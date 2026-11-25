-- C1：帳號與學習資料（docs/API.md）。在 D1 主控台整段執行；全部 IF NOT EXISTS，重跑無害。
-- 時間一律 UTC 毫秒。item_id 對應內容 ID（k003 / v0144 / g01），不可改號。

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                        -- 隨機 UUID
  email TEXT UNIQUE NOT NULL,                 -- 一律小寫
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',          -- free | pro
  target_retention REAL NOT NULL DEFAULT 0.9, -- 0.85 | 0.9 | 0.95（= app S.target）
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
  goal TEXT, daily_minutes INTEGER,           -- 新手引導填的目標（E1）
  streak INTEGER NOT NULL DEFAULT 0,          -- = app S.streak
  last_day TEXT,                              -- = app S.lastDay（使用者時區 YYYY-MM-DD）
  kana INTEGER NOT NULL DEFAULT 0,            -- = app S.kana
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (            -- 每人每項目一列；reviews 的快取
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  stability REAL, difficulty REAL,            -- = app card.s / card.d
  due_at INTEGER, last_review_at INTEGER,     -- = card.due / card.last
  reps INTEGER NOT NULL DEFAULT 0, lapses INTEGER NOT NULL DEFAULT 0,
  last_ok INTEGER,                            -- = card.ok（0/1）
  state TEXT NOT NULL DEFAULT 'learning',     -- learning | review | mastered | known
  updated_at INTEGER NOT NULL,                -- 伺服器寫入時間，給 GET /cards?since= 用
  PRIMARY KEY (user_id, item_id)
);
CREATE INDEX IF NOT EXISTS cards_due ON cards(user_id, due_at);
CREATE INDEX IF NOT EXISTS cards_updated ON cards(user_id, updated_at);

CREATE TABLE IF NOT EXISTS reviews (          -- 只增不改；FSRS 重算與個人化訓練的事實來源
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  reviewed_at INTEGER NOT NULL,
  rating INTEGER NOT NULL,                    -- 1 Again / 2 Hard / 3 Good / 4 Easy
  elapsed_days REAL, answer_text TEXT, duration_ms INTEGER,
  source TEXT NOT NULL,                       -- lesson | review | mock | placement
  UNIQUE (user_id, item_id, reviewed_at)
);
CREATE INDEX IF NOT EXISTS reviews_user_time ON reviews(user_id, reviewed_at);

CREATE TABLE IF NOT EXISTS daily_stats (      -- = app S.log 加上更多欄位
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  reviews INTEGER NOT NULL DEFAULT 0, new_items INTEGER NOT NULL DEFAULT 0,
  minutes REAL NOT NULL DEFAULT 0, streak_after INTEGER,
  PRIMARY KEY (user_id, day)
);

CREATE TABLE IF NOT EXISTS mock_results (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level TEXT NOT NULL, taken_at INTEGER NOT NULL,
  section_scores TEXT NOT NULL,               -- JSON
  total INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS league_members (
  league_id TEXT NOT NULL, week TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,          -- 本週「記住的項目數」
  PRIMARY KEY (league_id, week, user_id)
);

-- 登入（C2）：Email 魔法連結。只存 token 的 SHA-256，不存原文。
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,                -- 15 分鐘
  used_at INTEGER
);
CREATE INDEX IF NOT EXISTS login_tokens_email ON login_tokens(email, created_at);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,                -- 90 天，使用時展延
  last_seen_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
