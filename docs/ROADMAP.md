# 路線圖與待辦

## 三期

| 期 | 時程 | 範圍 | 進入下一期的門檻 |
| --- | --- | --- | --- |
| 第一期 MVP | 第 1–3 個月 | 五十音＋發音、N5 三軌 10 單元、FSRS 複習、N5 模擬考、連續天數、新字體對照 | 封測 7 日留存達標（數字待封測資料定） |
| 第二期 擴充 | 第 4–6 個月 | N4、N3 內容；分級測驗；週聯賽、印章收集；桌面小工具；訂閱上線 | 付費轉換達標 |
| 第三期 進階 | 第 7–12 個月 | N2、N1 內容；聽解播放器、長文讀解；AI 作文與口說批改；完整 N5–N1 模擬考；自習室與學習小組 | — |

## 封測要看的數字

次日／第 7 日／第 30 日留存；N5 第 1 單元完成率；每日平均學習分鐘；實際記憶率是否接近目標。
收集方式與查詢見 `docs/ANALYTICS.md`（A3）。

## 待辦（依優先順序，完成請打勾並在 commit 註明）

### A. 封測立即需要

- [x] A1 MVP 上線 mojowu.pages.dev（2026-11-25）
- [x] A2 App 內「關於／資料來源」頁，顯示 ATTRIBUTION（CC BY 必要）（2026-11-25，`#about`，從「我的」進入）
- [x] A3 匿名事件紀錄：開 Cloudflare Web Analytics＋自訂事件（lesson_done、review_done、test_done），以便算留存（2026-11-25；`docs/ANALYTICS.md`）
- [x] A4 意見回饋入口（連到 Google 表單或 email，顯示文字地址）（2026-11-25，Google 表單「mojowu 意見回饋」，入口在「我的」與關於頁；網址在 `app/src/links.ts`）
- [x] A5 單元 2 拆成「2a 數字」「2b 日期與時間」或 UI 標示「建議兩週」（2026-11-25，採 UI 標示：漢字 ≥ 20 的單元在路徑頁與今日任務顯示「建議兩週」，不改單元編號以免影響封測進度）
- [x] A6 長音／促音打錯時提示「差一點」（2026-11-25）

### B. 工程化

- [x] B1 建 `app/`：Vite + React + TS，依 `docs/ARCHITECTURE.md` §3 拆模組，功能與 MVP 對等（2026-11-25；e2e 與 MVP 共用、vitest 對照 MVP 函式一致）
- [x] B2 單元測試：romaji、answer matching、FSRS（以現行公式做回歸）、解鎖（2026-11-25，`app/test/`，70 項；含用真實 N5 資料驗證每個正解都能答對、學習回合規則）
- [x] B3 localStorage `mojowu-v1` → IndexedDB 遷移（2026-11-25，app/；localStorage 保留為同步鏡像，見 DECISIONS 16）
- [x] B4 GitHub Actions：PR 跑測試；資料 JSON schema 驗證（2026-11-25，`.github/workflows/ci.yml`：資料驗證＋ID 對照上一版、app 單元測試與建置、MVP 與 app 的 e2e）
- [x] B5 Pages 改用建置（`npm run build` → `app/dist`）——改部署設定前先告知 MY（2026-11-25，MY 已改 Pages 設定；v0.2.1 上線）

### C. 帳號與同步

- [x] C1 Workers + Hono 專案（`api/`），D1 建表（`docs/API.md`）（2026-11-25；改用同專案 Pages Functions，`functions/`＋`migrations/0001_accounts.sql`，見 DECISIONS 17）
- [ ] C2 Email 魔法連結登入；之後 Google、Apple（2026-11-25：Email 魔法連結 ✅，「我的」頁登入卡片；Google、Apple 待做）
- [x] C3 `/reviews:batch` 與 `/cards?since=` 離線同步（2026-11-26；合併成單一 `POST /api/sync`，見 DECISIONS 20）
- [x] C4 刪除帳號（2026-11-26：`DELETE /api/me`＋「我的」刪除帳號；隱私權政策 `app/public/privacy.html`（/privacy.html，含刪除步驟 #delete，可當 Google Play 的刪除網址）。匯出資料暫不做，已有「複製進度」）

### D. 內容

- [ ] D1 日語教師校對 N5（718 單字、79 漢字、60 文法），錯誤率 < 1%
- [ ] D2 N5 音檔（單字＋例句）放 R2，取代 TTS
- [ ] D3 N5 模擬考題庫（自行命題，依 JLPT 題型與分項計分）
- [x] D4 N4 內容（`docs/DATA.md` 擴充步驟）（2026-11-26：166 漢字、668 單字、80 文法、10 單元；App 支援多級數、可自由選級）
- [x] D4b N3 內容（2026-11-26：367 漢字、2,140 單字、120 文法、26 則和製漢語；20 個單元依漢字頻率自動分）
- [x] D4c N2 內容（2026-11-26：367 漢字、1,906 單字、160 文法、18 則和製漢語；20 個單元依漢字頻率自動分）
- [x] D4d N1 內容（2026-11-26：1,232 漢字、2,699 單字、150 文法、24 則和製漢語；30 個單元依漢字頻率自動分）

### E. 功能（對應設計稿 6–8）

- [ ] E1 新手引導（目標、程度、每日分鐘）
- [ ] E2 分級測驗（適性出題）
- [ ] E3 週聯賽（需後端）
- [ ] E4 學習日曆、休息券、提醒時間設定
- [ ] E5 印章收集與明信片

### F. 上架

- [ ] F1 Capacitor 包裝 iOS / Android
- [ ] F2 推播提醒
- [ ] F3 RevenueCat + Stripe 訂閱
- [ ] F4 隱私權政策、App Store / Google Play 審核

## 待 MY 決定

- 內容來源：持續以開放資料為底＋人工校對，或購買授權內容
- 音檔：真人錄音或高品質 TTS
- 定價：競品 US$7–14/月；是否提供終身方案
- repo 是否改為 private
- 商標與網域：~~網域~~ 已決定 mojowu.app（2026-11-25 購入）；商標待定
