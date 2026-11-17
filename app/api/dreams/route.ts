import { NextResponse } from "next/server";
import { z } from "zod";
import { handle, readJson } from "@/lib/api";
import { createDream } from "@/lib/db/queries";
import { DreamTextSchema, MoodSchema } from "@/lib/ai/schemas";

const Body = z.object({ rawText: DreamTextSchema, mood: MoodSchema.nullish() });

/** Save a freshly captured dream. */
export const POST = handle(async (req) => {
  const { rawText, mood } = await readJson(req, Body);
  const id = createDream({ rawText, mood: mood ?? null });
  return NextResponse.json({ id }, { status: 201 });
});
