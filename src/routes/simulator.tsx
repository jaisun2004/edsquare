import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, Loader2, Play, RotateCcw, StepForward } from "lucide-react";

import { PageHeader } from "@/components/layout/AppShell";
import { RecommendationBadge, RiskChip } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { scenarios, toAttrs, type TxnInput } from "@/data/scenarios";
import { useEDD, type TriageResult } from "@/lib/edd-store";
import type { Recommendation } from "@/data/edd";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Demo Simulator — EDSquare" },
      { name: "description", content: "Trigger a sample transaction and watch it flow through EDSquare triage, routing, engagement and enforcement." },
      { property: "og:title", content: "Demo Simulator — EDSquare" },
      { property: "og:description", content: "Trigger a sample transaction and follow it end-to-end through EDSquare." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Simulator,
});

const STAGES = ["Transaction", "Alert raised", "Data enrichment", "Decision Manager", "Triage outcome", "Case routing", "Engagement", "Decision", "Enforcement"] as const;

interface Run {
  alertId: string;
  input: TxnInput;
  triage?: TriageResult;
  caseId?: string;
  route?: { queue: string; reason: string };
  final?: Recommendation;
  cleared?: boolean;
}

function Simulator() {
  const store = useEDD();
  const [scenarioId, setScenarioId] = useState("mule");
  const [input, setInput] = useState<TxnInput>(scenarios[0]!.input);
  const [auto, setAuto] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [step, setStep] = useState(-1);
  const [busy, setBusy] = useState(false);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;

  const pick = (id: string) => {
    setScenarioId(id);
    setInput(scenarios.find((s) => s.id === id)!.input);
  };
  const set = <K extends keyof TxnInput>(k: K, v: TxnInput[K]) => setInput((p) => ({ ...p, [k]: v }));

  const lastStep = run?.cleared ? 4 : run?.final ? 8 : 7;
  const awaitingDecision = !!run && !run.cleared && step === 6 && !run.final;

  const trigger = () => {
    const alertId = `AL-SIM-${Math.floor(1000 + Math.random() * 9000)}`;
    store.injectAlert(
      { id: alertId, source: "Fraud / AML Engine", account: input.account, upi: input.upi, customer: input.customer, trigger: `Simulated ${input.channel} credit ₹${input.amount.toLocaleString("en-IN")}`, receivedAt: new Date().toISOString(), preliminarySignal: "M", status: "New" },
      toAttrs(input),
    );
    setRun({ alertId, input });
    setStep(0);
  };

  // Executes side effects when entering each stage.
  const advance = () => {
    const r = runRef.current;
    if (!r) return;
    const next = step + 1;
    if (next === 3) {
      const triage = store.triageAlert(r.alertId);
      setRun({ ...r, triage });
    }
    if (next === 4 && r.triage) {
      const t = r.triage;
      if (t.grade === "L" || (t.recommendation === "Unblock" && t.grade !== "VH")) {
        const caseId = store.applyTriage(t, "Unblock", "Simulator: low risk, auto-cleared");
        setRun({ ...r, caseId, cleared: true });
      }
    }
    if (next === 5 && r.triage && !r.cleared) {
      const caseId = store.applyTriage(r.triage, "Further Investigation", "Simulator: routed for EDD");
      const g = r.triage.grade;
      const route = g === "VH" ? { queue: "Kavita Menon (Supervisor)", reason: "Very High risk needs supervisor approval" } : g === "H" ? { queue: "Arjun Rao (Investigator)", reason: "High risk goes to the investigator queue" } : { queue: "Priya Nair (Analyst)", reason: "Medium risk goes to the analyst queue" };
      setTimeout(() => store.assignCase(caseId, route.queue.split(" (")[0]!), 50);
      setRun({ ...r, caseId, route });
    }
    if (next === 6 && r.caseId) store.startEngagement(r.caseId, "AI Call");
    setStep(next);
  };

  useEffect(() => {
    if (!auto || !run || busy || step < 0 || step >= lastStep || awaitingDecision) return;
    setBusy(true);
    const t = setTimeout(() => {
      setBusy(false);
      advance();
    }, 1100);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, run, step, lastStep, awaitingDecision]);

  const decide = (o: Recommendation) => {
    if (!run?.caseId) return;
    store.decide(run.caseId, o, o === run.triage?.recommendation ? "Simulator: accepted AI recommendation" : "Simulator: analyst override");
    setRun({ ...run, final: o });
    setStep(o === "Further Investigation" ? 7 : 8);
  };

  const reset = () => {
    setRun(null);
    setStep(-1);
    setBusy(false);
  };

  const c = run?.caseId ? store.cases.find((x) => x.id === run.caseId) : undefined;
  const engagement = c?.engagement.at(-1);
  const enf = run?.caseId ? store.enforcement.find((e) => e.caseId === run.caseId) : undefined;
  const runAudit = store.audit.filter((a) => a.caseId === run?.caseId || a.after.includes(run?.alertId ?? "§"));
  const attrs = run ? store.attrsFor(run.alertId) : {};
  const srcCount = new Set(store.attributes.filter((a) => a.key in attrs).map((a) => a.sourceId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Demo Simulator"
        description="Trigger a sample transaction and watch it go through EDSquare end-to-end."
        actions={<Button variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />Reset run</Button>}
      />

      {/* Pipeline */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4">
          {STAGES.map((s, i) => {
            const done = step > i || (step === i && i === lastStep);
            const active = step === i && !done;
            const skipped = run?.cleared && i > 4;
            return (
              <div key={s} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${done ? "border-primary bg-primary/10 text-primary" : active ? "border-primary text-foreground" : "text-muted-foreground"} ${skipped ? "opacity-40 line-through" : ""}`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : active ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Circle className="h-3.5 w-3.5" />}
                {s}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr_300px]">
        {/* Compose */}
        <Card>
          <CardHeader><CardTitle className="text-base">Compose transaction</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Scenario</Label>
              <Select value={scenarioId} onValueChange={pick} disabled={!!run}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{scenarios.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">{scenarios.find((s) => s.id === scenarioId)?.blurb}</p>
            </div>
            <Field label="Customer"><Input value={input.customer} disabled={!!run} onChange={(e) => set("customer", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Account"><Input value={input.account} disabled={!!run} onChange={(e) => set("account", e.target.value)} /></Field>
              <Field label="Channel">
                <Select value={input.channel} onValueChange={(v) => set("channel", v as TxnInput["channel"])} disabled={!!run}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["UPI", "IMPS", "NEFT"].map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="UPI handle"><Input value={input.upi} disabled={!!run} onChange={(e) => set("upi", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Num label="Amount (₹)" v={input.amount} on={(n) => set("amount", n)} d={!!run} />
              <Num label="Counterparties (7d)" v={input.counterparties} on={(n) => set("counterparties", n)} d={!!run} />
              <Num label="Account age (days)" v={input.accountAgeDays} on={(n) => set("accountAgeDays", n)} d={!!run} />
              <Num label="Pass-through %" v={input.passThroughPct} on={(n) => set("passThroughPct", n)} d={!!run} />
              <Num label="Dormant (days)" v={input.dormantDays} on={(n) => set("dormantDays", n)} d={!!run} />
              <Num label="Complaints" v={input.complaints} on={(n) => set("complaints", n)} d={!!run} />
            </div>
            <Toggle label="SIM swap" v={input.simSwap} on={(b) => set("simSwap", b)} d={!!run} />
            <Toggle label="New / shared device" v={input.newDevice} on={(b) => set("newDevice", b)} d={!!run} />
            <Toggle label="Negative Database hit" v={input.negbaseHit} on={(b) => set("negbaseHit", b)} d={!!run} />
            <div className="flex items-center justify-between border-t pt-3">
              <span className="text-sm">Auto-play</span>
              <Switch checked={auto} onCheckedChange={setAuto} />
            </div>
            {!run ? (
              <Button className="w-full" onClick={trigger}><Play className="mr-2 h-4 w-4" />Trigger transaction</Button>
            ) : (
              <Button className="w-full" variant="secondary" disabled={auto || step >= lastStep || awaitingDecision} onClick={advance}><StepForward className="mr-2 h-4 w-4" />Next step</Button>
            )}
          </CardContent>
        </Card>

        {/* Stage details */}
        <div className="space-y-3">
          {!run && <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Pick a scenario and press <b>Trigger transaction</b> to start.</CardContent></Card>}
          {run && step >= 0 && (
            <Stage title="Transaction received">
              {run.input.channel} credit of ₹{run.input.amount.toLocaleString("en-IN")} to {run.input.customer} ({run.input.account}, {run.input.upi}).
            </Stage>
          )}
          {run && step >= 1 && <Stage title="Alert raised">Alert <b>{run.alertId}</b> was created by the Fraud / AML engine and added to the Alert Inbox.</Stage>}
          {run && step >= 2 && (
            <Stage title="Data enrichment">
              <p className="mb-2">{srcCount.size} connected data sources returned {Object.keys(attrs).length} attributes.</p>
              <div className="flex flex-wrap gap-1">
                {store.attributes.filter((a) => a.key in attrs).slice(0, 14).map((a) => (
                  <Badge key={a.key} variant="outline" className="font-normal">{a.label}: {String(attrs[a.key])}</Badge>
                ))}
              </div>
            </Stage>
          )}
          {run?.triage && step >= 3 && (
            <Stage title="Decision Manager">
              <div className="mb-2 flex items-center gap-2"><RiskChip grade={run.triage.grade} score={run.triage.score} /> <RecommendationBadge value={run.triage.recommendation} /> <span className="text-xs text-muted-foreground">Segment: {run.triage.segment}</span></div>
              <div className="space-y-1">
                {run.triage.policy.stages.map((st) => (
                  <div key={st.set.id} className="text-xs">
                    <span className="font-medium">{st.set.name}</span> — {st.applied.length ? st.applied.map((a) => a.rule.name).join(", ") : "no rules fired"} <span className="text-muted-foreground">(score {st.scoreAfter})</span>
                  </div>
                ))}
              </div>
            </Stage>
          )}
          {run && step >= 4 && (
            <Stage title="Triage outcome">
              {run.cleared ? <>Low risk. The account was auto-cleared and stays fully operational. Record: <CaseLink id={run.caseId} /></> : <>Risk is elevated, so the account goes to EDD for further investigation.</>}
            </Stage>
          )}
          {run?.route && step >= 5 && <Stage title="Case routing">Case <CaseLink id={run.caseId} /> was routed to <b>{run.route.queue}</b>. {run.route.reason}.</Stage>}
          {run && step >= 6 && !run.cleared && (
            <Stage title="AI customer engagement">
              <div className="space-y-1 text-xs">
                {(engagement?.transcript ?? []).map((t, i) => <p key={i}><b>{t.speaker}:</b> {t.text}</p>)}
                <p className="text-muted-foreground">{engagement?.outcome}</p>
              </div>
            </Stage>
          )}
          {awaitingDecision && run?.triage && (
            <Card className="border-primary">
              <CardContent className="space-y-3 py-4">
                <p className="text-sm font-medium">Human checkpoint: AI prioritises, bank experts decide.</p>
                <p className="text-xs text-muted-foreground">AI recommends <b>{run.triage.recommendation}</b>. Accept it or override.</p>
                <div className="flex flex-wrap gap-2">
                  {(["Block", "Unblock", "Further Investigation"] as Recommendation[]).map((o) => (
                    <Button key={o} size="sm" variant={o === run.triage!.recommendation ? "default" : "outline"} onClick={() => decide(o)}>{o}</Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {run?.final && <Stage title="Decision">Decision recorded: <b>{run.final}</b>.</Stage>}
          {enf && step >= 8 && <Stage title="Enforcement">{enf.action}: {enf.accountStatus}. {enf.downstreamStatus}.</Stage>}
        </div>

        {/* Results */}
        <Card>
          <CardHeader><CardTitle className="text-base">Records created</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!run && <p className="text-muted-foreground">Nothing yet.</p>}
            {run && <p>Alert: <Link to="/alerts" className="text-primary underline">{run.alertId}</Link></p>}
            {run?.caseId && <p>Case: <CaseLink id={run.caseId} /></p>}
            {enf && <p>Enforcement: <Link to="/enforcement" className="text-primary underline">{enf.action}</Link></p>}
            {run && (
              <div>
                <p className="mb-1 font-medium">Audit trail</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {runAudit.slice(0, 10).map((a) => <li key={a.id}>• {a.action}</li>)}
                </ul>
                <Link to="/audit" className="text-xs text-primary underline">Open Audit Trail</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CaseLink({ id }: { id?: string }) {
  if (!id) return null;
  return <Link to="/cases/$caseId" params={{ caseId: id }} className="font-medium text-primary underline">{id}</Link>;
}
function Stage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="animate-in fade-in slide-in-from-bottom-2">
      <CardContent className="py-3">
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-primary" />{title}</p>
        <div className="text-sm text-muted-foreground">{children}</div>
      </CardContent>
    </Card>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Num({ label, v, on, d }: { label: string; v: number; on: (n: number) => void; d: boolean }) {
  return <Field label={label}><Input type="number" value={v} disabled={d} onChange={(e) => on(Number(e.target.value))} /></Field>;
}
function Toggle({ label, v, on, d }: { label: string; v: boolean; on: (b: boolean) => void; d: boolean }) {
  return <div className="flex items-center justify-between"><span className="text-sm">{label}</span><Switch checked={v} onCheckedChange={on} disabled={d} /></div>;
}
