# 架構

## 1. 現行 MVP（v0.1）

單一 HTML 檔 PWA，部署在 Cloudflare Pages，沒有建置、沒有後端。

```
瀏覽器
 ├─ index.html ─── fetch('data/n5.json') ──► 課程內容（唯讀）
 ├─ localStorage['mojowu-v1'] ◄──► 學習進度 S（卡片、連續天數、設定）
 ├─ speechSynthesis ──► 日語發音
 └─ sw.js ──► 離線快取（network-first）
```

### `public/index.html` 程式區塊

程式全部包在 `fetch('data/n5.json').then(RAW => { ... })` 裡，依序：

| 區塊 | 主要成員 | 說明 |
| --- | --- | --- |
| content | `UNITS`, `ITEMS`, `K`, `V`, `G` | 把精簡陣列展開成物件；`ITEMS[id]` 查任何項目 |
| kana + romaji | `KANA_ROWS`, `R2K`, `toHira()`, `kataToHira()`, `norm()`, `answersFor()`, `isRight()` | 羅馬字轉平假名、答案正規化與比對 |
| FSRS-4.5 | `W`, `retr()`, `ivl()`, `schedule(card, good)` | 間隔排程，見 `docs/LEARNING.md` |
| state | `KEY`, `S`, `save()`, `touchDay()`, `available()`, `unitDone()`, `currentUnit()`, `nextNew()`, `dueList()` | 進度與解鎖邏輯 |
| speech | `speak()`, `sayBtn()` | TTS |
| views | `home()`, `path()`, `reviewTab()`, `jlpt()`, `me()`, `kanaView()` | 回傳 HTML 字串的分頁 |
| session | `startLesson()`, `startReview()`, `startKana()`, `startTest()`, `learnCard()`, `quizCard()`, `feedback()`, `sessionView()`, `finishView()`, `grade()`, `advance()` | 學習回合 |
| shell | `render()`, `toast()`, `confirmBox()`, 事件委派, `route()` | 單一 click 監聽器靠 `data-act` / `data-go` / `data-unit` / `data-pick` / `data-tpick` / `data-say` 分派 |

### 狀態 `S`（localStorage `mojowu-v1`）

```js
{
  cards: { [itemId]: { s, d, due, reps, lapses, last, ok } }, // FSRS 狀態；s=穩定度(天) d=難度 due/last=ms
  target: 0.9,       // 目標記憶率 0.85 | 0.9 | 0.95
  streak: 0,         // 連續天數
  lastDay: 'YYYY-MM-DD',
  log: { 'YYYY-MM-DD': 次數 },
  kana: 0            // 1 = 假名練習曾答對 ≥ 8/10
}
```

卡片存在＝已學過。`ok` 為最近一次是否答對（用於漢字解鎖單字）。

### 路由

hash 路由：`#home #path #review #jlpt #me #kana`。學習回合（`session`）不進 hash，進行中隱藏底部導覽。

### 學習回合 `session`

```js
{ kind: 'lesson'|'review'|'kana'|'test', queue: [...items], first: {id: bool}, done, total,
  learn?, li?   // lesson：先逐張看 learn[]，再進 queue 測驗
  i?, res?      // test：題目索引與結果
  score? }      // kana
```

答錯的項目會推回 `queue` 尾端，同一回合答對才結束；只有**第一次作答**會寫入 FSRS。

## 1.5 `app/`（React 版，B1）

模組對照與指令見 `app/README.md`。重點：

- 狀態模型、localStorage key、hash 路由、回合規則都與 MVP 相同；畫面狀態放 `store/ui.ts`，改完呼叫 `bump()`，元件用 `useUi()`（`useSyncExternalStore`）訂閱。之後要換成 Zustand 等也只動這一檔。
- 課程資料仍只有 `public/data/n5.json` 一份，build 前同步進 `app/public/`。
- `test/parity.test.ts` 直接執行 `public/index.html` 內的函式做對照，確保移植零行為差異。
- **儲存（B3）**：IndexedDB `mojowu` v1（`cards`：key＝項目 ID；`meta`：target、streak、lastDay、log、kana、savedAt、migratedFrom）。`save()` 同步寫 localStorage 鏡像（`mojowu-v1`＋`mojowu-v1-savedAt`），再合併排入 IndexedDB 交易、只寫有變動的卡片。啟動 `initState()`：IndexedDB 空而 localStorage 有資料＝從 MVP 遷移；兩邊都有則取 savedAt 較新者並補寫另一邊；沒有 IndexedDB 時退回只用 localStorage。`navigator.storage.persist()` 降低被瀏覽器清除的機率。

