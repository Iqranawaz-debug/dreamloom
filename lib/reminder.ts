// Device-only reminder preferences. Without a push server (which would add a third party),
// the browser can only notify while the app is open, so a calendar file covers the rest.

export type Reminder = { enabled: boolean; time: string };
export const REMINDER_EVENT = "dp:reminder-changed";
export const REMINDER_TEXT = "Did you dream last night?";

const KEY = "dp:reminder";
const DISMISS_KEY = "dp:reminder-dismissed";

export function readReminder(): Reminder {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null") as Reminder | null;
    if (r && typeof r.enabled === "boolean" && /^\d{2}:\d{2}$/.test(r.time)) return r;
  } catch {}
  return { enabled: false, time: "07:30" };
}

export function saveReminder(r: Reminder) {
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {}
  window.dispatchEvent(new Event(REMINDER_EVENT));
}

const today = () => new Date().toDateString();

export function dismissedToday() {
  try {
    return localStorage.getItem(DISMISS_KEY) === today();
  } catch {
    return false;
  }
}

export function dismissToday() {
  try {
    localStorage.setItem(DISMISS_KEY, today());
  } catch {}
}

/** Milliseconds from now until the next occurrence of HH:MM. */
export function msUntil(time: string, now = new Date()) {
  const [h, m] = time.split(":").map(Number);
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

/** Today's reminder has passed within the last 6 hours: a good moment for a gentle in-app nudge. */
export function inNudgeWindow(time: string, now = new Date()) {
  const [h, m] = time.split(":").map(Number);
  const at = new Date(now);
  at.setHours(h, m, 0, 0);
  const since = now.getTime() - at.getTime();
  return since >= 0 && since < 6 * 3_600_000;
}

/** A daily repeating calendar event with an alert: works even when the app is closed. */
export function reminderIcs(time: string) {
  const [h, m] = time.split(":");
  const d = new Date();
  const day = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dream Painter//Reminder//EN",
    "BEGIN:VEVENT",
    `UID:dream-painter-reminder-${day}@local`,
    `DTSTAMP:${day}T000000Z`,
    `DTSTART:${day}T${h}${m}00`,
    "DURATION:PT5M",
    "RRULE:FREQ=DAILY",
    `SUMMARY:${REMINDER_TEXT}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${REMINDER_TEXT}`,
    "TRIGGER:PT0M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
