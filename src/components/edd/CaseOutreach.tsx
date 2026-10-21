import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, MessageCircle, Phone, XCircle, AlertCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/components/edd/chips";
import { ContactBox, PHONE_KEY, RealVoicePanel, RealWhatsAppPanel, validPhone, type Contact } from "@/components/edd/RealChannels";
import type { CallRecord, EDDCase, QuestionnaireRecord } from "@/data/edd";
import { cbsProfiles, questionsFor, workbookAlerts } from "@/data/workbook";
import type { DemoRun } from "@/lib/demo-runs";
import { isMerchant, responseFlag, scriptFor } from "@/lib/edd-flow";
import { caseSteps, outreachAvailability, outreachSuggestion, type StepTone } from "@/lib/case-steps";
import { useEDD } from "@/lib/edd-store";
import { maskNumber } from "@/lib/whatsapp";
import { normalisePhone } from "@/lib/voice";

function resolve(c: EDDCase, run?: DemoRun) {
  const acc = c.account.replace(/\D/g, "");
  const same = workbookAlerts.filter((a) => acc.endsWith(a.account) || a.account.endsWith(acc.slice(-4)));
  const alert = same.find((a) => !run || run.alertType.includes(a.type)) ?? same[0] ?? workbookAlerts[0]!;
  const profile = cbsProfiles.find((p) => p.account === alert.account) ?? cbsProfiles[0]!;
  return { alert, profile };
}

const toneIcon = (t: StepTone) => t === "ok" ? <CheckCircle2 className="h-4 w-4 text-primary" /> : t === "bad" ? <XCircle className="h-4 w-4 text-destructive" /> : t === "warn" ? <AlertCircle className="h-4 w-4 text-muted-foreground" /> : <Circle className="h-4 w-4 text-muted-foreground/50" />;

