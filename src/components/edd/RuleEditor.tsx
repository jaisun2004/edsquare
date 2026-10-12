import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CheckCircle2, Info, Loader2, Plus, Sparkles, Trash2, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OPERATORS, OUTCOMES, type Condition, type Operator, type Outcome, type RuleDef } from "@/data/policy";
import type { Attribute, AttrValue } from "@/data/sources";
import { useEDD } from "@/lib/edd-store";
import { checkRule, describeRule, evaluateRule } from "@/lib/rule-engine";
import { draftRulesFromText, type DraftRule } from "@/lib/rule-ai.functions";

const SET_PREFIX: Record<string, string> = { "S-HARD": "HS", "S-SCORE": "R", "S-SEG": "SG", "S-OV": "OV" };

export function nextRuleId(rules: RuleDef[], setId: string, taken: string[] = []) {
  const prefix = SET_PREFIX[setId] ?? "R";
  const nums = [...rules.map((r) => r.id), ...taken]
    .filter((id) => id.startsWith(`${prefix}-`))
    .map((id) => Number(id.split("-")[1]) || 0);
  return `${prefix}-${String(Math.max(0, ...nums) + 1).padStart(2, "0")}`;
}

function parseValue(attr: Attribute | undefined, op: Operator, raw: string): Condition["value"] {
  const t = attr?.type ?? "string";
  if (op === "between") {
    const [a, b] = raw.split(/\.\.|,|-/).map((x) => Number(x.trim()));
    return [a ?? 0, b ?? 0];
  }
  if (op === "in") return raw.split(",").map((x) => x.trim()).filter(Boolean);
  if (t === "number") return Number(raw);
  if (t === "boolean") return raw === "true";
  return raw;
}
const valueToRaw = (c: Condition) => (Array.isArray(c.value) ? c.value.join(c.op === "between" ? ".." : ", ") : String(c.value));

interface Draft {
  id: string;
  name: string;
  groupId: string;
  priority: number;
  description: string;
  logic: "AND" | "OR";
  conditions: { attr: string; op: Operator; raw: string }[];
  weight: number;
  outcome: Outcome | "none";
  dependsOn: string[];
}

function toDraft(r: RuleDef): Draft {
  return {
    id: r.id, name: r.name, groupId: r.groupId, priority: r.priority, description: r.description, logic: r.conditions.logic,
    conditions: r.conditions.conditions.map((c) => ({ attr: c.attr, op: c.op, raw: valueToRaw(c) })),
    weight: r.action.weight, outcome: r.action.outcome ?? "none", dependsOn: r.dependsOn,
  };
}

