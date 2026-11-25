# 決策紀錄

新決策往下加，格式：日期・決策・理由・替代方案。

| # | 日期 | 決策 | 理由 | 未採用 |
| --- | --- | --- | --- | --- |
| 1 | 2026-11-25 | 目標使用者為繁中母語者 | 已懂漢字字義，可省大量學習時間；市場上無針對此族群的完整課程 | 泛用多語 App |
| 2 | 2026-11-25 | 漢字課教讀音、新字體對照、和製漢語陷阱，不教字義 | 繁中使用者字義已知；陷阱詞是最常見錯誤 | 照搬英語圈的字義＋口訣教法 |
| 3 | 2026-11-25 | 三軌（文字・語彙・文法）＋漢字熟練才解鎖單字 | WaniKani 證明解鎖鏈能防止內容過載 | 線性關卡（Duolingo） |
| 4 | 2026-11-25 | 打字作答，羅馬字自動轉假名 | 主動回想比選擇題記得久（Bunpro）；不需日文輸入法 | 只用選擇題 |
| 5 | 2026-11-25 | 排程用 FSRS-4.5，端上計算 | 開源、可設目標記憶率、離線可用 | SM-2 |
| 6 | 2026-11-25 | 不使用愛心/體力限制；聯賽以「記住的項目數」計分 | 懲罰式機制令人反感；避免刷題 | Duolingo 愛心制 |
| 7 | 2026-11-25 | 漢字排在第一個用到它的單元 | 不會因漢字未教而延後單字；代價是 U2 漢字偏多 | 依主題指定漢字（會讓 41 個單字被延後） |
| 8 | 2026-11-25 | 開放資料：kanji-data（MIT）＋open-anki-jlpt-decks（MIT／Tanos CC BY） | 可商用、可追溯；不用 WaniKani 內容避免著作權 | 自行從零整理 |
| 9 | 2026-11-25 | MVP 為單檔 PWA、無建置、localStorage | 最快上線封測、驗證留存 | 直接做原生 App |
| 10 | 2026-11-25 | 正式版：React+Vite PWA＋Capacitor；Cloudflare Pages/Workers/D1/R2 | 一套程式碼跑網頁與 App；MY 的其他專案都在 Cloudflare | Flutter；Supabase；Vercel |
| 11 | 2026-11-25 | 名稱 mojowu；repo `mywu-cloud/mojowu`；網址 mojowu.pages.dev | MY 決定 | 漢橋日語 KanBridge 等候選 |
| 12 | 2026-11-25 | 模擬考只自行命題 | JLPT 官方考題有著作權 | 收錄歷屆試題 |
| 13 | 2026-11-25 | B1 移植時 FSRS 保留自寫公式，不換 `ts-fsrs` | 封測者卡片已依現行公式排程，換套件會讓間隔跳動；先以對照測試鎖住行為，換套件另開工作 | 移植同時換 ts-fsrs |
| 14 | 2026-11-25 | `app/` 與 MVP 並存，暫不改 Pages 部署 | 切換部署需改 Pages 設定（B5），先讓 MY 確認；並存期間兩邊共用課程資料與 e2e | 直接以 app 取代 MVP |
| 15 | 2026-11-25 | 畫面狀態用自寫的 `bump()`＋`useSyncExternalStore`，不引入狀態管理套件 | 與 MVP 結構一一對應、移植風險最低、零依賴 | Zustand、Redux |
| 18 | 2026-11-25 | 正式網域 mojowu.app（Cloudflare Registrar，首年 $1、續約 $14.20/年）；pages.dev 與新網域並存，C3（雲端同步）完成前不導轉 | 寄登入信需驗證自有網域；上架也需正式網域。瀏覽器的 IndexedDB／localStorage 依網址分開，直接導轉會讓封測者看不到進度——等登入＋同步上線，在舊網址登入上傳後再到新網址登入取回，之後才把 pages.dev 導向 mojowu.app | mojowu.com（已被註冊）；用 pinncafe.com 子網域寄信 |
| 17 | 2026-11-25 | API 放在同一個 Pages 專案的 Pages Functions（`functions/`，Hono），不另開 Worker | 同源免 CORS、沿用已綁定的 D1、一次部署；Pages Functions 底層就是 Workers，日後要拆出也容易 | 獨立 Workers 專案＋自訂網域 |
| 16 | 2026-11-25 | IndexedDB 為主、localStorage `mojowu-v1` 保留為同步鏡像，啟動時取 savedAt 較新者 | IndexedDB 非同步寫入，App 被關掉時最後一題可能沒寫完，鏡像可救回；B5 後若需回退 MVP，進度仍可用 | 遷移後刪除 localStorage；只用 IndexedDB |
