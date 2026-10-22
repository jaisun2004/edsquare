import { Link } from "@tanstack/react-router";

import { formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { runStats, type DemoRun, type RunColour } from "@/lib/demo-runs";
import { useEDD } from "@/lib/edd-store";

const colourCls: Record<RunColour, string> = {
  Red: "border-destructive text-destructive",
  Amber: "border-warning text-warning",
  Green: "border-success text-success",
  Manual: "border-primary text-primary",
};

export const ColourBadge = ({ c }: { c: RunColour }) => <Badge variant="outline" className={colourCls[c]}>{c}</Badge>;

const path = (r: DemoRun) =>
  `Call ${r.callAnswered ? "answered" : r.callAttempts ? `not answered (${r.callAttempts})` : "not placed"} · WhatsApp ${r.whatsappSent ? (r.formSubmitted ? "answered" : "sent, no reply") : "not sent"}`;

export function LatestCases({ limit = 5 }: { limit?: number }) {
  const { demoRuns } = useEDD();
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Latest cases</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        {demoRuns.length === 0 && (
          <p className="text-muted-foreground">No cases yet.</p>
        )}
        {demoRuns.slice(0, limit).map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
            <div className="min-w-0">
              <p className="font-medium">{r.customer}{r.contactName && r.contactName !== r.customer ? ` (contacted ${r.contactName})` : ""} <span className="text-xs text-muted-foreground">· {r.alertType} · {formatDateTime(r.at)}</span></p>
              <p className="truncate text-xs text-muted-foreground">{path(r)}</p>
            </div>
            <div className="flex items-center gap-2">
              <ColourBadge c={r.colour} />
              {r.caseId ? (
                <Link to="/cases/$caseId" params={{ caseId: r.caseId }} className="text-xs text-primary hover:underline">{r.caseId}</Link>
              ) : <span className="text-xs text-muted-foreground">No case</span>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function CaseResultStats() {
  const { demoRuns, cases } = useEDD();
  const s = runStats(demoRuns, cases.flatMap((c) => c.calls ?? []), cases.flatMap((c) => c.questionnaires ?? []));
  const items = [
    { label: "Alerts engaged", value: s.total },
    { label: "Cleared, no case", value: s.cleared },
    { label: "Case created", value: s.withCase },
    { label: "Voice answer rate", value: `${s.answerRate}%` },
    { label: "WhatsApp completion", value: `${s.completionRate}%` },
  ];
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">Case results</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-5">
          {items.map((i) => <div key={i.label}><p className="text-xl font-semibold">{i.value}</p><p className="text-xs text-muted-foreground">{i.label}</p></div>)}
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          {(Object.keys(s.byColour) as RunColour[]).map((c) => <span key={c} className="flex items-center gap-1.5"><ColourBadge c={c} /> {s.byColour[c]}</span>)}
        </div>
      </CardContent>
    </Card>
  );
}

export function EngagementSummary({ run }: { run: DemoRun }) {
  return (
    <Card className="lg:col-span-2 border-primary/30">
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm">Engagement summary <ColourBadge c={run.colour} /></CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p><span className="text-muted-foreground">Path taken: </span>{path(run)}</p>
        {run.number && <p><span className="text-muted-foreground">Customer number: </span>{run.number}</p>}
        <p><span className="text-muted-foreground">Outcome: </span>{run.outcome || "—"}</p>
        <p className="text-xs text-muted-foreground">Engaged at {formatDateTime(run.at)}. Answers and transcripts are in the Engagement tab.</p>
        {run.recordingUrl && <audio controls src={run.recordingUrl} className="h-8 w-full" />}
      </CardContent>
    </Card>
  );
}
