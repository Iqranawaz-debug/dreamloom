/**
 * Runs the whole pipeline (followups -> analyze -> paint -> poem -> save) against the
 * configured providers, checks each step, then deletes the test dream.
 *
 *   npm run test:pipeline              (mock AI, no delay)
 *   USE_MOCK_AI=false npm run test:pipeline   (real providers; uses your API key)
 */
import "./env";
import assert from "node:assert/strict";
import { analyzeDream, generateFollowups, writePoem } from "@/lib/ai/text";
import { generatePainting } from "@/lib/ai/image";
import { isMockAi } from "@/lib/ai/providers";
import { addSymbols, createDream, deleteDream, getDream, setFollowups, updateDream } from "@/lib/db/queries";
import { deleteImage, readImage } from "@/lib/storage";

const DREAM = "I was walking up endless stairs inside a lighthouse while the ocean rose outside the windows. A cat was waiting at the top.";

async function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const t = Date.now();
  const out = await fn();
  console.log(`ok  ${name} (${Date.now() - t} ms)`);
  return out;
}

async function main() {
  console.log(`Providers: ${isMockAi() ? "mock" : "real"}\n`);
  const id = createDream({ rawText: DREAM, mood: "weird" });
  let imageUrl: string | undefined;
  try {
    const questions = await step("followups", () => generateFollowups(DREAM));
    assert.ok(questions.length >= 2 && questions.length <= 3);
    const answers = questions.map((q, i) => ({ question: q, answer: i === 0 ? "Sea green and gold" : "" }));

    const analysis = await step("analyze", () => analyzeDream(DREAM, answers, "weird"));
    assert.ok(analysis.symbols.length >= 3 && analysis.symbols.length <= 6);
    assert.ok(analysis.symbols.every((s) => /^[a-z]+$/.test(s)));
    if (isMockAi()) assert.ok(analysis.symbols.includes("stairs") && analysis.symbols.includes("water"));

    ({ imageUrl } = await step("paint", () => generatePainting(analysis.imagePrompt, "watercolor", "weird")));
    const file = await readImage(imageUrl.split("/").pop()!);
    assert.ok(file && file.length > 500, "painting saved to disk");

    const poem = await step("poem", () => writePoem(analysis.cleanedText, "haiku"));
    const lines = poem.split("\n").filter((l) => l.trim()).length;
    assert.ok(lines >= 4 && lines <= 8);

    await step("save", async () => {
      setFollowups(id, answers);
      updateDream(id, { ...analysis, imageUrl, poem, style: "watercolor", poemStyle: "haiku" });
      addSymbols(id, analysis.symbols);
    });
    const saved = getDream(id);
    assert.equal(saved?.symbols.length, analysis.symbols.length);
    assert.equal(saved?.followups.length, answers.length);

    // Validation should reject bad input before any provider call.
    await assert.rejects(() => generateFollowups("  "));
    await assert.rejects(() => writePoem("a valid dream text", "sonnet" as never));
    console.log("ok  input validation\n");

    console.log(`Title:   ${analysis.title}\nSymbols: ${analysis.symbols.join(", ")}\n\n${poem}\n\nAll pipeline checks passed.`);
  } finally {
    deleteDream(id);
    await deleteImage(imageUrl);
  }
}

main().catch((e) => {
  console.error("\nPipeline test FAILED:", e);
  process.exit(1);
});
