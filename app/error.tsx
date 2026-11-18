"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid flex-1 place-items-center px-4 py-16" role="alert">
      <div className="glass w-full max-w-md p-8 text-center">
        <h1 className="font-display text-4xl">Something drifted out of place</h1>
        <p className="mt-3 text-ink-muted">Your dreams are safe. Try again, or head back to the start.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-ghost">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
