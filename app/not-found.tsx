import Link from "next/link";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <div className="grid flex-1 place-items-center px-4 py-16">
      <div className="glass w-full max-w-md p-8 text-center">
        <h1 className="font-display text-4xl">This dream has faded</h1>
        <p className="mt-3 text-ink-muted">It may have been deleted, or it was never here.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/diary" className="btn btn-primary">
            Open the diary
          </Link>
          <Link href="/" className="btn btn-ghost">
            Capture a dream
          </Link>
        </div>
      </div>
    </div>
  );
}
