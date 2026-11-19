import type { Analysis, Answer } from "../schemas";
import type { Mood, PaintStyle, PoemStyle } from "@/lib/constants";

export type ReflectionInput = {
  monthLabel: string;
  dreamCount: number;
  topSymbols: { name: string; count: number }[];
  moods: { mood: string; count: number }[];
};

/** Everything the app needs from a text model. Outputs are validated by lib/ai/text.ts. */
export interface TextProvider {
  name: string;
  followups(rawText: string): Promise<string[]>;
  analyze(rawText: string, answers: Answer[], mood: Mood | null): Promise<Analysis>;
  poem(cleanedText: string, style: PoemStyle): Promise<string>;
  reflection(input: ReflectionInput): Promise<string>;
}

export type Painting = { data: Uint8Array; mimeType: "image/svg+xml" | "image/png" | "image/jpeg" | "image/webp" };

export interface ImageProvider {
  name: string;
  paint(imagePrompt: string, style: PaintStyle, mood: Mood | null): Promise<Painting>;
}

/** A provider failure with a safe, user-facing message (never includes dream text). */
export class ProviderError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
