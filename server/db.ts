import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = process.env.DEV_LOGS_DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'devlogs.db');
const db = new Database(DB_FILE);

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    status TEXT,
    priority TEXT,
    category TEXT,
    created_at TEXT,
    updated_at TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS changelog (
    id TEXT PRIMARY KEY,
    request_id TEXT,
    timestamp TEXT,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS whiteboards (
    id TEXT PRIMARY KEY,
    name TEXT,
    data TEXT,
    created_at TEXT,
    updated_at TEXT
  );
`);

// ---------------------------------------------------------------------------
// Migration from requests.json
// ---------------------------------------------------------------------------
const REQUESTS_FILE = path.join(DATA_DIR, 'requests.json');
const CHANGELOG_FILE = path.join(DATA_DIR, 'changelog.json');

if (fs.existsSync(REQUESTS_FILE)) {
  try {
    const raw = fs.readFileSync(REQUESTS_FILE, 'utf-8');
    const requests = JSON.parse(raw);
    
    // Check if we already migrated
    const count = db.prepare('SELECT count(*) as count FROM requests').get() as { count: number };
    if (count.count === 0 && requests.length > 0) {
      console.log('[dev-logs] Migrating requests.json to SQLite...');
      const insert = db.prepare('INSERT INTO requests (id, status, priority, category, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?, ?)');
      const insertMany = db.transaction((reqs: any[]) => {
        for (const req of reqs) {
          insert.run(req.id, req.status, req.priority, req.category, req.created_at, req.updated_at, JSON.stringify(req));
        }
      });
      insertMany(requests);
      
      // Rename old file
      fs.renameSync(REQUESTS_FILE, REQUESTS_FILE + '.backup');
    }
  } catch (err) {
    console.error('[dev-logs] Migration failed for requests.json:', err);
  }
}

if (fs.existsSync(CHANGELOG_FILE)) {
  try {
    const raw = fs.readFileSync(CHANGELOG_FILE, 'utf-8');
    const logs = JSON.parse(raw);
    
    const count = db.prepare('SELECT count(*) as count FROM changelog').get() as { count: number };
    if (count.count === 0 && logs.length > 0) {
      console.log('[dev-logs] Migrating changelog.json to SQLite...');
      const insert = db.prepare('INSERT INTO changelog (id, request_id, timestamp, data) VALUES (?, ?, ?, ?)');
      const insertMany = db.transaction((entries: any[]) => {
        for (const entry of entries) {
          insert.run(entry.id, entry.request_id, entry.timestamp, JSON.stringify(entry));
        }
      });
      insertMany(logs);
      
      fs.renameSync(CHANGELOG_FILE, CHANGELOG_FILE + '.backup');
    }
  } catch (err) {
    console.error('[dev-logs] Migration failed for changelog.json:', err);
  }
}

export { db };
