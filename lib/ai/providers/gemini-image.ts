import "server-only";
import type { ImageProvider, Painting } from "./types";
import { ProviderError } from "./types";
import { generateContent } from "./gemini";
import { paintingPrompt } from "./prompts";

const ASPECTS = new Set(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]);
const SIZES = new Set(["512", "1K", "2K", "4K"]);
const MIME: Record<string, Painting["mimeType"]> = { "image/png": "image/png", "image/jpeg": "image/jpeg", "image/webp": "image/webp" };

/** Gemini native image generation ("Nano Banana"). Paid tier only. Sends the image prompt, never raw dream text. */
export function geminiImage(): ImageProvider {
  return {
    name: "gemini",
    async paint(imagePrompt, style, mood) {
      const aspect = process.env.GEMINI_IMAGE_ASPECT?.trim() || "2:3";
      const size = process.env.GEMINI_IMAGE_SIZE?.trim() || "1K";
      if (!ASPECTS.has(aspect) || !SIZES.has(size))
        throw new ProviderError(500, "GEMINI_IMAGE_ASPECT or GEMINI_IMAGE_SIZE in .env.local isn't a supported value.");

      const parts = await generateContent(
        process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-nano-banana-2.1",
        {
          contents: [{ role: "user", parts: [{ text: paintingPrompt(imagePrompt, style, mood) }] }],
          generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: aspect, imageSize: size } },
        },
        180_000,
      );
      const image = parts.find((p) => p.inlineData && MIME[p.inlineData.mimeType]);
      if (!image?.inlineData) throw new ProviderError(502, "Gemini didn't return a painting. Please try again.");
      return { data: new Uint8Array(Buffer.from(image.inlineData.data, "base64")), mimeType: MIME[image.inlineData.mimeType] };
    },
  };
}
