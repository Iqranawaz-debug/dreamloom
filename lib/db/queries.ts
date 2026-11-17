import "server-only";
import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { getDb } from "./index";
import { dreams, dreamSymbols, followups, settings, symbols, type Dream, type Followup } from "./schema";

export type DreamWithSymbols = Dream & { symbols: string[] };
export type DreamDetail = DreamWithSymbols & { followups: Followup[] };

type NewDream = {
  rawText: string;
  mood?: string | null;
  createdAt?: Date;
  isSample?: boolean;
};

export function createDream(input: NewDream): number {
  const row = getDb()
    .insert(dreams)
    .values({
      rawText: input.rawText,
      mood: input.mood ?? null,
      isSample: input.isSample ?? false,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    })
    .returning({ id: dreams.id })
    .get();
  return row.id;
}

export type DreamPatch = Partial<
  Pick<Dream, "cleanedText" | "title" | "mood" | "imageUrl" | "imagePrompt" | "poem" | "style" | "poemStyle">
>;

export function updateDream(id: number, patch: DreamPatch) {
  if (Object.keys(patch).length === 0) return;
  getDb().update(dreams).set(patch).where(eq(dreams.id, id)).run();
}

function symbolsFor(ids: number[]): Map<number, string[]> {
  const map = new Map<number, string[]>();
  if (ids.length === 0) return map;
  const rows = getDb()
    .select({ dreamId: dreamSymbols.dreamId, name: symbols.name })
    .from(dreamSymbols)
    .innerJoin(symbols, eq(symbols.id, dreamSymbols.symbolId))
    .where(inArray(dreamSymbols.dreamId, ids))
    .orderBy(symbols.name)
    .all();
  for (const r of rows) map.set(r.dreamId, [...(map.get(r.dreamId) ?? []), r.name]);
  return map;
}

export function getDream(id: number): DreamDetail | null {
  const db = getDb();
  const dream = db.select().from(dreams).where(eq(dreams.id, id)).get();
  if (!dream) return null;
  const fu = db.select().from(followups).where(eq(followups.dreamId, id)).orderBy(followups.id).all();
  return { ...dream, symbols: symbolsFor([id]).get(id) ?? [], followups: fu };
}

export type DreamFilter = { q?: string; mood?: string; symbol?: string; since?: Date };

export function listDreams(filter: DreamFilter = {}): DreamWithSymbols[] {
  const db = getDb();
  const where = [];
  if (filter.q?.trim()) {
    // Escape LIKE wildcards so user input is matched literally.
    const term = `%${filter.q.trim().replace(/[\%_]/g, (c) => `\${c}`)}%`;
    where.push(
      or(
        sql`${dreams.rawText} LIKE ${term} ESCAPE '\'`,
        sql`${dreams.cleanedText} LIKE ${term} ESCAPE '\'`,
        sql`${dreams.poem} LIKE ${term} ESCAPE '\'`,
        sql`${dreams.title} LIKE ${term} ESCAPE '\'`,
      ),
    );
  }
  if (filter.mood) where.push(eq(dreams.mood, filter.mood));
  if (filter.since) where.push(gte(dreams.createdAt, filter.since));
  if (filter.symbol) {
    where.push(
      inArray(
        dreams.id,
        db
          .select({ id: dreamSymbols.dreamId })
          .from(dreamSymbols)
          .innerJoin(symbols, eq(symbols.id, dreamSymbols.symbolId))
          .where(eq(symbols.name, filter.symbol)),
      ),
    );
  }
  const rows = db
    .select()
    .from(dreams)
    .where(where.length ? and(...where) : undefined)
    .orderBy(desc(dreams.createdAt), desc(dreams.id))
    .all();
  const map = symbolsFor(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, symbols: map.get(r.id) ?? [] }));
}

function upsertSymbolIds(names: string[]): number[] {
  const db = getDb();
  const clean = [...new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean))];
  if (clean.length === 0) return [];
  db.insert(symbols).values(clean.map((name) => ({ name }))).onConflictDoNothing().run();
  return db.select({ id: symbols.id }).from(symbols).where(inArray(symbols.name, clean)).all().map((r) => r.id);
}

/** Link symbols to a dream (adds to any existing ones). */
export function addSymbols(dreamId: number, names: string[]) {
  const ids = upsertSymbolIds(names);
  if (ids.length === 0) return;
  getDb()
    .insert(dreamSymbols)
    .values(ids.map((symbolId) => ({ dreamId, symbolId })))
    .onConflictDoNothing()
    .run();
}

/** Replace a dream's symbols. */
export function setSymbols(dreamId: number, names: string[]) {
  getDb().transaction((tx) => {
    tx.delete(dreamSymbols).where(eq(dreamSymbols.dreamId, dreamId)).run();
  });
  addSymbols(dreamId, names);
}

export function setFollowups(dreamId: number, items: { question: string; answer?: string | null }[]) {
  const db = getDb();
  db.transaction((tx) => {
    tx.delete(followups).where(eq(followups.dreamId, dreamId)).run();
    if (items.length)
      tx.insert(followups)
        .values(items.map((i) => ({ dreamId, question: i.question, answer: i.answer ?? null })))
        .run();
  });
}

export function deleteDream(id: number): Dream | null {
  const db = getDb();
  const row = db.delete(dreams).where(eq(dreams.id, id)).returning().get();
  pruneOrphanSymbols();
  return row ?? null;
}

export function deleteSampleDreams(): Dream[] {
  const rows = getDb().delete(dreams).where(eq(dreams.isSample, true)).returning().all();
  pruneOrphanSymbols();
  return rows;
}

function pruneOrphanSymbols() {
  getDb()
    .delete(symbols)
    .where(sql`${symbols.id} NOT IN (SELECT ${dreamSymbols.symbolId} FROM ${dreamSymbols})`)
    .run();
}

export function allSymbolNames(): string[] {
  return getDb().select({ name: symbols.name }).from(symbols).orderBy(symbols.name).all().map((r) => r.name);
}

export function symbolCounts(): { name: string; count: number }[] {
  return getDb()
    .select({ name: symbols.name, count: sql<number>`count(*)` })
    .from(dreamSymbols)
    .innerJoin(symbols, eq(symbols.id, dreamSymbols.symbolId))
    .groupBy(symbols.name)
    .orderBy(desc(sql`count(*)`), symbols.name)
    .all();
}

export function countDreams(): number {
  return getDb().select({ n: sql<number>`count(*)` }).from(dreams).get()?.n ?? 0;
}

export function getSetting(key: string): string | null {
  return getDb().select().from(settings).where(eq(settings.key, key)).get()?.value ?? null;
}

export function setSetting(key: string, value: string | null) {
  const db = getDb();
  if (value === null) db.delete(settings).where(eq(settings.key, key)).run();
  else
    db.insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } })
      .run();
}

