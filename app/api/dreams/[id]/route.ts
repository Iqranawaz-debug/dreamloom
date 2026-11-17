import { NextResponse } from "next/server";
import { connection } from "next/server";
import { HttpError, assertSameOrigin, handle, parseId } from "@/lib/api";
import { deleteDream, getDream } from "@/lib/db/queries";
import { deleteImage } from "@/lib/storage";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  await connection();
  const dream = getDream(await parseId(params));
  if (!dream) throw new HttpError(404, "Dream not found");
  return NextResponse.json(dream);
});

export const DELETE = handle<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const row = deleteDream(await parseId(params));
  if (!row) throw new HttpError(404, "Dream not found");
  await deleteImage(row.imageUrl);
  return NextResponse.json({ ok: true });
});
