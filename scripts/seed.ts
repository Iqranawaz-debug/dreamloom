/**
 * Seed 15 sample dreams spread over the last 2 months using the mock AI.
 * Re-runnable: previous sample dreams (and their paintings) are removed first.
 * Your own dreams are never touched.
 *
 *   npm run db:seed
 */
import "./env";
import { mockText } from "@/lib/ai/providers/mock-text";
import { paintSvg } from "@/lib/ai/providers/mock-image";
import { savePainting, deleteImage } from "@/lib/storage";
import { addSymbols, createDream, deleteSampleDreams, setFollowups, updateDream } from "@/lib/db/queries";
import type { Mood, PaintStyle, PoemStyle } from "@/lib/constants";

type Sample = { text: string; mood: Mood; style: PaintStyle; poem: PoemStyle; answers: string[] };

const SAMPLES: Sample[] = [
  { text: "I was swimming in a warm ocean at night and the water was glowing blue around my hands. Whales sang somewhere below me.", mood: "calm", style: "watercolor", poem: "free-verse", answers: ["Deep blue and silver", "Open sea, no land anywhere", "Peaceful, like being held"] },
  { text: "I was flying over my old school, but the roof was a garden full of tall flowers and my friends were waving from below.", mood: "joyful", style: "dreamy-digital", poem: "rhyming", answers: ["Pink and gold", "", "Light and free"] },
  { text: "Something was chasing me through a dark forest. Every door I opened led back to the same clearing with the moon above.", mood: "scared", style: "oil", poem: "haiku", answers: ["Black and a pale moon", "A forest that kept looping", ""] },
  { text: "My grandmother's house had an extra room I had never seen. Inside it was raining softly onto the carpet.", mood: "sad", style: "watercolor", poem: "free-verse", answers: ["Grey and faded yellow", "Her house, but bigger", "Homesick"] },
  { text: "The stairs in my apartment kept going up forever and each floor had a clock showing a different time.", mood: "confused", style: "surrealist", poem: "free-verse", answers: ["Brass and green", "", "Late for something"] },
  { text: "A fish was teaching a class about the stars, and everyone took notes on leaves. The classroom was underwater.", mood: "weird", style: "anime", poem: "rhyming", answers: ["Turquoise", "An underwater school", "Amused"] },
  { text: "I was on a train crossing a long bridge over a frozen lake. Snow fell upward past the windows.", mood: "calm", style: "oil", poem: "haiku", answers: ["White and lavender", "", "Quiet"] },
  { text: "I lost all my teeth while giving a speech, but they turned into little pearls and rolled into the sea.", mood: "weird", style: "surrealist", poem: "free-verse", answers: ["Pearl white", "A stage by the water", ""] },
  { text: "My dog and I were walking through a city made of glass at sunset. The buildings hummed like music.", mood: "joyful", style: "dreamy-digital", poem: "rhyming", answers: ["Orange and rose", "A glass city", "Happy and curious"] },
  { text: "I was falling from a cliff but slowly, like a feather, and the falling turned into floating above the clouds.", mood: "calm", style: "watercolor", poem: "haiku", answers: ["Soft white and blue", "", "Relieved"] },
  { text: "There was a mirror in a hallway that showed me as a child. When I touched it, the hallway became a maze.", mood: "confused", style: "surrealist", poem: "free-verse", answers: ["Silver", "A long hallway", "Unsure"] },
  { text: "A fire was burning in the middle of a snowy mountain and nobody could put it out, but it was not hot.", mood: "weird", style: "oil", poem: "rhyming", answers: ["Red against white", "", ""] },
  { text: "I could not find my keys and the house kept rearranging itself. Every room had a locked door.", mood: "scared", style: "anime", poem: "free-verse", answers: ["Dim yellow", "My house, but wrong", "Anxious"] },
  { text: "I sat in a boat on a quiet lake with my brother and we watched lanterns float up into the stars.", mood: "joyful", style: "watercolor", poem: "haiku", answers: ["Gold lanterns on dark water", "A mountain lake", "Warm"] },
  { text: "The moon came down and sat in my garden. It was the size of a car and smelled like rain.", mood: "sad", style: "dreamy-digital", poem: "free-verse", answers: ["Silver and deep green", "", "Tender"] },
];

async function main() {
  const removed = deleteSampleDreams();
  await Promise.all(removed.map((d) => deleteImage(d.imageUrl)));
  console.log(`Removed ${removed.length} previous sample dream(s).`);

  const now = Date.now();
  const DAY = 86_400_000;
  for (let i = 0; i < SAMPLES.length; i++) {
    const s = SAMPLES[i];
    // spread across ~60 days, newest first in the array = most recent
    const createdAt = new Date(now - Math.round((i * 60) / SAMPLES.length) * DAY - (i % 4) * 3_600_000 - 6 * 3_600_000);
    const id = createDream({ rawText: s.text, mood: s.mood, createdAt, isSample: true });
    const questions = await mockText.followups(s.text);
    const answers = questions.map((q, j) => ({ question: q, answer: s.answers[j] ?? "" }));
    const analysis = await mockText.analyze(s.text, answers, s.mood);
    const poem = await mockText.poem(analysis.cleanedText, s.poem);
    const imageUrl = await savePainting({
      data: new TextEncoder().encode(paintSvg(analysis.imagePrompt, s.style, s.mood)),
      mimeType: "image/svg+xml",
    });
    setFollowups(id, answers);
    updateDream(id, {
      cleanedText: analysis.cleanedText,
      title: analysis.title,
      imagePrompt: analysis.imagePrompt,
      imageUrl,
      poem,
      style: s.style,
      poemStyle: s.poem,
    });
    addSymbols(id, analysis.symbols);
    console.log(`  #${id} ${analysis.title}  [${analysis.symbols.join(", ")}]`);
  }
  console.log(`Seeded ${SAMPLES.length} sample dreams.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
