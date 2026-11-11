import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb } from './connection.js';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function runMigrations(reset = false): void {
  if (reset) {
    closeDb();
    for (const suffix of ['', '-wal', '-shm']) {
      const target = config.databasePath + suffix;
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    }
  }

  const db = getDb();
  const localMigrations = path.join(__dirname, 'migrations');
  const rootMigrations = path.resolve(process.cwd(), 'server', 'db', 'migrations');
  const migrationsDir = fs.existsSync(localMigrations) ? localMigrations : rootMigrations;
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Ensure schema_migrations exists before querying
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const appliedStmt = db.prepare('SELECT filename FROM schema_migrations');
  const appliedRows = appliedStmt.all() as Array<{ filename: string }>;
  const appliedSet = new Set(appliedRows.map((r) => r.filename));

  for (const file of files) {
    if (appliedSet.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.prepare('INSERT INTO schema_migrations (filename) VALUES (?)').run(file);
      db.exec('COMMIT');
      console.log(`[migrate] Applied ${file}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

const isDirectRun =
  process.argv[1] &&
  path.resolve(process.argv[1]).toLowerCase() === path.resolve(__filename).toLowerCase();

if (isDirectRun) {
  const reset = process.argv.includes('--reset');
  runMigrations(reset);
  console.log('[migrate] Database migrations complete.');
  closeDb();
}
