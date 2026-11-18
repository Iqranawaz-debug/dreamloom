// Renders the app icon (crescent moon on a midnight gradient) to PNG with no dependencies.
//   node scripts/generate-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type), data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc(body));
  return Buffer.concat([len, body, sum]);
}
const mix = (a, b, t) => a + (b - a) * t;
const clamp = (t) => Math.max(0, Math.min(1, t));

function render(size, moonScale) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const aa = 1.5 / size;
  const stars = [[0.24, 0.27, 0.012], [0.74, 0.22, 0.016], [0.8, 0.62, 0.01], [0.3, 0.76, 0.01], [0.62, 0.8, 0.013]];
  for (let y = 0; y < size; y++) {
    let o = y * (size * 3 + 1);
    raw[o++] = 0;
    for (let x = 0; x < size; x++) {
      const [u, v] = [(x + 0.5) / size, (y + 0.5) / size];
      const glow = clamp(1 - Math.hypot(u - 0.5, v - 0.42) / 0.62);
      let c = [mix(10, 52, glow * glow), mix(12, 40, glow * glow), mix(31, 112, glow * glow)];
      for (const [sx, sy, sr] of stars) {
        const s = clamp((sr - Math.hypot(u - sx, v - sy)) / aa);
        c = c.map((ch) => mix(ch, 236, s));
      }
      const R = 0.27 * moonScale;
      const outer = clamp((R - Math.hypot(u - 0.5, v - 0.5)) / aa);
      const inner = clamp((R * 0.86 - Math.hypot(u - (0.5 + R * 0.46), v - (0.5 - R * 0.3))) / aa);
      const moon = outer * (1 - inner);
      const shade = clamp((v - 0.25) / 0.5);
      const m = [mix(244, 201, shade), mix(238, 188, shade), 255];
      c = c.map((ch, i) => mix(ch, m[i], moon));
      raw[o++] = c[0];
      raw[o++] = c[1];
      raw[o++] = c[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", render(192, 1.15));
writeFileSync("public/icons/icon-512.png", render(512, 1.15));
writeFileSync("public/icons/maskable-512.png", render(512, 0.9)); // inside the maskable safe zone
writeFileSync("public/icons/apple-touch-icon.png", render(180, 1.1));
