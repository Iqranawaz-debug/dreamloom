import type { ImageProvider } from "./types";
import type { Mood, PaintStyle } from "@/lib/constants";
import { hashString, mockDelay, rng } from "./random";

// Palettes per mood: [sky top, sky bottom, accent 1, accent 2, highlight]
const PALETTES: Record<string, string[][]> = {
  calm: [
    ["#0f1e3d", "#3a5f8f", "#8fb8de", "#c9e3f2", "#f3f7ff"],
    ["#14233b", "#2d5b6b", "#7cc4c0", "#b9e4d8", "#eefaf6"],
  ],
  joyful: [
    ["#3a1f4d", "#c4677a", "#f2c58c", "#ffe3b0", "#fff6e0"],
    ["#22305c", "#e08e6d", "#f7d08a", "#ffd6e0", "#fffaf0"],
  ],
  scared: [
    ["#07070f", "#2a1730", "#7a2e4a", "#d98a9a", "#e8d0d6"],
    ["#0a0c14", "#1c2638", "#4b3a63", "#9b6fa8", "#d6c7e8"],
  ],
  sad: [
    ["#10131f", "#3b4560", "#8a9cd6", "#b5c0dd", "#e3e8f5"],
    ["#161a26", "#4a5468", "#7f8fa8", "#c2cad8", "#eef1f6"],
  ],
  weird: [
    ["#160b2e", "#5b2a86", "#b79ef0", "#7fe0d0", "#ffd1f3"],
    ["#0d1f2b", "#6a2f6e", "#f08ec4", "#a6f0c9", "#fff3a8"],
  ],
  confused: [
    ["#121a2a", "#3d4f6e", "#8ed4c6", "#d3b8ef", "#f5f0ff"],
    ["#1b1530", "#4c5c7a", "#a8c8e8", "#e8b8d0", "#fbf7ff"],
  ],
};


const f = (n: number) => n.toFixed(1);

