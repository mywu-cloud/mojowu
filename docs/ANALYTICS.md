# 使用統計（ROADMAP A3）

兩層：

| 層 | 工具 | 看什麼 | 設定 |
| --- | --- | --- | --- |
| 流量 | Cloudflare Web Analytics | 瀏覽量、訪客、來源、裝置、網頁效能 | Pages 專案 → 指標 → Web Analytics 已啟用（2026-11-25）；Cloudflare 部署時自動插入 beacon，不需 token |
| 學習事件 | Pages Function `/api/event` ＋ D1 | 留存、單元完成率、每日學習量 | 見下方「D1 設定」 |

Web Analytics 不支援自訂事件，所以學習事件自己記。

## 記錄內容（隱私）

- `anon`：隨機 UUID（localStorage `mojowu-anon`），**與任何個人資料無關**；清除瀏覽器資料就換新的。
- `event`：`app_open`（每個當地日期一次）、`lesson_done`、`review_done`、`test_done`、`kana_done`
- `day`：使用者當地日期；`ts`：伺服器收到的 UTC 毫秒；`ver`：App 版本
- `n`：數量（lesson/review＝本回合項目數；test＝答對題數；kana＝答對數）
- **不記 IP、User-Agent、作答內容。** 「我的」頁可關閉；本機開發與 e2e 不送。關於頁有說明。

程式：`app/src/lib/track.ts`（送出）、`functions/api/event.ts`（驗證與寫入；未綁 D1 時回 204 略過）。

## D1 設定（一次性）

1. Cloudflare → 儲存與資料庫 → D1 → 建立資料庫，名稱 `mojowu`
2. 在資料庫的「主控台」執行：

```sql
CREATE TABLE IF NOT EXISTS events (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  anon  TEXT    NOT NULL,
  event TEXT    NOT NULL,
  day   TEXT    NOT NULL,          -- 使用者當地日期 YYYY-MM-DD
  ts    INTEGER NOT NULL,          -- 伺服器 UTC 毫秒
  ver   TEXT    NOT NULL,
  n     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS events_anon_day ON events(anon, day);
CREATE INDEX IF NOT EXISTS events_day ON events(day);
```

3. Pages 專案 mojowu → 設定 → 繫結 → 新增 → D1 資料庫，**變數名稱 `DB`**，選 `mojowu`（正式與預覽環境都加）
4. 重新部署後生效。之後 C1 的 `users`／`cards`／`reviews` 表也建在同一個 D1。

## 查詢（D1 主控台）

```sql
-- 每日活躍人數（最近 30 天）
SELECT day, COUNT(DISTINCT anon) AS dau FROM events
WHERE day >= date('now', '-30 day') GROUP BY day ORDER BY day;

-- 次日／第 7 日／第 30 日留存（以首次出現日為 cohort；第 N 日當天有任何事件＝留存）
WITH first AS (SELECT anon, MIN(day) AS d0 FROM events GROUP BY anon),
act AS (SELECT DISTINCT anon, day FROM events)
SELECT f.d0 AS cohort, COUNT(*) AS users,
  ROUND(100.0 * SUM(EXISTS(SELECT 1 FROM act a WHERE a.anon = f.anon AND a.day = date(f.d0, '+1 day')))  / COUNT(*), 1) AS d1_pct,
  ROUND(100.0 * SUM(EXISTS(SELECT 1 FROM act a WHERE a.anon = f.anon AND a.day = date(f.d0, '+7 day')))  / COUNT(*), 1) AS d7_pct,
  ROUND(100.0 * SUM(EXISTS(SELECT 1 FROM act a WHERE a.anon = f.anon AND a.day = date(f.d0, '+30 day'))) / COUNT(*), 1) AS d30_pct
FROM first f GROUP BY f.d0 ORDER BY f.d0;

-- 每人每日平均學習項目數
SELECT day, ROUND(1.0 * SUM(n) / COUNT(DISTINCT anon), 1) AS items_per_user
FROM events WHERE event IN ('lesson_done', 'review_done') GROUP BY day ORDER BY day;

-- 有上過課的人中，五十音、測驗的使用率
SELECT event, COUNT(DISTINCT anon) AS users FROM events GROUP BY event;
```

「N5 第 1 單元完成率」需要知道單元，事件目前沒帶單元；若需要，在 `lesson_done` 加 `unit` 欄位（改 `track.ts`、`event.ts` 驗證與資料表）。
