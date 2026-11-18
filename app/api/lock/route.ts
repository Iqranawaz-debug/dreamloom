import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handle, readJson } from "@/lib/api";
import { LOCK_COOKIE, SESSION_SECONDS, createSession, readLock, removeLock, verifyPasscode, writeLock } from "@/lib/lock";

const Passcode = z.string().min(4, "Use at least 4 characters").max(64);
const Body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("unlock"), passcode: z.string().max(64) }),
  z.object({ action: z.literal("lock") }),
  z.object({ action: z.literal("set"), passcode: Passcode, current: z.string().max(64).optional() }),
  z.object({ action: z.literal("remove"), current: z.string().max(64) }),
]);

// Slows down guessing: after 5 wrong tries, wait 30s (doubling, up to 15 minutes).
const attempts = globalThis as unknown as { __dpLock?: { fails: number; until: number } };
const state = () => (attempts.__dpLock ??= { fails: 0, until: 0 });

async function checkPasscode(lock: NonNullable<ReturnType<typeof readLock>>, passcode: string) {
  const s = state();
  const wait = s.until - Date.now();
  if (wait > 0) throw new HttpError(429, `Too many tries. Please wait ${Math.ceil(wait / 1000)} seconds.`);
  if (await verifyPasscode(lock, passcode)) {
    s.fails = 0;
    s.until = 0;
    return;
  }
  s.fails += 1;
  if (s.fails >= 5) s.until = Date.now() + Math.min(30_000 * 2 ** (s.fails - 5), 900_000);
  throw new HttpError(403, "That passcode didn't match.");
}

function withSession(lock: NonNullable<ReturnType<typeof readLock>>) {
  const res = NextResponse.json({ ok: true, enabled: true });
  res.cookies.set(LOCK_COOKIE, createSession(lock), {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_SECONDS,
    secure: process.env.COOKIE_SECURE === "true",
  });
  return res;
}

export const POST = handle(async (req) => {
  const body = await readJson(req, Body);
  const lock = readLock();

  switch (body.action) {
    case "unlock":
      if (!lock) return NextResponse.json({ ok: true, enabled: false });
      await checkPasscode(lock, body.passcode);
      return withSession(lock);
    case "lock": {
      const res = NextResponse.json({ ok: true, enabled: Boolean(lock) });
      res.cookies.delete(LOCK_COOKIE);
      return res;
    }
    case "set":
      if (lock) await checkPasscode(lock, body.current ?? "");
      return withSession(await writeLock(body.passcode));
    case "remove": {
      if (lock) await checkPasscode(lock, body.current);
      removeLock();
      const res = NextResponse.json({ ok: true, enabled: false });
      res.cookies.delete(LOCK_COOKIE);
      return res;
    }
  }
});
