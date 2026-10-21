// Pure helpers for the case page: which channels can still be started, and a per-step status summary.
import type { EDDCase } from "@/data/edd";
import type { DemoRun } from "@/lib/demo-runs";
import { stepOutcome } from "@/lib/edd-flow";

export type StepTone = "ok" | "bad" | "warn" | "idle";
export interface StepStatus { id: string; label: string; status: string; tone: StepTone; at?: string | undefined; fromCase?: boolean }

/** A channel is offered on the case only when the demo run did not trigger it. */
export function outreachAvailability(c: Pick<EDDCase, "calls" | "questionnaires">, run?: Pick<DemoRun, "callAttempts" | "whatsappSent">) {
  const runCalls = (c.calls ?? []).filter((r) => r.origin !== "case").length + (run?.callAttempts ?? 0);
  const runForms = (c.questionnaires ?? []).filter((r) => r.origin !== "case").length + (run?.whatsappSent ? 1 : 0);
  return { call: runCalls === 0, whatsapp: runForms === 0 };
}

/** Suggested next step from a scored answer set; the officer still decides. */
export function outreachSuggestion(flag: number, merchant: boolean): { colour: string; text: string } {
  const o = stepOutcome(flag, merchant);
  return { colour: o.colour, text: o.action === "unblock" ? "Low risk: consider unblocking" : o.action === "manual_queue" ? "Needs manual review" : "High risk: keep blocked" };
}

export function caseSteps(c: EDDCase, run?: DemoRun): StepStatus[] {
  const find = (re: RegExp) => [...c.timeline].reverse().find((t) => re.test(t.action));
  const checks = find(/step 1|data check/i);
  const calls = c.calls ?? [];
  const forms = c.questionnaires ?? [];
  const answered = calls.find((x) => x.outcome === "answered");
  const lastCall = calls[calls.length - 1];
  const voice: StepStatus = calls.length
    ? { id: "voice", label: "AI voice call", status: answered ? `Answered${answered.colour ? ` · ${answered.colour}` : ""}` : `No answer (${calls.length} attempt${calls.length > 1 ? "s" : ""})`, tone: answered ? "ok" : "warn", at: (answered ?? lastCall)?.startedAt, fromCase: calls.some((x) => x.origin === "case") }
    : run?.callAttempts ? { id: "voice", label: "AI voice call", status: run.callAnswered ? "Answered" : `No answer (${run.callAttempts} attempts)`, tone: run.callAnswered ? "ok" : "warn" }
    : { id: "voice", label: "AI voice call", status: "Not triggered", tone: "idle" };
  const sub = forms.find((x) => x.outcome === "submitted");
  const waSkip = find(/whatsapp/i);
  const wa: StepStatus = forms.length
    ? { id: "wa", label: "WhatsApp questionnaire", status: sub ? `Submitted${sub.colour ? ` · ${sub.colour}` : ""}` : forms.some((x) => x.outcome === "failed") && !forms.some((x) => x.outcome === "no_response") ? "Send failed" : "No reply", tone: sub ? "ok" : "warn", at: (sub ?? forms[forms.length - 1])?.sentAt, fromCase: forms.some((x) => x.origin === "case") }
    : waSkip && /skip/i.test(waSkip.detail) ? { id: "wa", label: "WhatsApp questionnaire", status: "Skipped", tone: "idle", at: waSkip.at }
    : { id: "wa", label: "WhatsApp questionnaire", status: "Not triggered", tone: "idle" };
  const email = find(/email/i);
  const d = c.decision;
  return [
    checks ? { id: "checks", label: "Data checks", status: /pass|green|clear/i.test(checks.detail) && !/fail|fired|hit/i.test(checks.detail) ? "Passed" : `Flagged · ${checks.detail}`, tone: /pass|green|clear/i.test(checks.detail) && !/fail|fired|hit/i.test(checks.detail) ? "ok" : "bad", at: checks.at } : { id: "checks", label: "Data checks", status: "Not recorded", tone: "idle" },
    voice,
    wa,
    email ? { id: "email", label: "Email & app alert", status: "Sent", tone: "ok", at: email.at } : { id: "email", label: "Email & app alert", status: "Not reached", tone: "idle" },
    { id: "case", label: "Case created", status: c.id, tone: "ok", at: c.openedAt },
    d ? { id: "decision", label: "Human review / decision", status: `${d.outcome} by ${d.by}`, tone: d.outcome === "Unblock" ? "ok" : d.outcome === "Block" ? "bad" : "warn", at: d.at } : { id: "decision", label: "Human review / decision", status: "Pending", tone: "warn" },
  ];
}
