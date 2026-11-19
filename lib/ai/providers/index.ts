import "server-only";
import type { ImageProvider, TextProvider } from "./types";
import { mockText } from "./mock-text";
import { mockImage } from "./mock-image";
import { anthropicText } from "./anthropic-text";
import { openaiImage } from "./openai-image";

/**
 * Provider registry. To add a real provider: create a file in this folder that
 * implements TextProvider or ImageProvider, then add one line to the map below.
 * Nothing else in the app changes.
 */
const textProviders: Record<string, () => TextProvider> = {
  mock: () => mockText,
  anthropic: anthropicText,
};

const imageProviders: Record<string, () => ImageProvider> = {
  mock: () => mockImage,
  openai: openaiImage,
};

export const isMockAi = () => (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false";

function pick<T>(kind: string, map: Record<string, () => T>, configured: string | undefined, fallback: string): T {
  const name = isMockAi() ? "mock" : (configured || fallback);
  const make = map[name];
  if (!make) throw new Error(`Unknown ${kind} provider "${name}". Known: ${Object.keys(map).join(", ")}`);
  return make();
}

export const getTextProvider = () => pick("text", textProviders, process.env.TEXT_PROVIDER, "anthropic");
// Paintings stay on the mock painter unless IMAGE_PROVIDER names a real one.
export const getImageProvider = () => pick("image", imageProviders, process.env.IMAGE_PROVIDER, "mock");
