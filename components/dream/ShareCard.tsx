"use client";

import { useState } from "react";
import type { DreamDetail } from "@/lib/db/queries";
import { formatDate } from "@/lib/client";
import { Icon } from "@/components/ui/Icon";

const W = 1080;
const H = 1350;
const M = 64;

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      out.push(line);
      line = word;
    } else line = next;
  }
  if (line) out.push(line);
  return out;
}

async function renderCard(dream: DreamDetail): Promise<Blob> {
  const family = getComputedStyle(document.documentElement).getPropertyValue("--font-cormorant").trim() || "Georgia, serif";
  await document.fonts.load(`500 48px ${family}`);

  const img = new Image();
  img.src = dream.imageUrl!;
  await img.decode();

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#14123a");
  bg.addColorStop(1, "#05060f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Painting, cover-cropped into a rounded frame
  const frame = { x: M, y: M, w: W - M * 2, h: 700 };
  const scale = Math.max(frame.w / img.naturalWidth, frame.h / img.naturalHeight);
  const [sw, sh] = [frame.w / scale, frame.h / scale];
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(frame.x, frame.y, frame.w, frame.h, 36);
  ctx.clip();
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, frame.x, frame.y, frame.w, frame.h);
  ctx.restore();

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ece8fb";
  ctx.font = `500 60px ${family}`;
  ctx.fillText(dream.title ?? "A dream", W / 2, frame.y + frame.h + 96, W - M * 2);

  // Poem: shrink until it fits the space above the footer
  const top = frame.y + frame.h + 156;
  const bottom = H - 112;
  const source = (dream.poem ?? "").split("\n");
  let size = 40;
  let rows: string[] = [];
  for (; size >= 24; size -= 2) {
    ctx.font = `italic 400 ${size}px ${family}`;
    rows = source.flatMap((l) => (l.trim() ? wrap(ctx, l.trim(), W - M * 3) : [""]));
    if (rows.length * size * 1.32 <= bottom - top) break;
  }
  ctx.fillStyle = "#cfcae8";
  rows.forEach((row, i) => ctx.fillText(row, W / 2, top + size + i * size * 1.32));

  ctx.font = `400 26px ${family}`;
  ctx.fillStyle = "#8f8bb3";
  ctx.fillText(`${formatDate(dream.createdAt)}  ·  Dream Painter`, W / 2, H - 56);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't create the image."))), "image/png"),
  );
}

export function ShareCard({ dream }: { dream: DreamDetail }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderCard(dream);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dream-${dream.id}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("The card couldn't be made. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!dream.imageUrl) return null;
  return (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={download} data-loading={busy} disabled={busy}>
        <Icon name="share" className="h-4 w-4" /> Share card
      </button>
      {error && (
        <p role="alert" className="w-full text-center text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
