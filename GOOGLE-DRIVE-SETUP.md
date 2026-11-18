# Google Drive 個人同步設定

此網頁使用 Google Identity Services 登入，把 JSON 快照放在 Google Drive 的私人 App 資料區。沒有伺服器密鑰，不讀取你的其他 Drive 檔案。ChatGPT 的 Google Drive 連線與本網頁的授權互相獨立。

## 一次性設定（專案擁有人操作）
1. 前往 https://console.cloud.google.com/ ，建立或選擇你自己的專案。
2. 在 API 程式庫啟用 **Google Drive API**。
3. 在 Google Auth Platform 設定品牌、支援電子郵件、Audience；個人帳號可先使用 External / Testing，並只加入你自己的 Google 電子郵件為測試使用者。
4. 在 Data Access 加入範圍 `https://www.googleapis.com/auth/drive.appdata`。
5. 在 Clients 建立 OAuth 2.0 用戶端，類型選 **Web application**。
6. Authorized JavaScript origins 加入你實際使用的來源（不含路徑）：
   - `https://anita850511-droid.github.io`
   - 本機預覽需要時加入 `http://127.0.0.1:8876`
   不要把 `/food/` 放在 origins；這個 popup token 流程不需要填 callback URL。
7. 複製以 `.apps.googleusercontent.com` 結尾的 **Client ID**，在網頁「同步與備份」貼上。不要貼 Client Secret。
8. 點「連接 Google Drive」，由你親自登入、同意授權。首次連接時選擇上傳本機資料或載入既有雲端版本。

## 實際行為
- 同一個 Google 帳號和同一個 OAuth 用戶端，才能存取同一份 App 資料。
- 網頁開啟且授權有效時，修改會自動上傳；離線修改留在本機，恢復網路後重試。
- Google access token 只放在記憶體，不寫入程式、備份或 localStorage。重新開啟或授權到期後，需要按「連接 Google Drive」。這不是背景常駐同步。
- 若另一裝置有更新且本機未修改，連回頁面／立即同步會下載新版；兩邊都有修改則提示選擇版本。
- 使用新增快照而非覆蓋檔案，舊版保留，介面提供最近10份可還原。快照會佔用你的 Drive 空間，目前不自動清理。
- App 資料區不會出現在 Drive 一般檔案清單。刪除 App 資料仍可能導致資料遺失，建議保留下載備份。
- 雲端套用前可下載目前裝置備份；正式網址與本機預覽不共用 localStorage，可藉備份檔或同一個 Drive 授權搬移。

## 驗證
完成授權後，用少量測試資料上傳；另一個瀏覽器連接同一帳號，載入版本，確認日記、日期、圖表、模板都正確，再使用正式紀錄。目前程式已完成本機測試，但未配置 Client ID 前無法驗證真實 Google 帳號的同步。

官方文件：
- https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid
- https://developers.google.com/identity/oauth2/web/guides/use-token-model
- https://developers.google.com/workspace/drive/api/guides/appdata
