# CLAUDE.md — mojowu

這份檔案是給 Claude Code（以及任何接手的開發者）的入口。先讀這裡，再依需要讀 `docs/`。

## 專案一句話

**mojowu** 是給繁體中文使用者的日語學習 App：五十音 → JLPT N5 → N1，文字（漢字）・語彙・文法三軌並進，以 FSRS 間隔重複排程，並以 JLPT 模擬考當各階段關卡。
最大差異化：使用者已懂漢字字義，所以漢字課專教讀音、新字體對照（國→国）與和製漢語陷阱（手紙＝信）。

- 線上版：https://mojowu.app（2026-11-25 購入，Cloudflare Registrar；Pages 自訂網域）與 https://mojowu.pages.dev（封測者目前在用，**進度依網址分開存**，C3 前不要導轉，見 DECISIONS 18）。Cloudflare Pages，push `main` 自動部署；組建命令 `cd app && npm ci && npm run build`、輸出 `app/dist`）
- Repo：`mywu-cloud/mojowu`
- 擁有者：MY（以繁體中文溝通）

## 目前狀態（2026-11-25）

- **線上是 `app/`**（Vite + React + TS，v0.2.3，2026-11-25 起；見 `app/README.md`）。進度存 IndexedDB，localStorage `mojowu-v1` 為鏡像。**所有新功能做在 `app/`。**
- **`public/index.html`（舊 MVP 單檔版）已不部署**，保留作為回退版本與 `app/test/parity.test.ts` 的對照；`public/data/` 仍是課程資料唯一來源。回退方法見 `docs/ARCHITECTURE.md` §1.6。
- 內容只有 **N5**：79 漢字、718 單字、60 文法、10 單元。
- 意見回饋：Google 表單「mojowu 意見回饋」（MY 的 Google 帳號，回覆在表單的「回覆」分頁），網址在 `app/src/links.ts`。
- `functions/`：Cloudflare Pages Functions（Hono；`/api/event` 匿名事件、`/api/health`、`/api/me`，見 `docs/API.md`），部署時 Pages 自動編譯；依賴在根目錄 `package.json`。D1 資料庫 `mojowu` 綁定為 `DB`，資料表在 `migrations/*.sql`（D1 主控台手動執行）。
- 下一個里程碑：帳號與雲端同步（C）、新手引導等功能（E）（見 `docs/ROADMAP.md`）。

## 文件地圖

| 檔案 | 內容 |
| --- | --- |
| `docs/ARCHITECTURE.md` | 現行 MVP 程式結構、狀態模型、目標架構與遷移步驟 |
| `docs/DATA.md` | 內容資料格式、ID 規則、單元分配規則、建置流程、授權 |
| `docs/LEARNING.md` | N5→N1 學習路徑、三軌解鎖規則、FSRS 公式與參數、答案比對規則 |
| `docs/API.md` | 目標 API 端點與 D1 資料表 SQL |
| `docs/DESIGN.md` | 設計 token、9 個畫面規格、留存機制、無障礙要求 |
| `docs/ROADMAP.md` | 三期路線、關卡、**待辦清單（從這裡挑工作）** |
| `docs/RESEARCH.md` | 競品分析與 JLPT 官方規格摘要 |
| `docs/DECISIONS.md` | 已做的技術與產品決策及理由 |
| `docs/ANALYTICS.md` | 使用統計：Web Analytics、匿名學習事件、D1 設定與留存查詢 |
| `ATTRIBUTION.md` | 資料來源與授權（CC BY 需標示） |

## 常用指令

```bash
# 本機預覽（任何靜態伺服器皆可）
cd public && python3 -m http.server 8765        # 開 http://localhost:8765

# 端對端測試（需 playwright + chrome；有錯誤時 exit 1）
python3 tests/e2e.py http://localhost:8765/index.html /tmp/shot

# 課程資料驗證（--baseline 檢查 ID 沒被刪除或改號）
node scripts/validate_data.mjs [--baseline <舊版 n5.json>]

# 羅馬字轉假名單元測試
node tests/romaji.test.mjs

# functions 依賴（根目錄）；API 測試在 app/test/api.test.ts
npm ci

# app/（React 版）
cd app && npm install && npm run dev      # http://localhost:5173
cd app && npm test && npm run build       # vitest＋產出 app/dist

# 重建資料（改了 scripts/n5_zh.txt 或 scripts/build_data.py 之後）
python3 scripts/build_data.py <kanji.json> <n5.csv> scripts/n5_zh.txt content/n5.json
python3 scripts/build_app_data.py content/n5.json public/data/n5.json
python3 scripts/build_xlsx.py content/n5.json content/N5_content.xlsx
```

`<kanji.json>`、`<n5.csv>` 的下載網址在 `docs/DATA.md`。

## 規則（請遵守）

1. **UI 文字一律繁體中文（台灣用語）**；日文用 `Noto Serif JP`，介面用 `Noto Sans TC`。
2. **改了 `public/index.html` 或 `public/data/*` 必須調高 `public/sw.js` 的 `VERSION`**，否則使用者會一直拿到舊快取。`app/` 則調高 `app/public/sw.js`。
3. **不要改 localStorage 的 key（`mojowu-v1`）或 `S` 的欄位意義**而不寫遷移；封測者的進度只存在他們手機上。app/ 的進度存在 IndexedDB `mojowu`（localStorage 為鏡像），改資料表要調高 `DB_VERSION` 並依 oldVersion 逐步遷移（`app/src/store/db.ts`）。
4. **內容 ID 永遠不可重用或改號**（`k001`、`v0001`、`g01`），使用者卡片以 ID 對應。新增內容往後編號。
5. **資料來源授權**：不得使用 WaniKani 的部件名稱與記憶口訣（有著作權）；JLPT 官方考題不得收錄。新資料來源先寫進 `ATTRIBUTION.md`。
6. MVP：所有使用者看得到的資料字串都要經過 `esc()` 再塞進 HTML。app：交給 React 跳脫，不准用 `dangerouslySetInnerHTML`。
7. 每次改動跑 `tests/e2e.py` 確認 `errors: []`（MVP 與 app/dist 都可跑）；改 `app/` 另跑 `npm test`；改資料另跑 `scripts/validate_data.mjs`。PR 與 push `main` 時 GitHub Actions（`.github/workflows/ci.yml`）會自動跑全部。
8. Commit 訊息用繁體中文，說明「改了什麼、為什麼」。

## 已知限制與地雷

- 沒有帳號：清除瀏覽器資料＝進度消失。我的頁面有「複製進度／貼上還原」做手動備份。
- 單元 2「數字與時間」漢字特別多（28 字），UI 已標示「建議兩週」（`HEAVY_K` 門檻）；沒有拆成兩個單元。
- 單字中非 N5 漢字（如 駅、鉛筆）不列入解鎖條件，直接顯示。
- 字典資料的英文釋義保留在 `content/n5.json` 但 App 不用。
- 繁中釋義、文法例句是自行撰寫，**尚未經日語教師校對**。
- 發音用瀏覽器 TTS（`speechSynthesis`），品質依裝置而異；正式版改預錄音檔。
