// Turns workbook flow steps into ordered, timed "call flow" events for the live simulator view.
import type { CbsProfile, WorkbookAlert } from "@/data/workbook";
import type { Check, Colour } from "@/lib/edd-flow";

export const LANES = ["source", "engine", "negdb", "cbs", "dm", "whatsapp", "voice", "cases", "enforce"] as const;
export type Lane = (typeof LANES)[number];
export const LANE_LABEL: Record<Lane, string> = {
  source: "Alert source", engine: "EDSquare engine", negdb: "Negative DB", cbs: "Core Banking", dm: "Decision Manager",
  whatsapp: "Questionnaire", voice: "Voice bot", cases: "Case Manager", enforce: "Enforcement",
};

export interface FlowEvent {
  from: Lane;
  to: Lane;
  label: string;
  /** ms after the previous event (at 1x speed) */
  delay: number;
  /** simulated latency shown on the arrow */
  ms?: number;
  colour?: Colour;
  payload?: Record<string, unknown>;
}

const inr = (n: number) => `Rs ${n.toLocaleString("en-IN")}`;

export function intakeEvents(alert: WorkbookAlert, profile: CbsProfile, negbaseHit: boolean, checks: Check[], outcome: Colour): FlowEvent[] {
  const src = alert.type === "I4C" ? "I4C portal" : "Risk model";
  const ev: FlowEvent[] = [
    { from: "source", to: "engine", label: `${src} alert received: ${alert.reason} (${inr(alert.amount)})`, delay: 300, ms: 38, payload: { type: alert.type, account: alert.account, amount: alert.amount, date: alert.date } },
    { from: "engine", to: "enforce", label: `Debit freeze placed on A/c ${alert.account}`, delay: 600, ms: 120, colour: "Amber", payload: { action: "DEBIT_FREEZE", account: alert.account } },
    { from: "engine", to: "negdb", label: `Querying Negative DB for ${alert.account}`, delay: 600, ms: 212, payload: { account: alert.account, holder: alert.holder } },
    { from: "negdb", to: "engine", label: negbaseHit ? "Match found in Negative DB" : "No match in Negative DB", delay: 700, colour: negbaseHit ? "Red" : "Green", payload: { hit: negbaseHit } },
    { from: "engine", to: "cbs", label: `Fetching Core Banking profile ${profile.custId}`, delay: 600, ms: 412, payload: { custId: profile.custId, account: profile.account } },
    { from: "cbs", to: "engine", label: `Profile: ${profile.accountType}, avg daily credit ${inr(profile.avgCrAmtPerDay)}, PIN ${profile.pincode}, risk ${profile.risk}`, delay: 800, payload: { ...profile } },
    { from: "engine", to: "dm", label: "Evaluating Step 1 data checks", delay: 600, ms: 64 },
  ];
  for (const c of checks) ev.push({ from: "dm", to: "dm", label: `${c.fired ? "Fired" : "Pass"}: ${c.label}`, delay: 500, colour: c.fired ? "Red" : "Green", payload: { detail: c.detail } });
  ev.push({ from: "dm", to: "engine", label: `Step 1 outcome: ${outcome}`, delay: 600, colour: outcome });
  return ev;
}

export const totalDelay = (ev: FlowEvent[]) => ev.reduce((a, e) => a + e.delay, 0);

export const caseEvents = (caseId: string, account: string): FlowEvent[] => [
  { from: "engine", to: "cases", label: `Case ${caseId} created`, delay: 400, ms: 90, payload: { caseId, account } },
];

export function whatsappEvents(answers: Record<string, string>, flag: number, colour: Colour, clears: boolean): FlowEvent[] {
  return [
    { from: "whatsapp", to: "engine", label: `Customer answered ${Object.keys(answers).length} questions in the questionnaire`, delay: 200, payload: answers },
    { from: "engine", to: "dm", label: "Scoring answers against Core Banking", delay: 500, ms: 58 },
    { from: "dm", to: "engine", label: `Response flag ${flag} → ${colour}`, delay: 600, colour },
    clears
      ? { from: "engine", to: "enforce", label: "Transaction verified by customer, freeze lifted, no case", delay: 500, ms: 160, colour: "Green" }
      : { from: "engine", to: "voice", label: "Not cleared, starting voice bot", delay: 500 },
  ];
}
