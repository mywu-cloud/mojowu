-- 2026-11-25 已在 D1 主控台執行（A3）。保留作紀錄，重跑無害。
CREATE TABLE IF NOT EXISTS events (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  anon  TEXT    NOT NULL,
  event TEXT    NOT NULL,
  day   TEXT    NOT NULL,
  ts    INTEGER NOT NULL,
  ver   TEXT    NOT NULL,
  n     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS events_anon_day ON events(anon, day);
CREATE INDEX IF NOT EXISTS events_day ON events(day);
