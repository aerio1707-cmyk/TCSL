# 智慧路燈控制器異動追蹤工具

輸入報表資料夾與桿號（poles_id），自動比對每日 CSV 報表（EssReport_YYYYMMDD.csv）
中的 controller_id，產出該桿號的歷史異動軌跡。**純前端執行，資料不會上傳到任何伺服器**——
所有解析與比對都在你的瀏覽器裡完成，只要選好資料夾就能分析，不需要安裝任何軟體、不需要架設後端。

## 本機開發

```bash
npm install
npm run dev
```

開啟瀏覽器造訪 `http://localhost:5173`。

## 產生測試用假資料（選用）

`scripts/generate-fixtures.mjs` 會在 `sample-data/` 底下產生一批格式符合規格、但內容
全為虛構的 csv 檔案（不含任何真實座標、IMEI、地址），方便本機測試分析流程：

```bash
node scripts/generate-fixtures.mjs
```

`sample-data/` 已被 `.gitignore` 排除，不會被提交進版本控制（即使你之後把真實報表複製
進來測試，也不會意外外流）。

## 部署到 GitHub Pages

推送到 `main` 分支後，`.github/workflows/deploy.yml` 會自動建置並部署到 GitHub Pages。
第一次使用前，需要到 repo 的 Settings → Pages，將 Source 設為 **GitHub Actions**。

## 瀏覽器支援

使用 `<input type="file" webkitdirectory>` 讀取整個資料夾，Chrome / Edge / Firefox /
Safari 皆可使用；每次分析都需要手動重新選取資料夾（不會記住路徑），符合「按一次分析一次」
的使用情境。

## 資料解析邏輯摘要

- **日期判定**：CSV 內 `date:YYYY-MM-DD` 標籤 → 檔名內 8 碼日期（如 `EssReport_20260609.csv`）
  → 檔案最後修改時間，三層 fallback。
- **同日多檔案取捨**：以檔名內時間戳記或檔案最後修改時間較晚者為準。
- **資料清洗**：自動去除前後空白、Excel 公式字串符號 `="..."`，並將 `poles_id` 正規化
  （去除前導零），確保 `0200090` 與 `200090` 視為同一支桿號。
- **缺漏判定**：查詢範圍內任何日期（含週末/假日）只要找不到報表或找不到該桿號，一律標記
  為 🟡 資料缺漏，不做例外排除。

## 已知限制

- 檔案量非常大（數千份以上）時，解析可能較慢；目前在主執行緒同步處理，尚未搬到 Web
  Worker，如果之後實際使用發現卡頓可以再優化。
- 需要手動選取資料夾，沒有「記住路徑、自動監控更新」的功能。
