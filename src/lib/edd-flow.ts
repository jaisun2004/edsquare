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

/** status: "fired" = this rule blocked; "also" = rule is true but an earlier rule already blocked; "pass" = not true. */
export interface Check { id: string; label: string; fired: boolean; detail: string; status: "fired" | "also" | "pass" }

/** Every rule is evaluated independently; the first true rule is the blocking one. */
export function dataChecks(alert: WorkbookAlert, p: CbsProfile, negbaseHit: boolean, t: Thresholds = defaultThresholds): { outcome: Colour; checks: Check[] } {
  const multiple = p.avgCrAmtPerDay > 0 ? alert.amount / p.avgCrAmtPerDay : Infinity;
  const credits = alert.credits.length ? alert.credits : [alert.amount];
  const creditsSum = credits.reduce((a, b) => a + b, 0);
  const largest = Math.max(...credits);
  const share = creditsSum > 0 ? (largest / creditsSum) * 100 : 0;
  const raw = [
    { id: "C1", label: "mFilterIt Negative Database", hit: negbaseHit, detail: negbaseHit ? "Account found in Negative Database" : "Not found" },
    { id: "C2", label: `Amount > Rs ${t.minAmount.toLocaleString("en-IN")} and ≥ ${t.avgMultiple}x average daily credit`, hit: alert.amount > t.minAmount && multiple >= t.avgMultiple, detail: `Rs ${alert.amount.toLocaleString("en-IN")} vs average Rs ${p.avgCrAmtPerDay.toLocaleString("en-IN")}/day = ${multiple.toFixed(1)}x` },
    { id: "C3", label: `Transaction > ${t.creditSharePct}% of credits in last 2 days`, hit: credits.length > 1 && share > t.creditSharePct, detail: `Largest Rs ${largest.toLocaleString("en-IN")} of Rs ${creditsSum.toLocaleString("en-IN")} = ${share.toFixed(0)}%` },
  ];
  const first = raw.findIndex((c) => c.hit);
  const checks: Check[] = raw.map((c, i) => ({ id: c.id, label: c.label, detail: c.detail, fired: i === first, status: i === first ? "fired" : c.hit ? "also" : "pass" }));
  return { outcome: first >= 0 ? "Red" : "Amber", checks };
}

export const isMerchant = (p: CbsProfile) => p.accountType === "Current";

export function flagOutcome(flag: number, merchant: boolean, t: Thresholds = defaultThresholds): Colour {
  // Scenario sheet: >10 continue block; 8-10 non-merchant continue block; 8-10 merchant -> Manual review queue.
  if (flag > t.flagBlock) return "Red";
  if (merchant && flag >= t.flagReview) return "Manual";
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

/** Sheet steps 1-5 in order. */
export const SHEET_STEPS = ["Data checks", "Voice bot", "WhatsApp / self-service questionnaire", "Email & mobile app alert", "Exit / Manual queue", "Human in the loop"] as const;

/** Outcome of a scored step (2, 3 or 4): Green unblocks, Red continues block, Manual goes to the review queue. */
export function stepOutcome(flag: number, merchant: boolean, t: Thresholds = defaultThresholds): { colour: Colour; action: "unblock" | "continue_block" | "manual_queue" } {
  const colour = flagOutcome(flag, merchant, t);
  return { colour, action: colour === "Green" ? "unblock" : colour === "Manual" ? "manual_queue" : "continue_block" };
}

/** Where "no response" at a step leads, per the sheet. */
export function nextOnNoResponse(step: "voice" | "bitly" | "alert"): "bitly" | "alert" | "exit" {
  return step === "voice" ? "bitly" : step === "bitly" ? "alert" : "exit";
}

/** After the voice call: optional WhatsApp; skipping scores the call (if answered) or moves to the email & app alert. */
export function afterVoice(answered: boolean, sendWhatsApp: boolean): "bitly" | "score" | "alert" {
  if (sendWhatsApp) return "bitly";
  return answered ? "score" : "alert";
}
