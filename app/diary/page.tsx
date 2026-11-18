import { Suspense } from "react";
import { connection } from "next/server";
import { z } from "zod";
import { allSymbolNames, countDreams, listDreams } from "@/lib/db/queries";
import { MOOD_IDS } from "@/lib/constants";
import { DiaryFilters } from "@/components/diary/DiaryFilters";
import { DiaryGallery } from "@/components/diary/DiaryGallery";
import { Icon } from "@/components/ui/Icon";

export const metadata = { title: "Diary" };

const first = (v: unknown) => (Array.isArray(v) ? v[0] : v);
// Anything malformed in the URL is ignored rather than failing the page.
const Filters = z.object({
  q: z.preprocess(first, z.string().trim().max(200).optional()).catch(undefined),
  mood: z.preprocess(first, z.enum(MOOD_IDS).optional()).catch(undefined),
  symbol: z.preprocess(first, z.string().regex(/^[a-z]{2,20}$/).optional()).catch(undefined),
});

async function DiaryContent({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const filters = Filters.parse(await searchParams);
  const total = countDreams();
  const dreams = listDreams(filters);
  return (
    <>
      {total > 0 && <DiaryFilters q={filters.q ?? ""} mood={filters.mood ?? ""} symbol={filters.symbol ?? ""} symbols={allSymbolNames()} />}
      <DiaryGallery dreams={dreams} total={total} filtered={Boolean(filters.q || filters.mood || filters.symbol)} />
    </>
  );
}

function GallerySkeleton() {
  return (
    <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3" role="status" aria-label="Loading your dreams">
      {[320, 240, 380, 280, 340, 260].map((h, i) => (
        <div key={i} className="skeleton mb-4 break-inside-avoid" style={{ height: h }} />
      ))}
    </div>
  );
}

export default function DiaryPage({ searchParams }: PageProps<"/diary">) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your gallery</p>
          <h1 className="font-display mt-2 text-5xl sm:text-6xl">Dream diary</h1>
        </div>
        <a href="/api/export" download className="btn btn-secondary btn-sm">
          <Icon name="download" className="h-4 w-4" /> Export all my dreams
        </a>
      </header>
      <Suspense fallback={<GallerySkeleton />}>
        <DiaryContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
