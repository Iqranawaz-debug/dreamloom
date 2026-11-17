import "server-only";
import { getTextProvider } from "./providers";
import type { ReflectionInput } from "./providers/types";
import {
  AnalysisSchema,
  AnswerSchema,
  DreamTextSchema,
  FollowupsSchema,
  MoodSchema,
  PoemSchema,
  PoemStyleSchema,
  ReflectionSchema,
  type Analysis,
  type Answer,
} from "./schemas";
import type { Mood, PoemStyle } from "@/lib/constants";

/** Thrown when a provider returns something that fails validation. */
export class AiOutputError extends Error {
  constructor(what: string, cause?: unknown) {
    super(`The AI returned an invalid ${what}.`, { cause });
    this.name = "AiOutputError";
  }
}

function check<T>(what: string, parse: () => T): T {
  try {
    return parse();
  } catch (e) {
    throw new AiOutputError(what, e);
  }
}

export async function generateFollowups(rawText: string): Promise<string[]> {
  const text = DreamTextSchema.parse(rawText);
  const out = await getTextProvider().followups(text);
  return check("set of questions", () => FollowupsSchema.parse(out.slice(0, 3)));
}

export async function analyzeDream(rawText: string, answers: Answer[], mood: Mood | null): Promise<Analysis> {
  const text = DreamTextSchema.parse(rawText);
  const qa = AnswerSchema.array().max(3).parse(answers);
  const m = mood ? MoodSchema.parse(mood) : null;
  const out = await getTextProvider().analyze(text, qa, m);
  return check("analysis", () => {
    // Normalise symbols before strict validation: lowercase, single word, deduped, max 6.
    const symbols = [...new Set(out.symbols.map((s) => s.trim().toLowerCase().split(/\s+/)[0]))].slice(0, 6);
    return AnalysisSchema.parse({ ...out, symbols });
  });
}

export async function writePoem(cleanedText: string, style: PoemStyle): Promise<string> {
  const text = DreamTextSchema.parse(cleanedText);
  const s = PoemStyleSchema.parse(style);
  const out = await getTextProvider().poem(text, s);
  return check("poem", () => PoemSchema.parse(out.replace(/\r\n/g, "\n")));
}

export async function writeReflection(input: ReflectionInput): Promise<string> {
  const out = await getTextProvider().reflection(input);
  return check("reflection", () => ReflectionSchema.parse(out));
}
