# app/ — mojowu 正式版前端（Vite + React + TypeScript）

ROADMAP B1：把 MVP（`public/index.html`）拆成模組，功能對等。**尚未部署**，線上 mojowu.pages.dev 仍是 MVP；切換部署見 ROADMAP B5（改 Pages 設定前先告知 MY）。

```bash
cd app
npm install
npm run dev        # http://localhost:5173（會先把 ../public 的課程資料、圖示同步進 app/public）
npm test           # vitest：romaji、與 MVP 的對照測試
npm run build      # 產出 app/dist
# e2e（與 MVP 共用同一支腳本，選擇器相同）
cd dist && python3 -m http.server 8770 &
python3 ../../tests/e2e.py http://localhost:8770/index.html /tmp/app
```

## 結構

| 路徑 | 內容 | 對應 MVP 區塊 |
| --- | --- | --- |
| `src/content/` | 型別、`n5.json` 載入與展開（`C.UNITS/ITEMS/K/V/G`） | content |
| `src/lib/romaji.ts` | 羅馬字轉假名、`norm`、`loose`（差一點）、答案比對 | kana + romaji |
| `src/lib/fsrs.ts` | FSRS-4.5 `schedule(card, good, target, now)` | FSRS |
| `src/lib/speech.ts`、`date.ts` | TTS、日期 | speech |
| `src/store/state.ts` | 進度 `S`、`initState()`（遷移與載入）、`save()`、`touchDay` | state |
| `src/store/db.ts` | IndexedDB 讀寫（cards、meta） | — |
| `src/lib/account.ts`、`src/components/AccountCard.tsx` | 登入（C2）：寄登入信、處理 `#login=` 連結、登出、`api()` 呼叫工具 | — |
| `src/lib/track.ts` | 匿名學習事件（送到 `../functions/api/event.ts`，見 docs/ANALYTICS.md） | — |
| `src/store/progress.ts` | 解鎖、`nextNew`、`dueList`、`unitHeavy` | state |
| `src/store/ui.ts` | 畫面狀態＋`bump()`／`useUi()` 訂閱 | （MVP 的全域變數） |
| `src/session/` | 學習回合動作（`actions.ts`）與畫面（`Session.tsx`） | session |
| `src/screens/` | 首頁、路徑、複習、JLPT、我的、五十音、關於 | views |
| `src/components/` | 底部導覽、對話框、進度環、發音鈕 | shell |
| `test/parity.test.ts` | 從 `public/index.html` 取出 MVP 函式，比對 romaji 與 FSRS 結果一致；MVP 退場後刪除 | — |

## 測試（`npm test`）

| 檔案 | 測什麼 |
| --- | --- |
| `romaji.test.ts` | 羅馬字轉假名、`norm`、`loose` |
| `answers.test.ts` | 答案比對規則；**用真實 N5 資料確認每個單字、漢字的正解都能答對** |
| `fsrs.test.ts` | FSRS 公式性質與回歸值（鎖住現行排程，改了封測者間隔會變） |
| `progress.test.ts` | 單字解鎖、`nextNew` 順序、單元開放、到期清單、連續天數 |
| `session.test.ts` | 只有第一次作答寫入 FSRS、答錯推回尾端、差一點只提示一次、五十音過關 |
| `parity.test.ts` | 與 MVP 函式結果完全一致 |
| `auth.test.ts` | 登入 API（假 Resend）：寄信、白名單、頻率限制、一次性、過期、登出 |
| `account.test.ts` | 前端登入流程 |
| `api.test.ts` | /health、/me、session 驗證（node:sqlite 模擬 D1） |
| `event.test.ts` | `/api/event` 驗證與寫入（假 D1） |
| `storage.test.ts` | IndexedDB 儲存、從 MVP 遷移、鏡像救回、無 IndexedDB 退回（fake-indexeddb） |

另有瀏覽器遷移測試：`python3 tests/migrate_e2e.py http://localhost:8770/index.html`。

## 注意

- 課程資料只維護一份在 `../public/data/`；`npm run dev/build` 前會自動同步（`scripts/sync-public.mjs`），同步來的檔案不進 git。
- 改了 `src/` 或資料，要調高 `app/public/sw.js` 的 `VERSION`。
- React 會自動跳脫字串，不需要 `esc()`；**不要用 `dangerouslySetInnerHTML`**。
- 保留了 `data-act`、`#ans`、`#main` 等屬性，讓 `tests/e2e.py` 能同時測 MVP 與 app。
