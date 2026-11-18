"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { REMINDER_EVENT, REMINDER_TEXT, dismissToday, dismissedToday, inNudgeWindow, msUntil, readReminder } from "@/lib/reminder";

/** Registers the service worker and runs the optional reminder while the app is open. */
export function PwaAgent() {
  const [nudge, setNudge] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const notify = async () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const reg = await navigator.serviceWorker?.ready;
      await reg?.showNotification("Dream Painter", { body: REMINDER_TEXT, icon: "/icons/icon-192.png", tag: "dream-reminder" });
    };

    const schedule = () => {
      clearTimeout(timer);
      const r = readReminder();
      const onLock = location.pathname === "/lock";
      setNudge(r.enabled && !onLock && location.pathname !== "/" && inNudgeWindow(r.time) && !dismissedToday());
      if (!r.enabled) return;
      timer = setTimeout(() => {
        notify().catch(() => {});
        schedule();
      }, msUntil(r.time));
    };

    schedule();
    window.addEventListener(REMINDER_EVENT, schedule);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(REMINDER_EVENT, schedule);
    };
  }, []);

  if (!nudge) return null;
  const close = () => {
    dismissToday();
    setNudge(false);
  };
  return (
    <aside aria-label="Reminder" className="glass glass-strong fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-md items-center gap-2 p-3 animate-rise-in sm:bottom-6">
      <p className="font-display flex-1 pl-2 text-xl">{REMINDER_TEXT}</p>
      <Link href="/" onClick={close} className="btn btn-primary btn-sm">
        Capture
      </Link>
      <button type="button" onClick={close} className="btn btn-ghost btn-icon btn-sm" aria-label="Dismiss reminder">
        <Icon name="close" className="h-4 w-4" />
      </button>
    </aside>
  );
}
