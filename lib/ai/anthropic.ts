import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const TEXT_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

let client: Anthropic | undefined;

/** Server-only Anthropic client. Reads ANTHROPIC_API_KEY from the environment. */
export function getAnthropic() {
  client ??= new Anthropic();
  return client;
}
