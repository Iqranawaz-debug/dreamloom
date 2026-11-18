"use client";

import { useState } from "react";
import { api } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";

export function LockScreen({ next }: { next: string }) {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !passcode) return;
    setBusy(true);
    setError(null);
    try {
      await api("/api/lock", { body: { action: "unlock", passcode } });
      // Full reload so every route is fetched with the new session.
      window.location.assign(next);
    } catch (err) {
      setError((err as Error).message);
      setPasscode("");
      setBusy(false);
    }
  }

  return (
    <div className="grid flex-1 place-items-center px-4 py-16">
      <form onSubmit={submit} className="glass w-full max-w-sm p-8 text-center">
        <span aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-lavender/15 text-lavender">
          <Icon name="lock" className="h-6 w-6" />
        </span>
        <h1 className="font-display mt-5 text-4xl">Your dreams are resting</h1>
        <p className="mt-2 text-ink-muted">Enter your passcode to open them.</p>
        <label htmlFor="passcode" className="sr-only">
          Passcode
        </label>
        <input
          id="passcode"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={passcode}
          maxLength={64}
          onChange={(e) => setPasscode(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "lock-error" : undefined}
          className="field mt-6 text-center text-lg tracking-widest"
        />
        {error && (
          <p id="lock-error" role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary mt-5 w-full" disabled={!passcode} data-loading={busy}>
          Unlock
        </button>
      </form>
    </div>
  );
}
