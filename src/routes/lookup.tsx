import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { PageHeader } from "@/components/layout/AppShell";
import { DecisionBadge, LinkedHistoryPanel } from "@/components/edd/LinkedHistory";
import { formatDateTime } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEDD } from "@/lib/edd-store";
import { KIND_LABEL, detectKind, findLinked, queryIdents, summarise } from "@/lib/entity-links";

export const Route = createFileRoute("/lookup")({
  validateSearch: zodValidator(z.object({ q: fallback(z.string(), "").default("") })),
  head: () => ({
    meta: [
      { title: "Customer Lookup & Network — EDSquare" },
      { name: "description", content: "Search by account, phone, UPI ID, device or name and see every linked case, decision, alert and Negative Database hit." },
      { property: "og:title", content: "Customer Lookup & Network — EDSquare" },
      { property: "og:description", content: "One view of all cases and decisions linked to an account, phone or UPI ID." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LookupPage,
});

const EXAMPLES = ["XXXX3388", "9876500021", "sneha.rao1@ybl", "DEV-77C2", "9811004821"];

function LookupPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/lookup" });
  const { cases, alerts, negbase, enforcement, demoRuns } = useEDD();
  const [text, setText] = useState(q);
  useEffect(() => setText(q), [q]);

  const query = useMemo(() => (q.trim() ? queryIdents(q) : []), [q]);
  const result = useMemo(() => findLinked(query, { cases, alerts, negbase, enforcement, runs: demoRuns }), [query, cases, alerts, negbase, enforcement, demoRuns]);
  const summary = useMemo(() => summarise(result, enforcement), [result, enforcement]);
  const go = (v: string) => navigate({ search: { q: v.trim() } });

  const contacts = result.cases.flatMap((m) => [
    ...(m.item.calls ?? []).map((c) => ({ id: c.id, caseId: m.item.id, channel: "AI call", at: c.startedAt ?? m.item.openedAt, detail: c.status })),
    ...(m.item.questionnaires ?? []).map((w) => ({ id: w.id, caseId: m.item.id, channel: "WhatsApp", at: w.sentAt, detail: w.outcome.replace("_", " ") })),
  ]);
  const timeline = result.cases
    .flatMap((m) => m.item.timeline.map((t) => ({ ...t, caseId: m.item.id })))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 25);

  return (
    <div className="space-y-6">
      <PageHeader title="Customer Lookup" description="Search an account, phone, UPI ID, device or name to see every linked case and decision." />
      <form onSubmit={(e) => { e.preventDefault(); go(text); }} className="flex max-w-xl gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. XXXX3388, 98765 00021, name@upi" className="pl-9" aria-label="Lookup value" />
        </div>
        <Button type="submit">Search</Button>
      </form>
      {!q && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Try:{EXAMPLES.map((e) => <Button key={e} size="sm" variant="outline" onClick={() => go(e)}>{e}</Button>)}
        </div>
      )}
      {q && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label={`Searched as ${KIND_LABEL[detectKind(q)]}`} value={q} />
            <Stat label="Linked cases" value={String(summary.priorCases)} sub={summary.possible ? `+${summary.possible} possible` : undefined} />
            <Stat label="Blocked before" value={String(summary.blocked)} tone={summary.blocked ? "red" : undefined} />
            <Stat label="Negative DB hits" value={String(summary.negbaseHits)} tone={summary.negbaseHits ? "red" : undefined} />
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Most recent linked case</p>
              {summary.last ? <div className="mt-1 flex items-center gap-2"><DecisionBadge label={summary.last.decision} /><Link to="/cases/$caseId" params={{ caseId: summary.last.caseId }} className="text-sm text-primary hover:underline">{summary.last.caseId}</Link></div><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(summary.last.at)}</p> : <p className="mt-1 text-lg font-semibold">—</p>}
            </CardContent></Card>
          </div>
          <LinkedHistoryPanel query={query} result={result} enforcement={enforcement} onPivot={go} />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-sm">Calls &amp; WhatsApp ({contacts.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                {contacts.map((c) => <div key={c.id} className="flex justify-between gap-2 rounded-md border p-2"><span>{c.channel} · <Link to="/cases/$caseId" params={{ caseId: c.caseId }} className="text-primary hover:underline">{c.caseId}</Link> · {c.detail}</span><span className="text-muted-foreground">{formatDateTime(c.at)}</span></div>)}
                {!contacts.length && <p className="text-sm text-muted-foreground">No calls or WhatsApp messages on linked cases.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Timeline across linked cases</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-xs">
                {timeline.map((t) => <div key={t.caseId + t.id} className="rounded-md border p-2"><div className="flex justify-between gap-2"><span className="font-medium">{t.action}</span><span className="text-muted-foreground">{formatDateTime(t.at)}</span></div><p className="text-muted-foreground">{t.caseId} · {t.actor} · {t.detail}</p></div>)}
                {!timeline.length && <p className="text-sm text-muted-foreground">No events.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string | undefined; tone?: "red" | undefined }) {
  return (
    <Card><CardContent className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-lg font-semibold ${tone === "red" ? "text-destructive" : ""}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </CardContent></Card>
  );
}
