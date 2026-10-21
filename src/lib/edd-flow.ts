// Pure step engine for the workbook EDD flow (data checks -> voice bot -> questionnaire -> alerts -> exit/manual).
import type { CbsProfile, ScriptKey, ScriptQuestion, WorkbookAlert } from "@/data/workbook";

export type Colour = "Red" | "Amber" | "Green" | "Manual";

export interface Thresholds {
  minAmount: number; // Rs
  avgMultiple: number; // x average daily credit
  creditSharePct: number; // % of credits in last 2 days
  flagBlock: number; // flag > this => block
  flagReview: number; // flag >= this (and <= flagBlock) => block if not merchant
  voiceRetries: number;
}

export const defaultThresholds: Thresholds = { minAmount: 5000, avgMultiple: 2, creditSharePct: 20, flagBlock: 10, flagReview: 8, voiceRetries: 3 };

export interface Check { id: string; label: string; fired: boolean; detail: string }

export function dataChecks(alert: WorkbookAlert, p: CbsProfile, negbaseHit: boolean, t: Thresholds = defaultThresholds): { outcome: Colour; checks: Check[] } {
  const multiple = p.avgCrAmtPerDay > 0 ? alert.amount / p.avgCrAmtPerDay : Infinity;
  const creditsSum = alert.credits.reduce((a, b) => a + b, 0);
  const largest = Math.max(alert.amount, ...alert.credits);
  const share = creditsSum > 0 ? (Math.max(...alert.credits) / creditsSum) * 100 : 0;
  const checks: Check[] = [
    { id: "C1", label: "mFilterIt Negative Database", fired: negbaseHit, detail: negbaseHit ? "Account found in Negative Database" : "Not found" },
    { id: "C2", label: `Amount > Rs ${t.minAmount.toLocaleString("en-IN")} and ≥ ${t.avgMultiple}x average daily credit`, fired: !negbaseHit && alert.amount > t.minAmount && multiple >= t.avgMultiple, detail: `Rs ${alert.amount.toLocaleString("en-IN")} vs average Rs ${p.avgCrAmtPerDay.toLocaleString("en-IN")}/day = ${multiple.toFixed(1)}x` },
    { id: "C3", label: `Transaction > ${t.creditSharePct}% of credits in last 2 days`, fired: false, detail: `Largest Rs ${largest.toLocaleString("en-IN")} of Rs ${creditsSum.toLocaleString("en-IN")} = ${share.toFixed(0)}%` },
  ];
  checks[2]!.fired = !negbaseHit && !checks[1]!.fired && alert.credits.length > 1 && share > t.creditSharePct;
  return { outcome: checks.some((c) => c.fired) ? "Red" : "Amber", checks };
}

export const isMerchant = (p: CbsProfile) => p.accountType === "Current";

export function flagOutcome(flag: number, merchant: boolean, t: Thresholds = defaultThresholds): Colour {
  if (merchant && flag >= t.flagReview) return "Manual";
  if (flag > t.flagBlock) return "Red";
  if (flag >= t.flagReview) return "Red";
  return "Green";
}

const employmentMap: Record<string, string> = { Salaried: "Working / salaried", "Pvt Ltd": "Self employed / Business", "Self Employed": "Self employed / Business" };

/** Risk points for one answer, comparing it to the CBS profile. */
export function answerPoints(q: ScriptQuestion, answer: string, p: CbsProfile, alertType: "I4C" | "Model"): number {
  if (q.kind === "employment") {
    const expected = employmentMap[p.employment.trim()];
    if (!expected) return 0;
    return answer === expected || (expected === "Self employed / Business" && answer === "Self employed professional") ? 0 : 3;
  }
  if (q.kind === "reason") {
    if (answer === "Business") return isMerchant(p) ? 0 : 3;
    if (answer === "Friendly transfer") return alertType === "I4C" ? 4 : 2;
    return 1;
  }
  return q.options.find((o) => o.label === answer)?.points ?? 0;
}

export function responseFlag(qs: ScriptQuestion[], answers: Record<string, string>, p: CbsProfile, type: "I4C" | "Model") {
  return qs.reduce((s, q) => s + (answers[q.id] ? answerPoints(q, answers[q.id]!, p, type) : 0), 0);
}

export function scriptFor(alert: WorkbookAlert, channel: "voice" | "bitly"): ScriptKey {
  if (alert.type === "I4C") return channel === "voice" ? "I4C Script" : "I4C Bitly";
  if (channel === "bitly") return "Mod Bitly";
  return alert.debits.length ? "Mod Script Debits and Credits" : "Mod Script";
}

export function exitOutcome(type: "I4C" | "Model"): { colour: Colour; text: string } {
  return type === "I4C"
    ? { colour: "Red", text: "No response from customer: continue block and exit. Self-service link sent via WhatsApp, email, SMS and mobile app." }
    : { colour: "Manual", text: "No response from customer: moved to the Manual review queue." };
}

/** WhatsApp pre-call check: only a Green response clears the customer without creating a case. */
export function waCheckOutcome(flag: number, merchant: boolean, t: Thresholds = defaultThresholds): { colour: Colour; clears: boolean } {
  const colour = flagOutcome(flag, merchant, t);
  return { colour, clears: colour === "Green" };
}
