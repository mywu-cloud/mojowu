# mojowu・日語學習

給繁體中文使用者的日語學習 App：從五十音到 JLPT N1，文字（漢字）・語彙・文法三軌並進。
目前是 **MVP 封測版**，內容涵蓋 N5（79 漢字、718 單字、60 文法，10 個單元）。

## 功能

- 五十音對照表與隨機練習
- N5 十個主題單元，漢字答對後才解鎖含該字的單字
- 打字作答：直接打羅馬字會自動轉成假名
- FSRS-4.5 間隔重複排程，可選目標記憶率 85% / 90% / 95%
- 和製漢語陷阱提醒（例：手紙＝信、勉強＝讀書）
- N5 練習測驗，錯題自動變成複習卡
- 連續天數、未來 7 天到期量、深色模式、日語發音（瀏覽器 TTS）
- PWA：可加到主畫面、離線可用

進度目前只存在使用者自己的瀏覽器（localStorage），還沒有帳號與跨裝置同步。

## 文件

接手開發請先讀 **[CLAUDE.md](CLAUDE.md)**（Claude Code 會自動讀取），再依需要讀：

| 文件 | 內容 |
| --- | --- |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 現行 MVP 程式結構、狀態模型、目標架構與遷移步驟 |
| [docs/DATA.md](docs/DATA.md) | 內容資料格式、ID 規則、建置流程 |
| [docs/LEARNING.md](docs/LEARNING.md) | N5→N1 學習路徑、解鎖規則、FSRS |
| [docs/API.md](docs/API.md) | 目標 API 與 D1 資料表 |
| [docs/DESIGN.md](docs/DESIGN.md) | 設計 token、9 個畫面、留存機制 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 路線圖與待辦清單 |
| [docs/RESEARCH.md](docs/RESEARCH.md) | 競品分析與 JLPT 規格 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 決策紀錄 |

## 專案結構

```
CLAUDE.md            ← 給 Claude Code 的入口與規則
docs/                ← 架構、資料、學習設計、API、設計、路線圖
tests/               ← e2e.py（Playwright 冒煙測試）、romaji.test.mjs
public/              ← Cloudflare Pages 發布的資料夾（不需要建置）
  index.html         App 本體
  data/n5.json       App 讀取的精簡課程資料
  sw.js              離線快取（改了 index.html 或資料時要調高 VERSION）
  manifest.webmanifest, icon*.{svg,png}, _headers
content/
  n5.json            完整 N5 內容資料庫（含英文釋義、筆畫等欄位）
  N5_content.xlsx    給人審閱用的 Excel 版
scripts/
  build_data.py      由開放資料＋中文釋義產生 content/n5.json
  build_xlsx.py      由 content/n5.json 產生 Excel
  build_app_data.py  由 content/n5.json 產生 public/data/n5.json
  n5_zh.txt          718 筆單字的繁中釋義與單元（行號＝單字順序）
```

## 部署到 Cloudflare Pages

1. Cloudflare 後台 → Workers & Pages → Create → Pages → Connect to Git → 選 `mywu-cloud/mojowu`
2. Build settings：
   - Framework preset：None
   - Build command：留空
   - Build output directory：`public`
3. Save and Deploy。之後每次 push 到 `main` 會自動重新部署，網址為 `https://mojowu.pages.dev`（若名稱被占用，Cloudflare 會加後綴）。

## 更新內容

```bash
# 1. 修改 scripts/n5_zh.txt 或 scripts/build_data.py 後重建資料庫
python3 scripts/build_data.py <kanji.json> <n5.csv> scripts/n5_zh.txt content/n5.json
# 2. 產生 App 資料與 Excel
python3 scripts/build_app_data.py content/n5.json public/data/n5.json
python3 scripts/build_xlsx.py content/n5.json content/N5_content.xlsx
# 3. 調高 public/sw.js 的 VERSION，commit 並 push
```

`<kanji.json>` 與 `<n5.csv>` 的下載位置見 [ATTRIBUTION.md](ATTRIBUTION.md)。

## 封測要看的數字

次日、第 7 日、第 30 日留存；N5 第 1 單元完成率；每日平均學習分鐘；實際記憶率是否接近目標。
