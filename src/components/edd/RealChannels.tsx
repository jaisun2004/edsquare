import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MessageCircle, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CbsProfile, ScriptQuestion, WorkbookAlert } from "@/data/workbook";
import { callState, normalName } from "@/lib/voice";
import { dispatchVoiceCall, getVoiceCall, type VoiceCallView } from "@/lib/voice.functions";
import { extractCallAnswers } from "@/lib/rule-ai.functions";
import { sendWhatsAppText } from "@/lib/whatsapp.functions";
import { createQuestionnaire, getQuestionnaire } from "@/lib/questionnaire.functions";
import { maskNumber } from "@/lib/whatsapp";

const PHONE_KEY = "edsquare.demo.phone";
const MAX = 3;
const BANK = "Airtel Payments Bank";

function usePhone() {
  const [phone, setPhone] = useState("");
  useEffect(() => setPhone(sessionStorage.getItem(PHONE_KEY) ?? ""), []);
  const save = (p: string) => sessionStorage.setItem(PHONE_KEY, p);
  return [phone, (v: string) => setPhone(v.replace(/\D/g, "")), save] as const;
}

export interface ChannelLog { text: string; ok: boolean; ms?: number }

interface Common {
  alert: WorkbookAlert;
  profile: CbsProfile;
  qs: ScriptQuestion[];
  onLog: (l: ChannelLog) => void;
  onAnswers: (answers: Record<string, string>) => void;
  onNoResponse: (reason: string) => void;
}

const inr = (n: number) => n.toLocaleString("en-IN");

