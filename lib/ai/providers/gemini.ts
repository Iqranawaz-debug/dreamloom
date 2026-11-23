import "server-only";
import { z } from "zod";
import { ProviderError } from "./types";

/** Minimal raw-HTTP client for the Gemini API (generateContent). Never logs prompts or replies. */

const Part = z.object({
  text: z.string().optional(),
  thought: z.boolean().optional(),
  inlineData: z.object({ mimeType: z.string(), data: z.string() }).optional(),
});
const GenerateResponse = z.object({
  candidates: z
    .array(z.object({ content: z.object({ parts: z.array(Part).default([]) }).optional(), finishReason: z.string().optional() }))
    .optional(),
  promptFeedback: z.object({ blockReason: z.string().optional() }).optional(),
});
const ErrorBody = z.object({ error: z.object({ status: z.string().optional(), message: z.string().optional() }).optional() });
export type GeminiPart = z.infer<typeof Part>;

const BLOCKED = /SAFETY|PROHIBITED|BLOCKLIST|SPII|RECITATION/;

export function geminiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new ProviderError(500, "Gemini isn't set up yet (add GEMINI_API_KEY to .env.local).");
  return key;
}

export async function generateContent(model: string, body: object, timeoutMs: number): Promise<GeminiPart[]> {
  if (!/^[a-z0-9.-]+$/i.test(model)) throw new ProviderError(500, "The Gemini model name in .env.local looks wrong.");
  let res: Response;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": geminiKey(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new ProviderError(504, timeout ? "Gemini took too long. Please try again." : "Couldn't reach Gemini. Check your connection.");
  }

  if (!res.ok) {
    const parsed = ErrorBody.safeParse(await res.json().catch(() => ({})));
    const status = parsed.success ? (parsed.data.error?.status ?? "") : "";
    const badKey = parsed.success && /api key/i.test(parsed.data.error?.message ?? ""); // used for matching only, never logged
    console.error("[ai] gemini error:", res.status, status); // status only: messages can echo the prompt
    if (res.status === 401 || res.status === 403 || badKey)
      throw new ProviderError(502, "The Gemini API key is missing or invalid (check .env.local).");
    if (res.status === 429) throw new ProviderError(503, "Gemini's free limit is used up for now. Try again later.");
    if (res.status === 402) throw new ProviderError(502, "Gemini credits have run out. Add billing in Google AI Studio.");
    if (res.status === 400 && status === "FAILED_PRECONDITION")
      throw new ProviderError(502, "Gemini's free tier isn't available here. Enable billing in Google AI Studio.");
    if (res.status === 404) throw new ProviderError(502, "That Gemini model isn't available (check the model name in .env.local).");
    throw new ProviderError(502, "Gemini had a problem. Please try again.");
  }

  const data = GenerateResponse.safeParse(await res.json().catch(() => null));
  if (!data.success) throw new ProviderError(502, "Gemini returned an unexpected result.");
  const blockReason = data.data.promptFeedback?.blockReason;
  const candidate = data.data.candidates?.[0];
  if (blockReason || BLOCKED.test(candidate?.finishReason ?? ""))
    throw new ProviderError(422, "Gemini couldn't work with this one. Try softening a detail, or another style.");
  if (candidate?.finishReason === "MAX_TOKENS") throw new ProviderError(502, "Gemini's answer was cut off. Please try again.");
  return candidate?.content?.parts ?? [];
}
