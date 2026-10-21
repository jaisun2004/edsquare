import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Loader2, MessageCircle, Phone, PhoneOff, Play, RotateCcw, ShieldAlert, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cbsProfiles, greeting, questionsFor, workbookAlerts } from "@/data/workbook";
import { toAttrs } from "@/data/scenarios";
import { dataChecks, defaultThresholds, exitOutcome, flagOutcome, isMerchant, responseFlag, scriptFor, type Check, type Colour, type Thresholds } from "@/lib/edd-flow";
import { useEDD } from "@/lib/edd-store";
import { summariseFlowCase } from "@/lib/rule-ai.functions";

const STEPS = ["Data checks", "Voice bot", "WhatsApp questionnaire", "Email & app alert", "Exit / Manual queue", "Human in the loop"];
type Phase = "idle" | "checks" | "voice" | "bitly" | "notify" | "exit" | "human" | "done";
const phaseIdx: Record<Phase, number> = { idle: -1, checks: 0, voice: 1, bitly: 2, notify: 3, exit: 4, human: 5, done: 6 };

interface LogLine { step: string; colour: Colour; text: string }

const colourCls: Record<Colour, string> = {
  Red: "border-destructive text-destructive",
  Amber: "border-warning text-warning",
  Green: "border-success text-success",
  Manual: "border-primary text-primary",
};

