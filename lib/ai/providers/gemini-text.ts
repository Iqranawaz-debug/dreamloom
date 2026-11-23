import "server-only";
import { z } from "zod";
import type { TextProvider } from "./types";
import { ProviderError } from "./types";
import { generateContent } from "./gemini";
import { AnalysisOut, FollowupsOut, PoemOut, ReflectionOut, SYSTEM, analysisPrompt, followupsPrompt, poemPrompt, reflectionPrompt } from "./prompts";

/** JSON Schema for Gemini's structured output (a subset of JSON Schema; drop the $schema marker). */
function jsonSchema(schema: z.ZodType) {
  const { $schema: _ignored, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  void _ignored;
  return rest;
}

async function ask<T extends z.ZodType>(schema: T, prompt: string): Promise<z.infer<T>> {
  const parts = await generateContent(
    process.env.GEMINI_TEXT_MODEL?.trim() || "gemini-3.8-flash",
    {
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", responseJsonSchema: jsonSchema(schema), maxOutputTokens: 8192 },
    },
    90_000,
  );
  const text = parts
    .filter((p) => !p.thought && p.text)
    .map((p) => p.text)
    .join("");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new ProviderError(502, "Gemini returned an unexpected format. Please try again.");
  }
  const out = schema.safeParse(json);
  if (!out.success) throw new ProviderError(502, "Gemini returned an unexpected format. Please try again.");
  return out.data as z.infer<T>;
}

export function geminiText(): TextProvider {
  return {
    name: "gemini",
    followups: async (rawText) => (await ask(FollowupsOut, followupsPrompt(rawText))).questions,
    analyze: (rawText, answers, mood) => ask(AnalysisOut, analysisPrompt(rawText, answers, mood)),
    poem: async (cleanedText, style) => (await ask(PoemOut, poemPrompt(cleanedText, style))).poem,
    reflection: async (input) => (await ask(ReflectionOut, reflectionPrompt(input))).paragraph,
  };
}
