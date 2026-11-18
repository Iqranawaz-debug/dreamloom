// Shared (client + server) vocabulary. No secrets here.

// Colors validated as a categorical set on the dark surface (CVD-safe, fixed order).
export const MOODS = [
  { id: "calm", label: "Calm", emoji: "😌", color: "#3a9bd8" },
  { id: "joyful", label: "Joyful", emoji: "😊", color: "#b98210" },
  { id: "scared", label: "Scared", emoji: "😨", color: "#e2566e" },
  { id: "sad", label: "Sad", emoji: "😢", color: "#6a6cf0" },
  { id: "weird", label: "Weird", emoji: "🌀", color: "#cf62b8" },
  { id: "confused", label: "Confused", emoji: "😵‍💫", color: "#1aa36f" },
] as const;
export type Mood = (typeof MOODS)[number]["id"];
export const MOOD_IDS = MOODS.map((m) => m.id) as [Mood, ...Mood[]];
export const moodInfo = (id: string | null | undefined) => MOODS.find((m) => m.id === id);

export const PAINT_STYLES = [
  { id: "watercolor", label: "Watercolor" },
  { id: "oil", label: "Oil painting" },
  { id: "surrealist", label: "Surrealist" },
  { id: "anime", label: "Anime" },
  { id: "dreamy-digital", label: "Dreamy digital art" },
] as const;
export type PaintStyle = (typeof PAINT_STYLES)[number]["id"];
export const PAINT_STYLE_IDS = PAINT_STYLES.map((s) => s.id) as [PaintStyle, ...PaintStyle[]];

export const POEM_STYLES = [
  { id: "free-verse", label: "Free verse" },
  { id: "haiku", label: "Haiku" },
  { id: "rhyming", label: "Rhyming" },
] as const;
export type PoemStyle = (typeof POEM_STYLES)[number]["id"];
export const POEM_STYLE_IDS = POEM_STYLES.map((s) => s.id) as [PoemStyle, ...PoemStyle[]];

export const MAX_DREAM_CHARS = 5000;
export const MAX_ANSWER_CHARS = 600;
