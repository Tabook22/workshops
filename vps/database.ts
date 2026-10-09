import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { authEnabled } from './auth';
export { presenterAuthenticated } from './auth';

const dbPath = resolve(process.env.WORKSHOP_DB || './data/workshops.sqlite');
mkdirSync(dirname(dbPath), { recursive: true, mode: 0o700 });
const sqlite = new DatabaseSync(dbPath);
sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
sqlite.exec('CREATE TABLE IF NOT EXISTS _workshop_migrations (tag TEXT PRIMARY KEY NOT NULL, checksum TEXT NOT NULL, applied INTEGER NOT NULL)');
const migrationDirectory = fileURLToPath(new URL('./drizzle/', import.meta.url));
const journalPath = resolve(migrationDirectory, 'meta/_journal.json');
if (!existsSync(journalPath)) throw new Error('Packaged database migrations are missing. Run build:vps.');
const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { entries: { tag: string }[] };
for (const entry of journal.entries) {
  const sql = readFileSync(resolve(migrationDirectory, entry.tag + '.sql'), 'utf8');
  const checksum = createHash('sha256').update(sql).digest('hex');
  const existing = sqlite.prepare('SELECT checksum FROM _workshop_migrations WHERE tag=?').get(entry.tag);
  if (existing) {
    if (existing.checksum !== checksum) throw new Error('An applied migration changed: ' + entry.tag);
    continue;
  }
  sqlite.exec('BEGIN IMMEDIATE');
  try {
    sqlite.exec(sql);
    sqlite.prepare('INSERT INTO _workshop_migrations(tag,checksum,applied) VALUES (?,?,?)').run(entry.tag, checksum, Date.now());
    sqlite.exec('COMMIT');
  } catch (error) { sqlite.exec('ROLLBACK'); throw error; }
}

class Statement {
  constructor(private readonly sql: string, private readonly values: SQLInputValue[] = []) {}
  bind(...values: SQLInputValue[]) { return new Statement(this.sql, values); }
  async first<T>() { return (sqlite.prepare(this.sql).get(...this.values) as T | undefined) || null; }
  async run() {
    const result = sqlite.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
  execute() {
    const statement = sqlite.prepare(this.sql);
    if (/^\s*(SELECT|WITH|PRAGMA)\b/i.test(this.sql)) {
      return { success: true, results: statement.all(...this.values), meta: { changes: 0 } };
    }
    const result = statement.run(...this.values);
    return { success: true, results: [], meta: { changes: Number(result.changes) } };
  }
}
const adapter = {
  prepare(sql: string) { return new Statement(sql); },
  async batch(statements: Statement[]) {
    sqlite.exec('BEGIN IMMEDIATE');
    try { const results = statements.map(statement => statement.execute()); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  }
};
export function database(): D1Database { return adapter as unknown as D1Database; }
export async function hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
export function cookie(req: Request, name: string) {
  if(authEnabled && name.startsWith('admin_')) return '';
  const value = req.headers.get('cookie')?.split(';').map(item => item.trim()).find(item => item.startsWith(name + '='));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : '';
}
export function setCookie(req: Request, name: string, value: string) {
  const base = process.env.BASE_PATH || '/workshops';
  return `${name}=${encodeURIComponent(value)}; Path=${base}; HttpOnly; SameSite=Lax; Max-Age=604800${new URL(req.url).protocol === 'https:' ? '; Secure' : ''}`;
}
export function closeDatabase() { sqlite.close(); }
