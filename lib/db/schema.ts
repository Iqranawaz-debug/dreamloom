import { sql } from "drizzle-orm";
import { integer, primaryKey, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

export const dreams = sqliteTable(
  "dreams",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
    rawText: text("raw_text").notNull(),
    cleanedText: text("cleaned_text"),
    title: text("title"),
    mood: text("mood"),
    imageUrl: text("image_url"),
    imagePrompt: text("image_prompt"),
    poem: text("poem"),
    style: text("style"),
    poemStyle: text("poem_style"),
    /** Rows created by the seed script, so it can be re-run safely. */
    isSample: integer("is_sample", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("dreams_created_at_idx").on(t.createdAt)],
);

export const symbols = sqliteTable("symbols", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
});

export const dreamSymbols = sqliteTable(
  "dream_symbols",
  {
    dreamId: integer("dream_id")
      .notNull()
      .references(() => dreams.id, { onDelete: "cascade" }),
    symbolId: integer("symbol_id")
      .notNull()
      .references(() => symbols.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.dreamId, t.symbolId] }), index("dream_symbols_symbol_idx").on(t.symbolId)],
);

export const followups = sqliteTable("followups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  dreamId: integer("dream_id")
    .notNull()
    .references(() => dreams.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer"),
});

/** Small key/value store for local preferences (passcode hash, reminder time). */
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Dream = typeof dreams.$inferSelect;
export type Followup = typeof followups.$inferSelect;
