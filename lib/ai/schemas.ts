import { z } from "zod";
import { MAX_ANSWER_CHARS, MAX_DREAM_CHARS, MOOD_IDS, PAINT_STYLE_IDS, POEM_STYLE_IDS } from "@/lib/constants";

// ---- Inputs (validated at API boundaries and inside lib/ai/text.ts) ----
export const DreamTextSchema = z.string().trim().min(3, "Tell a little more of the dream").max(MAX_DREAM_CHARS);
/** Retold dream: the raw text plus folded-in answers, so it may be longer than the capture limit. */
export const CleanedTextSchema = z.string().trim().min(3).max(MAX_DREAM_CHARS + 2000);
export const MoodSchema = z.enum(MOOD_IDS);
export const PaintStyleSchema = z.enum(PAINT_STYLE_IDS);
export const PoemStyleSchema = z.enum(POEM_STYLE_IDS);
export const AnswerSchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().max(MAX_ANSWER_CHARS).optional().default(""),
});
export type Answer = z.infer<typeof AnswerSchema>;

// ---- Outputs (every provider result is checked against these) ----
export const FollowupsSchema = z.array(z.string().trim().min(5).max(200)).min(2).max(3);

export const SymbolSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z]{2,20}$/, "symbols are single lowercase nouns");

export const AnalysisSchema = z.object({
  cleanedText: CleanedTextSchema,
  title: z.string().trim().min(1).max(80),
  symbols: z.array(SymbolSchema).min(3).max(6),
  imagePrompt: z.string().trim().min(10).max(1500),
});
export type Analysis = z.infer<typeof AnalysisSchema>;

export const PoemSchema = z
  .string()
  .trim()
  .refine((p) => {
    const n = p.split("\n").filter((l) => l.trim()).length;
    return n >= 4 && n <= 8;
  }, "poem must be 4-8 lines");

export const ReflectionSchema = z.string().trim().min(20).max(1200);
