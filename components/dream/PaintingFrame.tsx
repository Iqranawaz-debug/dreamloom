/* eslint-disable @next/next/no-img-element -- local generated SVG/PNG served by our own route */
import { hashString, rng } from "@/lib/ai/providers/random";

/** A painting that slowly breathes: Ken Burns pan/zoom plus drifting motes of light (CSS only). */
export function PaintingFrame({ src, alt }: { src: string; alt: string }) {
  const r = rng(hashString(src));
  const motes = Array.from({ length: 14 }, () => ({
    left: `${(r.next() * 96 + 2).toFixed(1)}%`,
    size: 1.5 + r.next() * 2.5,
    dur: `${(9 + r.next() * 10).toFixed(1)}s`,
    delay: `${(-r.next() * 18).toFixed(1)}s`,
    dx: `${((r.next() - 0.5) * 50).toFixed(0)}px`,
    o: (0.35 + r.next() * 0.5).toFixed(2),
  }));
  return (
    <figure className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line shadow-[var(--shadow-lg)]">
      <img key={src} src={src} alt={alt} className="ken-burns block h-auto w-full" />
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        {motes.map((m, i) => (
          <span
            key={i}
            className="mote"
            style={
              {
                left: m.left,
                width: m.size,
                height: m.size,
                "--mote-dur": m.dur,
                "--mote-delay": m.delay,
                "--mote-dx": m.dx,
                "--mote-o": m.o,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
    </figure>
  );
}
