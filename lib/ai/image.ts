import "server-only";
import { getImageProvider } from "./providers";
import { PaintStyleSchema } from "./schemas";
import { savePainting } from "@/lib/storage";
import type { Mood, PaintStyle } from "@/lib/constants";
import { z } from "zod";

/**
 * The single entry point for paintings. Generates with the configured provider,
 * stores the file locally (data/dreams/) and returns its app URL.
 */
export async function generatePainting(
  imagePrompt: string,
  style: PaintStyle,
  mood: Mood | null = null,
): Promise<{ imageUrl: string }> {
  const prompt = z.string().trim().min(10).max(1500).parse(imagePrompt);
  const s = PaintStyleSchema.parse(style);
  const painting = await getImageProvider().paint(prompt, s, mood);
  if (!painting.data?.length) throw new Error("The painter returned an empty image.");
  return { imageUrl: await savePainting(painting) };
}
