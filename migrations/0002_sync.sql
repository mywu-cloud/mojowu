-- C3：雲端同步。在 D1 主控台執行一次（ALTER TABLE 不能重跑；重跑會出現 duplicate column 錯誤，可忽略）。
-- target_at：目標記憶率最後修改時間（用戶端時間，毫秒），兩台裝置都改過時取較新者。
ALTER TABLE users ADD COLUMN target_at INTEGER NOT NULL DEFAULT 0;
