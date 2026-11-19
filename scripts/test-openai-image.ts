/**
 * Offline check of the OpenAI painter: fetch is stubbed, so no key or network is used.
 *   npm run test:openai-image
 */
import "./env";
import assert from "node:assert/strict";
import { openaiImage } from "@/lib/ai/providers/openai-image";
import { ProviderError } from "@/lib/ai/providers/types";

type Call = { url: string; headers: Record<string, string>; body: Record<string, unknown> };
const calls: Call[] = [];
let reply: () => Response;

globalThis.fetch = (async (url: string, init: RequestInit) => {
  calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
  return reply();
}) as typeof fetch;

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function expectError(status: number, match: RegExp) {
  await assert.rejects(
    () => openaiImage().paint("A lighthouse on a sea of stars", "oil", "weird"),
    (e: unknown) => e instanceof ProviderError && e.status === status && match.test(e.message),
  );
}

async function main() {
  process.env.OPENAI_API_KEY = "test-key-not-real";
  delete process.env.OPENAI_IMAGE_MODEL;
  delete process.env.OPENAI_IMAGE_SIZE;
  delete process.env.OPENAI_IMAGE_QUALITY;

  const fakeImage = Buffer.alloc(300, 7);
  reply = () => json(200, { data: [{ b64_json: fakeImage.toString("base64") }] });
  const out = await openaiImage().paint("A lighthouse on a sea of stars", "watercolor", "calm");
  const c = calls[0];
  assert.equal(c.url, "https://api.openai.com/v1/images/generations");
  assert.equal(c.headers.Authorization, "Bearer test-key-not-real");
  assert.equal(c.body.model, "gpt-image-2");
  assert.equal(c.body.size, "1024x1536");
  assert.equal(c.body.quality, "medium");
  assert.equal(c.body.output_format, "webp");
  assert.match(String(c.body.prompt), /lighthouse/);
  assert.match(String(c.body.prompt), /watercolor/);
  assert.match(String(c.body.prompt), /no text/);
  assert.equal(out.mimeType, "image/webp");
  assert.deepEqual(Buffer.from(out.data), fakeImage);
  console.log("ok  request shape and image decoding");

  process.env.OPENAI_IMAGE_QUALITY = "high";
  process.env.OPENAI_IMAGE_SIZE = "1536x1024";
  await openaiImage().paint("A lighthouse on a sea of stars", "anime", null);
  assert.equal(calls[1].body.quality, "high");
  assert.equal(calls[1].body.size, "1536x1024");
  console.log("ok  env overrides");

  reply = () => json(401, { error: { code: "invalid_api_key" } });
  await expectError(502, /API key/);
  reply = () => json(429, { error: { code: "rate_limit_exceeded" } });
  await expectError(503, /busy/);
  reply = () => json(400, { error: { code: "moderation_blocked" } });
  await expectError(422, /couldn't paint this one/);
  reply = () => json(500, {});
  await expectError(502, /problem/);
  reply = () => json(200, { data: [] });
  await expectError(502, /unexpected/);
  console.log("ok  error mapping");

  process.env.OPENAI_API_KEY = "";
  await expectError(500, /set up/);
  process.env.OPENAI_API_KEY = "test-key-not-real";
  process.env.OPENAI_IMAGE_QUALITY = "ultra";
  await expectError(500, /set up/);
  console.log("ok  config validation\n\nOpenAI painter checks passed.");
}

main().catch((e) => {
  console.error("\nOpenAI painter test FAILED:", e);
  process.exit(1);
});