export function paintSvg(imagePrompt: string, style: PaintStyle, mood: Mood | null): string {
  const seed = hashString(imagePrompt + style + (mood ?? ""));
  const r = rng(seed);
  const [W, H] = r.pick([
    [800, 1000],
    [1000, 1000],
    [1000, 800],
    [800, 1100],
  ]);
  const pal = r.pick(PALETTES[mood ?? ""] ?? PALETTES.calm);
  const [top, bottom, a1, a2, hi] = pal;
  const prompt = imagePrompt.toLowerCase();
  const wants = (s: string) => prompt.includes(s);

  const defs: string[] = [
    `<linearGradient id="sky" x1="0" y1="0" x2="${f(r.next() * 0.4)}" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`,
    `<radialGradient id="glow"><stop offset="0" stop-color="${hi}" stop-opacity="0.9"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient>`,
    `<radialGradient id="orb"><stop offset="0" stop-color="${a2}" stop-opacity="0.55"/><stop offset="1" stop-color="${a1}" stop-opacity="0"/></radialGradient>`,
    `<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${style === "anime" ? 6 : 18}"/></filter>`,
  ];

  // Style treatments
  let texture = "";
  if (style === "watercolor") {
    defs.push(
      `<filter id="paint"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="3" seed="${seed % 100}"/><feDisplacementMap in="SourceGraphic" scale="38"/><feGaussianBlur stdDeviation="1.5"/></filter>`,
      `<filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/></filter>`,
    );
    texture = `<rect width="${W}" height="${H}" filter="url(#paper)"/>`;
  } else if (style === "oil") {
    defs.push(
      `<filter id="paint"><feTurbulence type="turbulence" baseFrequency="0.02 0.09" numOctaves="2" seed="${seed % 100}"/><feDisplacementMap in="SourceGraphic" scale="22"/></filter>`,
      `<filter id="paper"><feTurbulence type="turbulence" baseFrequency="0.05 0.5" numOctaves="2" seed="7"/><feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.05  0 0 0 0 0.1  0 0 0 0.16 0"/></filter>`,
    );
    texture = `<rect width="${W}" height="${H}" filter="url(#paper)"/>`;
  } else if (style === "surrealist") {
    defs.push(`<filter id="paint"><feGaussianBlur stdDeviation="0.6"/></filter>`);
  } else if (style === "anime") {
    defs.push(`<filter id="paint"><feGaussianBlur stdDeviation="0"/></filter>`);
  } else {
    defs.push(`<filter id="paint"><feGaussianBlur stdDeviation="2"/></filter>`);
  }

  const shapes: string[] = [];
  const horizon = H * (0.55 + r.next() * 0.15);

  // Ambient orbs
  for (let i = 0; i < r.int(3, 6); i++) {
    shapes.push(
      `<circle cx="${f(r.next() * W)}" cy="${f(r.next() * horizon)}" r="${f(80 + r.next() * 220)}" fill="url(#orb)" filter="url(#soft)"/>`,
    );
  }

  // Stars
  const starCount = style === "anime" ? 40 : 70;
  for (let i = 0; i < starCount; i++) {
    shapes.push(
      `<circle cx="${f(r.next() * W)}" cy="${f(r.next() * horizon * 0.85)}" r="${f(0.6 + r.next() * 1.8)}" fill="${hi}" opacity="${f(0.25 + r.next() * 0.6)}"/>`,
    );
  }

  // Celestial body
  const celestial = wants("sun") ? "sun" : "moon";
  const cx = W * (0.25 + r.next() * 0.5);
  const cy = horizon * (0.25 + r.next() * 0.25);
  const cr = 50 + r.next() * 60;
  shapes.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(cr * 2.6)}" fill="url(#glow)" opacity="0.6"/>`);
  shapes.push(`<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(cr)}" fill="${celestial === "sun" ? a2 : hi}" opacity="0.92"/>`);
  if (celestial === "moon")
    shapes.push(`<circle cx="${f(cx + cr * 0.35)}" cy="${f(cy - cr * 0.15)}" r="${f(cr * 0.9)}" fill="${top}" opacity="0.35"/>`);

  // Ground: hills or water
  if (wants("water") || wants("boat")) {
    shapes.push(`<rect y="${f(horizon)}" width="${W}" height="${f(H - horizon)}" fill="${bottom}" opacity="0.9"/>`);
    for (let i = 0; i < 9; i++) {
      const y = horizon + 18 + i * ((H - horizon) / 9);
      shapes.push(
        `<path d="M0 ${f(y)} Q ${f(W * 0.25)} ${f(y - 10)} ${f(W * 0.5)} ${f(y)} T ${W} ${f(y)}" stroke="${a2}" stroke-width="${f(1 + i * 0.4)}" fill="none" opacity="${f(0.15 + i * 0.05)}"/>`,
      );
    }
    shapes.push(
      `<ellipse cx="${f(cx)}" cy="${f(horizon + (H - horizon) * 0.4)}" rx="${f(cr * 0.7)}" ry="${f((H - horizon) * 0.35)}" fill="${hi}" opacity="0.18" filter="url(#soft)"/>`,
    );
  } else {
    for (let layer = 0; layer < 3; layer++) {
      const base = horizon + layer * 40;
      const amp = 40 + r.next() * 70;
      const pts = Array.from({ length: 6 }, (_, i) => `${f((W / 5) * i)} ${f(base - r.next() * amp)}`);
      shapes.push(
        `<path d="M0 ${H} L ${pts.join(" L ")} L ${W} ${H} Z" fill="${layer === 2 ? top : bottom}" opacity="${f(0.55 + layer * 0.2)}"/>`,
      );
    }
  }

  // Symbol motifs
  if (wants("door")) {
    const dx = W * (0.4 + r.next() * 0.2);
    shapes.push(
      `<rect x="${f(dx)}" y="${f(horizon - 180)}" width="90" height="180" rx="45" ry="45" fill="${hi}" opacity="0.75"/>`,
      `<rect x="${f(dx)}" y="${f(horizon - 180)}" width="90" height="180" rx="45" fill="url(#glow)" opacity="0.8"/>`,
    );
  }
  if (wants("stairs")) {
    for (let i = 0; i < 9; i++)
      shapes.push(
        `<rect x="${f(W * 0.15 + i * 38)}" y="${f(horizon - i * 30)}" width="46" height="12" fill="${a2}" opacity="${f(0.85 - i * 0.07)}"/>`,
      );
  }
  if (wants("forest")) {
    for (let i = 0; i < 14; i++) {
      const tx = r.next() * W;
      const th = 90 + r.next() * 140;
      const ty = horizon + 30 + r.next() * 60;
      shapes.push(`<path d="M${f(tx)} ${f(ty - th)} L ${f(tx - th * 0.25)} ${f(ty)} L ${f(tx + th * 0.25)} ${f(ty)} Z" fill="${top}" opacity="0.85"/>`);
    }
  }
  if (wants("flying") || wants("bird")) {
    for (let i = 0; i < r.int(3, 7); i++) {
      const bx = r.next() * W;
      const by = r.next() * horizon * 0.7;
      const s = 10 + r.next() * 16;
      shapes.push(
        `<path d="M${f(bx - s)} ${f(by)} Q ${f(bx - s / 2)} ${f(by - s / 2)} ${f(bx)} ${f(by)} Q ${f(bx + s / 2)} ${f(by - s / 2)} ${f(bx + s)} ${f(by)}" stroke="${hi}" stroke-width="2" fill="none" opacity="0.8"/>`,
      );
    }
  }
  if (wants("house")) {
    const hx = W * (0.2 + r.next() * 0.5);
    const hy = horizon + 10;
    shapes.push(
      `<path d="M${f(hx)} ${f(hy)} v-70 l45 -40 l45 40 v70 Z" fill="${top}" opacity="0.95"/>`,
      `<rect x="${f(hx + 35)}" y="${f(hy - 50)}" width="20" height="22" fill="${a2}" opacity="0.9"/>`,
    );
  }
  if (style === "surrealist") {
    // floor grid + floating forms
    for (let i = 0; i <= 10; i++) {
      shapes.push(`<line x1="${f(W / 2)}" y1="${f(horizon)}" x2="${f((W / 10) * i * 2 - W / 2)}" y2="${H}" stroke="${hi}" stroke-opacity="0.18"/>`);
    }
    for (let i = 0; i < 3; i++) {
      shapes.push(
        `<ellipse cx="${f(r.next() * W)}" cy="${f(horizon * (0.5 + r.next() * 0.4))}" rx="${f(30 + r.next() * 50)}" ry="${f(14 + r.next() * 20)}" fill="${a1}" opacity="0.7"/>`,
      );
    }
  }
  // Floating motes
  for (let i = 0; i < 18; i++) {
    shapes.push(
      `<circle cx="${f(r.next() * W)}" cy="${f(r.next() * H)}" r="${f(2 + r.next() * 6)}" fill="${r.pick([a1, a2, hi])}" opacity="${f(0.15 + r.next() * 0.35)}"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><defs>${defs.join("")}</defs><rect width="${W}" height="${H}" fill="url(#sky)"/><g filter="url(#paint)">${shapes.join("")}</g>${texture}<rect width="${W}" height="${H}" fill="url(#glow)" opacity="0.06"/></svg>`;
}

export const mockImage: ImageProvider = {
  name: "mock",
  async paint(imagePrompt, style, mood) {
    await mockDelay(hashString(imagePrompt));
    return { data: new TextEncoder().encode(paintSvg(imagePrompt, style, mood)), mimeType: "image/svg+xml" };
  },
};
