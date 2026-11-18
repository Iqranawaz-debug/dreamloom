/* eslint-disable @next/next/no-img-element -- local generated SVG/PNG served by our own route */
export function PaintingFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="relative overflow-hidden rounded-[var(--radius-xl)] border border-line shadow-[var(--shadow-lg)]">
      <img key={src} src={src} alt={alt} className="block h-auto w-full animate-fade-in" />
    </figure>
  );
}
