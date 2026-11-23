import "server-only";
import { z } from "zod";
import type { ImageProvider } from "./types";
import { ProviderError } from "./types";
import { paintingPrompt } from "./prompts";

const Config = z.object({
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is not set"),
  OPENAI_IMAGE_MODEL: z.string().min(1).default("gpt-image-2"),
  OPENAI_IMAGE_SIZE: z.string().regex(/^(\d{3,4}x\d{3,4}|auto)$/).default("1024x1536"),
  OPENAI_IMAGE_QUALITY: z.enum(["low", "medium", "high", "auto"]).default("medium"),
});

const Response = z.object({ data: z.array(z.object({ b64_json: z.string().min(100) })).min(1) });
const ErrorBody = z.object({ error: z.object({ code: z.string().nullish(), type: z.string().nullish() }) }).partial();

const blank = (v: string | undefined) => (v?.trim() ? v.trim() : undefined);

/** OpenAI GPT Image. Only the image prompt (never the raw dream text) is sent. */
export function openaiImage(): ImageProvider {
  return {
    name: "openai",
    async paint(imagePrompt, style, mood) {
      const parsed = Config.safeParse({
        OPENAI_API_KEY: blank(process.env.OPENAI_API_KEY),
        OPENAI_IMAGE_MODEL: blank(process.env.OPENAI_IMAGE_MODEL),
        OPENAI_IMAGE_SIZE: blank(process.env.OPENAI_IMAGE_SIZE),
        OPENAI_IMAGE_QUALITY: blank(process.env.OPENAI_IMAGE_QUALITY),
      });
      if (!parsed.success) throw new ProviderError(500, "The painter isn't set up yet (check OPENAI_* in .env.local).");
      const cfg = parsed.data;

      const prompt = paintingPrompt(imagePrompt, style, mood);

      let res: globalThis.Response;
      try {
        res = await fetch("https://api.openai.com/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${cfg.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: cfg.OPENAI_IMAGE_MODEL,
            prompt,
            n: 1,
            size: cfg.OPENAI_IMAGE_SIZE,
            quality: cfg.OPENAI_IMAGE_QUALITY,
            output_format: "webp",
            output_compression: 85,
          }),
          signal: AbortSignal.timeout(180_000),
        });
      } catch (e) {
        const timeout = e instanceof Error && e.name === "TimeoutError";
        throw new ProviderError(504, timeout ? "The painter took too long. Please try again." : "Couldn't reach the painter. Check your connection.");
      }

      if (!res.ok) {
        const body = ErrorBody.safeParse(await res.json().catch(() => ({})));
        const code = body.success ? body.data.error?.code : undefined;
        // Log status and code only: OpenAI error messages can echo the prompt.
        console.error("[ai] openai image error:", res.status, code ?? "");
        if (res.status === 401) throw new ProviderError(502, "The painter's API key is missing or invalid (check .env.local).");
        if (res.status === 429) throw new ProviderError(503, "The painter is busy. Try again in a moment.");
        if (code === "moderation_blocked" || code === "content_policy_violation")
          throw new ProviderError(422, "The painter couldn't paint this one. Try another style, or soften a detail.");
        throw new ProviderError(502, "The painter had a problem. Please try again.");
      }

      const data = Response.safeParse(await res.json().catch(() => null));
      if (!data.success) throw new ProviderError(502, "The painter returned an unexpected result.");
      return { data: new Uint8Array(Buffer.from(data.data.data[0].b64_json, "base64")), mimeType: "image/webp" };
    },
  };
}
