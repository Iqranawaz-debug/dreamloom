"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

/** Native <dialog>: focus trapping, Esc to close and inert background for free. */
export function ConfirmDialog({ open, title, body, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      aria-labelledby="confirm-title"
      className="glass glass-strong m-auto w-[min(92vw,26rem)] p-6 text-ink backdrop:bg-night-0/70 backdrop:backdrop-blur-sm"
    >
      <h2 id="confirm-title" className="font-display text-2xl">
        {title}
      </h2>
      <p className="mt-3 text-ink-muted">{body}</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy} autoFocus>
          Keep it
        </button>
        <button type="button" className="btn btn-danger" onClick={onConfirm} data-loading={busy}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
