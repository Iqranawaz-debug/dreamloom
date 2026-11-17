import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, IdSchema, handle, readJson } from "@/lib/api";
import { generateFollowups } from "@/lib/ai/text";
import { DreamTextSchema } from "@/lib/ai/schemas";
import { getDream, setFollowups } from "@/lib/db/queries";

const Body = z.union([z.object({ dreamId: IdSchema }), z.object({ rawText: DreamTextSchema })]);

/** 2-3 gentle questions. With dreamId, the questions are stored on the dream (answers come later). */
export const POST = handle(async (req) => {
  const body = await readJson(req, Body);
  if ("dreamId" in body) {
    const dream = getDream(body.dreamId);
    if (!dream) throw new HttpError(404, "Dream not found");
    if (dream.followups.length) return NextResponse.json({ questions: dream.followups.map((f) => f.question) });
    const questions = await generateFollowups(dream.rawText);
    setFollowups(dream.id, questions.map((question) => ({ question })));
    return NextResponse.json({ questions });
  }
  return NextResponse.json({ questions: await generateFollowups(body.rawText) });
});