export function RuleEditor({ initial }: { initial?: RuleDef }) {
  const { rules, ruleGroups, ruleSets, attributes, sources, alerts, role, actor, upsertRule, retireRule, evaluate, attrsFor } = useEDD();
  const navigate = useNavigate();
  const readOnly = role !== "admin";
  const draftAi = useServerFn(draftRulesFromText);

  const [d, setD] = useState<Draft>(() =>
    initial
      ? toDraft(initial)
      : { id: nextRuleId(rules, "S-SCORE"), name: "", groupId: "G-BEH", priority: 50, description: "", logic: "AND", conditions: [{ attr: "txn.passThroughPct", op: "gt", raw: "80" }], weight: 10, outcome: "none", dependsOn: [] },
  );
  const [prompt, setPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiDrafts, setAiDrafts] = useState<DraftRule[]>([]);
  const [missing, setMissing] = useState<string[]>([]);

  const attrOf = (k: string) => attributes.find((a) => a.key === k);
  const sourceOf = (id: string) => sources.find((s) => s.id === id);
  const setOfGroup = (gid: string) => ruleGroups.find((g) => g.id === gid)?.setId ?? "S-SCORE";

  const rule: RuleDef = useMemo(
    () => ({
      ...(initial ?? { active: true, version: 0, author: actor, history: [], status: "Draft" as const, threshold: "" }),
      id: d.id, name: d.name || "Untitled rule", family: ruleGroups.find((g) => g.id === d.groupId)?.name ?? d.groupId,
      groupId: d.groupId, priority: d.priority, description: d.description, weight: d.weight, threshold: d.description,
      conditions: { logic: d.logic, conditions: d.conditions.map((c) => ({ attr: c.attr, op: c.op, value: parseValue(attrOf(c.attr), c.op, c.raw) })) },
      action: { weight: d.weight, ...(d.outcome !== "none" ? { outcome: d.outcome } : {}) },
      dependsOn: d.dependsOn,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [d, initial, attributes],
  );

  const samples = useMemo(
    () => alerts.map((a) => ({ alert: a, attrs: { ...attrsFor(a.id), "dm.score": evaluate(a.id).score } })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alerts, rules, sources, attributes],
  );
  const test = useMemo(() => samples.map((s) => ({ ...s, res: evaluateRule({ ...rule, dependsOn: [] }, s.attrs) })), [samples, rule]);
  const firedCount = test.filter((t) => t.res.fired).length;
  const findings = useMemo(() => checkRule(rule, rules, attributes, sources, samples.map((s) => s.attrs)), [rule, rules, attributes, sources, samples]);
  const blocking = findings.some((f) => f.level === "error");

  const grouped = useMemo(() => {
    const m = new Map<string, Attribute[]>();
    for (const a of attributes) m.set(a.sourceId, [...(m.get(a.sourceId) ?? []), a]);
    return [...m.entries()];
  }, [attributes]);

  const updateCond = (i: number, patch: Partial<Draft["conditions"][number]>) =>
    setD((p) => ({ ...p, conditions: p.conditions.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  const changeGroup = (groupId: string) =>
    setD((p) => {
      const setId = setOfGroup(groupId);
      const id = initial ? p.id : nextRuleId(rules, setId);
      return { ...p, groupId, id, ...(setId === "S-SCORE" ? {} : { weight: 0 }) };
    });

  const loadAi = (r: DraftRule) => {
    const valid = r.conditions.filter((c) => attrOf(c.attr));
    const setId = setOfGroup(r.groupId);
    setD({
      id: initial ? d.id : nextRuleId(rules, setId), name: r.name, groupId: ruleGroups.some((g) => g.id === r.groupId) ? r.groupId : "G-BEH",
      priority: 50, description: r.description, logic: r.logic,
      conditions: valid.map((c) => ({ attr: c.attr, op: c.op as Operator, raw: c.value })),
      weight: r.weight, outcome: r.outcome, dependsOn: [],
    });
    if (valid.length < r.conditions.length) toast.warning("Some conditions referred to data that isn't connected and were removed.");
  };

  const generate = async () => {
    setAiBusy(true);
    try {
      const res = await draftAi({
        data: {
          text: prompt,
          catalogue: attributes.filter((a) => sourceOf(a.sourceId)?.status).map((a) => ({ key: a.key, label: a.label, type: a.type, ...(a.options ? { options: a.options } : {}) })),
          groups: ruleGroups.map((g) => ({ id: g.id, name: g.name, stage: ruleSets.find((s) => s.id === g.setId)?.stage ?? "" })),
        },
      });
      setAiDrafts(res.rules);
      setMissing(res.missingData);
      if (res.rules[0]) loadAi(res.rules[0]);
      if (!res.rules.length) toast.info("No rule could be built from that description.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed.");
    } finally {
      setAiBusy(false);
    }
  };

  const save = (status: RuleDef["status"]) => {
    upsertRule({ ...rule, status, active: status === "Active" ? rule.active : status !== "Draft" ? true : rule.active }, status === "Pending approval" ? "Submitted for approval" : initial ? "Edited" : "Created");
    toast.success(status === "Pending approval" ? `${rule.id} sent to a supervisor for approval` : `${rule.id} saved as draft`);
    navigate({ to: "/admin/rules" });
  };

  const saveAllAi = () => {
    const taken: string[] = [];
    for (const r of aiDrafts) {
      const setId = setOfGroup(r.groupId);
      const id = nextRuleId(rules, setId, taken);
      taken.push(id);
      upsertRule(
        {
          id, name: r.name, family: r.groupId, groupId: r.groupId, priority: 50, description: r.description, weight: r.weight, threshold: r.description,
          active: true, status: "Draft", version: 0, author: actor, history: [], dependsOn: [],
          conditions: { logic: r.logic, conditions: r.conditions.filter((c) => attrOf(c.attr)).map((c) => ({ attr: c.attr, op: c.op as Operator, value: parseValue(attrOf(c.attr), c.op as Operator, c.value) })) },
          action: { weight: r.weight, ...(r.outcome !== "none" ? { outcome: r.outcome } : {}) },
        },
        "Created from plain-English description",
      );
    }
    toast.success(`${aiDrafts.length} draft rules saved`);
    navigate({ to: "/admin/rules" });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {!initial && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm"><Sparkles className="size-4 text-primary" /> Describe a rule</CardTitle>
              <CardDescription>Write it in plain English. AI builds the conditions using only connected data. You review before anything goes live.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                rows={3}
                value={prompt}
                disabled={readOnly}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Block if the UPI is in the negative database for betting and the SIM is under 90 days old, otherwise send to AI calling if pass-through is above 80%"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={generate} disabled={readOnly || aiBusy || !prompt.trim()}>
                  {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Build rule
                </Button>
                {aiDrafts.length > 1 && <Button variant="outline" onClick={saveAllAi}>Save all {aiDrafts.length} as drafts</Button>}
              </div>
              {aiDrafts.length > 0 && (
                <div className="space-y-2">
                  {aiDrafts.map((r, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 rounded-md border border-border p-3 text-sm">
                      <div>
                        <p className="font-medium">{r.name}</p>
                        <p className="text-muted-foreground">{r.readback}</p>
                      </div>
                      <Button size="sm" variant="secondary" onClick={() => loadAi(r)}>Edit</Button>
                    </div>
                  ))}
                </div>
              )}
              {missing.length > 0 && (
                <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                  <p className="font-medium">Data not available from connected sources</p>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">{missing.map((m) => <li key={m}>{m}</li>)}</ul>
                  <Button size="sm" variant="link" className="px-0" onClick={() => navigate({ to: "/admin/sources" })}>Add a data source →</Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">Rule definition · {d.id}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5"><Label>Name</Label><Input value={d.name} disabled={readOnly} onChange={(e) => setD({ ...d, name: e.target.value })} /></div>
              <div className="space-y-1.5">
                <Label>Group (stage)</Label>
                <Select value={d.groupId} onValueChange={changeGroup} disabled={readOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[...ruleSets].sort((a, b) => a.order - b.order).map((s) => (
                      <SelectGroup key={s.id}>
                        <SelectLabel>{s.name}</SelectLabel>
                        {ruleGroups.filter((g) => g.setId === s.id).map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 md:col-span-2"><Label>Description</Label><Input value={d.description} disabled={readOnly} onChange={(e) => setD({ ...d, description: e.target.value })} /></div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label>When</Label>
                <Select value={d.logic} onValueChange={(v) => setD({ ...d, logic: v as "AND" | "OR" })} disabled={readOnly}>
                  <SelectTrigger className="h-8 w-[120px]"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="AND">ALL match</SelectItem><SelectItem value="OR">ANY match</SelectItem></SelectContent>
                </Select>
              </div>
              {d.conditions.map((c, i) => {
                const a = attrOf(c.attr);
                const ops = OPERATORS.filter((o) => o.types.includes(a?.type ?? "string"));
                return (
                  <div key={i} className="grid gap-2 rounded-md border border-border p-2 md:grid-cols-[1.4fr_0.8fr_1fr_auto]">
                    <Select value={c.attr} onValueChange={(v) => updateCond(i, { attr: v, op: (OPERATORS.find((o) => o.types.includes(attrOf(v)?.type ?? "string"))?.value ?? "eq") as Operator, raw: attrOf(v)?.type === "boolean" ? "true" : attrOf(v)?.options?.[0] ?? "" })} disabled={readOnly}>
                      <SelectTrigger><SelectValue placeholder="Attribute" /></SelectTrigger>
                      <SelectContent>
                        {grouped.map(([sid, attrs]) => (
                          <SelectGroup key={sid}>
                            <SelectLabel>{sourceOf(sid)?.name ?? sid}{sourceOf(sid)?.status === false ? " (off)" : ""}</SelectLabel>
                            {attrs.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={c.op} onValueChange={(v) => updateCond(i, { op: v as Operator })} disabled={readOnly}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{ops.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                    {c.op === "exists" ? (
                      <div />
                    ) : a?.type === "boolean" ? (
                      <Select value={c.raw} onValueChange={(v) => updateCond(i, { raw: v })} disabled={readOnly}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
                      </Select>
                    ) : a?.options && c.op !== "in" && c.op !== "contains" ? (
                      <Select value={c.raw} onValueChange={(v) => updateCond(i, { raw: v })} disabled={readOnly}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{a.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input value={c.raw} disabled={readOnly} placeholder={c.op === "between" ? "10..50" : c.op === "in" ? "a, b, c" : "value"} onChange={(e) => updateCond(i, { raw: e.target.value })} />
                    )}
                    <Button variant="ghost" size="icon" disabled={readOnly} onClick={() => setD({ ...d, conditions: d.conditions.filter((_, j) => j !== i) })} aria-label="Remove condition">
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" disabled={readOnly} onClick={() => setD({ ...d, conditions: [...d.conditions, { attr: "negbase.hit", op: "eq", raw: "true" }] })}>
                <Plus className="size-4" /> Add condition
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <div className="space-y-1.5"><Label>Score weight</Label><Input type="number" value={d.weight} disabled={readOnly} onChange={(e) => setD({ ...d, weight: Number(e.target.value) })} /></div>
              <div className="space-y-1.5">
                <Label>Route to</Label>
                <Select value={d.outcome} onValueChange={(v) => setD({ ...d, outcome: v as Draft["outcome"] })} disabled={readOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No routing (score only)</SelectItem>
                    {OUTCOMES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Priority</Label><Input type="number" value={d.priority} disabled={readOnly} onChange={(e) => setD({ ...d, priority: Number(e.target.value) })} /></div>
              <div className="space-y-1.5">
                <Label>Only if rule fired</Label>
                <Select value={d.dependsOn[0] ?? "none"} onValueChange={(v) => setD({ ...d, dependsOn: v === "none" ? [] : [v] })} disabled={readOnly}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No dependency</SelectItem>
                    {rules.filter((r) => r.id !== d.id && r.status !== "Retired").map((r) => <SelectItem key={r.id} value={r.id}>{r.id} · {r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md bg-secondary p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">Plain-English read-back</p>
              <p className="mt-1">{describeRule(rule, attributes)}</p>
            </div>

            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => save("Pending approval")} disabled={blocking || !d.name.trim()}>Submit for approval</Button>
                <Button variant="outline" onClick={() => save("Draft")} disabled={!d.name.trim()}>Save draft</Button>
                {initial && initial.status !== "Retired" && (
                  <Button variant="ghost" className="text-destructive" onClick={() => { retireRule(initial.id); navigate({ to: "/admin/rules" }); }}>Retire rule</Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Test against sample alerts</CardTitle>
            <CardDescription>Would fire on {firedCount} of {test.length} alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {test.map(({ alert, res }) => (
              <div key={alert.id} className="rounded-md border border-border p-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{alert.id} · {alert.customer}</span>
                  {res.fired ? <Badge>Fires</Badge> : <Badge variant="outline">No</Badge>}
                </div>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {res.matches.map((m, i) => (
                    <li key={i} className={m.pass ? "text-foreground" : ""}>
                      {m.pass ? "✓" : m.missing ? "∅" : "✗"} {attrOf(m.cond.attr)?.label ?? m.cond.attr}: {m.missing ? "not available" : String(m.actual as AttrValue)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Smart checks</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {findings.length === 0 && <p className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 className="size-4 text-success" /> No issues found.</p>}
            {findings.map((f, i) => (
              <p key={i} className="flex items-start gap-2">
                {f.level === "error" ? <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" /> : f.level === "warning" ? <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" /> : <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                <span>{f.message}</span>
              </p>
            ))}
          </CardContent>
        </Card>

        {initial && (
          <Card>
            <CardHeader><CardTitle className="text-sm">Version history</CardTitle></CardHeader>
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              {initial.history.map((h, i) => (
                <p key={i}><span className="font-medium text-foreground">v{h.version}</span> · {new Date(h.at).toLocaleString()} · {h.by} — {h.note}</p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
