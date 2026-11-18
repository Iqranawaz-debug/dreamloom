"use client";

/* eslint-disable @next/next/no-img-element -- local generated images served by our own route */
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { moodInfo } from "@/lib/constants";
import { formatDate } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";

export type StoryDream = { id: number; title: string; imageUrl: string | null; poem: string | null; createdAt: number };
export type YearData = {
  year: number;
  total: number;
  topSymbols: { name: string; count: number }[];
  topMood: string | null;
  strangest: StoryDream;
  peaceful: StoryDream;
};

const SLIDE_MS = 7000;

function DreamSlide({ eyebrow, dream }: { eyebrow: string; dream: StoryDream }) {
  return (
    <>
      {dream.imageUrl && <img src={dream.imageUrl} alt="" className="ken-burns absolute inset-0 h-full w-full object-cover" />}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-night-0 via-night-0/55 to-night-0/20" />
      <div className="relative mt-auto">
        <p className="eyebrow text-ink-muted">{eyebrow}</p>
        <h2 className="font-display mt-3 text-5xl">{dream.title}</h2>
        <p suppressHydrationWarning className="mt-2 text-sm text-ink-muted">
          {formatDate(dream.createdAt)}
        </p>
        <Link href={`/dream/${dream.id}`} className="btn btn-secondary btn-sm relative z-20 mt-5">
          Open this dream
        </Link>
      </div>
    </>
  );
}

export function YearStory({ data }: { data: YearData }) {
  const mood = moodInfo(data.topMood);
  const slides = [
    <div key="intro" className="my-auto text-center">
      <p className="eyebrow">Your year in dreams</p>
      <p className="font-display mt-6 text-8xl text-lavender">{data.year}</p>
      <p className="font-display mt-6 text-3xl">
        {data.total} {data.total === 1 ? "dream" : "dreams"} remembered
      </p>
    </div>,
    <div key="symbols" className="my-auto">
      <p className="eyebrow">What kept returning</p>
      <h2 className="font-display mt-3 text-5xl">Your symbols</h2>
      {data.topSymbols.length ? (
        <ol className="mt-8 space-y-4">
          {data.topSymbols.map((s, i) => (
            <li key={s.name} className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
              <span className="font-display text-3xl capitalize">
                <span className="mr-3 text-xl text-ink-faint">{i + 1}</span>
                {s.name}
              </span>
              <span className="text-sm text-ink-muted">
                {s.count} {s.count === 1 ? "dream" : "dreams"}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 text-ink-muted">Symbols will gather as your dreams are painted.</p>
      )}
    </div>,
    <div key="mood" className="my-auto text-center">
      <p className="eyebrow">The feeling you met most</p>
      <p className="mt-8 text-8xl" aria-hidden>
        {mood?.emoji ?? "🌙"}
      </p>
      <p className="font-display mt-6 text-5xl">{mood?.label ?? "Quietly unnamed"}</p>
    </div>,
    <DreamSlide key="strange" eyebrow="Your strangest dream" dream={data.strangest} />,
    <DreamSlide key="peace" eyebrow="Your most peaceful dream" dream={data.peaceful} />,
    <div key="outro" className="my-auto text-center">
      <p className="font-display text-5xl">Some dreams deserve to be remembered.</p>
      <p className="mt-4 text-ink-muted">Yours are all here, on this device.</p>
      <div className="relative z-20 mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/diary" className="btn btn-primary">
          Open the diary
        </Link>
        <Link href="/" className="btn btn-secondary">
          Capture a dream
        </Link>
      </div>
    </div>,
  ];
  const last = slides.length - 1;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [run, setRun] = useState(0); // restarts the progress bar when resuming

  const go = useCallback((delta: number) => setIndex((i) => Math.max(0, Math.min(last, i + delta))), [last]);

  useEffect(() => {
    // No surprise movement for people who asked for less motion.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- media query is client-only
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused || index === last) return;
    const t = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, paused, run, last, go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  return (
    <section aria-roledescription="carousel" aria-label={`Your ${data.year} in dreams`} className="mx-auto flex w-full max-w-md flex-1 flex-col px-3 pt-3 sm:pt-6">
      <div className="glass relative flex min-h-[72vh] flex-1 flex-col overflow-hidden p-6 pt-12">
        <div className="absolute inset-x-4 top-4 z-20 flex gap-1.5" aria-hidden>
          {slides.map((_, i) => (
            <span key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-ink/20">
              {i < index && <span className="block h-full w-full bg-ink" />}
              {i === index && (
                <span
                  key={`${index}-${run}`}
                  className="block h-full origin-left bg-ink"
                  style={
                    paused || index === last
                      ? { width: index === last ? "100%" : "0%" }
                      : { animation: `story-progress ${SLIDE_MS}ms linear both` }
                  }
                />
              )}
            </span>
          ))}
        </div>

        <div key={index} className="relative flex flex-1 flex-col animate-fade-in" aria-live={paused ? "polite" : "off"}>
          {slides[index]}
        </div>

        <div className="relative z-20 mt-6 flex items-center justify-between">
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous slide">
            <Icon name="arrowLeft" className="h-4 w-4" />
          </button>
          <span className="flex items-center gap-2 text-xs text-ink-muted">
            {index + 1} / {slides.length}
            <button
              type="button"
              className="btn btn-ghost btn-icon btn-sm"
              onClick={() => {
                setPaused((p) => !p);
                setRun((r) => r + 1);
              }}
              aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            >
              <Icon name={paused ? "play" : "pause"} className="h-4 w-4" />
            </button>
          </span>
          <button type="button" className="btn btn-secondary btn-icon btn-sm" onClick={() => go(1)} disabled={index === last} aria-label="Next slide">
            <Icon name="arrowRight" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
