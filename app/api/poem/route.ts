import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, IdSchema, handle, readJson } from "@/lib/api";
import { writePoem } from "@/lib/ai/text";
import { CleanedTextSchema, PoemStyleSchema } from "@/lib/ai/schemas";
import { getDream, updateDream } from "@/lib/db/queries";

const Body = z.union([
  z.object({ dreamId: IdSchema, style: PoemStyleSchema }),
  z.object({ cleanedText: CleanedTextSchema, style: PoemStyleSchema }),
]);

/** Write (or rewrite) the poem. With dreamId, it's saved on the dream. */
export const POST = handle(async (req) => {
  const body = await readJson(req, Body);
  if ("dreamId" in body) {
    const dream = getDream(body.dreamId);
    if (!dream) throw new HttpError(404, "Dream not found");
    const poem = await writePoem(dream.cleanedText ?? dream.rawText, body.style);
    updateDream(dream.id, { poem, poemStyle: body.style });
    return NextResponse.json({ poem });
  }
  return NextResponse.json({ poem: await writePoem(body.cleanedText, body.style) });
});
