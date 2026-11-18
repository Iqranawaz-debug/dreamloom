import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { getDream } from "@/lib/db/queries";
import { IdSchema } from "@/lib/api";
import { DreamFlow } from "@/components/dream/DreamFlow";
import { DreamOrb } from "@/components/dream/DreamOrb";

export const metadata = { title: "Dream" };

async function DreamLoader({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const parsed = IdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const dream = getDream(parsed.data);
  if (!dream) notFound();
  return <DreamFlow initial={dream} />;
}

export default function DreamPage({ params }: PageProps<"/dream/[id]">) {
  return (
    <Suspense
      fallback={
        <div className="grid flex-1 place-items-center py-24" role="status" aria-label="Loading dream">
          <DreamOrb size={120} />
        </div>
      }
    >
      <DreamLoader params={params} />
    </Suspense>
  );
}
