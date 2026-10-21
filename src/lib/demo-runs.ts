import type { CallRecord, EDDCase, QuestionnaireRecord } from "@/data/edd";

export type RunColour = "Red" | "Amber" | "Green" | "Manual";

export interface DemoRun {
  id: string;
  alertId?: string | undefined;
  at: string;
  alertType: string;
  account: string;
  customer: string;
  /** Name entered for the person actually called / messaged. */
  contactName?: string | undefined;
  number?: string | undefined; // masked
  colour: RunColour;
  outcome: string;
  caseId?: string | undefined;
  callAnswered: boolean;
  callAttempts: number;
  whatsappSent: boolean;
  formSubmitted: boolean;
  recordingUrl?: string | undefined;
}

export interface RunStats {
  total: number;
  byColour: Record<RunColour, number>;
  withCase: number;
  cleared: number;
  calls: number;
  callsAnswered: number;
  answerRate: number; // %
  formsSent: number;
  formsSubmitted: number;
  completionRate: number; // %
}

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

export function runStats(runs: DemoRun[], calls: CallRecord[], forms: QuestionnaireRecord[]): RunStats {
  const byColour: Record<RunColour, number> = { Red: 0, Amber: 0, Green: 0, Manual: 0 };
  for (const r of runs) byColour[r.colour] += 1;
  const callsAnswered = calls.filter((c) => c.outcome === "answered").length;
  const formsSubmitted = forms.filter((f) => f.outcome === "submitted").length;
  const withCase = runs.filter((r) => r.caseId).length;
  return {
    total: runs.length, byColour, withCase, cleared: runs.length - withCase,
    calls: calls.length, callsAnswered, answerRate: pct(callsAnswered, calls.length),
    formsSent: forms.length, formsSubmitted, completionRate: pct(formsSubmitted, forms.length),
  };
}

export interface ActivityRow {
  id: string; caseId: string; customer: string; channel: string; status: string; at: string; outcome: string; live: boolean; recordingUrl?: string | undefined;
}

/** Real call / questionnaire records on cases, as engagement activity rows. */
export function liveActivity(cases: EDDCase[]): ActivityRow[] {
  return cases.flatMap((c) => [
    ...(c.calls ?? []).map((k) => ({
      id: k.id, caseId: c.id, customer: c.customer, channel: "AI Call", live: k.real, at: k.startedAt, recordingUrl: k.recordingUrl,
      status: k.outcome === "answered" ? "Answered" : k.outcome === "failed" ? "Failed" : "No answer",
      outcome: k.summary ?? `Attempt ${k.attempt} to ${k.number}${k.disposition ? ` · ${k.disposition}` : ""}`,
    })),
    ...(c.questionnaires ?? []).map((q) => ({
      id: q.id, caseId: c.id, customer: c.customer, channel: "WhatsApp", live: q.real, at: q.sentAt,
      status: q.outcome === "submitted" ? "Submitted" : q.outcome === "failed" ? "Failed" : "Sent",
      outcome: q.outcome === "submitted" ? `Questionnaire submitted · flag ${q.flag ?? "—"} (${q.colour ?? "—"})` : `Questionnaire link sent to ${q.number}`,
    })),
  ]);
}
