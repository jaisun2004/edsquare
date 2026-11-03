import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, CheckCircle2, Circle, MinusCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { RecommendationBadge, RiskChip } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gradeForScore } from "@/data/edd";
import { STRATEGIES, type Strategy } from "@/data/policy";
import { useEDD } from "@/lib/edd-store";
import { describeCondition } from "@/lib/rule-engine";
import { setUsage } from "@/lib/decision-graph";
import { useOpsConfig } from "@/lib/ops-config-store";

export const Route = createFileRoute("/admin/policy")({
  head: () => ({
    meta: [
      { title: "Policy & Rule Hierarchy — EDSquare" },
      { name: "description", content: "Order rule sets, choose combine strategies, simulate alerts and version the EDD policy." },
      { property: "og:title", content: "Policy & Rule Hierarchy — EDSquare" },
      { property: "og:description", content: "Policy > rule set > group > rule, with simulation, compare and rollback." },
    ],
  }),
  component: PolicyPage,
});

function PolicyPage() {
  const { rules, ruleSets, ruleGroups, alerts, attributes, sources, policyVersions, role, moveRuleSet, setStrategy, setRulePriority, publishPolicy, rollbackPolicy, evaluate } = useEDD();
  const admin = role === "admin";
  const { flows } = useOpsConfig();
  const used = setUsage(flows);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [alertId, setAlertId] = useState(alerts[0]?.id ?? "");
  const [note, setNote] = useState("");
  const sets = [...ruleSets].sort((a, b) => a.order - b.order);
  const sim = useMemo(() => (alertId ? evaluate(alertId) : null), [alertId, evaluate]);
  const toggle = (id: string) => setCollapsed((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const sourceName = (attr: string) => sources.find((s) => s.id === attributes.find((a) => a.key === attr)?.sourceId)?.name ?? "";

  const latest = policyVersions[0];
  const diff = useMemo(() => {
    if (!latest) return { added: [], removed: [], changed: [], order: false };
    const prev = new Map(latest.rules.map((r) => [r.id, r]));
    const cur = new Map(rules.map((r) => [r.id, r]));
    const sig = (r: (typeof rules)[number]) => JSON.stringify([r.conditions, r.action, r.status, r.active, r.priority, r.dependsOn]);
    return {
      added: rules.filter((r) => !prev.has(r.id)).map((r) => r.id),
      removed: latest.rules.filter((r) => !cur.has(r.id)).map((r) => r.id),
      changed: rules.filter((r) => prev.has(r.id) && sig(prev.get(r.id)!) !== sig(r)).map((r) => r.id),
      order: JSON.stringify(latest.sets.map((s) => [s.id, s.order, s.strategy])) !== JSON.stringify(ruleSets.map((s) => [s.id, s.order, s.strategy])),
    };
  }, [latest, rules, ruleSets]);
  const dirty = diff.added.length + diff.removed.length + diff.changed.length > 0 || diff.order;

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Money-mule EDD policy · working copy (based on {latest?.version})</CardTitle>
            <CardDescription>Rule sets run top to bottom. A hard stop ends evaluation. Each set combines its rules with its own strategy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sets.map((s, i) => {
              const groups = ruleGroups.filter((g) => g.setId === s.id);
              const open = !collapsed.has(s.id);
              return (
                <div key={s.id} className="rounded-lg border border-border">
                  <div className="flex flex-wrap items-center gap-2 border-b border-border bg-secondary/50 p-3">
                    <button type="button" onClick={() => toggle(s.id)} className="flex items-center gap-2 text-sm font-medium" aria-label={`Toggle ${s.name}`}>
                      {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                      <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{i + 1}</span> {s.name}
                    </button>
                    <Badge variant="outline">{s.stage}</Badge>
                    {(used[s.id] ?? []).length
                      ? <Link to="/admin/workflows" className="text-xs text-muted-foreground hover:underline">Used in: {used[s.id]!.map((f) => `${f} → Data checks`).join(", ")}</Link>
                      : <span className="text-xs text-destructive">Not linked to any workflow</span>}
                    <div className="ml-auto flex items-center gap-1">
                      <Select value={s.strategy} onValueChange={(v) => setStrategy(s.id, v as Strategy)} disabled={!admin}>
                        <SelectTrigger className="h-8 w-[190px]"><SelectValue /></SelectTrigger>
                        <SelectContent>{STRATEGIES.map((x) => <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <Button size="icon" variant="ghost" disabled={!admin || i === 0} onClick={() => moveRuleSet(s.id, -1)} aria-label="Move up"><ArrowUp className="size-4" /></Button>
                      <Button size="icon" variant="ghost" disabled={!admin || i === sets.length - 1} onClick={() => moveRuleSet(s.id, 1)} aria-label="Move down"><ArrowDown className="size-4" /></Button>
                    </div>
                  </div>
                  {open && (
                    <div className="space-y-3 p-3">
                      <p className="text-xs text-muted-foreground">{s.description}</p>
                      {groups.map((g) => {
                        const gr = rules.filter((r) => r.groupId === g.id && r.status !== "Retired").sort((a, b) => a.priority - b.priority);
                        const gOpen = !collapsed.has(g.id);
                        return (
                          <div key={g.id} className="ml-3 border-l-2 border-primary/20 pl-3">
                            <button type="button" onClick={() => toggle(g.id)} className="flex items-center gap-1 text-sm font-medium">
                              {gOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />} {g.name} <span className="text-xs font-normal text-muted-foreground">({gr.length})</span>
                            </button>
                            {gOpen && (
                              <ul className="mt-1 space-y-1">
                                {gr.map((r) => (
                                  <li key={r.id} className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent">
                                    <Input type="number" className="h-7 w-14 px-1 text-xs" value={r.priority} disabled={!admin} onChange={(e) => setRulePriority(r.id, Number(e.target.value))} aria-label={`Priority of ${r.id}`} />
                                    <Link to="/admin/rules/$ruleId" params={{ ruleId: r.id }} className="font-medium text-primary hover:underline">{r.id}</Link>
                                    <span className="truncate">{r.name}</span>
                                    {r.dependsOn.length > 0 && <Badge variant="outline" className="text-xs">after {r.dependsOn.join(", ")}</Badge>}
                                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">{r.action.outcome ?? `+${r.action.weight}`}</span>
                                    {r.status !== "Active" && <Badge variant="outline" className="text-xs">{r.status}</Badge>}
                                    {!r.active && <Badge variant="outline" className="text-xs">off</Badge>}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Versions</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-md border border-border p-3">
              <p className="font-medium">Changes since {latest?.version}</p>
              {!dirty ? <p className="text-muted-foreground">No changes.</p> : (
                <ul className="mt-1 text-muted-foreground">
                  {diff.added.length > 0 && <li>Added: {diff.added.join(", ")}</li>}
                  {diff.changed.length > 0 && <li>Changed: {diff.changed.join(", ")}</li>}
                  {diff.removed.length > 0 && <li>Removed: {diff.removed.join(", ")}</li>}
                  {diff.order && <li>Rule-set order or strategy changed</li>}
                </ul>
              )}
              {admin && (
                <div className="mt-3 flex gap-2">
                  <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Release note" />
                  <Button disabled={!dirty || !note.trim()} onClick={() => { publishPolicy(note); setNote(""); toast.success("New policy version published"); }}>Publish</Button>
                </div>
              )}
            </div>
            {policyVersions.map((v) => (
              <div key={v.version} className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
                <div>
                  <p className="font-medium">{v.version} <span className="font-normal text-muted-foreground">· {v.rules.length} rules · {new Date(v.at).toLocaleDateString()} · {v.by}</span></p>
                  <p className="text-xs text-muted-foreground">{v.note}</p>
                </div>
                {admin && <Button size="sm" variant="outline" onClick={() => { rollbackPolicy(v.version); toast.success(`Working copy restored to ${v.version}`); }}>Restore</Button>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-sm">Simulate an alert</CardTitle>
          <CardDescription>Watch an alert flow through each level of the policy.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={alertId} onValueChange={setAlertId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{alerts.map((a) => <SelectItem key={a.id} value={a.id}>{a.id} · {a.customer}</SelectItem>)}</SelectContent>
          </Select>
          {sim && (
            <>
              <div className="flex items-center justify-between rounded-md border border-border p-3">
                <RiskChip grade={gradeForScore(sim.score)} score={sim.score} />
                <div className="text-right text-sm">
                  <p className="font-medium">{sim.outcome}</p>
                  <RecommendationBadge value={sim.recommendation} />
                </div>
              </div>
              <ol className="space-y-3">
                {sim.stages.map((st, i) => (
                  <li key={st.set.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{i + 1}. {st.set.name}</p>
                      <span className="text-xs text-muted-foreground">score {st.scoreAfter}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{st.note}</p>
                    <ul className="mt-2 space-y-1">
                      {st.results.map((r) => {
                        const applied = st.applied.includes(r);
                        return (
                          <li key={r.rule.id} className="text-xs">
                            <span className="flex items-center gap-1.5">
                              {applied ? <CheckCircle2 className="size-3.5 text-success" /> : r.fired ? <Circle className="size-3.5 text-primary" /> : <MinusCircle className="size-3.5 text-muted-foreground" />}
                              <span className={applied ? "font-medium text-foreground" : "text-muted-foreground"}>{r.rule.id} {r.rule.name}</span>
                              {r.fired && !applied && <span className="text-muted-foreground">(fired, not applied)</span>}
                            </span>
                            {r.skipped && <p className="ml-5 text-muted-foreground">{r.skipped}</p>}
                            {r.fired && (
                              <ul className="ml-5 text-muted-foreground">
                                {r.matches.filter((m) => m.pass).map((m, j) => (
                                  <li key={j}>{describeCondition(m.cond, attributes)} — actual {String(m.actual)} <span className="opacity-70">({sourceName(m.cond.attr)})</span></li>
                                ))}
                              </ul>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                ))}
              </ol>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