export function RealVoicePanel(p: Common) {
  const dispatch = useServerFn(dispatchVoiceCall);
  const poll = useServerFn(getVoiceCall);
  const extract = useServerFn(extractCallAnswers);
  const [phone, setPhone, savePhone] = usePhone();
  const [name, setName] = useState(normalName(p.alert.holder));
  const [lang, setLang] = useState<"ENGLISH" | "HINDI">("ENGLISH");
  const [used, setUsed] = useState(0);
  const [stage, setStage] = useState<"idle" | "dialling" | "waiting" | "scoring" | "done">("idle");
  const [view, setView] = useState<VoiceCallView>();
  const [err, setErr] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  const recent = p.alert.credits.reduce((a, b) => a + b, 0);
  const valid = /^\d{10,15}$/.test(phone) && name.trim().length > 0;

  const place = async () => {
    if (!valid || used >= MAX) return;
    if (!window.confirm(`Place a real AI voice call to +${phone}?`)) return;
    savePhone(phone);
    setErr(undefined); setView(undefined); setStage("dialling"); setUsed((n) => n + 1);
    try {
      const r = await dispatch({ data: { phone, session: { customer_name: normalName(name), bank_name: BANK, acct_last4: p.alert.account.slice(-4), credit_amt: inr(p.alert.amount), credit_date: p.alert.date, recent_credit_amt: String(recent), preferred_language: lang } } });
      p.onLog({ ok: r.ok, ms: r.ms, text: r.ok ? `Voice agent dispatched to ${maskNumber(phone)} (record ${r.recordId ?? "created"}).` : `Voice dispatch failed (${r.status || "no connection"}): ${r.body}` });
      if (!r.ok) { setErr(r.body); setStage("idle"); return; }
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
            p.onLog({ ok: true, text: `Call completed (${v.disposition ?? v.status}). ${v.summary ?? ""}`.trim() });
            try {
              const text = v.transcript.map((t) => `${t.role}: ${t.text}`).join("\n");
              const a = await extract({ data: { transcript: text, questions: p.qs.map((q) => ({ id: q.id, text: q.text, options: q.options.map((o) => o.label) })), profile: JSON.stringify({ employment: p.profile.employment, pincode: p.profile.pincode, accountType: p.profile.accountType }) } });
              p.onAnswers(a.answers);
            } catch (e) {
              setErr(`Could not read answers from the call: ${e instanceof Error ? e.message : ""}. Pick them below.`);
              p.onAnswers({});
            }
            setStage("done");
          } else {
            setStage("done");
            p.onNoResponse(v.found ? `Call ${v.status ?? "ended"} without an answer` : "No call record after 6 minutes");
          }
        } catch (e) { setErr(e instanceof Error ? e.message : "Polling failed."); }
      }, 5000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Call failed."); setStage("idle");
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="flex items-center gap-2 text-xs font-semibold"><Phone className="h-3.5 w-3.5" />Real AI voice call (optional)</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1"><Label className="text-xs">Mobile (e.g. 919081657821)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="91XXXXXXXXXX" disabled={stage === "waiting"} /></div>
        <div className="space-y-1"><Label className="text-xs">Customer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} disabled={stage === "waiting"} /></div>
        <div className="space-y-1"><Label className="text-xs">Language</Label>
          <Select value={lang} onValueChange={(v) => setLang(v as "ENGLISH" | "HINDI")}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ENGLISH">English</SelectItem><SelectItem value="HINDI">Hindi</SelectItem></SelectContent></Select>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{used}/{MAX} calls this step · {BANK} · A/c ••{p.alert.account.slice(-4)}</span>
        <Button size="sm" onClick={place} disabled={!valid || used >= MAX || stage === "dialling" || stage === "waiting" || stage === "scoring"}>
          {stage === "dialling" || stage === "waiting" || stage === "scoring" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Phone className="mr-2 h-4 w-4" />}
          {stage === "waiting" ? "Call in progress…" : stage === "scoring" ? "Reading answers…" : "Place real call"}
        </Button>
      </div>
      {view && (
        <div className="space-y-2 rounded-md bg-muted p-2 text-xs">
          <p>Status: <Badge variant="outline">{view.status}</Badge>{view.disposition && <> · {view.disposition}</>}</p>
          {view.transcript.length > 0 && <div className="max-h-48 space-y-1 overflow-y-auto">{view.transcript.map((t, i) => <p key={i}><b>{t.role === "user" ? "Customer" : "Agent"}:</b> {t.text}</p>)}</div>}
          {view.recordingUrl && <audio controls src={view.recordingUrl} className="h-8 w-full" />}
          {view.summary && <p className="text-muted-foreground"><b>Call summary:</b> {view.summary}</p>}
        </div>
      )}
      {err && <p className="text-xs text-destructive">{err}</p>}
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
  const [phone, setPhone, savePhone] = usePhone();
  const [used, setUsed] = useState(0);
  const [stage, setStage] = useState<"idle" | "sending" | "waiting" | "done">("idle");
  const [link, setLink] = useState<string>();
  const [err, setErr] = useState<string>();
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  const pin = p.profile.pincode;
  const decoys = [String(Number(pin) + 3), String(Number(pin) + 11)];
  const toCustomer = (q: ScriptQuestion) => ({ id: q.id, text: q.kind === "pincode" ? q.text.replace("Can we have", "Please select") : q.text, options: q.kind === "pincode" ? [pin, ...decoys, "Other"] : q.options.map((o) => o.label) });
  const fromCustomer = (a: Record<string, string>) => Object.fromEntries(p.qs.map((q) => [q.id, q.kind === "pincode" ? (a[q.id] === pin ? "Matches our records" : "Different pincode") : a[q.id]!]).filter(([, v]) => v));

  const go = async () => {
    if (!/^\d{10,15}$/.test(phone) || used >= MAX) return;
    if (!window.confirm(`Send a real WhatsApp questionnaire to +${phone}?`)) return;
    savePhone(phone);
    setErr(undefined); setStage("sending"); setUsed((n) => n + 1);
    try {
      const { token } = await create({ data: { header: { bank: BANK, amount: p.alert.amount, last4: p.alert.account.slice(-4), name: normalName(p.alert.holder) }, questions: p.qs.map(toCustomer) } });
      const url = `${questionnaireOrigin()}/q/${token}`;
      setLink(url);
      const message = `Dear ${normalName(p.alert.holder)}, ${BANK} noticed a credit of Rs ${inr(p.alert.amount)} on your A/c ending ${p.alert.account.slice(-4)}. Please confirm a few details here: ${url}`;
      const r = await send({ data: { to: phone, message } });
      p.onLog({ ok: r.ok, ms: r.ms, text: r.ok ? `WhatsApp questionnaire sent to ${maskNumber(phone)}${r.messageId ? " (message accepted)" : ""}.` : `WhatsApp send failed (${r.status || "no connection"}): ${r.body}` });
      if (!r.ok) { setErr(r.body); setStage("idle"); return; }
      setStage("waiting");
      clearInterval(timer.current);
      timer.current = setInterval(async () => {
        try {
          const q = await read({ data: { token } });
          if (q?.status === "submitted" && q.answers) {
            clearInterval(timer.current);
            setStage("done");
            p.onLog({ ok: true, text: "Customer submitted the questionnaire from their phone." });
            p.onAnswers(fromCustomer(q.answers));
          }
        } catch (e) { setErr(e instanceof Error ? e.message : "Polling failed."); }
      }, 4000);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Send failed."); setStage("idle");
    }
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <p className="flex items-center gap-2 text-xs font-semibold"><MessageCircle className="h-3.5 w-3.5" />Real WhatsApp questionnaire (optional)</p>
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-1"><Label className="text-xs">Mobile (e.g. 919081657821)</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="91XXXXXXXXXX" disabled={stage === "waiting"} /></div>
        <Button size="sm" onClick={go} disabled={!/^\d{10,15}$/.test(phone) || used >= MAX || stage === "sending" || stage === "waiting"}>
          {stage === "sending" || stage === "waiting" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
          {stage === "waiting" ? "Waiting for answers…" : "Send WhatsApp"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{used}/{MAX} sends this step. WhatsApp only delivers free text if the test phone messaged the business number in the last 24 hours.</p>
      {link && <p className="break-all text-xs">Link: <a href={link} target="_blank" rel="noreferrer" className="text-primary underline">{link}</a></p>}
      {stage === "waiting" && <Button size="sm" variant="outline" onClick={() => { clearInterval(timer.current); setStage("done"); p.onNoResponse("No reply to WhatsApp questionnaire"); }}>Stop waiting: no response</Button>}
      {err && <p className="text-xs text-destructive">{err}</p>}
    </div>
  );
}
