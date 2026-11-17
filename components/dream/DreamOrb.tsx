/** Soft abstract light form used while a dream is being made. CSS-only. */
export function DreamOrb({ size = 160 }: { size?: number }) {
  return (
    <div aria-hidden className="relative" style={{ width: size, height: size }}>
      <div
        className="absolute inset-[-40%] rounded-full opacity-70"
        style={{ background: "radial-gradient(circle, rgb(155 135 245 / 0.35), transparent 65%)", animation: "breathe 5s var(--ease-breathe) infinite" }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "conic-gradient(from 0deg, #c9bcff, #93e2ee, #f1aecb, #9b87f5, #c9bcff)",
          filter: "blur(18px)",
          opacity: 0.85,
          animation: "spin 14s linear infinite",
        }}
      />
      <div
        className="absolute inset-[18%] rounded-full"
        style={{
          background: "radial-gradient(circle at 40% 35%, #fbf8ff, #d6ccff 40%, rgb(155 135 245 / 0.2) 75%)",
          animation: "breathe 4s var(--ease-breathe) infinite",
        }}
      />
    </div>
  );
}
