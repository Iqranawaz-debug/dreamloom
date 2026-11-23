import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import type { TextProvider } from "./types";
import { AnalysisOut, FollowupsOut, PoemOut, ReflectionOut, SYSTEM, analysisPrompt, followupsPrompt, poemPrompt, reflectionPrompt } from "./prompts";

let client: Anthropic | undefined;
const getClient = () => (client ??= new Anthropic()); // reads ANTHROPIC_API_KEY server-side

async function ask<T extends z.ZodType>(schema: T, prompt: string, effort: "low" | "medium" = "low"): Promise<z.infer<T>> {
  const res = await getClient().beta.messages.parse({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
    max_tokens: 4000,
    system: SYSTEM,
    // If a safety classifier declines, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: betaZodOutputFormat(schema) },
    messages: [{ role: "user", content: prompt }],
  });
  if (res.stop_reason === "refusal") throw new Error("The model declined this request.");
  if (res.stop_reason === "max_tokens") throw new Error("The model response was cut off.");
  if (!res.parsed_output) throw new Error("The model returned an unexpected format.");
  return res.parsed_output as z.infer<T>;
}

export function anthropicText(): TextProvider {
  return {
    name: "anthropic",
    followups: async (rawText) => (await ask(FollowupsOut, followupsPrompt(rawText))).questions,
    analyze: (rawText, answers, mood) => ask(AnalysisOut, analysisPrompt(rawText, answers, mood), "medium"),
    poem: async (cleanedText, style) => (await ask(PoemOut, poemPrompt(cleanedText, style), "medium")).poem,
    reflection: async (input) => (await ask(ReflectionOut, reflectionPrompt(input))).paragraph,
  };
}
