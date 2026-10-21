import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CbsProfile, ScriptQuestion, WorkbookAlert } from "@/data/workbook";
import { callState, normalName, normalisePhone, prettyPhone } from "@/lib/voice";
import type { CallRecord, QuestionnaireRecord } from "@/data/edd";
import { dispatchVoiceCall, getVoiceCall, type VoiceCallView } from "@/lib/voice.functions";
import { extractCallAnswers } from "@/lib/rule-ai.functions";
import { sendWhatsAppText } from "@/lib/whatsapp.functions";
import { createQuestionnaire, getQuestionnaire } from "@/lib/questionnaire.functions";
import { maskNumber } from "@/lib/whatsapp";

export const PHONE_KEY = "edsquare.demo.phone";
const BANK = "Airtel Payments Bank";
const MAX = 3;

export interface Contact { phone: string; name: string; lang: "ENGLISH" | "HINDI" }
export const validPhone = (phone: string) => /^\d{12,15}$/.test(phone);

function useElapsed(active: boolean) {
  const [s, setS] = useState(0);
  useEffect(() => { setS(0); if (!active) return; const t = setInterval(() => setS((x) => x + 1), 1000); return () => clearInterval(t); }, [active]);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Customer contact taken once before the run; used by the voice call and WhatsApp. */
export function ContactBox({ raw, setRaw, name, setName, lang, setLang, disabled, compact }: { raw: string; setRaw: (v: string) => void; name: string; setName: (v: string) => void; lang: Contact["lang"]; setLang: (v: Contact["lang"]) => void; disabled?: boolean; compact?: boolean }) {
  const phone = normalisePhone(raw);
  const hint = !raw ? null : validPhone(phone)
    ? <p className="text-[11px] text-muted-foreground">Will use {prettyPhone(phone)}{phone !== raw.replace(/\D/g, "") ? " (country code added)" : ""}</p>
    : <p className="text-[11px] text-destructive">Enter a 10-digit mobile number</p>;
  const langSel = <Select value={lang} onValueChange={(v) => setLang(v as Contact["lang"])} disabled={!!disabled}><SelectTrigger className={compact ? "h-8 w-28" : ""}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ENGLISH">English</SelectItem><SelectItem value="HINDI">Hindi</SelectItem></SelectContent></Select>;
  if (compact) return (
    <div className="flex items-center gap-2">
      <Input className="h-8 w-40" value={raw} onChange={(e) => setRaw(e.target.value.replace(/[^\d+ ]/g, ""))} placeholder="Customer mobile" disabled={disabled} />
      <Input className="h-8 w-36" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" disabled={disabled} />
      {langSel}
    </div>
  );
  return (
    <div className="space-y-2 rounded-md border p-3">
      <p className="text-xs font-semibold">Customer contact (real call & WhatsApp)</p>
      <div className="space-y-1"><Label className="text-xs">Mobile (country code optional)</Label><Input value={raw} onChange={(e) => setRaw(e.target.value.replace(/[^\d+ ]/g, ""))} placeholder="10-digit mobile" disabled={disabled} />{hint}</div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label className="text-xs">Name on the call</Label><Input value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} /></div>
        <div className="space-y-1"><Label className="text-xs">Language</Label>{langSel}</div>
      </div>
    </div>
  );
}

export interface ChannelLog { text: string; ok: boolean; ms?: number }

interface Common {
  alert: WorkbookAlert;
  profile: CbsProfile;
  qs: ScriptQuestion[];
  onLog: (l: ChannelLog) => void;
  onAnswers: (answers: Record<string, string>) => void;
  onNoResponse: (reason: string) => void;
  onCall?: (r: CallRecord) => void;
  onQuestionnaire?: (r: QuestionnaireRecord) => void;
  contact: Contact;
}

const inr = (n: number) => n.toLocaleString("en-IN");

