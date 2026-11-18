import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { listDreams, type DreamWithSymbols } from "@/lib/db/queries";
import { YearStory, type StoryDream, type YearData } from "@/components/year/YearStory";

export const metadata = { title: "Year in Dreams" };

const slim = (d: DreamWithSymbols): StoryDream => ({ id: d.id, title: d.title ?? "Untitled dream", imageUrl: d.imageUrl, poem: d.poem, createdAt: new Date(d.createdAt).getTime() });

/** Strange = unusual mood, many images, and symbols that rarely appear elsewhere. */
function strangest(dreams: DreamWithSymbols[], counts: Map<string, number>) {
  const moodScore: Record<string, number> = { weird: 6, confused: 4, scared: 2 };
  const score = (d: DreamWithSymbols) =>
    (moodScore[d.mood ?? ""] ?? 0) + d.symbols.length * 0.5 + d.symbols.reduce((n, s) => n + 1 / (counts.get(s) ?? 1), 0) * 2;
  return [...dreams].sort((a, b) => score(b) - score(a))[0];
}

/** Peaceful = calm or joyful mood, avoiding unsettling images. */
function mostPeaceful(dreams: DreamWithSymbols[], exclude?: number) {
  const moodScore: Record<string, number> = { calm: 6, joyful: 3, sad: -1, confused: -2, weird: -2, scared: -6 };
  const soft = new Set(["water", "garden", "moon", "light", "stars", "music", "boat", "forest"]);
  const hard = new Set(["chase", "falling", "shadow", "fire", "teeth", "maze"]);
  const score = (d: DreamWithSymbols) =>
    (moodScore[d.mood ?? ""] ?? 0) + d.symbols.filter((s) => soft.has(s)).length - d.symbols.filter((s) => hard.has(s)).length * 2;
  const pool = dreams.filter((d) => d.id !== exclude);
  return [...(pool.length ? pool : dreams)].sort((a, b) => score(b) - score(a))[0];
}

async function YearContent() {
  await connection();
  const year = new Date().getFullYear();
  const dreams = listDreams({ since: new Date(year, 0, 1) });

  if (dreams.length === 0)
    return (
      <div className="mx-auto mt-16 w-full max-w-lg px-4">
        <div className="glass p-10 text-center">
          <h1 className="font-display text-4xl">Your {year} story hasn&apos;t begun</h1>
          <p className="mt-3 text-ink-muted">Record a dream, and this page will start to fill with your year.</p>
          <Link href="/" className="btn btn-primary mt-6">
            Capture a dream
          </Link>
        </div>
      </div>
    );

  const counts = new Map<string, number>();
  const moods = new Map<string, number>();
  for (const d of dreams) {
    for (const s of d.symbols) counts.set(s, (counts.get(s) ?? 0) + 1);
    if (d.mood) moods.set(d.mood, (moods.get(d.mood) ?? 0) + 1);
  }
  const strange = strangest(dreams, counts);
  const data: YearData = {
    year,
    total: dreams.length,
    topSymbols: [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([name, count]) => ({ name, count })),
    topMood: [...moods].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
    strangest: slim(strange),
    peaceful: slim(mostPeaceful(dreams, strange.id)),
  };
  return <YearStory data={data} />;
}

export default function YearPage() {
  return (
    <Suspense fallback={<div className="skeleton mx-auto mt-10 h-[70vh] w-[min(92vw,28rem)]" role="status" aria-label="Gathering your year" />}>
      <YearContent />
    </Suspense>
  );
}
