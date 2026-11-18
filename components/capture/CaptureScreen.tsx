"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MAX_DREAM_CHARS, MOODS, type Mood } from "@/lib/constants";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Icon } from "@/components/ui/Icon";
import { DreamOrb } from "@/components/dream/DreamOrb";
import { Overlay } from "@/components/ui/Overlay";

const DRAFT_KEY = "dp:draft";
type Mode = "voice" | "write";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function readDraft(): { text: string; mood: Mood | null } {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "") as { text: string; mood: Mood | null };
  } catch {
    return { text: "", mood: null };
  }
}

export function CaptureScreen() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [mood, setMood] = useState<Mood | null>(null);
  const [mode, setMode] = useState<Mode>("voice");
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const submittedRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ids = { text: useId(), count: useId(), mood: useId(), status: useId() };

  const appendFinal = useCallback((phrase: string) => {
    if (!phrase) return;
    setText((t) => {
      const next = t ? `${t.replace(/\s+$/, "")} ${phrase}` : phrase.charAt(0).toUpperCase() + phrase.slice(1);
      return next.slice(0, MAX_DREAM_CHARS);
    });
  }, []);
  const speech = useSpeechRecognition(appendFinal);

  // Restore an unsent draft (device-only convenience).
  useEffect(() => {
    const d = readDraft();
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage after mount */
    if (d.text) setText(d.text);
    if (d.mood) setMood(d.mood);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    try {
      if (text || mood) localStorage.setItem(DRAFT_KEY, JSON.stringify({ text, mood }));
      else localStorage.removeItem(DRAFT_KEY);
    } catch {}
  }, [text, mood]);

  // Default to writing when voice is unsupported.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- depends on client-only feature detection
    if (speech.supported === false) setMode("write");
  }, [speech.supported]);

  // Recording timer.
  useEffect(() => {
    if (!speech.listening) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset when a new recording starts
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [speech.listening]);

  const switchMode = (m: Mode) => {
    if (m === "write" && speech.listening) speech.stop();
    setMode(m);
    if (m === "write") requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const trimmed = text.trim();
  const canSubmit = trimmed.length >= 3 && !submitting;

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit || submittedRef.current) return; // no duplicate submissions
    submittedRef.current = true;
    speech.stop();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/dreams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: trimmed, mood }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: number; error?: string };
      if (!res.ok || !data.id) throw new Error(data.error ?? "Couldn't save your dream.");
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setLeaving(true);
      setTimeout(() => router.push(`/dream/${data.id}`), 700);
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Couldn't save your dream.");
    }
  }

  return (
    <>
      <form onSubmit={submit} className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 pt-6 sm:px-6 sm:pt-12" aria-describedby={ids.status}>
        {/* Hero */}
        <div className="text-center">
          <p className="eyebrow animate-fade-in">A quiet place for the night&apos;s stories</p>
          <h1 className="font-display mt-4 text-[2.6rem] text-ink sm:text-6xl">
            Where dreams <em className="font-normal italic text-lavender">become art.</em>
          </h1>
          <p className="mx-auto mt-4 max-w-sm text-base leading-7 text-ink-muted">Some dreams deserve to be remembered.</p>
        </div>

        {/* Mode switch */}
        <div role="group" aria-label="How do you want to tell it?" className="glass mt-8 inline-flex rounded-full p-1">
          {(["voice", "write"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              disabled={m === "voice" && speech.supported === false}
              onClick={() => switchMode(m)}
              className="btn btn-sm min-w-28 rounded-full text-ink-muted aria-pressed:bg-lavender/15 aria-pressed:text-ink disabled:opacity-40"
            >
              <Icon name={m === "voice" ? "mic" : "pen"} className="h-4 w-4" />
              {m === "voice" ? "Speak" : "Write"}
            </button>
          ))}
        </div>
        {speech.supported === false && (
          <p className="mt-3 text-center text-sm text-ink-faint">Voice isn&apos;t supported in this browser, so writing is ready for you.</p>
        )}

        {/* Voice */}
        {mode === "voice" && speech.supported !== false && (
          <section aria-label="Voice capture" className="mt-10 flex w-full flex-col items-center">
            <button
              type="button"
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              aria-pressed={speech.listening}
              aria-label={speech.listening ? "Stop recording" : "Start recording your dream"}
              disabled={speech.supported === null || submitting}
              className="group relative grid h-44 w-44 place-items-center rounded-full sm:h-52 sm:w-52"
            >
              {speech.listening &&
                [0, 1, 2].map((i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute inset-0 rounded-full border border-lavender/40"
                    style={{ animation: `ring 2.4s var(--ease-soft) ${i * 0.8}s infinite` }}
                  />
                ))}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, #efe9ff 0%, #b7a6f7 32%, #6b5bd2 62%, #2a2366 100%)",
                  boxShadow: speech.listening
                    ? "0 0 70px 6px rgb(155 135 245 / 0.45), inset 0 -12px 30px rgb(20 10 60 / 0.5)"
                    : "0 0 50px 0 rgb(155 135 245 / 0.28), inset 0 -12px 30px rgb(20 10 60 / 0.5)",
                  animation: speech.listening ? "orb-pulse 3s var(--ease-breathe) infinite" : "breathe 6s var(--ease-breathe) infinite",
                  transition: "box-shadow 600ms var(--ease-soft)",
                }}
              />
              <span className="relative text-night-1 transition-transform duration-300 group-hover:scale-110">
                <Icon name={speech.listening ? "stop" : "mic"} className="h-10 w-10" />
              </span>
            </button>

            <div className="mt-6 h-6 text-sm text-ink-muted" aria-live="polite">
              {speech.listening ? (
                <span className="inline-flex items-center gap-2 font-mono tabular-nums">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-rose" aria-hidden />
                  Listening · {fmt(seconds)}
                </span>
              ) : speech.supported ? (
                text ? "Tap to keep telling it" : "Tap the moon and tell it as it comes"
              ) : null}
            </div>
            {speech.error && (
              <p role="alert" className="mt-2 max-w-sm text-center text-sm text-danger">
                {speech.error}
              </p>
            )}

            {(text || speech.interim) && (
              <div className="glass mt-6 w-full p-5 text-left" aria-live="polite" aria-label="Live transcript">
                <p className="font-display text-xl leading-relaxed text-ink">
                  {text}
                  {speech.interim && <span className="text-ink-faint"> {speech.interim}</span>}
                </p>
                <button type="button" onClick={() => switchMode("write")} className="btn btn-ghost btn-sm mt-3 -ml-3">
                  <Icon name="pen" className="h-4 w-4" /> Edit the words
                </button>
              </div>
            )}
          </section>
        )}

        {/* Write */}
        {mode === "write" && (
          <section aria-label="Write your dream" className="mt-10 w-full">
            <label htmlFor={ids.text} className="sr-only">
              Your dream
            </label>
            <div className="glass writing-surface relative overflow-hidden p-1">
              <textarea
                ref={textareaRef}
                id={ids.text}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_DREAM_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
                placeholder="I dreamed of something last night..."
                aria-describedby={ids.count}
                rows={7}
                className="block min-h-56 w-full resize-none bg-transparent px-5 py-5 font-display text-xl leading-relaxed text-ink outline-none placeholder:text-ink-faint/80 focus-visible:shadow-none sm:text-2xl [field-sizing:content]"
              />
              <div className="flex items-center justify-between px-5 pb-3 text-xs text-ink-faint">
                <span>Fragments are fine. Write it as it comes.</span>
                <span id={ids.count} className="tabular-nums">
                  {text.length} / {MAX_DREAM_CHARS}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Mood */}
        <fieldset className="mt-10 w-full">
          <legend className="eyebrow mx-auto mb-4 block text-center">How did it feel?</legend>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {MOODS.map((m) => {
              const selected = mood === m.id;
              return (
                <label
                  key={m.id}
                  className="group relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-night-2/40 text-sm text-ink-muted transition-all duration-300 hover:border-line-strong hover:text-ink has-[:checked]:text-ink has-[:focus-visible]:shadow-[var(--focus-ring)]"
                  style={
                    selected
                      ? { borderColor: `${m.color}99`, background: `radial-gradient(circle at 50% 30%, ${m.color}2e, transparent 75%)` }
                      : undefined
                  }
                >
                  <input
                    type="radio"
                    name="mood"
                    value={m.id}
                    checked={selected}
                    onChange={() => setMood(m.id)}
                    onClick={() => selected && setMood(null)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className="text-3xl transition-transform duration-500 ease-[var(--ease-soft)] group-hover:-translate-y-0.5"
                    style={{ transform: selected ? "scale(1.18) translateY(-2px)" : undefined }}
                  >
                    {m.emoji}
                  </span>
                  {m.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* CTA */}
        <div className="mt-10 flex w-full flex-col items-center gap-3">
          <button type="submit" disabled={!canSubmit} data-loading={submitting && !leaving} className="btn btn-primary group h-14 w-full max-w-sm text-base sm:w-auto sm:px-10">
            <Icon name="brush" className="h-5 w-5" />
            Paint my dream
            {[
              ["-18px", "-22px", "10%", "0s"],
              ["16px", "-26px", "45%", ".15s"],
              ["22px", "-14px", "85%", ".3s"],
              ["-10px", "18px", "25%", ".45s"],
              ["14px", "20px", "70%", ".2s"],
            ].map(([sx, sy, left, delay], i) => (
              <span
                key={i}
                aria-hidden
                className="pointer-events-none absolute top-1/2 h-1.5 w-1.5 rounded-full bg-white opacity-0 group-hover:[animation:sparkle_1.2s_ease-out_infinite] group-disabled:hidden"
                style={{ left, animationDelay: delay, "--sx": sx, "--sy": sy } as React.CSSProperties}
              />
            ))}
          </button>
          <p id={ids.status} className="min-h-5 text-center text-sm" role={error ? "alert" : undefined}>
            {error ? (
              <span className="text-danger">{error}</span>
            ) : trimmed.length > 0 && trimmed.length < 3 ? (
              <span className="text-ink-faint">A few more words, whenever you&apos;re ready.</span>
            ) : (
              <span className="text-ink-faint">Your dream stays on this device.</span>
            )}
          </p>
        </div>
      </form>

      {/* Transition: capture fades into deep midnight */}
      {leaving && (
        <Overlay role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-8 px-6 text-center">
            <DreamOrb />
            <p className="font-display text-3xl text-ink">Your dream is taking shape...</p>
            <p className="text-ink-muted">Listening to your dream...</p>
          </div>
        </Overlay>
      )}
    </>
  );
}
