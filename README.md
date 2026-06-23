# 食物紀錄 App

這是一個可直接打開使用的食物紀錄 PWA。資料會存在目前瀏覽器的 localStorage，不需要後端或資料庫。

## 使用方式

1. 打開 `index.html`。
2. 選日期。
3. 新增食物、份量、餐別與備註。
4. 可複製本日摘要，或匯出全部資料為 CSV。

## 放到 GitHub Pages

1. 建立一個 GitHub repository。
2. 上傳這個資料夾裡的所有檔案。
3. 到 repository 的 Settings > Pages。
4. Source 選 `Deploy from a branch`，Branch 選 `main` 和 `/root`。
5. 等 GitHub Pages 部署完成後，用手機打開網址。
6. 在手機瀏覽器選「加入主畫面」，就會像 app 一樣開啟。

## 注意

- 資料存在瀏覽器本機，換手機或清除瀏覽器資料後不會自動同步。
- 如果之後想要跨裝置同步，可以再接 Firebase、Supabase，或做成真正的手機 app。
