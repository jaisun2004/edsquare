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
import { answerPoints, dataChecks, defaultThresholds, stepOutcome, SHEET_STEPS, exitOutcome, flagOutcome, isMerchant, responseFlag, scriptFor, type Check, type Colour, type Thresholds } from "@/lib/edd-flow";
import { useEDD, type FlowLogEntry } from "@/lib/edd-store";
import type { CallRecord, QuestionnaireRecord, TimelineEntry } from "@/data/edd";
import { summariseFlowCase } from "@/lib/rule-ai.functions";
import { CaseCreatedCard, EngineConsole, FlowLanes, PhoneCall, type StampedEvent } from "@/components/edd/live/LiveFlow";
import { QuestionnaireWindow } from "@/components/edd/live/QuestionnaireWindow";
import { caseEvents, intakeEvents, scoreEvents, type FlowEvent } from "@/lib/flow-events";
import { RealVoicePanel, RealWhatsAppPanel, type ChannelLog } from "@/components/edd/RealChannels";

const STEPS = SHEET_STEPS;
type Phase = "idle" | "checks" | "voice" | "bitly" | "notify" | "human" | "verified" | "done";
const phaseIdx: Record<Phase, number> = { idle: -1, checks: 0, voice: 1, bitly: 2, notify: 3, human: 5, verified: 6, done: 6 };

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
  const triageRef = useRef<ReturnType<typeof store.triageAlert>>(undefined);
  const [events, setEvents] = useState<StampedEvent[]>([]);
  const [speed, setSpeed] = useState(1);
  const [presenter, setPresenter] = useState(false);
  const [busy, setBusy] = useState(false);
  const pendingRef = useRef<FlowLogEntry[]>([]);
  const callsRef = useRef<CallRecord[]>([]);
  const qRef = useRef<QuestionnaireRecord[]>([]);
  const caseRef = useRef<string | undefined>(undefined);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stamp = (e: FlowEvent): StampedEvent => ({ ...e, at: new Date().toLocaleTimeString("en-IN", { hour12: false }) });
  const play = (list: FlowEvent[], then?: () => void) => {
    setBusy(true);
    let t = 0;
    for (const e of list) { t += e.delay / speed; timers.current.push(setTimeout(() => setEvents((x) => [...x, stamp(e)]), t)); }
    timers.current.push(setTimeout(() => { setBusy(false); then?.(); }, t + 200 / speed));
  };

  const alert = workbookAlerts.find((a) => a.id === alertId)!;
  const profile = cbsProfiles.find((p) => p.account === alert.account)!;
  const channel = phase === "voice" ? "voice" : "bitly";
  const script = scriptFor(alert, channel);
  const qs = questionsFor(script, alert.amount, alert.date, alert.credits.reduce((a, b) => a + b, 0), alert.debits.reduce((a, b) => a + b, 0));
  const flag = responseFlag(qs, answers, profile, alert.type);
  const merchant = isMerchant(profile);
  const running = phase !== "idle";

  const channelOf = (step: string): TimelineEntry["channel"] => step.includes("Voice") ? "voice" : step.includes("WhatsApp") || step.includes("Email") ? "whatsapp" : step.includes("Data") || step.includes("Check") ? "checks" : step.includes("decision") || step.includes("Exit") || step.includes("Case") ? "decision" : "system";
  const actorOf = (step: string) => step.includes("Voice") ? "AI voice agent" : step.includes("Human") ? store.actor : "EDSquare engine";
  const entry = (step: string, action: string, text: string): FlowLogEntry => ({ at: new Date().toISOString(), actor: actorOf(step), action, detail: text, channel: channelOf(step) });
  const record = (e: FlowLogEntry) => {
    const cid = caseRef.current;
    if (cid) storeRef.current.attachFlow(cid, { events: [e] });
    else { pendingRef.current.push(e); storeRef.current.logEvent(undefined, e.action, e.detail); }
  };
  const flush = (cid: string) => {
    caseRef.current = cid;
    storeRef.current.attachFlow(cid, { events: pendingRef.current, calls: callsRef.current, questionnaires: qRef.current });
    pendingRef.current = [];
  };
  const upsert = <T extends { id: string }>(list: T[], r: T) => [...list.filter((x) => x.id !== r.id), r];
  const onCall = (r: CallRecord) => {
    callsRef.current = upsert(callsRef.current, r);
    if (caseRef.current) storeRef.current.attachFlow(caseRef.current, { calls: [r] });
  };
  const onQuestionnaire = (r: QuestionnaireRecord) => {
    qRef.current = upsert(qRef.current, r);
    if (caseRef.current) storeRef.current.attachFlow(caseRef.current, { questionnaires: [r] });
  };

  const add = (step: string, colour: Colour, text: string, _cid?: string) => {
    setLog((l) => [...l, { step, colour, text }]);
    record(entry(step, `${step}: ${colour}`, text));
  };

  const ensureCase = (reason: string) => {
    if (caseId || !triageRef.current) return caseId;
    const cid = storeRef.current.applyTriage(triageRef.current, "Further Investigation", `${alert.type} flow: ${reason}`);
    setCaseId(cid);
    flush(cid);
    play(caseEvents(cid, alert.account));
    return cid;
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
    triageRef.current = storeRef.current.triageAlert(id);
    const r = dataChecks(alert, profile, negbase, th);
    play(intakeEvents(alert, profile, negbase, r.checks, r.outcome), () => {
      setChecks(r.checks);
      const fired = r.checks.find((c) => c.fired);
      for (const c of r.checks) record(entry("Data check", `Check: ${c.label}`, `${c.fired ? "Fired" : "Passed"}: ${c.detail}`));
      record(entry("Data check", "Negative Database lookup", negbase ? "Hit: account found on the Negative Database" : "No match on the Negative Database"));
      add("Step 1 Data checks", r.outcome, fired ? `${fired.label}: ${fired.detail}.` : "No check fired.", undefined);
      if (r.outcome === "Red") {
        const cid = storeRef.current.applyTriage(triageRef.current!, "Further Investigation", `${alert.type} flow: Step 1 ${negbase ? "Negative Database hit" : fired?.label ?? "check fired"}`);
        setCaseId(cid);
        flush(cid);
        play([...caseEvents(cid, alert.account), { from: "engine", to: "cases", label: "Continue block: human in the loop", delay: 300, colour: "Red" }]);
        setPhase("human");
        return;
      }
      play([{ from: "engine", to: "voice", label: "Step 1 passed: starting Step 2 voice bot", delay: 300 }]);
      setPhase("voice");
    });
  };

  const noResponse = (reason?: string) => {
    if (phase === "voice") {
      const n = attempts + 1;
      setAttempts(n);
      play([{ from: "engine", to: "voice", label: `Dialling customer, attempt ${n}`, delay: 200, ms: 1800 }, { from: "voice", to: "engine", label: reason ?? "No answer / disconnected", delay: 900, colour: "Amber" }, ...(n >= th.voiceRetries ? [{ from: "engine" as const, to: "whatsapp" as const, label: "Retries exhausted: Step 3 WhatsApp / self-service questionnaire", delay: 500, ms: 640 }] : [])]);
      if (!reason) onCall({ id: `SIM-CALL-${Date.now()}`, attempt: n, number: "simulated", real: false, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), status: "no answer", outcome: "no_response", transcript: [] });
      add("Step 2 Voice bot", "Amber", `Attempt ${n}/${th.voiceRetries}: ${reason ?? "no response / call disconnected"}.`);
      if (n >= th.voiceRetries) { setAnswers({}); setPhase("bitly"); }
    } else if (phase === "bitly") {
      add("Step 3 WhatsApp questionnaire", "Amber", `${reason ?? "No reply to the questionnaire"}. Moving to email & app alert.`);
      play([{ from: "whatsapp", to: "engine", label: "No reply within window", delay: 300, colour: "Amber" }, { from: "engine", to: "source", label: "Step 4: email + mobile app alert sent with questionnaire", delay: 500, ms: 140 }]);
      setAnswers({});
      setPhase("notify");
    } else if (phase === "notify") {
      add("Step 4 Email & app alert", "Amber", "Email and mobile app alert sent with the questionnaire link. No response.");
      const e = exitOutcome(alert.type);
      add("Step 5 Exit", e.colour, e.text);
      ensureCase("no customer response");
      play([{ from: "engine", to: "cases", label: e.text, delay: 400, colour: e.colour }]);
      setPhase("human");
    }
    setAnswering(false);
  };

  const submitAnswers = () => {
    const o = stepOutcome(flag, merchant, th);
    const name = phase === "voice" ? "Step 2 Voice bot" : phase === "bitly" ? "Step 3 WhatsApp questionnaire" : "Step 4 Email & app alert";
    const text = `Response flag ${flag}${merchant ? " (merchant account)" : ""}: ${o.action === "continue_block" ? "continue block" : o.action === "manual_queue" ? "refer to Manual review queue" : "unblock, freeze lifted, no case"}.`;
    const scored = qs.filter((q) => answers[q.id]).map((q) => ({ question: q.text, answer: answers[q.id]!, points: answerPoints(q, answers[q.id]!, profile, alert.type) }));
    const extra = { answers: scored, flag, colour: o.colour };
    if (phase === "voice") {
      const last = callsRef.current.filter((c) => c.outcome === "answered").at(-1);
      onCall(last ? { ...last, ...extra } : { id: `SIM-CALL-${Date.now()}`, attempt: attempts + 1, number: "simulated", real: false, startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), status: "completed", outcome: "answered", transcript: transcript.map((t) => ({ role: t.who === "bot" ? "agent" : "user", text: t.text })), ...extra });
    } else if (phase === "bitly") {
      const last = qRef.current.at(-1);
      onQuestionnaire(last ? { ...last, outcome: "submitted", submittedAt: last.submittedAt ?? new Date().toISOString(), ...extra } : { id: `SIM-Q-${Date.now()}`, number: "simulated", real: false, sentAt: new Date().toISOString(), submittedAt: new Date().toISOString(), outcome: "submitted", ...extra });
    }
    record(entry(name, "Answers scored", scored.map((a) => `${a.answer} (+${a.points})`).join("; ") || "No answers"));
    add(name, o.colour, text);
    play(scoreEvents(phase === "voice" ? "voice" : "whatsapp", answers, flag, o.colour), () => { if (o.action !== "unblock") ensureCase(`${name} flag ${flag} (${o.colour})`); });
    setAnswering(false);
    if (o.action === "unblock") { setFinal("Unblocked: verified by customer"); setPhase("verified"); } else setPhase("human");
  };

  const realLog = (step: string) => (l: ChannelLog) => {
    add(step, l.ok ? "Amber" : "Red", l.text);
    play([{ from: "engine", to: step.includes("Voice") ? "voice" : "whatsapp", label: l.text, delay: 100, ...(l.ms !== undefined ? { ms: l.ms } : {}), ...(l.ok ? {} : { colour: "Red" as const }) }]);
  };
  const realAnswers = (a: Record<string, string>) => { setAnswers(a); setAnswering(true); };

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
    play([{ from: "cases", to: "engine", label: `Reviewer decision: ${o}`, delay: 200 }, { from: "engine", to: "enforce", label: o === "Block" ? "Block confirmed, account stays frozen" : "Freeze lifted, account unblocked", delay: 600, ms: 160, colour: o === "Block" ? "Red" : "Green" }]);
    setFinal(o);
    setPhase("done");
  };

  const reset = () => {
    triageRef.current = undefined;
    pendingRef.current = []; callsRef.current = []; qRef.current = []; caseRef.current = undefined;
    timers.current.forEach(clearTimeout); timers.current = []; setEvents([]); setBusy(false);
    setPhase("idle"); setCaseId(undefined); setChecks([]); setAttempts(0); setAnswering(false); setAnswers({}); setLog([]); setSummary(undefined); setFinal(undefined);
  };

  const idx = phaseIdx[phase];
  const engaging = phase === "voice" || phase === "bitly" || phase === "notify";

  const transcript = [
    ...greeting.map((g) => ({ who: "bot" as const, text: g.replace("{name}", alert.holder).replace("{last4}", alert.account.slice(-4)) })),
    ...(answering ? qs.flatMap((q) => [{ who: "bot" as const, text: q.text }, ...(answers[q.id] ? [{ who: "cust" as const, text: answers[q.id]! }] : [])]) : []),
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Speed</span>
        {[1, 2].map((s) => <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} className="h-7" onClick={() => setSpeed(s)}>{s}x</Button>)}
        <div className="ml-4 flex items-center gap-2 text-xs"><Switch checked={presenter} onCheckedChange={setPresenter} />Presenter mode</div>
        {busy && <span className="flex items-center gap-1 text-xs text-primary"><Loader2 className="h-3 w-3 animate-spin" />Engine running…</span>}
        {presenter && (!running ? <Button size="sm" className="ml-auto" onClick={start}><Play className="mr-2 h-4 w-4" />Run {alert.label}</Button> : <Button size="sm" variant="outline" className="ml-auto" onClick={reset}><RotateCcw className="mr-2 h-4 w-4" />New run</Button>)}
      </div>
      <FlowLanes events={events} live={busy} />
      {caseId && events.some((e) => e.to === "cases") && <CaseCreatedCard key={caseId} caseId={caseId} account={alert.account} risk={profile.risk === "H" || alert.type === "I4C" ? "High" : "Medium"} queue={alert.type === "I4C" ? "Investigator queue" : "Analyst queue"} />}
      <Card>
        <CardContent className="flex flex-wrap gap-2 py-4">
          {STEPS.map((s, i) => (
            <div key={s} className={`rounded-full border px-3 py-1 text-xs ${idx > i ? "border-primary bg-primary/10 text-primary" : idx === i ? "border-primary font-medium text-foreground" : "text-muted-foreground"}`}>
              {i + 1}. {s}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${presenter ? "lg:grid-cols-[1fr_360px]" : "lg:grid-cols-[340px_1fr_360px]"}`}>
        <div className={`space-y-4 ${presenter ? "hidden" : ""}`}>
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
              <p className="-mt-2 text-xs text-muted-foreground">Pretend this account is already on the Negative Database. Step 1 fails immediately (Red).</p>
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
              {phase === "human" && !log.some((l) => !l.step.startsWith("Step 1") && !l.step.startsWith("WhatsApp block")) && (
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
                {phase === "voice" ? `Step 2 · Voice bot (attempt ${attempts + 1} of ${th.voiceRetries})` : phase === "bitly" ? "Step 3 · WhatsApp / self-service questionnaire" : "Step 4 · Email & mobile app alert (simulated)"}
                <Badge variant="outline">{script}</Badge>
              </p>
              {phase === "voice" && !answering && <RealVoicePanel key={`v-${alertId}`} alert={alert} profile={profile} qs={qs} onLog={realLog("Step 2 Voice bot")} onAnswers={realAnswers} onNoResponse={(r) => noResponse(r)} onCall={onCall} />}
              {phase === "bitly" && !answering && <RealWhatsAppPanel key={`w-${alertId}`} alert={alert} profile={profile} qs={qs} onLog={realLog("Step 3 WhatsApp questionnaire")} onAnswers={realAnswers} onNoResponse={(r) => noResponse(r)} onQuestionnaire={onQuestionnaire} />}
              {phase === "bitly" ? (
                <QuestionnaireWindow amount={alert.amount} last4={alert.account.slice(-4)} qs={qs} answers={answers} started={answering} busy={busy} flag={flag} colour={flagOutcome(flag, merchant, th)}
                  points={(q, a) => answerPoints(q, a, profile, alert.type)}
                  onStart={() => { setAnswering(true); play([{ from: "whatsapp", to: "engine", label: "Customer opened questionnaire", delay: 200, colour: "Green" }]); }}
                  onNoReply={() => noResponse()} onAnswer={(id, a) => setAnswers({ ...answers, [id]: a })} onSubmit={submitAnswers} />
              ) : (
              <div className="grid gap-4 md:grid-cols-[auto_1fr]">
              {phase === "voice" ? <PhoneCall attempt={attempts + 1} retries={th.voiceRetries} connected={answering} transcript={transcript} /> : <div />}
              <div className="space-y-3">

              {!answering ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={busy} onClick={() => { setAnswering(true); play(phase === "voice" ? [{ from: "engine", to: "voice", label: "Dialling customer (simulated)", delay: 100, ms: 1800 }, { from: "voice", to: "engine", label: "Call connected, running script", delay: 700, colour: "Green" }] : [{ from: "source", to: "engine", label: "Customer opened questionnaire from email / app", delay: 200, colour: "Green" }]); }}>Customer responds (simulated)</Button>
                  <Button size="sm" variant="outline" onClick={() => noResponse()}><PhoneOff className="mr-2 h-4 w-4" />No response</Button>
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
              </div>
              </div>
              )}
            </CardContent></Card>
          )}

          {phase === "verified" && (
            <Card className="border-success"><CardContent className="space-y-1 py-4 text-sm">
              <p className="font-semibold text-success">Green: unblock. Verified by customer, no case created</p>
              <p className="text-xs text-muted-foreground">The questionnaire answers matched Core Banking, so the transaction was treated as genuine and the freeze was lifted.</p>
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

        <div className="space-y-4">
        <EngineConsole events={events} />
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
    </div>
  );
}
