import type { TextProvider } from "./types";
import type { Answer } from "../schemas";
import type { Mood, PoemStyle } from "@/lib/constants";
import { hashString, mockDelay, rng } from "./random";

// keyword pattern -> symbol
const SYMBOL_KEYWORDS: [RegExp, string][] = [
  [/\b(water|ocean|sea|lake|river|waves?|swim\w*|rain|flood\w*|pool)\b/i, "water"],
  [/\b(fly|flying|flew|float\w*|soar\w*|wings?)\b/i, "flying"],
  [/\b(fall|falling|fell|cliff)\b/i, "falling"],
  [/\b(house|home|rooms?|apartment|attic|basement)\b/i, "house"],
  [/\b(stairs?|staircase|steps|ladder)\b/i, "stairs"],
  [/\b(doors?|doorway|gate)\b/i, "door"],
  [/\b(forest|woods|trees?|jungle)\b/i, "forest"],
  [/\b(moon|moonlight)\b/i, "moon"],
  [/\b(sun|sunlight|sunset|sunrise)\b/i, "sun"],
  [/\b(stars?|galaxy|space|planets?)\b/i, "stars"],
  [/\b(chased|chasing|chase|running|ran|escap\w*)\b/i, "chase"],
  [/\b(teeth|tooth)\b/i, "teeth"],
  [/\b(school|exam|class|teacher)\b/i, "school"],
  [/\b(train|station|bus|car|driving|road)\b/i, "journey"],
  [/\b(mother|mom|father|dad|sister|brother|grandma\w*|grandpa\w*|family)\b/i, "family"],
  [/\b(cats?|dogs?|birds?|fish|whale|horse|wolf|fox|snake)\b/i, "animal"],
  [/\b(mirrors?|reflection)\b/i, "mirror"],
  [/\b(fire|flames?|burning)\b/i, "fire"],
  [/\b(snow|ice|frozen|winter)\b/i, "snow"],
  [/\b(city|streets?|buildings?|tower)\b/i, "city"],
  [/\b(mountains?|hills?|peak)\b/i, "mountain"],
  [/\b(garden|flowers?|roses|bloom\w*)\b/i, "garden"],
  [/\b(clock|late|hurry\w*)\b/i, "clock"],
  [/\b(keys?|lock|locked)\b/i, "key"],
  [/\b(lost|maze|labyrinth|corridor|hallway)\b/i, "maze"],
  [/\b(light|glow\w*|lantern|candle)\b/i, "light"],
  [/\b(dark|darkness|shadows?|night)\b/i, "shadow"],
  [/\b(boat|ship|sail\w*)\b/i, "boat"],
  [/\b(music|song|singing|piano)\b/i, "music"],
  [/\b(bridge)\b/i, "bridge"],
];

const MOOD_FILLERS: Record<string, string[]> = {
  calm: ["light", "water", "garden", "moon"],
  joyful: ["sun", "flying", "garden", "music"],
  scared: ["shadow", "chase", "door", "maze"],
  sad: ["water", "house", "shadow", "boat"],
  weird: ["mirror", "clock", "stairs", "door"],
  confused: ["maze", "stairs", "door", "clock"],
};

export function extractSymbols(text: string, mood: string | null, seed: number): string[] {
  const found: string[] = [];
  for (const [re, sym] of SYMBOL_KEYWORDS) if (re.test(text) && !found.includes(sym)) found.push(sym);
  const fillers = rng(seed).shuffle(MOOD_FILLERS[mood ?? ""] ?? ["light", "door", "shadow", "water"]);
  for (const f of fillers) {
    if (found.length >= 3) break;
    if (!found.includes(f)) found.push(f);
  }
  return found.slice(0, 6);
}

const QUESTION_BANK = {
  color: [
    "What colors do you remember most clearly?",
    "Was the light soft, bright, or dim?",
    "If the dream had one color, what would it be?",
  ],
  setting: [
    "Where did the dream take place?",
    "Did the place feel familiar, or somewhere new?",
    "What was around you, near and far?",
  ],
  feeling: [
    "How did you feel when you woke up?",
    "Which moment stayed with you the most?",
    "Was there a feeling that lingered in the air?",
  ],
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const tidy = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/\bi\b/g, "I")
    .replace(/(^|[.!?]\s+)([a-z])/g, (_m, p: string, c: string) => p + c.toUpperCase())
    .trim()
    .replace(/([^.!?])$/, "$1.");

const TITLE_PATTERNS = [
  (a: string, b: string) => `The ${a} and the ${b}`,
  (a: string) => `A ${a} Remembered`,
  (a: string, b: string) => `Where the ${a} Meets the ${b}`,
  (a: string) => `Beneath the ${a}`,
  (a: string, b: string) => `${a} in the ${b}`,
];

const MOOD_ATMOSPHERE: Record<string, string> = {
  calm: "still, hushed, pale blue light",
  joyful: "warm golden light, gentle breeze",
  scared: "deep shadows, a tense quiet",
  sad: "rain-soft greys, a lonely hush",
  weird: "impossible geometry, shifting colors",
  confused: "blurred edges, overlapping spaces",
};

