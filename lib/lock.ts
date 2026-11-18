// Passcode lock. Used by proxy.ts as well as route handlers, so it must stay free of "server-only"
// and of the database: the lock state is one small file next to the database.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export const LOCK_COOKIE = "dp_unlock";
export const SESSION_SECONDS = 12 * 60 * 60;

type LockFile = { salt: string; hash: string; secret: string };

const lockPath = () => path.join(path.dirname(path.resolve(process.env.DATABASE_PATH ?? "./data/dream-painter.db")), "lock.json");

export function readLock(): LockFile | null {
  try {
    const data = JSON.parse(fs.readFileSync(lockPath(), "utf8")) as Partial<LockFile>;
    return data.salt && data.hash && data.secret ? (data as LockFile) : null;
  } catch {
    return null;
  }
}

/** Sets or replaces the passcode. A new secret signs out every existing session. */
export async function writeLock(passcode: string): Promise<LockFile> {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(passcode, salt, 32);
  const lock = { salt: salt.toString("hex"), hash: hash.toString("hex"), secret: crypto.randomBytes(32).toString("hex") };
  fs.mkdirSync(path.dirname(lockPath()), { recursive: true });
  fs.writeFileSync(lockPath(), JSON.stringify(lock), { mode: 0o600 });
  return lock;
}

export function removeLock() {
  fs.rmSync(lockPath(), { force: true });
}

export async function verifyPasscode(lock: LockFile, passcode: string): Promise<boolean> {
  const actual = await scrypt(passcode, Buffer.from(lock.salt, "hex"), 32);
  return crypto.timingSafeEqual(actual, Buffer.from(lock.hash, "hex"));
}

const sign = (secret: string, exp: string) => crypto.createHmac("sha256", secret).update(exp).digest("hex");

export function createSession(lock: LockFile): string {
  const exp = String(Date.now() + SESSION_SECONDS * 1000);
  return `${exp}.${sign(lock.secret, exp)}`;
}

export function isValidSession(lock: LockFile, token: string | undefined): boolean {
  if (!token) return false;
  const [exp, mac] = token.split(".");
  if (!exp || !mac || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expected = Buffer.from(sign(lock.secret, exp));
  const given = Buffer.from(mac);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

/** Only same-site paths may be used as a post-unlock destination (no open redirects). */
export function safeNext(next: string | null | undefined): string {
  return next && /^\/(?![/\\])/.test(next) && !next.startsWith("/lock") ? next : "/";
}
