import "server-only";
import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError, z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import { AiOutputError } from "@/lib/ai/text";
import { ProviderError } from "@/lib/ai/providers/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

const MAX_BODY_BYTES = 64 * 1024;

/**
 * Parse and validate a JSON body. Requires application/json (forces a CORS preflight for
 * cross-site requests) and a same-origin Origin header, so other websites can't drive the API.
 */
export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  assertSameOrigin(req);
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Expected application/json");
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY_BYTES) throw new HttpError(413, "Request too large");
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "Request too large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid JSON");
  }
  return schema.parse(body);
}

export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return; // same-origin GETs and non-browser clients (scripts) omit it
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {}
  throw new HttpError(403, "Cross-origin request blocked");
}

export const IdSchema = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);

export async function parseId(params: Promise<{ id: string }>): Promise<number> {
  const r = IdSchema.safeParse((await params).id);
  if (!r.success) throw new HttpError(404, "Dream not found");
  return r.data;
}

/** Wrap a route handler with consistent JSON error responses. Never echoes dream text in logs. */
export function handle<Ctx>(fn: (req: Request, ctx: Ctx) => Promise<Response>) {
  return async (req: Request, ctx: Ctx): Promise<Response> => {
    try {
      return await fn(req, ctx);
    } catch (e) {
      unstable_rethrow(e); // framework signals (such as prerender bailouts) are not errors
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json(
          { error: e.issues[0]?.message ?? "Invalid input", issues: e.issues.map((i) => ({ path: i.path, message: i.message })) },
          { status: 400 },
        );
      if (e instanceof AiOutputError) {
        console.error("[ai] invalid output:", e.cause instanceof ZodError ? e.cause.issues.map((i) => `${i.path.join(".")}: ${i.code}`) : e.name);
        return NextResponse.json({ error: "The dream spirits mumbled. Please try again." }, { status: 502 });
      }
      if (e instanceof ProviderError) return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof Anthropic.APIError) {
        console.error("[ai] provider error:", e.status, e.name);
        const msg =
          e.status === 401 ? "AI key is missing or invalid (check .env.local)." : e.status === 429 ? "The AI is busy. Try again in a moment." : "The AI service had a problem. Please try again.";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      // Name only: database and provider messages can quote dream text, which must never reach logs.
      console.error("[api] unexpected error:", e instanceof Error ? e.name : "unknown");
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }
  };
}
