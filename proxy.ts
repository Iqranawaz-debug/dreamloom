import { NextResponse, type NextRequest } from "next/server";
import { LOCK_COOKIE, isValidSession, readLock, safeNext } from "@/lib/lock";

/** Loopback and private-network names only, which blocks DNS-rebinding attacks from websites. */
function isAllowedHost(hostHeader: string | null) {
  if (!hostHeader) return false;
  const host = hostHeader.replace(/:\d+$/, "").toLowerCase();
  const extra = (process.env.ALLOWED_HOSTS ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
  return (
    extra.includes(host) ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "[::1]" ||
    /^127\.\d+\.\d+\.\d+$/.test(host) ||
    /^10\.\d+\.\d+\.\d+$/.test(host) ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host) ||
    /^169\.254\.\d+\.\d+$/.test(host)
  );
}

export function proxy(req: NextRequest) {
  if (!isAllowedHost(req.headers.get("host"))) return new NextResponse("Forbidden host", { status: 403 });

  const { pathname, search } = req.nextUrl;
  if (pathname === "/lock" || pathname === "/api/lock") return NextResponse.next();

  const lock = readLock();
  if (!lock || isValidSession(lock, req.cookies.get(LOCK_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Locked" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/lock";
  url.search = `?next=${encodeURIComponent(safeNext(pathname + search))}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Static assets the lock screen and installed app need before unlocking.
  matcher: ["/((?!_next/static|_next/image|icons/|icon.svg|manifest.webmanifest|sw.js|offline.html).*)"],
};
