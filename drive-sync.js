/* Google Drive snapshots: append-only uploads preserve earlier versions. */
(() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  let token = '', expires = 0, busy = false, timer, ready = false, clean = '', base = [], files = [], chosen = [];
  let account = '';
  const status = message => document.getElementById('cloudStatus').textContent = message;
  const el = id => document.getElementById(id);
  const signature = () => JSON.stringify(backupPayload().data);
  const same = (a,b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  function controls() {
    el('cloudControls').innerHTML = `<div class="field"><label for="driveClientId">Google OAuth 用戶端 ID（首次設定）</label><input id="driveClientId" placeholder="……apps.googleusercontent.com" autocomplete="off"></div><button id="driveConnect">連接 Google Drive</button><div class="two-col" style="margin-top:10px"><button id="driveSync" class="secondary" disabled>立即同步</button><button id="driveDisconnect" class="secondary" disabled>中斷連接</button></div><p class="hint">只存取這個 App 的私人資料區，不讀取其他雲端硬碟檔案。登入有效期間、網頁開啟時會自動同步；到期需重新連接。</p><div id="driveChoices"></div><details><summary>首次設定方式</summary><p class="hint">在 Google Cloud 建立專案、啟用 Google Drive API，設定 OAuth 同意畫面及你的測試帳號；建立「網頁應用程式」用戶端，加入正式網站與本機預覽的 JavaScript 來源。將用戶端 ID 填在上方，不需要提供密鑰。</p><a href="GOOGLE-DRIVE-SETUP.md" target="_blank" rel="noopener">查看完整設定說明</a></details>`;
    el('driveClientId').value = localStorage.getItem('foodDriveClientId') || '';
    el('driveConnect').onclick = connect;
    el('driveSync').onclick = () => sync();
    el('driveDisconnect').onclick = disconnect;
    status('Google Drive 尚未連接。完成首次授權設定前，資料仍只保存在此裝置；可先下載備份。');
  }
  async function loadGoogle() {
    if (window.google?.accounts?.oauth2) return;
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');script.src='https://accounts.google.com/gsi/client';script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('無法載入 Google 登入，請確認網路。'));};document.head.append(script);
    });
  }
  async function connect() {
    const id=el('driveClientId').value.trim();
    if(!/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(id)){status('請先填寫 Google Cloud 的網頁 OAuth 用戶端 ID；這不是 Google 密碼或用戶端密鑰。');return;}
    localStorage.setItem('foodDriveClientId',id);
    el('driveConnect').disabled=true;status('正在準備 Google 登入…');
    try {
      if(!window.google?.accounts?.oauth2) {
        await loadGoogle();el('driveConnect').disabled=false;
        status('Google 登入已準備就緒，請再按一次「連接 Google Drive」選擇帳號。');return;
      }
      const client=google.accounts.oauth2.initTokenClient({client_id:id,scope:SCOPE,include_granted_scopes:false,error_callback:()=>{el('driveConnect').disabled=false;status('登入未完成，資料仍保存在此裝置。');},callback:async response=>{
        el('driveConnect').disabled=false;
        if(response.error||!google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE)){status('尚未授權此 App 的 Drive 資料區。');return;}
        token=response.access_token;expires=Date.now()+Number(response.expires_in)*1000-30000;
        ready=false;clean='';base=[];
        try {
          const about=await api('/about?fields=user(emailAddress,permissionId)');account=about.user.permissionId;
          const prior=localStorage.getItem('foodDriveAccount');
          if(prior&&prior!==account){disconnect();status('此裝置資料曾連接另一個 Google 帳號。為避免混合私人資料，請改用原帳號，或在另一個瀏覽器使用新帳號。');return;}
          localStorage.setItem('foodDriveAccount',account);
          el('driveDisconnect').disabled=false;el('driveSync').disabled=false;
          files=await listFiles();
          status('已連接 '+about.user.emailAddress+'。請選擇首次同步方式。');showChoices(true);
        }catch(e){status(e.message);}
      }});
      client.requestAccessToken({prompt:'select_account'});
    }catch(e){el('driveConnect').disabled=false;status(e.message);}
  }
  function disconnect() { token='';expires=0;ready=false;clearTimeout(timer);el('driveSync').disabled=true;el('driveDisconnect').disabled=true;el('driveChoices').replaceChildren();status('已中斷此頁連接；本機及 Google Drive 已儲存的資料均保留。'); }
  async function api(path,options={}) {
    if(!token||Date.now()>=expires){ready=false;throw Error('Google 登入已到期，請按「連接 Google Drive」。本機修改已保留，尚未同步。');}
    const response=await fetch('https://www.googleapis.com'+(path.startsWith('/upload/')?path:'/drive/v3'+path),{...options,headers:{Authorization:'Bearer '+token,...options.headers},signal:AbortSignal.timeout(30000)});
    if(!response.ok){if(response.status===401){expires=0;ready=false;}throw Error(response.status===401?'登入已到期，請重新連接 Google Drive。':'Google Drive 同步失敗（'+response.status+'），本機資料仍保留。');}
    return response.status===204?null:response.json();
  }
  async function listFiles() {
    let result=[],next='';
    do {const params=new URLSearchParams({spaces:'appDataFolder',q:"trashed = false and appProperties has { key='foodApp' and value='journal-v1' }",fields:'nextPageToken,files(id,name,createdTime,appProperties)',pageSize:'100'});if(next)params.set('pageToken',next);const data=await api('/files?'+params);result.push(...(data.files||[]));next=data.nextPageToken||'';}while(next);
    return result.sort((a,b)=>b.createdTime.localeCompare(a.createdTime));
  }
  function heads(list) {const parents=new Set(list.flatMap(f=>Object.entries(f.appProperties||{}).filter(([k])=>/^p\d+$/.test(k)).map(([,v])=>v)));return list.filter(f=>!parents.has(f.id)).map(f=>f.id);}
  function button(text,run){const b=document.createElement('button');b.textContent=text;b.className='secondary';b.style.marginTop='8px';b.onclick=run;return b;}
  function showChoices(first=false) {
    ready=false;chosen=heads(files);const box=el('driveChoices');box.replaceChildren();
    const note=document.createElement('p');note.className='hint';note.textContent=first?'首次連接不會自動覆蓋資料。請選擇以此裝置上傳，或載入一份雲端版本。':'偵測到另一台裝置也有更新，已暫停自動同步。請選擇要保留的版本；舊雲端版本仍會保留。';box.append(note);
    box.append(button('以此裝置資料建立雲端版本',()=>resolveLocal()));
    files.slice(0,10).forEach(file=>box.append(button('載入雲端版本 · '+new Date(file.createdTime).toLocaleString(),()=>resolveRemote(file))));
  }
  async function upload(parents) {
    if(parents.length>90)throw Error('版本分支過多，請先下載備份並整理雲端版本。');
    const snapshot=backupPayload(), captured=JSON.stringify(snapshot.data);
    const props={foodApp:'journal-v1'};parents.forEach((id,i)=>props['p'+i]=id);
    const boundary='food_'+crypto.randomUUID(), metadata={name:'food-diary-'+new Date().toISOString()+'.json',mimeType:'application/json',parents:['appDataFolder'],appProperties:props};
    const body='--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: application/json\r\n\r\n'+JSON.stringify(snapshot)+'\r\n--'+boundary+'--';
    const result=await api('/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'Content-Type':'multipart/related; boundary='+boundary},body});
    base=[result.id];clean=captured;ready=true;localStorage.setItem('foodDriveLastSync',new Date().toISOString());
    el('driveChoices').replaceChildren();status('已同步到 Google Drive · '+new Date().toLocaleTimeString()+'。歷史版本會保留。');
    if(signature()!==clean)queueCloudSync();
  }
  async function resolveLocal() {
    if(busy||!confirm('將此裝置的飲食、日記、體重、生理期與設定上傳到目前連接的 Google Drive？雲端舊版本會保留。'))return;
    busy=true;
    try {files=await listFiles();const current=heads(files);if(!same(current,chosen)){showChoices();status('雲端又有更新，請重新選擇版本。');return;}await upload(current);}catch(e){status(e.message);}finally{busy=false;}
  }
  async function resolveRemote(file) {
    if(busy||!confirm('載入這份雲端版本並取代此裝置資料？會先下載此裝置備份。'))return;
    busy=true;
    try {
      const before=signature();
      const payload=await api('/files/'+encodeURIComponent(file.id)+'?alt=media');const data=validateBackup(payload);
      if(signature()!==before){status('下載期間本機資料有修改，已取消還原；請重新選擇版本。');return;}
      downloadBackup(backupPayload(),'載入雲端前備份');applyBackupData(data);hydrateFromStorage();
      files=await listFiles();base=heads(files);clean=signature();ready=true;
      // A resolution snapshot explicitly descends from every observed branch.
      await upload(base);
    }catch(e){status(e.message);}finally{busy=false;}
  }
  async function sync() {
    if(busy)return;
    if(!ready){if(token){files=await listFiles().catch(e=>{status(e.message);return files;});showChoices(true);}else status('請先連接 Google Drive。');return;}
    if(!navigator.onLine){status('目前離線，修改已保存在此裝置，連線後再同步。');return;}
    busy=true;
    try {
      files=await listFiles();const current=heads(files);
      if(!same(current,base)) {
        if(current.length===1 && signature()===clean) {
          const before=signature();
          const payload=await api('/files/'+encodeURIComponent(current[0])+'?alt=media');
          const data=validateBackup(payload);
          if(signature()!==before){showChoices();status('下載期間此裝置也有修改，請選擇版本。');return;}
          ready=false;applyBackupData(data);hydrateFromStorage();base=current;clean=signature();ready=true;
          status('已載入 Google Drive 的最新資料。');return;
        }
        showChoices();status('雲端與此裝置皆有更新，請選擇版本後繼續同步。');return;
      }
      if(signature()!==clean)await upload(current);else status('此裝置與 Google Drive 版本一致。');
    }catch(e){status(e.message);}finally{busy=false;}
  }
  window.queueCloudSync = function(){if(!ready)return;clearTimeout(timer);status('本機已儲存，等待同步…');timer=setTimeout(sync,1800);};
  window.addEventListener('online',()=>{if(ready)sync();});
  window.addEventListener('focus',()=>{if(ready)sync();});
  controls();
})();
