import { Link } from "@tanstack/react-router";
import { AlertTriangle, History, Network, ShieldAlert } from "lucide-react";
import { useMemo } from "react";

import { CategoryBadge, formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EnforcementEntry } from "@/data/edd";
import { KIND_LABEL, buildGraph, caseDecision, type CaseDecision, type HistorySummary, type Ident, type LinkReason, type LinkedResult } from "@/lib/entity-links";
import { NetworkGraph } from "./NetworkGraph";

export function DecisionBadge({ label }: { label: CaseDecision }) {
  const cls =
    label === "Blocked" ? "border-destructive/40 bg-destructive/10 text-destructive"
    : label === "Unblocked" || label === "Verified" ? "border-success/40 bg-success/10 text-success"
    : "border-warning/40 bg-warning/10 text-warning-foreground";
  return <Badge variant="outline" className={cls}>{label}</Badge>;
}

export function LinkChips({ links }: { links: LinkReason[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {links.map((l) => (
        <Badge key={l.kind + l.value} variant="outline" className={l.strength === "possible" ? "border-dashed text-muted-foreground" : ""}>
          same {KIND_LABEL[l.kind].toLowerCase()}{l.strength === "possible" ? " (possible)" : ""}
        </Badge>
      ))}
    </div>
  );
}

function summaryText(s: HistorySummary): string {
  if (!s.priorCases && !s.negbaseHits) return s.possible ? `No confirmed links · ${s.possible} possible name match${s.possible > 1 ? "es" : ""}` : "No earlier cases or Negative Database hits";
  const parts = [`${s.priorCases} other case${s.priorCases === 1 ? "" : "s"}`];
  if (s.blocked) parts.push(`${s.blocked} blocked`);
  if (s.negbaseHits) parts.push(`${s.negbaseHits} Negative DB hit${s.negbaseHits > 1 ? "s" : ""}`);
  return parts.join(" · ");
}

/** Compact strip used in the alert drawer, case overview and simulator. */
export function HistoryStrip({ summary, query, compact }: { summary: HistorySummary; query?: string | undefined; compact?: boolean }) {
  const tone = summary.flag === "red" ? "border-destructive/40 bg-destructive/5" : summary.flag === "amber" ? "border-warning/40 bg-warning/5" : "border-border";
  const Icon = summary.flag === "red" ? ShieldAlert : summary.flag === "amber" ? AlertTriangle : History;
  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${tone}`}>
      <Icon className={`size-4 ${summary.flag === "red" ? "text-destructive" : "text-muted-foreground"}`} />
      <span className="font-medium">Seen before:</span>
      <span>{summaryText(summary)}</span>
      {summary.last && !compact && (
        <span className="text-muted-foreground">
          · last <Link to="/cases/$caseId" params={{ caseId: summary.last.caseId }} className="text-primary underline-offset-2 hover:underline">{summary.last.caseId}</Link> {summary.last.decision} ({summary.last.category}, {formatDateTime(summary.last.at)})
        </span>
      )}
      {query && <Link to="/lookup" search={{ q: query }} className="ml-auto text-primary underline-offset-2 hover:underline">Open network view</Link>}
    </div>
  );
}

/** Full linked-history panel: cases, alerts, Negative DB, and network graph. */
export function LinkedHistoryPanel({ query, result, enforcement, showGraph = true, onPivot }: { query: Ident[]; result: LinkedResult; enforcement: EnforcementEntry[]; showGraph?: boolean; onPivot?: (value: string) => void }) {
  const graph = useMemo(() => buildGraph(query, result, enforcement), [query, result, enforcement]);
  return (
    <div className="grid gap-4">
      {showGraph && (
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0"><Network className="size-4" /><CardTitle className="text-sm">Network</CardTitle></CardHeader>
          <CardContent><NetworkGraph nodes={graph.nodes} edges={graph.edges} onPivot={onPivot} /></CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-sm">Linked cases ({result.cases.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Case</TableHead><TableHead>Customer</TableHead><TableHead>Opened</TableHead><TableHead>Category</TableHead><TableHead>Decision</TableHead><TableHead>Linked by</TableHead></TableRow></TableHeader>
            <TableBody>
              {result.cases.map((m) => {
                const d = caseDecision(m.item, enforcement);
                return (
                  <TableRow key={m.item.id}>
                    <TableCell><Link to="/cases/$caseId" params={{ caseId: m.item.id }} className="font-medium text-primary hover:underline">{m.item.id}</Link></TableCell>
                    <TableCell>{m.item.customer}<div className="text-xs text-muted-foreground">{m.item.account}</div></TableCell>
                    <TableCell className="text-xs">{formatDateTime(m.item.openedAt)}</TableCell>
                    <TableCell><CategoryBadge category={m.item.category} /></TableCell>
                    <TableCell><DecisionBadge label={d.label} />{d.reason && <div className="mt-1 max-w-[220px] text-xs text-muted-foreground">{d.reason}</div>}</TableCell>
                    <TableCell><LinkChips links={m.linkedBy} /></TableCell>
                  </TableRow>
                );
              })}
              {!result.cases.length && <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No linked cases.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Linked alerts ({result.alerts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {result.alerts.map((m) => (
              <div key={m.item.id} className="rounded-md border p-2 text-xs">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{m.item.id} · {m.item.customer}</span><span className="text-muted-foreground">{formatDateTime(m.item.receivedAt)}</span></div>
                <p className="mt-1 text-muted-foreground">{m.item.trigger}</p>
                <div className="mt-1 flex items-center justify-between gap-2"><LinkChips links={m.linkedBy} />{m.item.caseId && <Link to="/cases/$caseId" params={{ caseId: m.item.caseId }} className="text-primary hover:underline">{m.item.caseId}</Link>}</div>
              </div>
            ))}
            {!result.alerts.length && <p className="text-sm text-muted-foreground">No linked alerts.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Negative Database ({result.negbase.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {result.negbase.map((m) => (
              <div key={m.item.id} className="rounded-md border border-destructive/30 p-2 text-xs">
                <div className="flex items-center justify-between gap-2"><span className="font-medium">{m.item.id} · {m.item.identifier}</span><CategoryBadge category={m.item.category} /></div>
                <p className="mt-1 text-muted-foreground">{m.item.evidence}</p>
                <div className="mt-1"><LinkChips links={m.linkedBy} /></div>
              </div>
            ))}
            {!result.negbase.length && <p className="text-sm text-muted-foreground">No Negative Database hits.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
