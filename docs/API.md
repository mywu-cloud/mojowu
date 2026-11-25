# API 與資料庫（目標架構，尚未實作）

排程在用戶端算，伺服器只負責存取與同步，所以離線也能複習。全部端點需 Bearer token，內容 JSON 除外。Workers 用 Hono。

## 端點

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| GET | `/content/{level}.json?v=` | 該級內容（靜態、可快取） |
| POST | `/auth/magic-link` | 寄登入連結 |
| GET | `/me` | 設定、方案、連續天數 |
| PATCH | `/me` | 目標記憶率、時區、提醒時間 |
| GET | `/cards?since=` | 增量拉取變動的卡片 |
| POST | `/reviews:batch` | 上傳一批作答＋卡片狀態；以 (user_id, item_id, reviewed_at) 去重 |
| GET | `/stats/daily?from=&to=` | 學習日曆、未來到期量 |
| POST | `/mock-results` | 上傳模擬考成績；伺服器把錯題卡片設為立即到期 |
| GET | `/leagues/current` | 本週聯賽名次 |
| POST | `/placement` | 分級測驗結果；批次把低階項目標為已知 |
| DELETE | `/me` | 刪除帳號與所有學習資料（App Store 規定） |

**衝突處理**：兩台裝置都對同一卡作答時，伺服器依 `reviews` 時間順序重算 FSRS，不做「後寫覆蓋」。

## D1 資料表

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',          -- free | pro
  target_retention REAL NOT NULL DEFAULT 0.9,
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
  goal TEXT, daily_minutes INTEGER,           -- 新手引導填的目標
  created_at INTEGER NOT NULL
);

CREATE TABLE cards (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,                      -- k003 / v0144 / g01（不可改號）
  stability REAL, difficulty REAL,
  due_at INTEGER, last_review_at INTEGER,
  reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0,
  last_ok INTEGER, state TEXT NOT NULL DEFAULT 'learning',  -- learning | review | mastered | known
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX cards_due ON cards(user_id, due_at);

CREATE TABLE reviews (                        -- 只增不改；FSRS 重算與個人化訓練的事實來源
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  reviewed_at INTEGER NOT NULL,
  rating INTEGER NOT NULL,                    -- 1 Again / 2 Hard / 3 Good / 4 Easy
  elapsed_days REAL, answer_text TEXT, duration_ms INTEGER,
  source TEXT NOT NULL,                       -- lesson | review | mock | placement
  UNIQUE (user_id, item_id, reviewed_at)
);

CREATE TABLE daily_stats (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,                          -- 以使用者時區切日 YYYY-MM-DD
  reviews INTEGER NOT NULL DEFAULT 0, new_items INTEGER NOT NULL DEFAULT 0,
  minutes REAL NOT NULL DEFAULT 0, streak_after INTEGER,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE mock_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level TEXT NOT NULL, taken_at INTEGER NOT NULL,
  section_scores TEXT NOT NULL,               -- JSON：{"knowledge":78,"reading":..,"listening":34}
  total INTEGER NOT NULL
);

CREATE TABLE league_members (
  league_id TEXT NOT NULL, week TEXT NOT NULL,   -- 2026-W48
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,             -- 本週「記住的項目數」，不是答題數
  PRIMARY KEY (league_id, week, user_id)
);
```

時間一律 UTC 毫秒。MVP 的 localStorage `S.cards` 欄位對應：`s→stability`、`d→difficulty`、`due→due_at`、`last→last_review_at`、`ok→last_ok`。
