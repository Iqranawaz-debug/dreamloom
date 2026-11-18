"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { moodInfo } from "@/lib/constants";
import type { InsightDream } from "./types";

const W = 900;
const H = 560;

type GraphNode = SimulationNodeDatum & { id: string; kind: "dream" | "symbol"; label: string; r: number; color: string; dreamId?: number };
type GraphLink = SimulationLinkDatum<GraphNode> & { source: string | GraphNode; target: string | GraphNode };
type Snapshot = { id: string; x: number; y: number };

const linkId = (end: string | number | GraphNode) => (typeof end === "object" ? end.id : String(end));

/** Force-directed map: dreams are linked through the symbols they share. */
export function DreamMap({ dreams }: { dreams: InsightDream[] }) {
  const router = useRouter();
  const { nodes, links } = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of dreams) for (const s of d.symbols) counts.set(s, (counts.get(s) ?? 0) + 1);
    const shared = [...counts].filter(([, c]) => c >= 2);
    const nodes: GraphNode[] = [
      ...dreams.map((d) => ({
        id: `d${d.id}`,
        kind: "dream" as const,
        label: d.title,
        r: 8,
        color: moodInfo(d.mood)?.color ?? "#8f8bb3",
        dreamId: d.id,
      })),
      ...shared.map(([name, c]) => ({
        id: `s${name}`,
        kind: "symbol" as const,
        label: name,
        r: 6 + Math.min(c, 10) * 1.2,
        color: "#c9bcff",
      })),
    ];
    const keep = new Set(shared.map(([n]) => n));
    const links: GraphLink[] = dreams.flatMap((d) =>
      d.symbols.filter((s) => keep.has(s)).map((s) => ({ source: `d${d.id}`, target: `s${s}` })),
    );
    return { nodes, links };
  }, [dreams]);

  const [positions, setPositions] = useState<Record<string, Snapshot>>({});
  const [active, setActive] = useState<string | null>(null);
  const simRef = useRef<Simulation<GraphNode, GraphLink> | null>(null);
  const simNodes = useRef<GraphNode[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ node: GraphNode; moved: boolean } | null>(null);

  useEffect(() => {
    const ns = nodes.map((n) => ({ ...n }));
    const ls = links.map((l) => ({ ...l }));
    simNodes.current = ns;
    const publish = () =>
      setPositions(
        Object.fromEntries(
          ns.map((n) => {
            n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, n.x ?? W / 2));
            n.y = Math.max(n.r + 4, Math.min(H - n.r - 4, n.y ?? H / 2));
            return [n.id, { id: n.id, x: n.x, y: n.y }];
          }),
        ),
      );
    const sim = forceSimulation<GraphNode>(ns)
      .force("link", forceLink<GraphNode, GraphLink>(ls).id((n) => n.id).distance(62).strength(0.5))
      .force("charge", forceManyBody().strength(-130))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide<GraphNode>((n) => n.r + 6));
    simRef.current = sim;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sim.stop();
      sim.tick(300);
      publish();
    } else {
      sim.on("tick", publish);
    }
    return () => {
      sim.stop();
    };
  }, [nodes, links]);

  const toSvg = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * W, y: ((e.clientY - rect.top) / rect.height) * H };
  };

  const neighbours = useMemo(() => {
    if (!active) return null;
    const set = new Set([active]);
    for (const l of links) {
      const [a, b] = [linkId(l.source), linkId(l.target)];
      if (a === active) set.add(b);
      if (b === active) set.add(a);
    }
    return set;
  }, [active, links]);

  const activeNode = nodes.find((n) => n.id === active);
  const ready = Object.keys(positions).length === nodes.length;

  return (
    <section className="glass p-6" aria-labelledby="map-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="map-title" className="font-display text-3xl">
          Dream map
        </h2>
        <p className="min-h-5 text-sm text-ink-muted" aria-live="polite">
          {activeNode ? (activeNode.kind === "dream" ? activeNode.label : `Symbol: ${activeNode.label}`) : "Drag a star, or open a dream"}
        </p>
      </div>
      {links.length === 0 ? (
        <p className="mt-4 text-ink-muted">When two dreams share a symbol, they&apos;ll be connected here.</p>
      ) : (
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="mt-4 h-auto w-full select-none" role="group" aria-label="Map of dreams connected by shared symbols">
          {ready && (
            <>
              <g>
                {links.map((l, i) => {
                  const [a, b] = [positions[linkId(l.source)], positions[linkId(l.target)]];
                  const lit = active && (a.id === active || b.id === active);
                  return (
                    <line
                      key={i}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#c9bcff"
                      strokeOpacity={lit ? 0.7 : active ? 0.05 : 0.18}
                      strokeWidth={lit ? 1.5 : 1}
                    />
                  );
                })}
              </g>
              {nodes.map((n) => {
                const p = positions[n.id];
                const dim = neighbours && !neighbours.has(n.id);
                const open = () => n.dreamId && router.push(`/dream/${n.dreamId}`);
                return (
                  <g
                    key={n.id}
                    transform={`translate(${p.x} ${p.y})`}
                    opacity={dim ? 0.25 : 1}
                    tabIndex={0}
                    role={n.kind === "dream" ? "link" : "button"}
                    aria-label={n.kind === "dream" ? `Open dream: ${n.label}` : `Highlight dreams with ${n.label}`}
                    className="cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-white"
                    style={{ touchAction: "none", boxShadow: "none" }}
                    onPointerEnter={() => setActive(n.id)}
                    onPointerLeave={() => !dragRef.current && setActive(null)}
                    onFocus={() => setActive(n.id)}
                    onBlur={() => setActive(null)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        open();
                      }
                    }}
                    onPointerDown={(e) => {
                      const node = simNodes.current.find((x) => x.id === n.id);
                      if (!node) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      dragRef.current = { node, moved: false };
                      node.fx = node.x;
                      node.fy = node.y;
                      simRef.current?.alphaTarget(0.25).restart();
                    }}
                    onPointerMove={(e) => {
                      const drag = dragRef.current;
                      if (!drag) return;
                      const { x, y } = toSvg(e);
                      if (Math.hypot(x - (drag.node.x ?? x), y - (drag.node.y ?? y)) > 4) drag.moved = true;
                      drag.node.fx = x;
                      drag.node.fy = y;
                    }}
                    onPointerUp={() => {
                      const drag = dragRef.current;
                      dragRef.current = null;
                      if (!drag) return;
                      drag.node.fx = null;
                      drag.node.fy = null;
                      simRef.current?.alphaTarget(0);
                      if (!drag.moved) open();
                    }}
                  >
                    {/* Larger invisible hit target for fingers */}
                    <circle r={Math.max(n.r + 12, 22)} fill="transparent" />
                    <circle r={n.r} fill={n.kind === "symbol" ? "#1b1d45" : n.color} stroke={n.kind === "symbol" ? n.color : "#14163a"} strokeWidth={2} />
                    {n.kind === "symbol" && (
                      <text y={n.r + 15} textAnchor="middle" fontSize={14} fill="#b8b4d8" className="pointer-events-none">
                        {n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}
        </svg>
      )}
    </section>
  );
}