export function CaseStepSummary({ item, run }: { item: EDDCase; run?: DemoRun | undefined }) {
  const steps = caseSteps(item, run);
  return (
    <Card className="lg:col-span-2">
      <CardHeader><CardTitle className="text-sm">Step status</CardTitle></CardHeader>
      <CardContent>
        <ol className="divide-y">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 py-2 text-sm">
              <span className="w-5 text-xs text-muted-foreground">{i + 1}</span>
              {toneIcon(s.tone)}
              <span className="w-48 font-medium">{s.label}</span>
              <span className="flex-1">{s.status}{s.fromCase && <Badge variant="outline" className="ml-2">from case</Badge>}</span>
              <span className="text-xs text-muted-foreground">{s.at ? formatDateTime(s.at) : "—"}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

type Active = { kind: "voice" | "wa"; key: number } | undefined;

export function CaseOutreach({ item, run }: { item: EDDCase; run?: DemoRun | undefined }) {
  const { attachFlow, actor, role } = useEDD();
  const { alert, profile } = useMemo(() => resolve(item, run), [item, run]);
  const avail = outreachAvailability(item, run);
  const closed = item.stage === "Closed";
  const [raw, setRaw] = useState(item.contact?.phone ?? "");
  const [name, setName] = useState(item.contact?.name ?? alert.holder);
  const [lang, setLang] = useState<Contact["lang"]>((item.contact?.lang as Contact["lang"]) ?? "ENGLISH");
  const [offline, setOffline] = useState(false);
  const [active, setActive] = useState<Active>();
  const [result, setResult] = useState<{ flag: number; colour: string; text: string; channel: string }>();
  useEffect(() => { if (!raw) { const s = localStorage.getItem(PHONE_KEY); if (s) setRaw(s); } }, []);

  const phone = normalisePhone(raw);
  const contact: Contact = { phone, name, lang };
  const qs = (k: "voice" | "bitly") => { const s = scriptFor(alert, k); return questionsFor(s, alert.amount, alert.date, alert.credits.reduce((a, b) => a + b, 0), alert.debits.reduce((a, b) => a + b, 0)); };
  const log = (action: string, detail: string, channel: "voice" | "whatsapp" | "decision") => attachFlow(item.id, { events: [{ at: new Date().toISOString(), actor: channel === "voice" && !action.includes("started") ? "AI voice agent" : actor, action, detail, channel }] });

  function score(kind: "voice" | "wa", answers: Record<string, string>) {
    const list = qs(kind === "voice" ? "voice" : "bitly");
    const flag = responseFlag(list, answers, profile, alert.type);
    const s = outreachSuggestion(flag, isMerchant(profile));
    setResult({ flag, ...s, channel: kind === "voice" ? "AI call" : "WhatsApp" });
    log(kind === "voice" ? "Case: voice answers scored" : "Case: WhatsApp answers scored", `Risk flag ${flag} → ${s.colour}. Suggested: ${s.text}.`, "decision");
  }

  function start(kind: "voice" | "wa") {
    if (!offline && !validPhone(phone)) return;
    if (!offline) localStorage.setItem(PHONE_KEY, raw);
    setResult(undefined);
    log(kind === "voice" ? "Case: AI call started" : "Case: WhatsApp check sent", `Started from case by ${actor} (${role})${offline ? " · offline demo" : ` to ${maskNumber(phone)}`}.`, kind === "voice" ? "voice" : "whatsapp");
    if (offline) {
      const list = qs(kind === "voice" ? "voice" : "bitly");
      const answers = Object.fromEntries(list.map((q) => [q.id, q.options[0]!.label]));
      const now = new Date().toISOString();
      if (kind === "voice") attachFlow(item.id, { calls: [{ id: `CALL-${Date.now()}`, attempt: 1, number: "offline", real: false, startedAt: now, endedAt: now, status: "completed", outcome: "answered", transcript: [], origin: "case", summary: "Offline demo call" }] });
      else attachFlow(item.id, { questionnaires: [{ id: `Q-${Date.now()}`, number: "offline", real: false, sentAt: now, submittedAt: now, outcome: "submitted", origin: "case" }] });
      score(kind, answers);
      return;
    }
    setActive({ kind, key: Date.now() });
  }

  const common = {
    alert, profile, contact,
    onLog: (l: { text: string; ok: boolean }) => log(active?.kind === "wa" ? "Case: WhatsApp" : "Case: Voice bot", l.text, active?.kind === "wa" ? "whatsapp" : "voice"),
    onNoResponse: (reason: string) => { log(active?.kind === "wa" ? "Case: WhatsApp no reply" : "Case: AI call no answer", reason, active?.kind === "wa" ? "whatsapp" : "voice"); setActive(undefined); },
    onCall: (r: CallRecord) => attachFlow(item.id, { calls: [{ ...r, origin: "case" }] }),
    onQuestionnaire: (r: QuestionnaireRecord) => attachFlow(item.id, { questionnaires: [{ ...r, origin: "case" }] }),
  };

  const none = !avail.call && !avail.whatsapp;
  return (
    <Card className="border-primary/30">
      <CardHeader><CardTitle className="flex items-center gap-2 text-sm">Contact customer</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        {none ? <p className="text-muted-foreground">AI call and WhatsApp were both done in the demo run. See the records below.</p> : (
          <>
            {closed && <p className="text-xs text-muted-foreground">This case is closed, so new contact is disabled.</p>}
            <ContactBox raw={raw} setRaw={setRaw} name={name} setName={setName} lang={lang} setLang={setLang} disabled={closed || !!active} />
            <div className="flex flex-wrap items-center gap-3">
              {avail.call ? <Button size="sm" disabled={closed || !!active || (!offline && !validPhone(phone))} onClick={() => start("voice")}><Phone className="mr-1 h-4 w-4" />Start AI call</Button> : <span className="text-xs text-muted-foreground">AI call already done in demo run.</span>}
              {avail.whatsapp ? <Button size="sm" variant="outline" disabled={closed || !!active || (!offline && !validPhone(phone))} onClick={() => start("wa")}><MessageCircle className="mr-1 h-4 w-4" />Send WhatsApp check</Button> : <span className="text-xs text-muted-foreground">WhatsApp already done in demo run.</span>}
              <div className="ml-auto flex items-center gap-2"><Switch id="off" checked={offline} onCheckedChange={setOffline} disabled={!!active} /><Label htmlFor="off" className="text-xs">Offline demo</Label></div>
            </div>
          </>
        )}
        {active?.kind === "voice" && <RealVoicePanel key={active.key} {...common} qs={qs("voice")} attempt={1} retries={1} onAnswers={(a) => { setActive(undefined); score("voice", a); }} />}
        {active?.kind === "wa" && <RealWhatsAppPanel key={active.key} {...common} qs={qs("bitly")} onAnswers={(a) => { setActive(undefined); score("wa", a); }} />}
        {result && <div className="rounded-md bg-muted p-3"><p className="font-medium">{result.channel} result: flag {result.flag} · <Badge variant="outline">{result.colour}</Badge></p><p className="text-xs text-muted-foreground">Suggested: {result.text}. Bank experts decide.</p></div>}
      </CardContent>
    </Card>
  );
}