export function RealVoicePanel(p: Common & { attempt: number; retries: number }) {
  const dispatch = useServerFn(dispatchVoiceCall);
  const poll = useServerFn(getVoiceCall);
  const extract = useServerFn(extractCallAnswers);
  const { phone, name, lang } = p.contact;
  const [stage, setStage] = useState<"dialling" | "waiting" | "scoring" | "done" | "failed">("dialling");
  const [view, setView] = useState<VoiceCallView>();
  const [err, setErr] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  const began = useRef(false);
  const elapsed = useElapsed(stage === "waiting");
  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => { if (began.current) return; began.current = true; void place(); }, []);

  const recent = p.alert.credits.reduce((a, b) => a + b, 0);

  async function place() {
    setErr(undefined); setView(undefined); setStage("dialling");
    const attempt = p.attempt;
    const started = new Date().toISOString();
    const rec = (v: VoiceCallView | undefined, outcome: CallRecord["outcome"], extra: Partial<CallRecord> = {}): CallRecord => ({ id: `CALL-${Date.parse(started)}`, attempt, number: maskNumber(phone), real: true, startedAt: v?.startedAt ?? started, endedAt: v?.endedAt ?? new Date().toISOString(), status: v?.status ?? outcome, outcome, disposition: v?.disposition, summary: v?.summary, recordingUrl: v?.recordingUrl, partnerRecordId: v?.callId, transcript: v?.transcript ?? [], ...extra });
    try {
      const r = await dispatch({ data: { phone, session: { customer_name: normalName(name), bank_name: BANK, acct_last4: p.alert.account.slice(-4), credit_amt: inr(p.alert.amount), credit_date: p.alert.date, recent_credit_amt: String(recent), preferred_language: lang } } });
      p.onLog({ ok: r.ok, ms: r.ms, text: r.ok ? `Voice agent dialling ${maskNumber(phone)} (attempt ${attempt}).` : `Voice dispatch failed (${r.status || "no connection"}): ${r.body}` });
      if (!r.ok) { setErr(r.body); setStage("failed"); p.onCall?.(rec(undefined, "failed", { status: `dispatch failed ${r.status || ""}`.trim() })); return; }
      setStage("waiting");
      const startedAt = Date.now();
      clearInterval(timer.current);
      timer.current = setInterval(async () => {
        try {
          const v = await poll({ data: { phone, since: r.since } });
          if (v.error) setErr(v.error);
          if (v.found) setView(v);
          const st = v.found ? callState(v.status, v.transcript.filter((t) => t.role === "user").length) : "running";
          if (st === "running" && Date.now() - startedAt < 6 * 60_000) return;
          clearInterval(timer.current);
          if (st === "answered") {
            setStage("scoring");
            p.onCall?.(rec(v, "answered", { partnerRecordId: v.callId ?? r.recordId }));
            p.onLog({ ok: true, text: `Call completed (${v.disposition ?? v.status}). ${v.summary ?? ""}`.trim() });
            try {
              const text = v.transcript.map((t) => `${t.role}: ${t.text}`).join("\n");
              const a = await extract({ data: { transcript: text, questions: p.qs.map((q) => ({ id: q.id, text: q.text, options: q.options.map((o) => o.label) })), profile: JSON.stringify({ employment: p.profile.employment, pincode: p.profile.pincode, accountType: p.profile.accountType }) } });
              p.onAnswers(a.answers);
            } catch {
              p.onAnswers({});
            }
            setStage("done");
          } else {
            setStage("done");
            p.onCall?.(rec(v.found ? v : undefined, "no_response", { partnerRecordId: v.callId ?? r.recordId }));
            p.onNoResponse(v.found ? `Call ${v.status ?? "ended"} without an answer` : "No call record after 6 minutes");
          }
        } catch (e) { setErr(e instanceof Error ? e.message : "Polling failed."); }
      }, 5000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Call failed."); setStage("failed");
    }
  }

  const label = stage === "dialling" ? "Dialling…" : stage === "waiting" ? (view?.transcript.length ? `Connected · ${elapsed}` : `Ringing / in call · ${elapsed}`) : stage === "scoring" ? "Call ended · reading answers…" : stage === "failed" ? "Call could not be placed" : "Call ended";
  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold">{stage === "failed" ? <Phone className="h-3.5 w-3.5 text-destructive" /> : <Loader2 className={`h-3.5 w-3.5 ${stage === "done" ? "hidden" : "animate-spin"}`} />}{label}</p>
        <span className="text-xs text-muted-foreground">Attempt {p.attempt}/{p.retries} · {prettyPhone(phone)}</span>
      </div>
      {stage === "waiting" && <p className="text-xs text-muted-foreground">Waiting for the customer to pick up and finish the call…</p>}
      {view && (
        <div className="space-y-2 rounded-md bg-muted p-2 text-xs">
          <p>Status: <Badge variant="outline">{view.status}</Badge>{view.disposition && <> · {view.disposition}</>}</p>
          {view.transcript.length > 0 && <div className="max-h-48 space-y-1 overflow-y-auto">{view.transcript.map((t, i) => <p key={i}><b>{t.role === "user" ? "Customer" : "Agent"}:</b> {t.text}</p>)}</div>}
          {view.recordingUrl && <audio controls src={view.recordingUrl} className="h-8 w-full" />}
          {view.summary && <p className="text-muted-foreground"><b>Call summary:</b> {view.summary}</p>}
        </div>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex gap-2">
        {stage === "failed" && <Button size="sm" onClick={() => void place()}>Try again</Button>}
        {(stage === "waiting" || stage === "failed") && <button className="text-xs text-muted-foreground underline" onClick={() => { clearInterval(timer.current); setStage("done"); p.onNoResponse(stage === "failed" ? "Call could not be placed" : "Presenter ended wait: no answer"); }}>Mark as not answered</button>}
      </div>
    </div>
  );
}

function questionnaireOrigin() {
  const h = window.location.hostname;
  return h === "localhost" || h.startsWith("id-preview--") || h.endsWith("lovableproject.com") ? "https://edsquare.mfilterit.net" : window.location.origin;
}

export function RealWhatsAppPanel(p: Common) {
  const create = useServerFn(createQuestionnaire);
  const send = useServerFn(sendWhatsAppText);
  const read = useServerFn(getQuestionnaire);
  const phone = p.contact.phone;
  const [used, setUsed] = useState(0);
  const [stage, setStage] = useState<"idle" | "sending" | "waiting" | "done">("idle");
  const began = useRef(false);
  const elapsed = useElapsed(stage === "waiting");
  useEffect(() => { if (began.current) return; began.current = true; void go(); }, []);
  const [link, setLink] = useState<string>();
  const [err, setErr] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  const pin = p.profile.pincode;
  const decoys = [String(Number(pin) + 3), String(Number(pin) + 11)];
  const toCustomer = (q: ScriptQuestion) => ({ id: q.id, text: q.kind === "pincode" ? q.text.replace("Can we have", "Please select") : q.text, options: q.kind === "pincode" ? [pin, ...decoys, "Other"] : q.options.map((o) => o.label) });
  const fromCustomer = (a: Record<string, string>) => Object.fromEntries(p.qs.map((q) => [q.id, q.kind === "pincode" ? (a[q.id] === pin ? "Matches our records" : "Different pincode") : a[q.id]!]).filter(([, v]) => v));

  async function go() {
    if (!validPhone(phone) || used >= MAX) return;
    setErr(undefined); setStage("sending"); setUsed((n) => n + 1);
    try {
      const { token } = await create({ data: { header: { bank: BANK, amount: p.alert.amount, last4: p.alert.account.slice(-4), name: normalName(p.alert.holder) }, questions: p.qs.map(toCustomer) } });
      const url = `${questionnaireOrigin()}/q/${token}`;
      setLink(url);
      const message = `Dear ${normalName(p.alert.holder)}, ${BANK} noticed a credit of Rs ${inr(p.alert.amount)} on your A/c ending ${p.alert.account.slice(-4)}. Please confirm a few details here: ${url}`;
      const r = await send({ data: { to: phone, message } });
      p.onLog({ ok: r.ok, ms: r.ms, text: r.ok ? `WhatsApp questionnaire sent to ${maskNumber(phone)}${r.messageId ? " (message accepted)" : ""}.` : `WhatsApp send failed (${r.status || "no connection"}): ${r.body}` });
      const sentAt = new Date().toISOString();
      const qrec = (outcome: QuestionnaireRecord["outcome"], submittedAt?: string): QuestionnaireRecord => ({ id: `Q-${token.slice(0, 8)}`, number: maskNumber(phone), real: true, sentAt, link: url, outcome, submittedAt });
      if (!r.ok) { setErr(r.body); setStage("idle"); p.onQuestionnaire?.(qrec("failed")); return; }
      p.onQuestionnaire?.(qrec("no_response"));
      setStage("waiting");
      clearInterval(timer.current);
      timer.current = setInterval(async () => {
        try {
          const q = await read({ data: { token } });
          if (q?.status === "submitted" && q.answers) {
            clearInterval(timer.current);
            setStage("done");
            p.onLog({ ok: true, text: "Customer submitted the questionnaire from their phone." });
            p.onQuestionnaire?.(qrec("submitted", new Date().toISOString()));
            p.onAnswers(fromCustomer(q.answers));
          }
        } catch (e) { setErr(e instanceof Error ? e.message : "Polling failed."); }
      }, 4000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed."); setStage("idle");
    }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-semibold"><MessageCircle className="h-3.5 w-3.5" />
          {stage === "sending" ? "Sending WhatsApp…" : stage === "waiting" ? `Waiting for customer to submit the form · ${elapsed}` : stage === "done" ? "Answers received" : "WhatsApp not sent"}
        </p>
        <span className="text-xs text-muted-foreground">{prettyPhone(phone)} · {used}/{MAX} sends</span>
      </div>
      {link && <p className="break-all text-xs">Link: <a href={link} target="_blank" rel="noreferrer" className="text-primary underline">{link}</a></p>}
      {err && <p className="text-xs text-destructive">{err}</p>}
      <div className="flex items-center gap-3">
        {stage === "idle" && used < MAX && <Button size="sm" onClick={() => void go()}>Send again</Button>}
        {(stage === "waiting" || stage === "idle") && <button className="text-xs text-muted-foreground underline" onClick={() => { clearInterval(timer.current); setStage("done"); p.onNoResponse("No reply to WhatsApp questionnaire"); }}>Stop waiting: no response</button>}
      </div>
      <p className="text-[11px] text-muted-foreground">WhatsApp only delivers free text if the test phone messaged the business number in the last 24 hours.</p>
    </div>
  );
}
