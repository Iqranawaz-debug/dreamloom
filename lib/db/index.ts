import "server-only";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const path = process.env.DATABASE_PATH ?? "./data/dream-painter.db";

let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;

/** Lazily opened local SQLite connection. Server-only: dream data never leaves this machine. */
export function getDb() {
  instance ??= drizzle(new Database(path), { schema });
  return instance;
}
