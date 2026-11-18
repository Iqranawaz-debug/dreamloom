import { connection } from "next/server";
import { strToU8, zipSync, type Zippable } from "fflate";
import { handle } from "@/lib/api";
import { getDream, listDreams } from "@/lib/db/queries";
import { fileFromUrl, readImage } from "@/lib/storage";

/** Download every dream as dreams.json plus an images/ folder, zipped. */
export const GET = handle(async () => {
  await connection();
  const files: Zippable = {};
  const dreams = [];
  for (const { id } of listDreams()) {
    const d = getDream(id);
    if (!d) continue;
    const name = fileFromUrl(d.imageUrl);
    const data = name ? await readImage(name) : null;
    if (name && data) files[`images/${name}`] = new Uint8Array(data);
    dreams.push({
      id: d.id,
      createdAt: new Date(d.createdAt).toISOString(),
      title: d.title,
      mood: d.mood,
      rawText: d.rawText,
      cleanedText: d.cleanedText,
      poem: d.poem,
      poemStyle: d.poemStyle,
      style: d.style,
      imagePrompt: d.imagePrompt,
      image: name && data ? `images/${name}` : null,
      symbols: d.symbols,
      followups: d.followups.map((f) => ({ question: f.question, answer: f.answer })),
    });
  }
  files["dreams.json"] = strToU8(JSON.stringify({ exportedAt: new Date().toISOString(), count: dreams.length, dreams }, null, 2));
  const zip = zipSync(files, { level: 6 });
  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="dream-painter-export-${stamp}.zip"`,
      "Cache-Control": "no-store",
    },
  });
});
