"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";
import { readReminder, reminderIcs, saveReminder, type Reminder } from "@/lib/reminder";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function Passcode({ initial }: { initial: boolean }) {
  const [enabled, setEnabled] = useState(initial);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const reset = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
  };

  async function send(body: object, done: string, after: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      await api("/api/lock", { body });
      setEnabled(after);
      reset();
      setMessage({ ok: true, text: done });
    } catch (e) {
      setMessage({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 4) return setMessage({ ok: false, text: "Use at least 4 characters." });
    if (next !== confirm) return setMessage({ ok: false, text: "The two passcodes don't match." });
    send({ action: "set", passcode: next, current: enabled ? current : undefined }, enabled ? "Passcode changed." : "Passcode lock is on.", true);
  }

  return (
    <section className="glass p-6" aria-labelledby="lock-title">
      <h2 id="lock-title" className="font-display flex items-center gap-2 text-3xl">
        <Icon name="lock" className="h-5 w-5 text-lavender" /> Passcode lock
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">
        {enabled ? "On. Dreams stay closed until the passcode is entered." : "Off. Add a passcode to keep your diary private on shared devices."}
      </p>
      <p className="mt-1 text-sm leading-6 text-ink-faint">There&apos;s no way to recover a forgotten passcode from inside the app.</p>
      <form onSubmit={save} className="mt-5 grid gap-3">
        {enabled && (
          <div>
            <label className="label" htmlFor="pc-current">
              Current passcode
            </label>
            <input id="pc-current" className="field" type="password" autoComplete="current-password" maxLength={64} value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="pc-new">
              {enabled ? "New passcode" : "Passcode"}
            </label>
            <input id="pc-new" className="field" type="password" autoComplete="new-password" minLength={4} maxLength={64} value={next} onChange={(e) => setNext(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="pc-confirm">
              Repeat it
            </label>
            <input id="pc-confirm" className="field" type="password" autoComplete="new-password" maxLength={64} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn btn-primary btn-sm" data-loading={busy} disabled={busy || !next}>
            {enabled ? "Change passcode" : "Turn on"}
          </button>
          {enabled && (
            <>
              <button type="button" className="btn btn-secondary btn-sm" disabled={busy || !current} onClick={() => send({ action: "remove", current }, "Passcode lock is off.", false)}>
                Turn off
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={busy}
                onClick={async () => {
                  await api("/api/lock", { body: { action: "lock" } }).catch(() => {});
                  // Full reload on purpose: clears everything held in memory.
                  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                  window.location.assign("/lock");
                }}
              >
                Lock now
              </button>
            </>
          )}
        </div>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-cyan" : "text-danger"}`}>
            {message.text}
          </p>
        )}
      </form>
    </section>
  );
}

function ReminderSettings() {
  const [reminder, setReminder] = useState<Reminder>({ enabled: false, time: "07:30" });
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stored on this device, read after mount
    setReminder(readReminder());
  }, []);

  const update = (r: Reminder) => {
    setReminder(r);
    saveReminder(r);
  };

  async function toggle(enabled: boolean) {
    setNote(null);
    if (enabled && typeof Notification !== "undefined" && Notification.permission === "default") await Notification.requestPermission();
    if (enabled && (typeof Notification === "undefined" || Notification.permission !== "granted"))
      setNote("Notifications are off for this browser, so you'll see a gentle note inside the app instead.");
    update({ ...reminder, enabled });
  }

  function downloadCalendar() {
    const url = URL.createObjectURL(new Blob([reminderIcs(reminder.time)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "dream-painter-reminder.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  return (
    <section className="glass p-6" aria-labelledby="reminder-title">
      <h2 id="reminder-title" className="font-display flex items-center gap-2 text-3xl">
        <Icon name="bell" className="h-5 w-5 text-lavender" /> Daily reminder
      </h2>
      <p className="mt-2 text-sm leading-6 text-ink-muted">A soft “Did you dream last night?” at the time you choose.</p>
      <div className="mt-5 flex flex-wrap items-end gap-4">
        <label className="flex min-h-12 cursor-pointer items-center gap-3">
          <input type="checkbox" className="h-5 w-5 accent-[var(--lavender)]" checked={reminder.enabled} onChange={(e) => toggle(e.target.checked)} />
          Remind me
        </label>
        <div>
          <label className="label" htmlFor="reminder-time">
            Time
          </label>
          <input id="reminder-time" type="time" className="field w-36" value={reminder.time} onChange={(e) => e.target.value && update({ ...reminder, time: e.target.value })} />
        </div>
        <button type="button" className="btn btn-secondary btn-sm" onClick={downloadCalendar}>
          <Icon name="download" className="h-4 w-4" /> Add to calendar
        </button>
      </div>
      <p className="mt-4 text-sm leading-6 text-ink-faint">
        Browser notifications only arrive while Dream Painter is open. To be reminded when it&apos;s closed, add the daily event to your calendar. Nothing is sent to a server.
      </p>
      {note && (
        <p role="status" className="mt-2 text-sm text-ink-muted">
          {note}
        </p>
      )}
    </section>
  );
}

function Install() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- display mode is client-only
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  return (
    <section className="glass p-6" aria-labelledby="install-title">
      <h2 id="install-title" className="font-display text-3xl">
        Install the app
      </h2>
      {installed ? (
        <p className="mt-2 text-sm leading-6 text-ink-muted">Dream Painter is installed on this device.</p>
      ) : prompt ? (
        <button
          type="button"
          className="btn btn-primary btn-sm mt-4"
          onClick={async () => {
            await prompt.prompt();
            setPrompt(null);
          }}
        >
          Install Dream Painter
        </button>
      ) : (
        <p className="mt-2 text-sm leading-6 text-ink-muted">Use your browser&apos;s menu and choose “Install app” or “Add to Home Screen”.</p>
      )}
    </section>
  );
}

export function SettingsPanel({ lockEnabled }: { lockEnabled: boolean }) {
  return (
    <div className="mt-8 grid gap-6">
      <Passcode initial={lockEnabled} />
      <ReminderSettings />
      <Install />
      <section className="glass p-6" aria-labelledby="data-title">
        <h2 id="data-title" className="font-display text-3xl">
          Your data
        </h2>
        <p className="mt-2 text-sm leading-6 text-ink-muted">Dreams and paintings are stored only on this device. Download a full copy at any time.</p>
        <a href="/api/export" download className="btn btn-secondary btn-sm mt-4">
          <Icon name="download" className="h-4 w-4" /> Export all my dreams
        </a>
      </section>
    </div>
  );
}
