import { createFileRoute } from "@tanstack/react-router";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DIST_LABELS, ESC_ACTION_LABELS, ESC_TRIGGER_LABELS, FEEDS, PRESETS, feedName,
  type DistMode, type EscAction, type EscTrigger, type FeedFactor, type FeedId, type FeedQueue, type PresetId, type QueueWeights,
} from "@/data/ops-config";
import { useCaseFeeds, type CaseFeedRow } from "@/components/edd/SourceViews";
import { explainOrder, fmtMins, nextEscalation, rankFeed, rankQueue, reasonChips, suggestAssignee } from "@/lib/queue-priority";
import { resetOpsConfig, setOpsConfig, useOpsConfig } from "@/lib/ops-config-store";
import { useEDD } from "@/lib/edd-store";

export const Route = createFileRoute("/admin/queue")({
  head: () => ({
    meta: [
      { title: "Queue priority — EDSquare" },
      { name: "description", content: "Set each alert source's queue order, team distribution and escalation ladder." },
      { property: "og:title", content: "Queue priority — EDSquare" },
      { property: "og:description", content: "Source-driven case queues: what comes first, who works it, when it escalates." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: QueuePage,
});

const CROSS: { key: keyof QueueWeights; label: string; help: string }[] = [
  { key: "risk", label: "Risk score", help: "Case risk score from the Decision Manager." },
  { key: "sla", label: "SLA urgency", help: "Rises as the deadline nears; full weight once overdue." },
  { key: "source", label: "Alert source", help: "How critical the alert's source is (set on the right)." },
  { key: "age", label: "Waiting time", help: "How long the case has been open (full at 48 hours)." },
];
const FACTORS: { key: FeedFactor; label: string }[] = [
  { key: "sla", label: "Deadline (SLA left)" },
  { key: "amount", label: "Amount at risk" },
  { key: "risk", label: "Risk score" },
  { key: "age", label: "Waiting time" },
  { key: "negHits", label: "Negative Database hits" },
];
const LEVELS = ["Not at all", "A little", "Some", "A lot"];

/** Open-case count per assignee. */
const loadOf = (rows: CaseFeedRow[]) => rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.assignee]: (m[r.assignee] ?? 0) + 1 }), {});

function QueuePage() {
  const { queue } = useOpsConfig();
  const [tab, setTab] = useState<"all" | FeedId>("I4C");
  const rows = useCaseFeeds();
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
      <TabsList className="flex-wrap">
        {FEEDS.map((f) => <TabsTrigger key={f.id} value={f.id}>{f.short} <span className="ml-1 text-muted-foreground">({rows.filter((r) => r.feed === f.id).length})</span></TabsTrigger>)}
        <TabsTrigger value="all">Across queues</TabsTrigger>
      </TabsList>
      {FEEDS.map((f) => <TabsContent key={f.id} value={f.id}><FeedQueuePanel feed={f.id} q={queue.perFeed[f.id]} rows={rows} /></TabsContent>)}
      <TabsContent value="all"><CrossPanel rows={rows} /></TabsContent>
    </Tabs>
  );
}

function useEditable() {
  const { role } = useEDD();
  return role === "admin" || role === "supervisor";
}

