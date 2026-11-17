import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Painting } from "@/lib/ai/providers/types";

// Paintings live next to the database in data/ (git-ignored, never in public/),
// and are served through /api/images/[file] so they stay behind the passcode lock.
export const imagesDir = () =>
  path.resolve(path.dirname(path.resolve(process.env.DATABASE_PATH ?? "./data/dream-painter.db")), "dreams");

const EXT: Record<Painting["mimeType"], string> = {
  "image/svg+xml": "svg",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
export const MIME_BY_EXT: Record<string, string> = Object.fromEntries(Object.entries(EXT).map(([m, e]) => [e, m]));

/** Only names we generate are accepted: uuid + known extension. Blocks path traversal. */
export const IMAGE_FILE_RE = /^[0-9a-f-]{36}\.(svg|png|jpg|webp)$/;

export async function savePainting(p: Painting): Promise<string> {
  const dir = imagesDir();
  await fs.mkdir(dir, { recursive: true });
  const name = `${crypto.randomUUID()}.${EXT[p.mimeType]}`;
  await fs.writeFile(path.join(dir, name), p.data);
  return `/api/images/${name}`;
}

export function fileFromUrl(url: string | null | undefined): string | null {
  const name = url?.split("/").pop() ?? "";
  return IMAGE_FILE_RE.test(name) ? name : null;
}

export async function readImage(name: string): Promise<Buffer | null> {
  if (!IMAGE_FILE_RE.test(name)) return null;
  try {
    return await fs.readFile(path.join(imagesDir(), name));
  } catch {
    return null;
  }
}

export async function deleteImage(url: string | null | undefined) {
  const name = fileFromUrl(url);
  if (name) await fs.rm(path.join(imagesDir(), name), { force: true });
}
