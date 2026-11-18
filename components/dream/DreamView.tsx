"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DreamDetail } from "@/lib/db/queries";
import { PAINT_STYLES, POEM_STYLES, moodInfo, type PaintStyle, type PoemStyle } from "@/lib/constants";
import { api, formatDate } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PaintingFrame } from "./PaintingFrame";
import { ReadAloud } from "./ReadAloud";
import { ShareCard } from "./ShareCard";

export function DreamView({ dream, onChange, reveal = false }: { dream: DreamDetail; onChange: (d: DreamDetail) => void; reveal?: boolean }) {
  const router = useRouter();
  const mood = moodInfo(dream.mood);
  const [paintStyle, setPaintStyle] = useState<PaintStyle>(
    (PAINT_STYLES.find((s) => s.id !== dream.style)?.id ?? "watercolor") as PaintStyle,
  );
  const [poemStyle, setPoemStyle] = useState<PoemStyle>((dream.poemStyle as PoemStyle) ?? "free-verse");
  const [busy, setBusy] = useState<"paint" | "poem" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  async function repaint() {
    if (busy) return;
    setBusy("paint");
    setError(null);
    try {
      const { imageUrl } = await api<{ imageUrl: string }>("/api/paint", { body: { dreamId: dream.id, style: paintStyle } });
      onChange({ ...dream, imageUrl, style: paintStyle });
      setPaintStyle((PAINT_STYLES.find((s) => s.id !== paintStyle)?.id ?? "watercolor") as PaintStyle);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function rewrite() {
    if (busy) return;
    setBusy("poem");
    setError(null);
    try {
      const { poem } = await api<{ poem: string }>("/api/poem", { body: { dreamId: dream.id, style: poemStyle } });
      onChange({ ...dream, poem, poemStyle });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError(null);
    try {
      await api(`/api/dreams/${dream.id}`, { method: "DELETE" });
      router.push("/diary");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  const styleLabel = PAINT_STYLES.find((s) => s.id === dream.style)?.label;

  return (
    <article className="mx-auto w-full max-w-3xl px-4 pt-6 sm:px-6 sm:pt-10" aria-labelledby="dream-title">
      <header className={reveal ? "animate-rise-in" : undefined}>
        <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
          <time suppressHydrationWarning dateTime={new Date(dream.createdAt).toISOString()}>{formatDate(dream.createdAt)}</time>
          {mood && (
            <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
              <span className="mood-dot" style={{ background: mood.color }} aria-hidden />
              {mood.label}
            </span>
          )}
        </p>
        <h1 id="dream-title" className="font-display mt-3 text-4xl sm:text-6xl">
          {dream.title ?? "Untitled dream"}
        </h1>
      </header>

      <div className={`relative mt-8 ${reveal ? "animate-reveal" : ""}`}>
        {dream.imageUrl ? (
          <PaintingFrame src={dream.imageUrl} alt={`Painting of the dream${dream.title ? ` “${dream.title}”` : ""}${styleLabel ? `, ${styleLabel.toLowerCase()}` : ""}`} />
        ) : (
          <div className="glass grid aspect-[4/5] place-items-center text-ink-faint">No painting yet</div>
        )}
        {busy === "paint" && (
          <div className="absolute inset-0 grid place-items-center rounded-[var(--radius-xl)] bg-night-0/60 backdrop-blur-sm animate-fade-in" role="status">
            <p className="font-display text-2xl">Repainting in {PAINT_STYLES.find((s) => s.id === paintStyle)?.label.toLowerCase()}...</p>
          </div>
        )}
      </div>

      {dream.poem && (
        <section aria-label="Poem" className={`relative mx-auto mt-12 max-w-xl text-center ${reveal ? "animate-rise-in [animation-delay:600ms]" : ""}`}>
          <p key={dream.poem} className={`poem animate-fade-in ${busy === "poem" ? "opacity-40" : ""}`}>
            {dream.poem}
          </p>
          {busy === "poem" && (
            <p className="mt-3 text-sm text-ink-muted" role="status">
              Rewriting...
            </p>
          )}
        </section>
      )}

      {dream.symbols.length > 0 && (
        <ul className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Symbols">
          {dream.symbols.map((s) => (
            <li key={s}>
              <Link href={`/diary?symbol=${encodeURIComponent(s)}`} className="badge hover:border-line-strong hover:text-ink">
                {s}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <hr className="divider my-10" />

      {/* Actions */}
      <section aria-label="Change this dream" className="grid gap-4 sm:grid-cols-2">
        <div className="glass p-4">
          <label htmlFor="repaint-style" className="label">
            Repaint in a different style
          </label>
          <div className="flex gap-2">
            <select id="repaint-style" className="field" value={paintStyle} onChange={(e) => setPaintStyle(e.target.value as PaintStyle)}>
              {PAINT_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                  {s.id === dream.style ? " (current)" : ""}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary shrink-0" onClick={repaint} disabled={!!busy} data-loading={busy === "paint"}>
              <Icon name="brush" className="h-4 w-4" /> Repaint
            </button>
          </div>
        </div>
        <div className="glass p-4">
          <label htmlFor="poem-style" className="label">
            Rewrite the poem
          </label>
          <div className="flex gap-2">
            <select id="poem-style" className="field" value={poemStyle} onChange={(e) => setPoemStyle(e.target.value as PoemStyle)}>
              {POEM_STYLES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary shrink-0" onClick={rewrite} disabled={!!busy} data-loading={busy === "poem"}>
              <Icon name="refresh" className="h-4 w-4" /> Rewrite
            </button>
          </div>
        </div>
      </section>
      {error && (
        <p role="alert" className="mt-4 text-center text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2" data-slot="extra-actions">
        {dream.poem && <ReadAloud text={dream.poem} />}
        <ShareCard dream={dream} />
        <button className="btn btn-ghost btn-sm text-danger hover:text-danger" onClick={() => setConfirm(true)} disabled={!!busy}>
          <Icon name="trash" className="h-4 w-4" /> Delete dream
        </button>
      </div>

      <details className="glass mt-10 p-5">
        <summary className="cursor-pointer text-ink-muted hover:text-ink">Your words</summary>
        <p className="mt-4 leading-7 text-ink-muted">{dream.cleanedText ?? dream.rawText}</p>
        {dream.followups.some((f) => f.answer) && (
          <dl className="mt-4 space-y-3 text-sm">
            {dream.followups
              .filter((f) => f.answer)
              .map((f) => (
                <div key={f.id}>
                  <dt className="text-ink-faint">{f.question}</dt>
                  <dd className="text-ink-muted">{f.answer}</dd>
                </div>
              ))}
          </dl>
        )}
      </details>

      <ConfirmDialog
        open={confirm}
        title="Let this dream go?"
        body="The dream, its painting and poem will be deleted from this device. This can't be undone."
        confirmLabel="Delete"
        busy={busy === "delete"}
        error={confirm ? error : null}
        onConfirm={remove}
        onCancel={() => setConfirm(false)}
      />
    </article>
  );
}
