import { useNavigate } from "@tanstack/react-router";

import type { GraphEdge, GraphNode } from "@/lib/entity-links";

const W = 760;
const H = 420;

/** Simple radial graph: searched identifiers in the middle, linked cases around them, their other identifiers on the outside. */
export function NetworkGraph({ nodes, edges, onPivot }: { nodes: GraphNode[]; edges: GraphEdge[]; onPivot?: ((value: string) => void) | undefined }) {
  const navigate = useNavigate();
  if (nodes.length <= 1) return <p className="py-6 text-center text-sm text-muted-foreground">Nothing linked yet.</p>;
  const center = nodes.filter((n) => n.center);
  const records = nodes.filter((n) => n.type !== "ident").sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  const outer = nodes.filter((n) => n.type === "ident" && !n.center);
  const pos = new Map<string, { x: number; y: number }>();
  const ring = (list: GraphNode[], rx: number, ry: number, offset = 0) =>
    list.forEach((n, i) => {
      const a = offset + (i / Math.max(1, list.length)) * Math.PI * 2 - Math.PI / 2;
      pos.set(n.id, list.length === 1 && rx < 60 ? { x: W / 2, y: H / 2 } : { x: W / 2 + Math.cos(a) * rx, y: H / 2 + Math.sin(a) * ry });
    });
  ring(center, center.length > 1 ? 55 : 0, center.length > 1 ? 30 : 0);
  ring(records, 200, 120, 0.3);
  ring(outer, 340, 185, 0.1);

  const fill = (n: GraphNode) =>
    n.tone === "red" ? "var(--destructive)" : n.tone === "green" ? "var(--success)" : n.tone === "amber" ? "var(--warning)" : n.center ? "var(--primary)" : "var(--muted)";

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[560px]" role="img" aria-label="Linked records network">
        {edges.map((e, i) => {
          const a = pos.get(e.from), b = pos.get(e.to);
          if (!a || !b) return null;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={1.5} strokeDasharray={e.strength === "possible" ? "4 4" : undefined} />;
        })}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          const click = () => {
            if (n.type === "case") navigate({ to: "/cases/$caseId", params: { caseId: n.label } });
            else if (n.type === "ident" && !n.center) onPivot ? onPivot(n.label) : navigate({ to: "/lookup", search: { q: n.label } });
          };
          const clickable = n.type === "case" || (n.type === "ident" && !n.center);
          return (
            <g key={n.id} transform={`translate(${p.x},${p.y})`} onClick={click} className={clickable ? "cursor-pointer" : ""}>
              {n.type === "ident" ? (
                <circle r={n.center ? 16 : 10} fill={fill(n)} stroke="var(--background)" strokeWidth={2} />
              ) : (
                <>
                  <rect x={-14} y={-14} width={28} height={28} rx={6} fill={fill(n)} stroke={n.latest ? "var(--foreground)" : "var(--background)"} strokeWidth={n.latest ? 3 : 2} />
                  {n.latest && <text y={-22} textAnchor="middle" className="fill-primary text-[10px] font-semibold uppercase">Latest</text>}
                </>
              )}
              <text y={n.center ? 30 : 26} textAnchor="middle" className="fill-foreground text-[11px] font-medium">{n.label}</text>
              {n.sub && <text y={n.center ? 42 : 38} textAnchor="middle" className="fill-muted-foreground text-[10px]">{n.sub}</text>}
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="size-3 rounded-full bg-primary" /> Searched</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-destructive" /> Blocked / Negative DB</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-success" /> Unblocked</span>
        <span className="flex items-center gap-1"><span className="size-3 rounded bg-warning" /> Open</span>
        <span>Dark outline = most recent case.</span>
        <span>Dashed line = possible match. Click a case to open it, or an identifier to search it.</span>
      </div>
    </div>
  );
}
