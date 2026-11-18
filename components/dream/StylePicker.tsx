"use client";

import { PAINT_STYLES, POEM_STYLES, type PaintStyle, type PoemStyle } from "@/lib/constants";

const SWATCH: Record<PaintStyle, string> = {
  watercolor: "radial-gradient(circle at 30% 30%, #c9e3f2, #8fb8de 45%, #3a5f8f)",
  oil: "linear-gradient(135deg, #f3d19c, #c4677a 55%, #3a1f4d)",
  surrealist: "linear-gradient(180deg, #5b2a86 0 55%, #f1aecb 55% 100%)",
  anime: "linear-gradient(180deg, #7fd0f0, #ffd6e0 70%, #fff3a8)",
  "dreamy-digital": "radial-gradient(circle at 60% 40%, #93e2ee, #9b87f5 50%, #160b2e)",
};

type Props =
  | { kind: "paint"; value: PaintStyle; onChange: (v: PaintStyle) => void; className?: string }
  | { kind: "poem"; value: PoemStyle; onChange: (v: PoemStyle) => void; className?: string };

export function StylePicker(props: Props) {
  const name = props.kind === "paint" ? "paint-style" : "poem-style";
  const legend = props.kind === "paint" ? "Painting style" : "Poem style";
  const options = props.kind === "paint" ? PAINT_STYLES : POEM_STYLES;
  return (
    <fieldset className={props.className}>
      <legend className="eyebrow mb-3">{legend}</legend>
      <div className={props.kind === "paint" ? "grid grid-cols-2 gap-3 sm:grid-cols-3" : "flex flex-wrap gap-2"}>
        {options.map((o) => {
          const checked = props.value === o.id;
          const input = (
            <input
              type="radio"
              name={name}
              value={o.id}
              checked={checked}
              onChange={() => (props.onChange as (v: string) => void)(o.id)}
              className="sr-only"
            />
          );
          return props.kind === "paint" ? (
            <label
              key={o.id}
              className="glass card-interactive flex cursor-pointer items-center gap-3 rounded-2xl p-3 has-[:checked]:border-lavender/60 has-[:checked]:bg-lavender/10 has-[:focus-visible]:shadow-[var(--focus-ring)]"
            >
              {input}
              <span aria-hidden className="h-10 w-10 shrink-0 rounded-xl" style={{ background: SWATCH[o.id as PaintStyle] }} />
              <span className="text-sm">{o.label}</span>
            </label>
          ) : (
            <label key={o.id} className="chip">
              {input}
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
