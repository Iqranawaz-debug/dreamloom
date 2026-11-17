import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, IdSchema, handle, readJson } from "@/lib/api";
import { analyzeDream } from "@/lib/ai/text";
import { AnswerSchema, DreamTextSchema, MoodSchema } from "@/lib/ai/schemas";
import { getDream, setFollowups, setSymbols, updateDream } from "@/lib/db/queries";

const Answers = AnswerSchema.array().max(3).default([]);
const Body = z.union([
  z.object({ dreamId: IdSchema, answers: Answers }),
  z.object({ rawText: DreamTextSchema, answers: Answers, mood: MoodSchema.nullish() }),
]);

/** Clean up the dream, extract symbols and an image prompt. With dreamId, results are saved. */
export const POST = handle(async (req) => {
  const body = await readJson(req, Body);
  if ("dreamId" in body) {
    const dream = getDream(body.dreamId);
    if (!dream) throw new HttpError(404, "Dream not found");
    const mood = MoodSchema.nullable().catch(null).parse(dream.mood);
    const analysis = await analyzeDream(dream.rawText, body.answers, mood);
    if (body.answers.length) setFollowups(dream.id, body.answers);
    updateDream(dream.id, {
      cleanedText: analysis.cleanedText,
      title: analysis.title,
      imagePrompt: analysis.imagePrompt,
    });
    setSymbols(dream.id, analysis.symbols);
    return NextResponse.json(analysis);
  }
  return NextResponse.json(await analyzeDream(body.rawText, body.answers, body.mood ?? null));
});
