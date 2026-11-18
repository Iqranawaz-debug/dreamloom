"use client";

/* eslint-disable @next/next/no-img-element -- local generated images served by our own route */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DreamWithSymbols } from "@/lib/db/queries";
import { moodInfo } from "@/lib/constants";
import { api, formatDate } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function DiaryGallery({ dreams, total, filtered }: { dreams: DreamWithSymbols[]; total: number; filtered: boolean }) {
  const router = useRouter();
  const [target, setTarget] = useState<DreamWithSymbols | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await api(`/api/dreams/${target.id}`, { method: "DELETE" });
      setTarget(null);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (total === 0)
    return (
      <div className="glass mx-auto mt-12 max-w-lg p-10 text-center">
        <p className="font-display text-3xl">Your gallery is waiting</p>
        <p className="mt-3 text-ink-muted">Tell your first dream, and its painting will hang here.</p>
        <Link href="/" className="btn btn-primary mt-6">
          Capture a dream
        </Link>
      </div>
    );

  if (dreams.length === 0)
    return (
      <div className="mx-auto mt-16 max-w-md text-center" role="status">
        <p className="font-display text-3xl">No dreams match</p>
        <p className="mt-3 text-ink-muted">Try a different word, or clear the filters to see them all.</p>
      </div>
    );

  return (
    <>
      <p className="mt-6 text-sm text-ink-faint" role="status">
        {filtered ? `${dreams.length} of ${total} dreams` : `${total} dream${total === 1 ? "" : "s"}`}
      </p>
      <ul className="mt-4 columns-1 gap-4 sm:columns-2 lg:columns-3">
        {dreams.map((d) => {
          const mood = moodInfo(d.mood);
          const title = d.title ?? "Untitled dream";
          return (
            <li key={d.id} className="group relative mb-4 break-inside-avoid">
              <Link href={`/dream/${d.id}`} className="glass card-interactive block overflow-hidden">
                {d.imageUrl ? (
                  <img src={d.imageUrl} alt="" loading="lazy" className="block h-auto w-full" />
                ) : (
                  <div className="grid aspect-[4/3] place-items-center bg-night-2/60 text-sm text-ink-faint">Not painted yet</div>
                )}
                <div className="p-4">
                  <p className="flex items-center gap-2 text-xs text-ink-faint">
                    {mood && (
                      <span className="mood-dot" style={{ background: mood.color }} role="img" aria-label={`Mood: ${mood.label}`} />
                    )}
                    <time suppressHydrationWarning dateTime={new Date(d.createdAt).toISOString()}>{formatDate(d.createdAt, { dateStyle: "medium" })}</time>
                  </p>
                  <h2 className="font-display mt-2 text-2xl">{title}</h2>
                  {d.poem && <p className="mt-2 line-clamp-2 whitespace-pre-line font-display text-lg leading-snug text-ink-muted">{d.poem}</p>}
                </div>
              </Link>
              <button
                type="button"
                aria-label={`Delete ${title}`}
                onClick={() => setTarget(d)}
                className="btn btn-secondary btn-icon btn-sm absolute right-3 top-3 opacity-100 transition-opacity sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
              >
                <Icon name="trash" className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={target !== null}
        title="Let this dream go?"
        body={`“${target?.title ?? "This dream"}”, its painting and poem will be deleted from this device. This can't be undone.`}
        confirmLabel="Delete"
        busy={busy}
        error={error}
        onConfirm={remove}
        onCancel={() => {
          setTarget(null);
          setError(null);
        }}
      />
    </>
  );
}