function FeedQueuePanel({ feed, q, rows }: { feed: FeedId; q: FeedQueue; rows: CaseFeedRow[] }) {
  const { queue, flows } = useOpsConfig();
  const editable = useEditable();
  const flow = flows.find((x) => x.feed === feed);
  const save = (next: Partial<FeedQueue>) => setOpsConfig({ queue: { ...queue, perFeed: { ...queue.perFeed, [feed]: { ...q, ...next } } } });
  const mine = rows.filter((r) => r.feed === feed);
  const load = loadOf(rows);
  const ranked = rankFeed(mine, q).slice(0, 10);
  const setDist = (d: Partial<FeedQueue["distribution"]>) => save({ distribution: { ...q.distribution, ...d } });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{feedName(feed)} · worked by <span className="font-medium text-foreground">{flow?.desk ?? "—"}</span> · SLA {flow?.slaMin ?? "—"} min (set in Workflows by source)</p>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">1. What comes first in this queue</CardTitle>
            {editable && <Button size="sm" variant="ghost" onClick={() => { resetOpsConfig("queue"); toast.success("Queue settings reset"); }}><RotateCcw className="mr-1 size-4" />Reset all</Button>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PRESETS) as Exclude<PresetId, "custom">[]).map((p) => (
                <Button key={p} size="sm" variant={q.preset === p ? "default" : "outline"} disabled={!editable}
                  onClick={() => save({ preset: p, weights: PRESETS[p].weights })}>{PRESETS[p].label}</Button>
              ))}
              {q.preset === "custom" && <Badge variant="secondary">Custom</Badge>}
            </div>
            {FACTORS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <div className="flex justify-between text-sm"><span className="font-medium">{f.label}</span><span className="text-muted-foreground">Matters {LEVELS[q.weights[f.key]]?.toLowerCase()}</span></div>
                <Slider value={[q.weights[f.key]]} max={3} step={1} disabled={!editable}
                  onValueChange={([v]) => save({ preset: "custom", weights: { ...q.weights, [f.key]: v ?? 0 } })} />
              </div>
            ))}
            <div className="space-y-3 rounded-md border border-border p-3">
              <label className="flex items-center justify-between text-sm">Always put breached cases on top
                <Switch checked={q.overrides.breachedTop} disabled={!editable} onCheckedChange={(v) => save({ overrides: { ...q.overrides, breachedTop: v } })} /></label>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>Always put amounts of at least Rs</span>
                <div className="flex items-center gap-2">
                  <Input type="number" className="h-8 w-28" disabled={!editable || !q.overrides.amountTopGte} value={q.overrides.amountTopGte ?? ""}
                    onChange={(e) => save({ overrides: { ...q.overrides, amountTopGte: Number(e.target.value) || 1 } })} />
                  <Switch checked={!!q.overrides.amountTopGte} disabled={!editable}
                    onCheckedChange={(v) => save({ overrides: { ...q.overrides, amountTopGte: v ? 100000 : undefined } })} />
                </div>
              </div>
            </div>
            <p className="rounded-md bg-muted p-3 text-sm">{explainOrder(q)}</p>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">2. Who works this queue</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Select value={q.distribution.mode} disabled={!editable} onValueChange={(v) => setDist({ mode: v as DistMode })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(DIST_LABELS) as DistMode[]).map((m) => <SelectItem key={m} value={m}>{DIST_LABELS[m]}</SelectItem>)}</SelectContent>
              </Select>
              {q.distribution.members.map((m, i) => (
                <div key={m.name} className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="min-w-28 font-medium">{m.name}</span>
                  <Badge variant="outline" className="capitalize">{m.role}</Badge>
                  <span className="text-muted-foreground">{load[m.name] ?? 0} open · limit</span>
                  <Input type="number" className="h-8 w-16" value={m.cap} disabled={!editable}
                    onChange={(e) => setDist({ members: q.distribution.members.map((x, j) => (j === i ? { ...x, cap: Math.max(1, Number(e.target.value) || 1) } : x)) })} />
                  <label className="flex items-center gap-1 text-xs">Senior
                    <Switch checked={m.senior} disabled={!editable} onCheckedChange={(v) => setDist({ members: q.distribution.members.map((x, j) => (j === i ? { ...x, senior: v } : x)) })} /></label>
                  <span className="text-xs text-muted-foreground">{m.langs.join(", ")}</span>
                </div>
              ))}
              <label className="flex items-center justify-between text-sm">Very high risk (VH) cases only go to senior members
                <Switch checked={q.distribution.seniorOnlyVH} disabled={!editable} onCheckedChange={(v) => setDist({ seniorOnlyVH: v })} /></label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm">3. When it escalates</CardTitle>
              {editable && q.escalation.length < 3 && <Button size="sm" variant="outline" onClick={() => save({ escalation: [...q.escalation, { id: `e${Date.now()}`, trigger: "sla_breached", action: "notify", target: "Supervisor" }] })}><Plus className="mr-1 size-4" />Level</Button>}
            </CardHeader>
            <CardContent className="space-y-2">
              {q.escalation.length === 0 && <p className="text-sm text-muted-foreground">No escalation set.</p>}
              {q.escalation.map((e, i) => {
                const upd = (p: Partial<typeof e>) => save({ escalation: q.escalation.map((x) => (x.id === e.id ? { ...x, ...p } : x)) });
                const needsValue = e.trigger === "unassigned_min" || e.trigger === "sla_pct" || e.trigger === "high_risk_idle";
                return (
                  <div key={e.id} className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge>L{i + 1}</Badge>
                    <Select value={e.trigger} disabled={!editable} onValueChange={(v) => upd({ trigger: v as EscTrigger, value: v === "sla_pct" ? 80 : 15 })}>
                      <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(ESC_TRIGGER_LABELS) as EscTrigger[]).map((t) => <SelectItem key={t} value={t}>{ESC_TRIGGER_LABELS[t]}</SelectItem>)}</SelectContent>
                    </Select>
                    {needsValue && <Input type="number" className="h-8 w-16" value={e.value ?? 0} disabled={!editable} onChange={(ev) => upd({ value: Number(ev.target.value) || 0 })} />}
                    <span>→</span>
                    <Select value={e.action} disabled={!editable} onValueChange={(v) => upd({ action: v as EscAction })}>
                      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                      <SelectContent>{(Object.keys(ESC_ACTION_LABELS) as EscAction[]).map((a) => <SelectItem key={a} value={a}>{ESC_ACTION_LABELS[a]}</SelectItem>)}</SelectContent>
                    </Select>
                    {e.action !== "raise_priority" && <Input className="h-8 w-36" value={e.target} disabled={!editable} onChange={(ev) => upd({ target: ev.target.value })} />}
                    {editable && <Button size="icon" variant="ghost" aria-label="Remove level" onClick={() => save({ escalation: q.escalation.filter((x) => x.id !== e.id) })}><Trash2 className="size-4" /></Button>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">4. Live preview — this queue with these settings</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Case</TableHead><TableHead>Why it's here</TableHead><TableHead>Now with</TableHead><TableHead>Would go to</TableHead><TableHead>Next escalation</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
            <TableBody>
              {ranked.length === 0 && <TableRow><TableCell colSpan={7} className="py-6 text-center text-muted-foreground">No open cases in this queue.</TableCell></TableRow>}
              {ranked.map((r, i) => {
                const esc = nextEscalation(r.item, q, flow?.slaMin ?? 60);
                const chips = [...new Set([...(r.pinned ? [r.pinned] : []), ...reasonChips(r.item)])];
                return (
                  <TableRow key={r.item.c.id}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{r.item.c.id} <span className="text-muted-foreground">· {r.item.c.customer}</span></TableCell>
                    <TableCell><div className="flex flex-wrap gap-1">{chips.length ? chips.map((c) => <Badge key={c} variant={c === "Breached" ? "destructive" : "secondary"}>{c}</Badge>) : <span className="text-xs text-muted-foreground">Score</span>}</div></TableCell>
                    <TableCell className="text-xs">{r.item.assignee}</TableCell>
                    <TableCell className="text-xs">{suggestAssignee(r.item, q, load, { turn: i, lang: r.item.c.contact?.lang }) ?? (q.distribution.mode === "pull" ? "Picked by team" : "No one free")}</TableCell>
                    <TableCell className="text-xs">{esc ? <span className={esc.due ? "font-medium text-destructive" : ""}>L{esc.level} {esc.due ? "due now" : `in ${fmtMins(esc.inMin)}`} · {esc.text}</span> : "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{r.score}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function CrossPanel({ rows }: { rows: CaseFeedRow[] }) {
  const { queue, flows } = useOpsConfig();
  const editable = useEditable();
  const total = Object.values(queue.weights).reduce((a, b) => a + b, 0) || 1;
  const ranked = rankQueue(rows, queue).slice(0, 8);
  const now = Date.now();
  const members = [...new Map(Object.values(queue.perFeed).flatMap((q) => q.distribution.members).map((m) => [m.name, m])).values()];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Overall weights (when one team covers several queues)</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {CROSS.map((f) => (
              <div key={f.key} className="space-y-2">
                <div className="flex justify-between text-sm"><span className="font-medium">{f.label}</span><span className="text-muted-foreground">{Math.round((queue.weights[f.key] / total) * 100)}% of score</span></div>
                <Slider value={[queue.weights[f.key]]} max={100} step={5} disabled={!editable} onValueChange={([v]) => setOpsConfig({ queue: { ...queue, weights: { ...queue.weights, [f.key]: v ?? 0 } } })} />
                <p className="text-xs text-muted-foreground">{f.help}</p>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">How much attention each queue gets</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {FEEDS.map((f) => (
              <div key={f.id} className="space-y-2">
                <div className="flex justify-between text-sm"><span className="font-medium">{f.name}</span><span className="text-muted-foreground">{queue.feedPriority[f.id]}</span></div>
                <Slider value={[queue.feedPriority[f.id]]} max={100} step={5} disabled={!editable} onValueChange={([v]) => setOpsConfig({ queue: { ...queue, feedPriority: { ...queue.feedPriority, [f.id]: v ?? 0 } } })} />
                <p className="text-xs text-muted-foreground">{flows.find((x) => x.feed === f.id)?.desk} · {PRESETS[queue.perFeed[f.id].preset as Exclude<PresetId, "custom">]?.label ?? "Custom order"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-sm">Team load</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {members.map((m) => {
            const mine = rows.filter((r) => r.assignee === m.name);
            const breached = mine.filter((r) => new Date(r.slaDueAt).getTime() <= now).length;
            const pct = Math.min(100, Math.round((mine.length / m.cap) * 100));
            return (
              <div key={m.name} className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="font-medium">{m.name}</span><span className="text-muted-foreground">{mine.length}/{m.cap} open{breached ? ` · ${breached} breached` : ""}</span></div>
                <div className="h-2 rounded-full bg-muted"><div className={`h-2 rounded-full ${pct >= 100 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">Unassigned: {rows.filter((r) => r.assignee === "Unassigned").length} open cases.</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">Combined queue — top 8</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Case</TableHead><TableHead>Source</TableHead><TableHead>Why</TableHead><TableHead className="text-right">Priority</TableHead></TableRow></TableHeader>
            <TableBody>
              {ranked.map((r, i) => (
                <TableRow key={r.item.c.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{r.item.c.id} <span className="text-muted-foreground">· {r.item.c.customer}</span></TableCell>
                  <TableCell className="text-xs">{feedName(r.item.feed)}</TableCell>
                  <TableCell className="text-xs">{[r.pinned, ...reasonChips(r.item)].filter(Boolean).join(" · ") || "—"}</TableCell>
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
