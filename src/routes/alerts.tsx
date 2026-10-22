import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { RiskChip, formatDateTime, timeAgo } from "@/components/edd/chips";
import { AlertFunnel, JourneyDots, JourneyStrip, ResultBadge, BlockReason, useJourneys } from "@/components/edd/Journey";
import { sheetAlertFor } from "@/data/sample-scenarios";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AlertResult } from "@/lib/alert-journey";
import { useEDD } from "@/lib/edd-store";
import { can } from "@/lib/roles";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — EDSquare" },
      { name: "description", content: "Every incoming alert and what happened to it: checks, customer contact, case and block or unblock decision." },
      { property: "og:title", content: "Alerts — EDSquare" },
      { property: "og:description", content: "Track each alert from intake to blocked, unblocked or cleared." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { open?: string } => (typeof s["open"] === "string" ? { open: s["open"] } : {}),
  component: AlertsPage,
});

const SOURCES = ["Negative Database", "Fraud / AML Engine", "Risk Model", "CRM Complaint", "External Intelligence"];

function AlertsPage() {
  const { role, dismissAlert } = useEDD();
  const journeys = useJourneys();
  const [source, setSource] = useState("all");
  const [result, setResult] = useState<AlertResult | "all">("all");
  const search = Route.useSearch();
  const [openId, setOpenId] = useState<string | null>(search.open ?? null);
  const navigate = useNavigate();
  const runTriage = (a: { id: string; source: string; trigger: string; account: string }) => navigate({ to: "/simulator", search: { alert: sheetAlertFor(a as never), from: a.id, auto: 1 } });

  const rows = journeys
    .filter(({ alert, j }) => (source === "all" || alert.source === source) && (result === "all" || j.result === result))
    .sort((a, b) => b.alert.receivedAt.localeCompare(a.alert.receivedAt));
  const open = journeys.find((x) => x.alert.id === openId);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Alerts"
        description="Every alert and where it ended up. Click a count to filter, click a row to see its full story."
        actions={<Button asChild variant="outline"><Link to="/simulator">Run a live demo alert</Link></Button>}
      />

      <AlertFunnel onPick={setResult} active={result} />

      <div className="flex flex-wrap items-center gap-2">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">Journey: data checks · voice call · WhatsApp · case · decision</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alert</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead>Journey</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Case</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ alert: a, j }) => (
                <TableRow key={a.id} className="cursor-pointer" onClick={() => setOpenId(a.id)}>
                  <TableCell>
                    <p className="font-medium">{a.id}</p>
                    <p className="text-xs text-muted-foreground">{a.source} · {timeAgo(a.receivedAt)}</p>
                  </TableCell>
                  <TableCell><p>{a.customer}</p><p className="text-xs text-muted-foreground">{a.account}</p></TableCell>
                  <TableCell className="max-w-[240px] text-sm text-muted-foreground">{a.trigger}</TableCell>
                  <TableCell><RiskChip grade={a.preliminarySignal} /></TableCell>
                  <TableCell><JourneyDots j={j} /></TableCell>
                  <TableCell className="max-w-[220px]"><ResultBadge r={j.result} /><BlockReason j={j} className="mt-1 line-clamp-2" /></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>{j.caseItem ? <Link to="/cases/$caseId" params={{ caseId: j.caseItem.id }} className="font-medium text-primary underline">{j.caseItem.id}</Link> : <span className="text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    {j.result === "New" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" disabled={!can(role, "runTriage")} onClick={() => runTriage(a)}>Run in simulator</Button>
                        <Button size="sm" variant="ghost" disabled={!can(role, "runTriage")} onClick={() => dismissAlert(a.id)}>Dismiss</Button>
                      </div>
                    ) : j.caseItem ? (
                      <Button size="sm" variant="outline" asChild><Link to="/cases/$caseId" params={{ caseId: j.caseItem.id }}>Open case</Link></Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow><TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">No alerts match this filter.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">{open.alert.id} <ResultBadge r={open.j.result} />{open.j.caseItem && <Link to="/cases/$caseId" params={{ caseId: open.j.caseItem.id }} className="text-sm text-primary underline">{open.j.caseItem.id}</Link>}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-medium">{open.alert.customer} · {open.alert.account}</p>
                  <p className="text-muted-foreground">{open.alert.source} · received {formatDateTime(open.alert.receivedAt)}</p>
                  <p className="mt-2">{open.alert.trigger}</p>
                </div>
                {open.j.result === "System blocked" && (
                  <div className="rounded-md border border-destructive bg-destructive/10 p-3">
                    <p className="font-medium text-destructive">Transaction blocked by the system</p>
                    <BlockReason j={open.j} />
                  </div>
                )}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Journey</p>
                  <div className="[&>div]:grid-cols-1"><JourneyStrip j={open.j} /></div>
                </div>
                {open.j.run && (
                  <div className="rounded-md border border-border p-3">
                    <p className="font-medium">Engagement result</p>
                    <p className="text-muted-foreground">{open.j.run.outcome || "—"}</p>
                    {open.j.run.recordingUrl && <audio controls src={open.j.run.recordingUrl} className="mt-2 h-8 w-full" />}
                  </div>
                )}
                {open.j.enforcement && (
                  <div className="rounded-md border border-border p-3">
                    <p className="font-medium">{open.j.enforcement.action === "Block" ? "Account blocked" : "Account unblocked"}</p>
                    <p className="text-muted-foreground">{open.j.enforcement.reason}</p>
                    <p className="text-xs text-muted-foreground">By {open.j.enforcement.decidedBy}{open.j.enforcement.approvedBy ? `, approved by ${open.j.enforcement.approvedBy}` : ""} · {formatDateTime(open.j.enforcement.at)}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  {open.j.caseItem && <Button asChild size="sm"><Link to="/cases/$caseId" params={{ caseId: open.j.caseItem.id }}>Open case {open.j.caseItem.id}</Link></Button>}
                  {open.j.result === "New" && <Button size="sm" disabled={!can(role, "runTriage")} onClick={() => runTriage(open.alert)}>Run in simulator</Button>}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
