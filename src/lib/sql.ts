import initSqlJs, { Database } from 'sql.js';
import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '..', 'data', 'crm-intel.db');

let sqlPromise: Promise<Awaited<ReturnType<typeof initSqlJs>>> | null = null;

function getSQL() {
  if (!sqlPromise) {
    const wasmPath = path.join(
      process.cwd(),
      'node_modules',
      'sql.js',
      'dist',
      'sql-wasm.wasm'
    );
    sqlPromise = initSqlJs({
      locateFile: () => wasmPath,
    });
  }
  return sqlPromise;
}

export async function openDB(): Promise<Database> {
  const SQL = await getSQL();
  const buffer = await fs.readFile(DB_PATH);
  return new SQL.Database(buffer);
}

export async function dbExists(): Promise<boolean> {
  try {
    await fs.access(DB_PATH);
    return true;
  } catch {
    return false;
  }
}

export async function saveDB(db: Database): Promise<void> {
  const data = db.export();
  await fs.writeFile(DB_PATH, Buffer.from(data));
}

export { DB_PATH };
