# CLAUDE.md — mojowu

這份檔案是給 Claude Code（以及任何接手的開發者）的入口。先讀這裡，再依需要讀 `docs/`。

## 專案一句話

**mojowu** 是給繁體中文使用者的日語學習 App：五十音 → JLPT N5 → N1，文字（漢字）・語彙・文法三軌並進，以 FSRS 間隔重複排程，並以 JLPT 模擬考當各階段關卡。
最大差異化：使用者已懂漢字字義，所以漢字課專教讀音、新字體對照（國→国）與和製漢語陷阱（手紙＝信）。

- 線上版：https://mojowu.pages.dev（Cloudflare Pages，push `main` 自動部署）
- Repo：`mywu-cloud/mojowu`
- 擁有者：MY（以繁體中文溝通）

## 目前狀態（2026-11-25）

- **MVP 封測版**：`public/index.html` 單檔 PWA，無建置步驟、無後端、進度存 localStorage。
- 內容只有 **N5**：79 漢字、718 單字、60 文法、10 單元。
- **`app/`**：Vite + React + TS 版本（B1 完成，功能與 MVP 對等，**尚未部署**；見 `app/README.md`）。新功能請做在 `app/`，MVP 只修封測必要的問題，直到 B5 切換部署。
- 下一個里程碑：單元測試補齊、IndexedDB、加帳號與雲端同步（見 `docs/ROADMAP.md`）。

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
| `ATTRIBUTION.md` | 資料來源與授權（CC BY 需標示） |

## 常用指令

```bash
# 本機預覽（任何靜態伺服器皆可）
cd public && python3 -m http.server 8765        # 開 http://localhost:8765

# 端對端測試（需 playwright + chrome）
python3 tests/e2e.py http://localhost:8765/index.html /tmp/shot

# 羅馬字轉假名單元測試
node tests/romaji.test.mjs

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
3. **不要改 localStorage 的 key（`mojowu-v1`）或 `S` 的欄位意義**而不寫遷移；封測者的進度只存在他們手機上。
4. **內容 ID 永遠不可重用或改號**（`k001`、`v0001`、`g01`），使用者卡片以 ID 對應。新增內容往後編號。
5. **資料來源授權**：不得使用 WaniKani 的部件名稱與記憶口訣（有著作權）；JLPT 官方考題不得收錄。新資料來源先寫進 `ATTRIBUTION.md`。
6. MVP：所有使用者看得到的資料字串都要經過 `esc()` 再塞進 HTML。app：交給 React 跳脫，不准用 `dangerouslySetInnerHTML`。
7. 每次改動跑 `tests/e2e.py` 確認 `errors: []`（MVP 與 app/dist 都可跑）；改 `app/` 另跑 `npm test`。沙盒連不到 Google Fonts 時會出現 2 筆 `ERR_TUNNEL_CONNECTION_FAILED`，可忽略。
8. Commit 訊息用繁體中文，說明「改了什麼、為什麼」。

## 已知限制與地雷

- 沒有帳號：清除瀏覽器資料＝進度消失。我的頁面有「複製進度／貼上還原」做手動備份。
- 單元 2「數字與時間」漢字特別多（28 字），UI 已標示「建議兩週」（`HEAVY_K` 門檻）；沒有拆成兩個單元。
- 單字中非 N5 漢字（如 駅、鉛筆）不列入解鎖條件，直接顯示。
- 字典資料的英文釋義保留在 `content/n5.json` 但 App 不用。
- 繁中釋義、文法例句是自行撰寫，**尚未經日語教師校對**。
- 發音用瀏覽器 TTS（`speechSynthesis`），品質依裝置而異；正式版改預錄音檔。
