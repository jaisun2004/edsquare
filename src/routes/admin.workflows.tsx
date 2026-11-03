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
import { DECISION_BLOCKS, FEEDS, STEP_KINDS, STEP_LABELS, TRIGGER_LABELS, type FeedDecision, type FeedFlow, type FeedId, type FlowBlock, type FlowStep, type StepKind, type Trigger } from "@/data/ops-config";
import { resetOpsConfig, setOpsConfig, useOpsConfig } from "@/lib/ops-config-store";
import { useEDD } from "@/lib/edd-store";
import { FlowPreview } from "@/components/edd/SourceViews";
import { Link } from "@tanstack/react-router";
import { bandText } from "@/lib/decision-graph";
import type { Thresholds } from "@/lib/edd-flow";

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
  const { role, ruleSets, ruleGroups, rules } = useEDD();
  const editable = role === "admin" || role === "supervisor";
  const [feed, setFeed] = useState<FeedId>("I4C");
  const [addKind, setAddKind] = useState<StepKind>("voice");
  const flow = flows.find((f) => f.feed === feed)!;
  const meta = FEEDS.find((f) => f.id === feed)!;

  const save = (next: FeedFlow) => setOpsConfig({ flows: flows.map((f) => (f.feed === feed ? next : f)) });
  const setBlocks = (blocks: FlowBlock[]) => save({ ...flow, blocks });
  const setBlock = (id: string, patch: Partial<FlowBlock>) => setBlocks(flow.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const setStep = (bid: string, id: string, patch: Partial<FlowStep>) =>
    setBlocks(flow.blocks.map((b) => (b.id === bid ? { ...b, steps: b.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : b)));
  const swap = <T,>(arr: T[], i: number, d: -1 | 1): T[] | null => {
    const j = i + d;
    if (j < 0 || j >= arr.length) return null;
    const c = [...arr]; [c[i], c[j]] = [c[j]!, c[i]!]; return c;
  };
  const moveBlock = (i: number, d: -1 | 1) => { const r = swap(flow.blocks, i, d); if (r) setBlocks(r); };
  const moveStep = (b: FlowBlock, i: number, d: -1 | 1) => { const r = swap(b.steps, i, d); if (r) setBlock(b.id, { steps: r }); };
  const toBlock = (from: FlowBlock, step: FlowStep, toId: string) =>
    setBlocks(flow.blocks.map((b) => (b.id === from.id ? { ...b, steps: b.steps.filter((x) => x.id !== step.id) } : b.id === toId ? { ...b, steps: [...b.steps, step] } : b)));
  const setDecision = (patch: Partial<FeedDecision>) => save({ ...flow, decision: { ...flow.decision, ...patch } });
  const setTh = (k: keyof Thresholds, v: number) => setDecision({ thresholds: { ...flow.decision.thresholds, [k]: v } });
  const num = (k: keyof Thresholds, label: string, step = 1) => (
    <label className="flex items-center gap-1 text-xs text-muted-foreground">{label}
      <Input type="number" step={step} className="h-8 w-20" value={flow.decision.thresholds[k]} disabled={!editable} onChange={(e) => setTh(k, Number(e.target.value) || 0)} />
    </label>
  );
  const sortedSets = [...ruleSets].sort((a, b) => a.order - b.order);
  const triggers = Object.keys(TRIGGER_LABELS) as Trigger[];
  let stepNo = 0;

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

      {flow.blocks.map((b, bi) => (
        <Card key={b.id} className={b.enabled ? "" : "opacity-60"}>
          <CardHeader className="flex flex-row flex-wrap items-center gap-3 space-y-0 pb-3">
            <Badge variant="outline">Block {bi + 1}</Badge>
            <Input className="h-8 w-56 font-medium" value={b.name} disabled={!editable} onChange={(e) => setBlock(b.id, { name: e.target.value })} aria-label="Block name" />
            <span className="text-xs text-muted-foreground">Run this block</span>
            <Select value={b.trigger} disabled={!editable || bi === 0} onValueChange={(v) => setBlock(b.id, { trigger: v as Trigger })}>
              <SelectTrigger className="h-8 w-64"><SelectValue /></SelectTrigger>
              <SelectContent>{triggers.map((t) => <SelectItem key={t} value={t}>{TRIGGER_LABELS[t].replace("previous step / block", "previous block")}</SelectItem>)}</SelectContent>
            </Select>
            {(b.trigger === "amount_gte" || b.trigger === "amount_lt") && (
              <Input type="number" className="h-8 w-32" aria-label="Block amount (Rs)" value={b.amount ?? 0} disabled={!editable} onChange={(e) => setBlock(b.id, { amount: Number(e.target.value) || 0 })} />
            )}
            <div className="ml-auto flex items-center gap-1">
              <Switch checked={b.enabled} disabled={!editable} onCheckedChange={(v) => setBlock(b.id, { enabled: v })} aria-label="Block on" />
              <Button size="icon" variant="ghost" disabled={!editable || bi === 0} onClick={() => moveBlock(bi, -1)} aria-label="Move block up"><ArrowUp className="size-4" /></Button>
              <Button size="icon" variant="ghost" disabled={!editable || bi === flow.blocks.length - 1} onClick={() => moveBlock(bi, 1)} aria-label="Move block down"><ArrowDown className="size-4" /></Button>
              <Button size="icon" variant="ghost" disabled={!editable} onClick={() => setBlocks(flow.blocks.filter((x) => x.id !== b.id))} aria-label="Remove block"><Trash2 className="size-4" /></Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {DECISION_BLOCKS[b.name] === "checks" && (
              <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-semibold">Decision: which policy rule sets this block runs <Link to="/admin/policy" className="ml-1 font-normal text-primary hover:underline">Open policy</Link></p>
                <div className="flex flex-wrap gap-2">
                  {sortedSets.map((rs) => {
                    const on = flow.decision.ruleSets.includes(rs.id);
                    const count = rules.filter((r) => r.active && ruleGroups.some((g) => g.id === r.groupId && g.setId === rs.id)).length;
                    return (
                      <button key={rs.id} type="button" disabled={!editable}
                        onClick={() => setDecision({ ruleSets: on ? flow.decision.ruleSets.filter((x) => x !== rs.id) : [...flow.decision.ruleSets, rs.id] })}
                        className={`rounded-md border px-2 py-1 text-xs ${on ? "border-primary bg-primary/15 font-medium" : "border-border text-muted-foreground"}`}>
                        {on ? "✓ " : ""}{rs.order}. {rs.name} · {count} rules
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-3">
                  {num("minAmount", "Min amount (Rs)")}
                  {num("avgMultiple", "x avg daily credit", 0.5)}
                  {num("creditSharePct", "Credit share %")}
                </div>
              </div>
            )}
            {DECISION_BLOCKS[b.name] === "score" && (
              <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3">
                <p className="text-xs font-semibold">Decision: score bands for the answers <span className="font-normal text-muted-foreground">({bandText(flow)}) · shared by call and questionnaire</span></p>
                <div className="flex flex-wrap gap-3">
                  {num("flagBlock", "Keep blocked above")}
                  {num("flagReview", "Review from")}
                  {num("unansweredPoints", "Points per unanswered")}
                  {b.steps.some((x) => x.kind === "voice") && num("voiceRetries", "Call retries")}
                </div>
                <p className="text-[11px] text-muted-foreground">"If previous block red" triggers use these bands: a score above the block band counts as red.</p>
              </div>
            )}
            {b.steps.length === 0 && <p className="text-xs text-muted-foreground">No steps in this block yet.</p>}
            {b.steps.map((s, i) => (
              <div key={s.id} className={`flex flex-wrap items-center gap-3 rounded-md border border-border p-3 ${s.enabled ? "" : "opacity-50"}`}>
                <span className="w-6 text-sm font-semibold text-muted-foreground">{++stepNo}</span>
                <div className="min-w-48 flex-1">
                  <p className="text-sm font-medium">{STEP_LABELS[s.kind]}</p>
                  {channelKinds.includes(s.kind) && <Badge variant="secondary" className="mt-1">Customer contact</Badge>}
                </div>
                <Select value={s.trigger} disabled={!editable || i === 0} onValueChange={(v) => setStep(b.id, s.id, { trigger: v as Trigger })}>
                  <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                  <SelectContent>{triggers.map((t) => <SelectItem key={t} value={t}>{TRIGGER_LABELS[t].replace("previous step / block", "previous step")}</SelectItem>)}</SelectContent>
                </Select>
                {(s.trigger === "amount_gte" || s.trigger === "amount_lt") && (
                  <Input type="number" className="w-32" aria-label="Amount (Rs)" value={s.amount ?? 0} disabled={!editable} onChange={(e) => setStep(b.id, s.id, { amount: Number(e.target.value) || 0 })} />
                )}
                {s.kind === "voice" && (
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">Retries
                    <Input type="number" min={0} max={5} className="w-16" value={s.retries ?? 0} disabled={!editable} onChange={(e) => setStep(b.id, s.id, { retries: Math.max(0, Math.min(5, Number(e.target.value) || 0)) })} />
                  </label>
                )}
                {s.kind === "whatsapp" && (
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">Wait (min)
                    <Input type="number" min={1} className="w-20" value={s.waitMin ?? 60} disabled={!editable} onChange={(e) => setStep(b.id, s.id, { waitMin: Math.max(1, Number(e.target.value) || 1) })} />
                  </label>
                )}
                {flow.blocks.length > 1 && (
                  <Select value="" disabled={!editable} onValueChange={(v) => toBlock(b, s, v)}>
                    <SelectTrigger className="w-40" aria-label="Move to block"><SelectValue placeholder="Move to block…" /></SelectTrigger>
                    <SelectContent>{flow.blocks.filter((x) => x.id !== b.id).map((x) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
                  </Select>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <Switch checked={s.enabled} disabled={!editable} onCheckedChange={(v) => setStep(b.id, s.id, { enabled: v })} aria-label="Step on" />
                  <Button size="icon" variant="ghost" disabled={!editable || i === 0} onClick={() => moveStep(b, i, -1)} aria-label="Move up"><ArrowUp className="size-4" /></Button>
                  <Button size="icon" variant="ghost" disabled={!editable || i === b.steps.length - 1} onClick={() => moveStep(b, i, 1)} aria-label="Move down"><ArrowDown className="size-4" /></Button>
                  <Button size="icon" variant="ghost" disabled={!editable} onClick={() => setBlock(b.id, { steps: b.steps.filter((x) => x.id !== s.id) })} aria-label="Remove step"><Trash2 className="size-4" /></Button>
                </div>
              </div>
            ))}
            {editable && (
              <div className="flex items-center gap-2 pt-1">
                <Select value={addKind} onValueChange={(v) => setAddKind(v as StepKind)}>
                  <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                  <SelectContent>{STEP_KINDS.map((k) => <SelectItem key={k} value={k}>{STEP_LABELS[k]}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setBlock(b.id, { steps: [...b.steps, { id: `st-${Date.now()}`, kind: addKind, enabled: true, trigger: "always" }] })}>
                  <Plus className="mr-1 size-4" /> Add step
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
      {editable ? (
        <Button variant="outline" onClick={() => setBlocks([...flow.blocks, { id: `bl-${Date.now()}`, name: "New block", enabled: true, trigger: "prev_failed", steps: [] }])}>
          <Plus className="mr-1 size-4" /> Add block
        </Button>
      ) : <p className="text-xs text-muted-foreground">Switch to Admin or Supervisor to change workflows.</p>}
    </div>
  );
}