const POEM_IMAGES: Record<string, string[]> = {
  water: ["the water kept my name", "a tide that knew the way"],
  flying: ["the air held me like a hand", "I rose above the sleeping roofs"],
  falling: ["the ground forgot to catch me", "I fell, and falling turned to flight"],
  house: ["a house with one more room", "the hallway breathed"],
  stairs: ["stairs that led to other stairs", "each step a softer floor"],
  door: ["a door left open, just enough", "behind the door, a quiet field"],
  forest: ["the trees leaned in to listen", "green hush of the old wood"],
  moon: ["the moon was close enough to touch", "a pale coin of moon"],
  sun: ["sunlight pooled in my palms", "a slow gold afternoon"],
  stars: ["stars like scattered salt", "the sky spilled its stars"],
  chase: ["something followed, then let go", "my feet were made of fog"],
  shadow: ["shadows soft as velvet", "the dark was only waiting"],
  light: ["a lantern no one carried", "light pooled at the edges"],
  garden: ["a garden growing backwards", "petals falling up"],
  mirror: ["my face, but not my face", "the mirror kept the room"],
};

const GENERIC_LINES = [
  "I woke with the night still on my skin",
  "and the morning did not ask me why",
  "some things only speak in sleep",
  "I carried it gently into the day",
  "the edges blurred, the feeling stayed",
  "everything was almost a word",
];

export const mockText: TextProvider = {
  name: "mock",

  async followups(rawText) {
    const seed = hashString(rawText);
    await mockDelay(seed);
    const r = rng(seed);
    const kinds = r.shuffle(["color", "setting", "feeling"] as const);
    const count = rawText.length > 220 ? 2 : 3;
    return kinds.slice(0, count).map((k) => r.pick(QUESTION_BANK[k]));
  },

  async analyze(rawText, answers: Answer[], mood: Mood | null) {
    const seed = hashString(rawText + mood);
    await mockDelay(seed);
    const r = rng(seed);
    const answered = answers.filter((a) => a.answer?.trim());
    const all = [rawText, ...answered.map((a) => a.answer)].join(" ");
    const symbols = extractSymbols(all, mood, seed);
    const extra = answered.map((a) => tidy(a.answer)).join(" ");
    const cleanedText = tidy(rawText) + (extra ? ` ${extra}` : "");
    const title = r.pick(TITLE_PATTERNS)(cap(symbols[0]), cap(symbols[1] ?? symbols[0]));
    const colorAnswer = answered.find((x) => /color|light/i.test(x.question))?.answer;
    const imagePrompt = [
      `A dreamlike scene featuring ${symbols.join(", ")}`,
      MOOD_ATMOSPHERE[mood ?? ""] ?? "soft, luminous atmosphere",
      colorAnswer ? `palette: ${colorAnswer.slice(0, 120)}` : null,
      "painterly, ethereal, no text",
    ]
      .filter(Boolean)
      .join("; ");
    return { cleanedText, title, symbols, imagePrompt };
  },

  async poem(cleanedText, style: PoemStyle) {
    const seed = hashString(cleanedText + style + Date.now());
    await mockDelay(seed);
    const symbols = extractSymbols(cleanedText, null, seed);
    const r = rng(seed);
    if (style === "haiku") {
      return [
        `${cap(symbols[0])} in the dark`,
        r.pick(["something I almost knew", "a hush before the morning", "the night held its breath"]),
        r.pick(["I wake, and it fades", "dawn folds it away", "and then, only sky"]),
        "",
        `Soft ${symbols[1] ?? "light"}, soft as sleep`,
        r.pick(["carried across the threshold", "drifting where I cannot follow", "remembered in my hands"]),
        r.pick(["the pillow still warm", "morning keeps the rest", "I keep what I can"]),
      ].join("\n");
    }
    if (style === "rhyming") {
      const middle = r.shuffle([
        [`I found the ${symbols[0]} waiting there,`, "a soft hello, a held-in air."],
        [`The ${symbols[1] ?? "night"} would shimmer, then would stay,`, "and ask me not to slip away."],
        [`And ${symbols[2] ?? "light"} kept whispering my name,`, "as if the dark and I were the same."],
      ]).slice(0, 2);
      return [
        "I wandered where the quiet goes,",
        "past doors that only sleeping knows.",
        ...middle.flat(),
        "But morning came on careful feet,",
        "and left the strange world incomplete.",
      ].join("\n");
    }
    const images = symbols.map((s) => (POEM_IMAGES[s] ? r.pick(POEM_IMAGES[s]) : `the ${s} was waiting there`));
    const lines = [...images, ...r.shuffle(GENERIC_LINES)].slice(0, r.int(5, 7));
    return lines.map((l, i) => (i === 0 ? cap(l) : l)).join("\n");
  },

  async reflection({ monthLabel, dreamCount, topSymbols, moods }) {
    await mockDelay(dreamCount);
    if (dreamCount === 0)
      return `No dreams were recorded in ${monthLabel} yet. Whenever one visits, it will have a place here.`;
    const sym = topSymbols.slice(0, 3).map((s) => s.name);
    const mood = [...moods].sort((a, b) => b.count - a.count)[0];
    const list = sym.length > 1 ? `${sym.slice(0, -1).join(", ")} and ${sym.at(-1)}` : sym[0];
    return [
      `In ${monthLabel} you recorded ${dreamCount} dream${dreamCount === 1 ? "" : "s"}.`,
      sym.length ? `Images of ${list} returned more than once, like familiar places your sleeping mind likes to wander.` : "",
      mood ? `Many of them carried a ${mood.mood} feeling.` : "",
      "These are simply patterns to notice, not meanings to decide. It might be interesting to see which of them come back next month.",
    ]
      .filter(Boolean)
      .join(" ");
  },
};
