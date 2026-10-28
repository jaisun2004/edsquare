import { createFileRoute } from "@tanstack/react-router";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FEEDS, feedName, type QueueWeights } from "@/data/ops-config";
import { useCaseFeeds } from "@/components/edd/SourceViews";
import { rankQueue } from "@/lib/queue-priority";
import { resetOpsConfig, setOpsConfig, useOpsConfig } from "@/lib/ops-config-store";
import { useEDD } from "@/lib/edd-store";

export const Route = createFileRoute("/admin/queue")({
  head: () => ({
    meta: [
      { title: "Queue priority — EDSquare" },
      { name: "description", content: "Set how cases are ranked in the work queue: risk, SLA urgency, alert source and waiting time." },
      { property: "og:title", content: "Queue priority — EDSquare" },
      { property: "og:description", content: "Configurable, source-aware case queue prioritisation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QueuePage,
});

const FACTORS: { key: keyof QueueWeights; label: string; help: string }[] = [
  { key: "risk", label: "Risk score", help: "Case risk score from the Decision Manager." },
  { key: "sla", label: "SLA urgency", help: "Rises as the deadline nears; full weight once overdue." },
  { key: "source", label: "Alert source", help: "How critical the alert's source is (set below)." },
  { key: "age", label: "Waiting time", help: "How long the case has been open (full at 48 hours)." },
];

function QueuePage() {
  const { queue, flows } = useOpsConfig();
  const { role } = useEDD();
  const editable = role === "admin" || role === "supervisor";
  const rows = useCaseFeeds();
  const total = Object.values(queue.weights).reduce((a, b) => a + b, 0) || 1;
  const ranked = rankQueue(rows, queue).slice(0, 8);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Ranking factors</CardTitle>
            {editable && <Button size="sm" variant="ghost" onClick={() => { resetOpsConfig("queue"); toast.success("Queue priority reset"); }}><RotateCcw className="mr-1 size-4" />Reset</Button>}
          </CardHeader>
          <CardContent className="space-y-5">
            {FACTORS.map((f) => (
              <div key={f.key} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.label}</span>
                  <span className="text-muted-foreground">{Math.round((queue.weights[f.key] / total) * 100)}% of score</span>
                </div>
                <Slider value={[queue.weights[f.key]]} max={100} step={5} disabled={!editable}
                  onValueChange={([v]) => setOpsConfig({ queue: { ...queue, weights: { ...queue.weights, [f.key]: v ?? 0 } } })} />
                <p className="text-xs text-muted-foreground">{f.help}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Source criticality and routing</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {FEEDS.map((f) => {
              const flow = flows.find((x) => x.feed === f.id);
              return (
                <div key={f.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground">{queue.feedPriority[f.id]}</span>
                  </div>
                  <Slider value={[queue.feedPriority[f.id]]} max={100} step={5} disabled={!editable}
                    onValueChange={([v]) => setOpsConfig({ queue: { ...queue, feedPriority: { ...queue.feedPriority, [f.id]: v ?? 0 } } })} />
                  <p className="text-xs text-muted-foreground">Routed to {flow?.desk ?? "—"} · SLA {flow?.slaMin ?? "—"} min (set in Workflows by source)</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Live preview — top of the queue with these settings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow><TableHead>#</TableHead><TableHead>Case</TableHead><TableHead>Source</TableHead><TableHead>Risk</TableHead><TableHead>SLA</TableHead><TableHead>Source pts</TableHead><TableHead>Wait</TableHead><TableHead className="text-right">Priority</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((r, i) => (
                <TableRow key={r.item.c.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.item.c.id} <span className="text-muted-foreground">· {r.item.c.customer}</span></TableCell>
                  <TableCell className="text-xs">{feedName(r.item.feed)}</TableCell>
                  <TableCell>{r.parts.risk.toFixed(0)}</TableCell>
                  <TableCell>{r.parts.sla.toFixed(0)}</TableCell>
                  <TableCell>{r.parts.source.toFixed(0)}</TableCell>
                  <TableCell>{r.parts.age.toFixed(0)}</TableCell>
                  <TableCell className="text-right font-semibold">{r.score}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
