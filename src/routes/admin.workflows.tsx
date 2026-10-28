import { createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FEEDS, STEP_KINDS, STEP_LABELS, TRIGGER_LABELS, type FeedFlow, type FeedId, type FlowStep, type StepKind, type Trigger } from "@/data/ops-config";
import { resetOpsConfig, setOpsConfig, useOpsConfig } from "@/lib/ops-config-store";
import { useEDD } from "@/lib/edd-store";
import { FlowPreview } from "@/components/edd/SourceViews";

export const Route = createFileRoute("/admin/workflows")({
  head: () => ({
    meta: [
      { title: "Workflows by source — EDSquare" },
      { name: "description", content: "Configure the process flow for each alert source: which check runs first and when the AI call or WhatsApp is triggered." },
      { property: "og:title", content: "Workflows by source — EDSquare" },
      { property: "og:description", content: "Per-source orchestration for I4C, NPCI, model and threat-intel alerts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkflowsPage,
});

const channelKinds: StepKind[] = ["voice", "whatsapp", "email_app"];

function WorkflowsPage() {
  const { flows } = useOpsConfig();
  const { role } = useEDD();
  const editable = role === "admin" || role === "supervisor";
  const [feed, setFeed] = useState<FeedId>("I4C");
  const [addKind, setAddKind] = useState<StepKind>("voice");
  const flow = flows.find((f) => f.feed === feed)!;
  const meta = FEEDS.find((f) => f.id === feed)!;

  const save = (next: FeedFlow) => setOpsConfig({ flows: flows.map((f) => (f.feed === feed ? next : f)) });
  const setStep = (id: string, patch: Partial<FlowStep>) => save({ ...flow, steps: flow.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  const move = (i: number, d: -1 | 1) => {
    const steps = [...flow.steps];
    const j = i + d;
    if (j < 0 || j >= steps.length) return;
    [steps[i], steps[j]] = [steps[j]!, steps[i]!];
    save({ ...flow, steps });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FEEDS.map((f) => (
          <Button key={f.id} size="sm" variant={f.id === feed ? "default" : "outline"} onClick={() => setFeed(f.id)}>{f.name}</Button>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-base">{meta.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{meta.description}</p>
          </div>
          {editable && (
            <Button size="sm" variant="ghost" onClick={() => { resetOpsConfig("flows"); toast.success("All workflows reset to defaults"); }}>
              <RotateCcw className="mr-1 size-4" /> Reset defaults
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Handling desk</span>
              <Input value={flow.desk} disabled={!editable} onChange={(e) => save({ ...flow, desk: e.target.value })} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">SLA (minutes)</span>
              <Input type="number" min={1} value={flow.slaMin} disabled={!editable} onChange={(e) => save({ ...flow, slaMin: Math.max(1, Number(e.target.value) || 1) })} />
            </label>
          </div>
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Flow preview</p>
            <FlowPreview flow={flow} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Steps, in order</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {flow.steps.map((s, i) => (
            <div key={s.id} className={`flex flex-wrap items-center gap-3 rounded-md border border-border p-3 ${s.enabled ? "" : "opacity-50"}`}>
              <span className="w-6 text-sm font-semibold text-muted-foreground">{i + 1}</span>
              <div className="min-w-48 flex-1">
                <p className="text-sm font-medium">{STEP_LABELS[s.kind]}</p>
                {channelKinds.includes(s.kind) && <Badge variant="secondary" className="mt-1">Customer contact</Badge>}
              </div>
              <Select value={s.trigger} disabled={!editable || i === 0} onValueChange={(v) => setStep(s.id, { trigger: v as Trigger })}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(TRIGGER_LABELS) as Trigger[]).map((t) => <SelectItem key={t} value={t}>{TRIGGER_LABELS[t]}</SelectItem>)}
                </SelectContent>
              </Select>
              {(s.trigger === "amount_gte" || s.trigger === "amount_lt") && (
                <Input type="number" className="w-32" aria-label="Amount (Rs)" value={s.amount ?? 0} disabled={!editable} onChange={(e) => setStep(s.id, { amount: Number(e.target.value) || 0 })} />
              )}
              {s.kind === "voice" && (
                <label className="flex items-center gap-1 text-xs text-muted-foreground">Retries
                  <Input type="number" min={0} max={5} className="w-16" value={s.retries ?? 0} disabled={!editable} onChange={(e) => setStep(s.id, { retries: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })} />
                </label>
              )}
              {s.kind === "whatsapp" && (
                <label className="flex items-center gap-1 text-xs text-muted-foreground">Wait (min)
                  <Input type="number" min={1} className="w-20" value={s.waitMin ?? 60} disabled={!editable} onChange={(e) => setStep(s.id, { waitMin: Math.max(1, Number(e.target.value) || 1) })} />
                </label>
              )}
              <div className="ml-auto flex items-center gap-1">
                <Switch checked={s.enabled} disabled={!editable} onCheckedChange={(v) => setStep(s.id, { enabled: v })} aria-label="Step on" />
                <Button size="icon" variant="ghost" disabled={!editable || i === 0} onClick={() => move(i, -1)} aria-label="Move up"><ArrowUp className="size-4" /></Button>
                <Button size="icon" variant="ghost" disabled={!editable || i === flow.steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down"><ArrowDown className="size-4" /></Button>
                <Button size="icon" variant="ghost" disabled={!editable} onClick={() => save({ ...flow, steps: flow.steps.filter((x) => x.id !== s.id) })} aria-label="Remove step"><Trash2 className="size-4" /></Button>
              </div>
            </div>
          ))}
          {editable && (
            <div className="flex items-center gap-2 pt-2">
              <Select value={addKind} onValueChange={(v) => setAddKind(v as StepKind)}>
                <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
                <SelectContent>{STEP_KINDS.map((k) => <SelectItem key={k} value={k}>{STEP_LABELS[k]}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" variant="outline" onClick={() => save({ ...flow, steps: [...flow.steps, { id: `st-${Date.now()}`, kind: addKind, enabled: true, trigger: "always" }] })}>
                <Plus className="mr-1 size-4" /> Add step
              </Button>
            </div>
          )}
          {!editable && <p className="text-xs text-muted-foreground">Switch to Admin or Supervisor to change workflows.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
