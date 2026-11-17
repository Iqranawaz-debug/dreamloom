import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, IdSchema, handle, readJson } from "@/lib/api";
import { generatePainting } from "@/lib/ai/image";
import { MoodSchema, PaintStyleSchema } from "@/lib/ai/schemas";
import { getDream, updateDream } from "@/lib/db/queries";
import { deleteImage } from "@/lib/storage";

const Body = z.union([
  z.object({ dreamId: IdSchema, style: PaintStyleSchema }),
  z.object({ imagePrompt: z.string().trim().min(10).max(1500), style: PaintStyleSchema, mood: MoodSchema.nullish() }),
]);

/** Paint (or repaint) a dream. With dreamId, the stored prompt is used and the new image replaces the old one. */
export const POST = handle(async (req) => {
  const body = await readJson(req, Body);
  if ("dreamId" in body) {
    const dream = getDream(body.dreamId);
    if (!dream) throw new HttpError(404, "Dream not found");
    if (!dream.imagePrompt) throw new HttpError(409, "This dream hasn't been analyzed yet");
    const mood = MoodSchema.nullable().catch(null).parse(dream.mood);
    const { imageUrl } = await generatePainting(dream.imagePrompt, body.style, mood);
    updateDream(dream.id, { imageUrl, style: body.style });
    await deleteImage(dream.imageUrl);
    return NextResponse.json({ imageUrl });
  }
  return NextResponse.json(await generatePainting(body.imagePrompt, body.style, body.mood ?? null));
});
