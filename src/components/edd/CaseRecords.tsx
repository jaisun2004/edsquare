import { useState } from "react";
import { Bot, ChevronDown, ClipboardCheck, Gavel, MessageCircle, Phone, PhoneOff, Settings2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/components/edd/chips";
import type { CallAnswer, CallRecord, QuestionnaireRecord, TimelineEntry } from "@/data/edd";

const dur = (a: string, b?: string) => {
  if (!b) return "—";
  const s = Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 1000));
  return `${Math.floor(s / 60)}m ${s % 60}s`;
};

const colourVariant = (c?: string) => (c === "Red" ? "destructive" : c === "Green" ? "default" : "secondary") as "destructive" | "default" | "secondary";

function Answers({ answers, flag, colour }: { answers?: CallAnswer[] | undefined; flag?: number | undefined; colour?: string | undefined }) {
  if (!answers?.length) return null;
  return (
    <div className="space-y-1 rounded-md border border-border p-2 text-xs">
      <p className="flex items-center gap-2 font-medium">Answers & score {flag !== undefined && <Badge variant={colourVariant(colour)}>Flag {flag} · {colour}</Badge>}</p>
      {answers.map((a, i) => (
        <p key={i} className="flex justify-between gap-3"><span className="text-muted-foreground">{a.question}</span><span className="shrink-0 font-medium">{a.answer} (+{a.points})</span></p>
      ))}
    </div>
  );
}

function CallCard({ c }: { c: CallRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {c.outcome === "answered" ? <Phone className="h-4 w-4 text-primary" /> : <PhoneOff className="h-4 w-4 text-muted-foreground" />}
        <span className="font-medium">Attempt {c.attempt}</span>
        <Badge variant="outline">{c.outcome === "answered" ? "Answered" : c.outcome === "failed" ? "Failed" : "No response"}</Badge>
        {!c.real && <Badge variant="secondary">Simulated</Badge>}
        <span className="text-xs text-muted-foreground">{c.number} · {formatDateTime(c.startedAt)} · {dur(c.startedAt, c.endedAt)}</span>
      </div>
      {c.real && (c.recordingUrl ? <audio controls preload="none" src={c.recordingUrl} className="h-9 w-full" /> : <p className="text-xs text-muted-foreground">Recording not available</p>)}
      {c.summary && <p className="text-xs"><b>Summary:</b> {c.summary}</p>}
      {(c.disposition || c.partnerRecordId) && <p className="text-xs text-muted-foreground">{c.disposition && <>Disposition: {c.disposition} · </>}{c.partnerRecordId && <>Partner record {c.partnerRecordId}</>}</p>}
      <Answers answers={c.answers} flag={c.flag} colour={c.colour} />
      {c.transcript.length > 0 && (
        <>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(!open)}><ChevronDown className={`mr-1 h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />{open ? "Hide" : "Show"} transcript ({c.transcript.length})</Button>
          {open && (
            <div className="max-h-72 space-y-2 overflow-y-auto rounded-md bg-muted p-2">
              {c.transcript.map((t, i) => {
                const cust = t.role === "user";
                return <div key={i} className={`flex ${cust ? "justify-end" : ""}`}><p className={`max-w-[80%] rounded-lg px-3 py-1.5 text-xs ${cust ? "bg-primary text-primary-foreground" : "bg-background"}`}><b>{cust ? "Customer" : "Agent"}:</b> {t.text}</p></div>;
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function CaseCalls({ calls, questionnaires }: { calls: CallRecord[]; questionnaires: QuestionnaireRecord[] }) {
  if (!calls.length && !questionnaires.length) return null;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4" />Voice calls ({calls.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {calls.length ? [...calls].sort((a, b) => a.attempt - b.attempt).map((c) => <CallCard key={c.id} c={c} />) : <p className="text-xs text-muted-foreground">No calls on this case.</p>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm"><MessageCircle className="h-4 w-4" />WhatsApp questionnaire ({questionnaires.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {questionnaires.length ? questionnaires.map((q) => (
            <div key={q.id} className="space-y-2 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="outline">{q.outcome === "submitted" ? "Submitted" : q.outcome === "failed" ? "Send failed" : "No reply"}</Badge>
                {!q.real && <Badge variant="secondary">Simulated</Badge>}
                <span className="text-xs text-muted-foreground">{q.number}</span>
              </div>
              <p className="text-xs text-muted-foreground">Sent {formatDateTime(q.sentAt)}{q.submittedAt && <> · Submitted {formatDateTime(q.submittedAt)}</>}</p>
              <Answers answers={q.answers} flag={q.flag} colour={q.colour} />
            </div>
          )) : <p className="text-xs text-muted-foreground">No questionnaire sent.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "checks", label: "Checks" },
  { id: "voice", label: "Voice" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "decision", label: "Decision" },
] as const;

const icon = (c?: TimelineEntry["channel"]) => {
  const cls = "h-3.5 w-3.5";
  if (c === "checks") return <ClipboardCheck className={cls} />;
  if (c === "voice") return <Bot className={cls} />;
  if (c === "whatsapp") return <MessageCircle className={cls} />;
  if (c === "decision") return <Gavel className={cls} />;
  return <Settings2 className={cls} />;
};

export function CaseTimeline({ entries }: { entries: TimelineEntry[] }) {
  const [f, setF] = useState<(typeof FILTERS)[number]["id"]>("all");
  const isDecision = (t: TimelineEntry) => t.channel === "decision" || (!t.channel && /decision|case created|assigned|stage/i.test(t.action));
  const list = entries.filter((t) => f === "all" || (f === "decision" ? isDecision(t) : t.channel === f));
  return (
    <Card>
      <CardContent className="space-y-4 py-6">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((x) => <Button key={x.id} size="sm" variant={f === x.id ? "default" : "outline"} className="h-7" onClick={() => setF(x.id)}>{x.label}</Button>)}
        </div>
        {list.length === 0 && <p className="text-sm text-muted-foreground">No events in this view.</p>}
        {list.map((t) => (
          <div key={t.id} className="flex gap-3">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">{icon(t.channel ?? (isDecision(t) ? "decision" : undefined))}</div>
            <div className="border-l-2 border-primary/20 pl-3">
              <p className="text-sm font-medium">{t.action}</p>
              <p className="text-sm text-muted-foreground">{t.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.actor} · {formatDateTime(t.at)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
