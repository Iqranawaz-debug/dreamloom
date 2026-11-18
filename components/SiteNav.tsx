"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./ui/Icon";

const LINKS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Capture", icon: "moon" },
  { href: "/diary", label: "Diary", icon: "book" },
  { href: "/insights", label: "Insights", icon: "constellation" },
  { href: "/year", label: "Year", icon: "sparkle" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function SiteNav() {
  return <SiteNavView pathname={usePathname()} />;
}

/** Rendered with an empty pathname as the Suspense fallback, then hydrated with the real one. */
export function SiteNavView({ pathname }: { pathname: string }) {
  if (pathname === "/lock") return null;
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/50 bg-night-1/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 rounded-full pr-2" aria-label="Dream Painter home">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-lavender/80 to-violet/60 text-night-1">
              <Icon name="moon" className="h-4 w-4" />
            </span>
            <span className="font-display text-xl">Dream Painter</span>
          </Link>
          <nav aria-label="Main" className="hidden sm:block">
            <ul className="flex items-center gap-1">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={isActive(pathname, l.href) ? "page" : undefined}
                    className="btn btn-ghost btn-sm aria-[current=page]:bg-lavender/10 aria-[current=page]:text-ink"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Mobile bottom bar: thumb reach */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-night-1/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      >
        <ul className="grid grid-cols-5">
          {LINKS.map((l) => {
            const active = isActive(pathname, l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 text-[0.7rem] transition-colors ${
                    active ? "text-lavender" : "text-ink-faint hover:text-ink"
                  }`}
                >
                  <Icon name={l.icon} className="h-5 w-5" />
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
