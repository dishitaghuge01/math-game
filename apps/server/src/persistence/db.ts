import Database from 'better-sqlite3';
import path from 'node:path';
import { mkdirSync } from 'node:fs';

const dataDir = path.resolve(process.cwd(), 'data');
mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'game.sqlite');

// For local dev this is file-based SQLite. If the service later moves to Postgres,
// the schema can remain broadly the same while only the connection string changes.
const db = new Database(dbPath) as Database.Database;

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vector_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    node_index INTEGER NOT NULL,
    vector_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS narration_history (
    session_id TEXT NOT NULL,
    node_index INTEGER NOT NULL,
    narrative TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (session_id, node_index)
  );

  CREATE TABLE IF NOT EXISTS unlock_flags (
    session_id TEXT NOT NULL,
    flag TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (session_id, flag)
  );

  CREATE TABLE IF NOT EXISTS expeditions (
    expedition_id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

export default db;
