import { rng } from "@/lib/ai/providers/random";

/** Box-shadow star field: one element per layer, thousands of pixels painted once by the GPU. */
function starField(seed: number, count: number, size: number, alpha: [number, number]) {
  const r = rng(seed);
  const tints = ["255 255 255", "214 206 255", "200 236 245", "255 220 236"];
  return Array.from({ length: count }, () => {
    const x = (r.next() * 100).toFixed(2);
    const y = (r.next() * 130).toFixed(2);
    const a = (alpha[0] + r.next() * (alpha[1] - alpha[0])).toFixed(2);
    return `${x}vw ${y}vh 0 ${size > 1 ? 0.4 : 0}px rgb(${r.pick(tints)} / ${a})`;
  }).join(",");
}

const LAYERS = [
  { shadow: starField(11, 140, 1, [0.25, 0.7]), size: 1, twinkle: "7s", className: "parallax-slow" },
  { shadow: starField(23, 60, 1.5, [0.35, 0.85]), size: 1.5, twinkle: "5s", className: "parallax-slow" },
  { shadow: starField(37, 18, 2, [0.5, 0.95]), size: 2, twinkle: "3.6s", className: "parallax-fast" },
];

const ORBS = [
  { top: "8%", left: "-8%", size: "38vmax", color: "rgb(124 98 220 / 0.22)", dur: "48s", dx: "60px", dy: "40px" },
  { top: "55%", left: "70%", size: "32vmax", color: "rgb(90 170 210 / 0.14)", dur: "56s", dx: "-50px", dy: "-40px" },
  { top: "70%", left: "-10%", size: "26vmax", color: "rgb(230 140 190 / 0.12)", dur: "64s", dx: "40px", dy: "-60px" },
];

/** Fixed, decorative night sky behind every page. CSS-only animation; pauses under reduced motion. */
export function Atmosphere() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="nebula" />
      <div className="nebula nebula-2" />
      {ORBS.map((o, i) => (
        <div
          key={i}
          className="orb"
          style={
            {
              top: o.top,
              left: o.left,
              width: o.size,
              height: o.size,
              "--orb-color": o.color,
              "--orb-dur": o.dur,
              "--orb-dx": o.dx,
              "--orb-dy": o.dy,
            } as React.CSSProperties
          }
        />
      ))}
      {LAYERS.map((l, i) => (
        <div
          key={i}
          className={`stars ${l.className}`}
          style={
            {
              width: `${l.size}px`,
              height: `${l.size}px`,
              boxShadow: l.shadow,
              "--twinkle": l.twinkle,
            } as React.CSSProperties
          }
        />
      ))}
      {/* vignette keeps text areas calm and readable */}
      <div className="inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 40%, rgb(3 4 12 / 0.55) 100%)" }} />
    </div>
  );
}
