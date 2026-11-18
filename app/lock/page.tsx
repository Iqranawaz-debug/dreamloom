import { Suspense } from "react";
import { safeNext } from "@/lib/lock";
import { LockScreen } from "@/components/settings/LockScreen";

export const metadata = { title: "Locked", robots: { index: false } };

async function Lock({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { next } = await searchParams;
  return <LockScreen next={safeNext(typeof next === "string" ? next : "/")} />;
}

export default function LockPage({ searchParams }: PageProps<"/lock">) {
  return (
    <Suspense fallback={null}>
      <Lock searchParams={searchParams} />
    </Suspense>
  );
}
