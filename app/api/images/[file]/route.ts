import { connection } from "next/server";
import { MIME_BY_EXT, readImage } from "@/lib/storage";

/** Serve a stored painting. Only generated file names are accepted (no path traversal). */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  await connection();
  const { file } = await params;
  const data = await readImage(file);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": MIME_BY_EXT[file.split(".").pop()!] ?? "application/octet-stream",
      "Cache-Control": "private, max-age=31536000, immutable",
      // SVGs could carry script if opened directly; lock them down.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