## 1.6 部署（B5，2026-11-25 起）

| Cloudflare Pages 組建組態 | 現在（app） | 回退到 MVP |
| --- | --- | --- |
| 組建命令 | `cd app && npm ci && npm run build` | （空白） |
| 組建輸出 | `app/dist` | `public` |
| 根目錄 | （空白） | （空白） |

- Node 版本由 repo 根目錄 `.node-version`（22）決定；組建系統版本 3。
- 自訂網域：`mojowu.app`（Pages → 自訂網域，2026-11-25 啟用）。`mojowu.pages.dev` 仍可用；兩者的本機進度互不相通，搬家計畫見 DECISIONS 18。
- 回退：把組建組態改回右欄並重新部署（或在 Pages「部署」頁對舊部署按「回滾」）。進度不會遺失——app 每次儲存都同步寫 localStorage `mojowu-v1`，MVP 讀的就是它；只有 IndexedDB 獨有、尚未寫進鏡像的資料不存在（正常情況沒有）。
- 回退後 MVP 的 sw.js（`mojowu-v0.1.x`）會取代 app 的（`mojowu-app-v…`）並清掉其快取。

## 2. 目標架構（正式版）

```
使用者裝置 ─────────────────────────────┐        Cloudflare
  React + Vite + TS（PWA）              │  下載   ┌ Pages：網站＋內容 JSON（每級一檔，帶版本號）
  Capacitor 包成 iOS / Android App      ├───────►│ R2：預錄音檔
  FSRS 排程（端上計算，離線可用）        │  同步   │ Workers（Hono）：API、登入、webhook
  IndexedDB：內容、卡片、待傳作答        ├───────►│ D1：users / cards / reviews / ...
                                        │        └──► 登入（Email 魔法連結、Google、Apple）
                                        │             金流（RevenueCat、Stripe）
```

原則：**排程在手機上算，雲端只負責存與同步**；`reviews` 是唯一事實來源，`cards` 只是快取。

| 層 | 選用 | 替代 |
| --- | --- | --- |
| 前端 | React + Vite + TypeScript，PWA | Flutter |
| App 上架 | Capacitor | React Native |
| 託管 | Cloudflare Pages | Vercel |
| API | Cloudflare Workers + Hono | Supabase Edge Functions |
| 資料庫 | Cloudflare D1 | Supabase Postgres |
| 內容 | 靜態 JSON（每級一檔） | 放 D1 |
| 登入 | Email 魔法連結＋Google＋Apple（App Store 要求 Apple 登入） | Clerk、Supabase Auth |
| 音檔 | R2 預錄；MVP 用 TTS | 真人錄音 |
| 金流 | RevenueCat（App）＋Stripe（網頁） | 各平台自建 |
| 分析 | Cloudflare Web Analytics＋自建事件表 | PostHog |

## 3. 遷移步驟（建議順序）

1. 建 `app/`（Vite + React + TS），把 `public/index.html` 的區塊拆成模組：
   `content/`（載入與型別）、`lib/romaji.ts`、`lib/fsrs.ts`（暫保留自寫公式，見決策 13）、`store/`（狀態）、`screens/`（5 分頁＋回合）。
2. 保持 localStorage 相容：首次啟動讀 `mojowu-v1` 轉進 IndexedDB。
3. 補單元測試：romaji、answer matching、FSRS、解鎖。
4. Cloudflare Pages build command 改 `npm run build`、output `app/dist`（這一步會改部署設定，先告知 MY）。
5. 建 Workers API 與 D1（`docs/API.md`），加登入與同步。
6. Capacitor 包裝、推播、上架。
