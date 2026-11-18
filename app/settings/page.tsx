import { Suspense } from "react";
import { connection } from "next/server";
import { readLock } from "@/lib/lock";
import { SettingsPanel } from "@/components/settings/SettingsPanel";

export const metadata = { title: "Settings" };

async function Panel() {
  await connection();
  return <SettingsPanel lockEnabled={readLock() !== null} />;
}

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 sm:px-6 sm:pt-10">
      <p className="eyebrow">Yours, on this device</p>
      <h1 className="font-display mt-2 text-5xl sm:text-6xl">Settings</h1>
      <Suspense fallback={<div className="skeleton mt-8 h-96" role="status" aria-label="Loading settings" />}>
        <Panel />
      </Suspense>
    </div>
  );
}
