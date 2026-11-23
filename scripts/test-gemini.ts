/**
 * Offline check of the Gemini providers: fetch is stubbed, so no key or network is used.
 *   npm run test:gemini
 */
import "./env";
import assert from "node:assert/strict";
import { geminiText } from "@/lib/ai/providers/gemini-text";
import { geminiImage } from "@/lib/ai/providers/gemini-image";
import { ProviderError } from "@/lib/ai/providers/types";

type Call = { url: string; headers: Record<string, string>; body: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
const calls: Call[] = [];
let reply: () => Response;
globalThis.fetch = (async (url: string, init: RequestInit) => {
  calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
  return reply();
}) as typeof fetch;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const textReply = (obj: unknown, finishReason = "STOP") => () =>
  json(200, { candidates: [{ content: { parts: [{ text: "thinking...", thought: true }, { text: JSON.stringify(obj) }] }, finishReason }] });

async function rejects(fn: () => Promise<unknown>, status: number, match: RegExp) {
  await assert.rejects(fn, (e: unknown) => e instanceof ProviderError && e.status === status && match.test(e.message));
}

async function main() {
  process.env.GEMINI_API_KEY = "test-key-not-real";
  for (const k of ["GEMINI_TEXT_MODEL", "GEMINI_IMAGE_MODEL", "GEMINI_IMAGE_ASPECT", "GEMINI_IMAGE_SIZE"]) delete process.env[k];
  const text = geminiText();

  reply = textReply({ questions: ["What colors stayed with you?", "Where were you?"] });
  const qs = await text.followups("I walked through a silver forest under a huge moon.");
  assert.deepEqual(qs, ["What colors stayed with you?", "Where were you?"]);
  const c = calls[0];
  assert.equal(c.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
  assert.equal(c.headers["x-goog-api-key"], "test-key-not-real");
  assert.equal(c.body.generationConfig.responseMimeType, "application/json");
  assert.equal(c.body.generationConfig.responseJsonSchema.type, "object");
  assert.equal(c.body.generationConfig.responseJsonSchema.$schema, undefined);
  assert.match(c.body.systemInstruction.parts[0].text, /Dream Painter/);
  assert.match(c.body.contents[0].parts[0].text, /<dream>/);
  console.log("ok  text request shape, thought parts skipped");

  reply = textReply({ cleanedText: "I walked.", title: "Silver Wood", symbols: ["forest", "moon", "light"], imagePrompt: "A silver forest under a vast moon" });
  const a = await text.analyze("I walked through a silver forest.", [{ question: "Where?", answer: "A forest" }], "calm");
  assert.equal(a.title, "Silver Wood");
  reply = textReply({ poem: "line one\nline two\nline three\nline four" });
  assert.match(await text.poem("I walked.", "free-verse"), /line four/);
  reply = textReply({ paragraph: "Moons returned this month." });
  assert.equal(await text.reflection({ monthLabel: "November 2026", dreamCount: 2, topSymbols: [], moods: [] }), "Moons returned this month.");
  console.log("ok  analyze, poem, reflection");

  process.env.GEMINI_TEXT_MODEL = "gemini-3.5-flash-lite";
  reply = textReply({ poem: "a\nb\nc\nd" });
  await text.poem("I walked.", "haiku");
  assert.match(calls.at(-1)!.url, /gemini-3\.5-flash-lite:generateContent$/);
  process.env.GEMINI_TEXT_MODEL = "../evil";
  await rejects(() => text.poem("I walked.", "haiku"), 500, /model name/);
  delete process.env.GEMINI_TEXT_MODEL;
  console.log("ok  model override and validation");

  reply = () => json(200, { candidates: [{ content: { parts: [{ text: "not json" }] }, finishReason: "STOP" }] });
  await rejects(() => text.followups("a dream here"), 502, /unexpected format/);
  reply = () => json(200, { promptFeedback: { blockReason: "SAFETY" } });
  await rejects(() => text.followups("a dream here"), 422, /couldn't work/);
  reply = textReply({}, "SAFETY");
  await rejects(() => text.followups("a dream here"), 422, /couldn't work/);
  reply = textReply({}, "MAX_TOKENS");
  await rejects(() => text.followups("a dream here"), 502, /cut off/);
  reply = () => json(400, { error: { status: "INVALID_ARGUMENT", message: "API key not valid. Please pass a valid API key." } });
  await rejects(() => text.followups("a dream here"), 502, /API key/);
  reply = () => json(403, { error: { status: "PERMISSION_DENIED" } });
  await rejects(() => text.followups("a dream here"), 502, /API key/);
  reply = () => json(429, { error: { status: "RESOURCE_EXHAUSTED" } });
  await rejects(() => text.followups("a dream here"), 503, /limit/);
  reply = () => json(400, { error: { status: "FAILED_PRECONDITION" } });
  await rejects(() => text.followups("a dream here"), 502, /billing/);
  reply = () => json(404, { error: { status: "NOT_FOUND" } });
  await rejects(() => text.followups("a dream here"), 502, /model/);
  process.env.GEMINI_API_KEY = "";
  await rejects(() => text.followups("a dream here"), 500, /GEMINI_API_KEY/);
  process.env.GEMINI_API_KEY = "test-key-not-real";
  console.log("ok  errors and safety blocks");

  const png = Buffer.alloc(400, 9);
  reply = () => json(200, { candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: png.toString("base64") } }] }, finishReason: "STOP" }] });
  const img = await geminiImage().paint("A silver forest under a vast moon", "watercolor", "calm");
  const ic = calls.at(-1)!;
  assert.match(ic.url, /gemini-nano-banana-2\.1:generateContent$/);
  assert.deepEqual(ic.body.generationConfig.responseModalities, ["IMAGE"]);
  assert.deepEqual(ic.body.generationConfig.imageConfig, { aspectRatio: "2:3", imageSize: "1K" });
  assert.match(ic.body.contents[0].parts[0].text, /watercolor/);
  assert.equal(img.mimeType, "image/png");
  assert.deepEqual(Buffer.from(img.data), png);
  reply = () => json(200, { candidates: [{ content: { parts: [{ text: "I can't draw that" }] }, finishReason: "STOP" }] });
  await rejects(() => geminiImage().paint("A silver forest under a vast moon", "oil", null), 502, /didn't return a painting/);
  reply = () => json(200, { candidates: [{ finishReason: "IMAGE_SAFETY" }] });
  await rejects(() => geminiImage().paint("A silver forest under a vast moon", "oil", null), 422, /couldn't work/);
  process.env.GEMINI_IMAGE_ASPECT = "7:3";
  await rejects(() => geminiImage().paint("A silver forest under a vast moon", "oil", null), 500, /supported value/);
  console.log("ok  image request, decoding and errors\n\nGemini checks passed.");
}

main().catch((e) => {
  console.error("\nGemini test FAILED:", e);
  process.exit(1);
});
