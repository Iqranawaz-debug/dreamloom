import "server-only";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "./schema";

export type Db = BetterSQLite3Database<typeof schema>;

const globalForDb = globalThis as unknown as { __dreamDb?: Db };

/**
 * Lazily opened local SQLite connection, migrated on first use.
 * Cached on globalThis so dev hot-reloads don't open a new handle each time.
 */
export function getDb(): Db {
  if (globalForDb.__dreamDb) return globalForDb.__dreamDb;
  const file = path.resolve(process.env.DATABASE_PATH ?? "./data/dream-painter.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const sqlite = new Database(file);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve("lib/db/migrations") });
  globalForDb.__dreamDb = db;
  return db;
}