export function WorkbookFlow() {
  const store = useEDD();
  const storeRef = useRef(store);
  storeRef.current = store;
  const summarise = useServerFn(summariseFlowCase);
  const [alertId, setAlertId] = useState(workbookAlerts[0]!.id);
  const [negbase, setNegbase] = useState(false);
  const [th, setTh] = useState<Thresholds>(defaultThresholds);
  const [phase, setPhase] = useState<Phase>("idle");
  const [caseId, setCaseId] = useState<string>();
  const [checks, setChecks] = useState<Check[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [answering, setAnswering] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [log, setLog] = useState<LogLine[]>([]);
  const [summary, setSummary] = useState<string>();
  const [summaryBusy, setSummaryBusy] = useState(false);
  const [final, setFinal] = useState<string>();

  const alert = workbookAlerts.find((a) => a.id === alertId)!;
  const profile = cbsProfiles.find((p) => p.account === alert.account)!;
  const channel = phase === "voice" ? "voice" : "bitly";
  const script = scriptFor(alert, channel);
  const qs = questionsFor(script, alert.amount, alert.date, alert.credits.reduce((a, b) => a + b, 0), alert.debits.reduce((a, b) => a + b, 0));
  const flag = responseFlag(qs, answers, profile, alert.type);
  const merchant = isMerchant(profile);
  const running = phase !== "idle";

  const add = (step: string, colour: Colour, text: string, cid = caseId) => {
    setLog((l) => [...l, { step, colour, text }]);
    store.logEvent(cid, `${step}: ${colour}`, text);
  };

  const start = () => {
    const id = `AL-${alert.type}-${Math.floor(1000 + Math.random() * 9000)}`;
    store.injectAlert(
      { id, source: alert.type === "I4C" ? "External Intelligence" : "Risk Model", account: alert.account, upi: "—", customer: alert.holder, trigger: `${alert.type === "I4C" ? "I4C complaint" : "Model alert"}: ${alert.reason} (Rs ${alert.amount.toLocaleString("en-IN")})`, receivedAt: new Date().toISOString(), preliminarySignal: "H", status: "New" },
      toAttrs({ customer: alert.holder, account: alert.account, upi: "", amount: alert.amount, channel: "IMPS", counterparties: alert.credits.length + alert.debits.length, accountAgeDays: profile.vintageMonths * 30, dormantDays: 0, passThroughPct: alert.debits.length ? 80 : 20, simSwap: false, newDevice: false, negbaseHit: negbase, complaints: alert.type === "I4C" ? 1 : 0 }),
    );
    setPhase("checks");
    setTimeout(() => finishStart(id), 60);
  };

  const finishStart = (id: string) => {
    const triage = storeRef.current.triageAlert(id);
    const cid = storeRef.current.applyTriage(triage, "Further Investigation", `${alert.type} flow: account kept blocked pending EDD`);
    setCaseId(cid);
    const r = dataChecks(alert, profile, negbase, th);
    setChecks(r.checks);
    const fired = r.checks.find((c) => c.fired);
    add("Step 1 Data checks", r.outcome, fired ? `${fired.label}: ${fired.detail}. Continue block.` : "No check fired. Move to voice bot.", cid);
    setPhase(r.outcome === "Amber" ? "voice" : "human");
  };

  const noResponse = () => {
    if (phase === "voice") {
      const n = attempts + 1;
      setAttempts(n);
      add("Step 2 Voice bot", "Amber", `Attempt ${n}/${th.voiceRetries}: no response / call disconnected.`);
      if (n >= th.voiceRetries) setPhase("bitly");
    } else if (phase === "bitly") {
      add("Step 3 WhatsApp questionnaire", "Amber", `${script} link sent on WhatsApp. No response.`);
      setPhase("notify");
    } else if (phase === "notify") {
      add("Step 4 Email & app alert", "Amber", "Email and mobile app alert sent with the questionnaire link. No response.");
      const e = exitOutcome(alert.type);
      add("Step 5 Exit", e.colour, e.text);
      setPhase("human");
    }
    setAnswering(false);
  };

  const submitAnswers = () => {
    const o = flagOutcome(flag, merchant, th);
    const name = phase === "voice" ? "Step 2 Voice bot" : phase === "bitly" ? "Step 3 WhatsApp questionnaire" : "Step 4 App questionnaire";
    const text = `Response flag ${flag}${merchant ? " (merchant account)" : ""}: ${o === "Red" ? "continue block" : o === "Manual" ? "refer to Manual review queue" : "low risk, recommend unblock"}.`;
    add(name, o, text);
    setAnswering(false);
    setPhase("human");
  };

  const getSummary = async () => {
    setSummaryBusy(true);
    try {
      const r = await summarise({ data: { context: JSON.stringify({ alert, profile, negbase, thresholds: th, checks, answers, responseFlag: flag, log }) } });
      setSummary(r.summary);
    } catch {
      const red = log.some((l) => l.colour === "Red");
      setSummary(`• ${alert.type} alert on ${alert.account} (${alert.holder}): ${alert.reason}, Rs ${alert.amount.toLocaleString("en-IN")}.\n${log.map((l) => `• ${l.step}: ${l.text}`).join("\n")}\nSuggested: ${red ? "Block" : "Unblock"}. (AI summary unavailable, template used.)`);
    } finally {
      setSummaryBusy(false);
    }
  };

  const decide = (o: "Block" | "Unblock") => {
    if (caseId) store.decide(caseId, o, `Human in the loop after ${alert.type} flow (flag ${flag})`);
    add("Human decision", o === "Block" ? "Red" : "Green", `Reviewer chose ${o}.`);
    setFinal(o);
    setPhase("done");
  };

  const reset = () => {
    setPhase("idle"); setCaseId(undefined); setChecks([]); setAttempts(0); setAnswering(false); setAnswers({}); setLog([]); setSummary(undefined); setFinal(undefined);
  };

  const idx = phaseIdx[phase];
  const engaging = phase === "voice" || phase === "bitly" || phase === "notify";

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap gap-2 py-4">
          {STEPS.map((s, i) => (
            <div key={s} className={`rounded-full border px-3 py-1 text-xs ${idx > i ? "border-primary bg-primary/10 text-primary" : idx === i ? "border-primary font-medium text-foreground" : "text-muted-foreground"}`}>
              {i + 1}. {s}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Sample alert</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Select value={alertId} onValueChange={setAlertId} disabled={running}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{workbookAlerts.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
              <div className="space-y-1 rounded-md border p-3 text-xs">
                <p><b>{alert.type === "I4C" ? "I4C complaint" : "Model alert"}</b>: {alert.reason}</p>
                <p>A/c {alert.account} · {alert.holder} ({alert.gender})</p>
                <p>Amount Rs {alert.amount.toLocaleString("en-IN")} · {alert.date}</p>
                {alert.complainant && <p>Complainant: {alert.complainant.name}, {alert.complainant.mobile}</p>}
                {alert.credits.length > 1 && <p>Credits: {alert.credits.map((c) => c.toLocaleString("en-IN")).join(", ")} from {alert.receivedFrom}</p>}
                {alert.debits.length > 0 && <p>Debits: {alert.debits.map((c) => c.toLocaleString("en-IN")).join(", ")} to {alert.sentTo}</p>}
                {alert.balance !== undefined && <p>Balance: Rs {alert.balance.toLocaleString("en-IN")}</p>}
              </div>
              <div className="flex items-center justify-between"><span>Negative Database hit</span><Switch checked={negbase} onCheckedChange={setNegbase} disabled={running} /></div>
              {!running ? <Button className="w-full" onClick={start}><Play className="mr-2 h-4 w-4" />Run flow</Button> : <Button className="w-full" variant="outline" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />New run</Button>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Decision Manager thresholds</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-2">
              {([["minAmount", "Min amount (Rs)"], ["avgMultiple", "x avg daily credit"], ["creditSharePct", "% of 2-day credits"], ["flagBlock", "Flag: block above"], ["flagReview", "Flag: review from"], ["voiceRetries", "Voice retries"]] as const).map(([k, l]) => (
                <div key={k} className="space-y-1"><Label className="text-xs">{l}</Label><Input type="number" value={th[k]} disabled={running} onChange={(e) => setTh({ ...th, [k]: Number(e.target.value) })} /></div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Core Banking profile</CardTitle></CardHeader>
            <CardContent className="space-y-0.5 text-xs text-muted-foreground">
              <p>{profile.custId} · {profile.accountType}{merchant ? " (merchant)" : ""} · {profile.vintageMonths} months</p>
              <p>{profile.employment.trim()} · {profile.employer}</p>
              <p>Avg credit Rs {profile.avgCrAmtPerDay.toLocaleString("en-IN")}/day (P75 {profile.avgCrAmtP75.toLocaleString("en-IN")})</p>
              <p>Avg balance Rs {profile.avgMonthlyBalance.toLocaleString("en-IN")} · PIN {profile.pincode}</p>
              <p>Risk {profile.risk} · Blocks in 6 months: {profile.blocksLast6m ? "Yes" : "No"}</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {!running && <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Pick a sample alert from the workbook and press <b>Run flow</b>.</CardContent></Card>}
          {checks.length > 0 && (
            <Card><CardContent className="space-y-2 py-4">
              <p className="text-sm font-semibold">Step 1 · Data checks</p>
              {checks.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2 text-xs">
                  <span><b>{c.label}</b><br /><span className="text-muted-foreground">{c.detail}</span></span>
                  <Badge variant="outline" className={c.fired ? colourCls.Red : ""}>{c.fired ? "Fired" : "Pass"}</Badge>
                </div>
              ))}
              {phase === "human" && !log.some((l) => !l.step.startsWith("Step 1")) && (
                <Button size="sm" variant="outline" onClick={() => { add("Override", "Amber", "Reviewer chose to continue to customer engagement."); setPhase("voice"); }}>
                  Continue to customer engagement anyway
                </Button>
              )}
            </CardContent></Card>
          )}

          {engaging && (
            <Card className="border-primary"><CardContent className="space-y-3 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                {phase === "voice" ? <Phone className="h-4 w-4" /> : phase === "bitly" ? <MessageCircle className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                {phase === "voice" ? `Step 2 · Voice bot (attempt ${attempts + 1} of ${th.voiceRetries})` : phase === "bitly" ? "Step 3 · WhatsApp self-service questionnaire" : "Step 4 · Email & mobile app alert"}
                <Badge variant="outline">{script}</Badge>
              </p>
              {phase === "voice" && <div className="space-y-0.5 rounded-md bg-muted p-3 text-xs">{greeting.map((g) => <p key={g}>🤖 {g.replace("{name}", alert.holder).replace("{last4}", alert.account.slice(-4))}</p>)}</div>}
              {!answering ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => setAnswering(true)}>Customer responds</Button>
                  <Button size="sm" variant="outline" onClick={noResponse}><PhoneOff className="mr-2 h-4 w-4" />No response</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {qs.map((q) => (
                    <div key={q.id} className="space-y-1">
                      <p className="text-xs">{q.text}</p>
                      <div className="flex flex-wrap gap-1">
                        {q.options.map((o) => (
                          <Button key={o.label} size="sm" variant={answers[q.id] === o.label ? "default" : "outline"} className="h-7 text-xs" onClick={() => setAnswers({ ...answers, [q.id]: o.label })}>{o.label}</Button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between rounded-md border p-2 text-sm">
                    <span>Response flag: <b>{flag}</b> → <Badge variant="outline" className={colourCls[flagOutcome(flag, merchant, th)]}>{flagOutcome(flag, merchant, th)}</Badge></span>
                    <Button size="sm" disabled={Object.keys(answers).length < qs.length} onClick={submitAnswers}>Submit answers</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Points are added when answers don't match Core Banking (employment, pin code, unknown sender, payment reason vs account type).</p>
                </div>
              )}
            </CardContent></Card>
          )}

          {(phase === "human" || phase === "done") && (
            <Card className="border-primary"><CardContent className="space-y-3 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><ShieldAlert className="h-4 w-4" />Human in the loop: AI prioritises, bank experts decide.</p>
              {!summary ? (
                <Button size="sm" variant="outline" onClick={getSummary} disabled={summaryBusy}>{summaryBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate case summary</Button>
              ) : <p className="whitespace-pre-line rounded-md bg-muted p-3 text-xs">{summary}</p>}
              {phase === "human" ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="destructive" onClick={() => decide("Block")}>Keep blocked</Button>
                  <Button size="sm" variant="outline" onClick={() => decide("Unblock")}>Unblock</Button>
                </div>
              ) : <p className="text-sm">Decision recorded: <b>{final}</b>.</p>}
            </CardContent></Card>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Step outcomes</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-xs">
            {log.length === 0 && <p className="text-muted-foreground">Nothing yet.</p>}
            {log.map((l, i) => (
              <div key={i} className="space-y-0.5">
                <div className="flex items-center gap-2"><Badge variant="outline" className={colourCls[l.colour]}>{l.colour}</Badge><b>{l.step}</b></div>
                <p className="text-muted-foreground">{l.text}</p>
              </div>
            ))}
            {caseId && <p className="pt-2">Case: <Link to="/cases/$caseId" params={{ caseId }} className="text-primary underline">{caseId}</Link> · <Link to="/audit" className="text-primary underline">Audit Trail</Link></p>}
            <p className="border-t pt-2 text-muted-foreground">Red = continue block · Amber = next step · Green = unblock · Manual = review queue</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
