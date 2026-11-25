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
| `src/store/state.ts` | 進度 `S`（localStorage `mojowu-v1`，與 MVP 相同）、`touchDay` | state |
| `src/store/progress.ts` | 解鎖、`nextNew`、`dueList`、`unitHeavy` | state |
| `src/store/ui.ts` | 畫面狀態＋`bump()`／`useUi()` 訂閱 | （MVP 的全域變數） |
| `src/session/` | 學習回合動作（`actions.ts`）與畫面（`Session.tsx`） | session |
| `src/screens/` | 首頁、路徑、複習、JLPT、我的、五十音、關於 | views |
| `src/components/` | 底部導覽、對話框、進度環、發音鈕 | shell |
| `test/parity.test.ts` | 從 `public/index.html` 取出 MVP 函式，比對 romaji 與 FSRS 結果一致；MVP 退場後刪除 | — |

## 注意

- 課程資料只維護一份在 `../public/data/`；`npm run dev/build` 前會自動同步（`scripts/sync-public.mjs`），同步來的檔案不進 git。
- 改了 `src/` 或資料，要調高 `app/public/sw.js` 的 `VERSION`。
- React 會自動跳脫字串，不需要 `esc()`；**不要用 `dangerouslySetInnerHTML`**。
- 保留了 `data-act`、`#ans`、`#main` 等屬性，讓 `tests/e2e.py` 能同時測 MVP 與 app。
