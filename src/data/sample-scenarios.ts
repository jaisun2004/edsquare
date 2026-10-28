// Ready-made sample alerts and cases built from the bank's test sheet (edd_flow_and_scripts_final_v1.1.xlsx),
// one per scenario, so every screen shows real outcomes before any live run.
import type { Alert, CallRecord, EDDCase, EnforcementEntry, QuestionnaireRecord, TimelineEntry } from "@/data/edd";
import { workbookAlerts } from "@/data/workbook";
import type { DemoRun, RunColour } from "@/lib/demo-runs";
import type { AlertResult } from "@/lib/alert-journey";

export interface SampleScenario {
  key: string;
  title: string;
  expected: AlertResult;
  sheetAlert: string; // workbook alert id
  colour: RunColour;
  /** Case created? */
  caseId?: string;
  decision?: "Block" | "Unblock";
  call?: "answered" | "no_response";
  whatsapp?: "submitted" | "no_response";
  flag?: number;
  checkFired?: string;
  outcome: string;
}

export const SAMPLE_SCENARIOS: SampleScenario[] = [
  { key: "s1", title: "Blocked at data checks", expected: "Blocked", sheetAlert: "i4c-1", colour: "Red", caseId: "CASE-2091", decision: "Block", checkFired: "Negative Database hit", outcome: "Step 1 check fired; reviewer kept the block." },
  { key: "s2", title: "Call answered, low risk: verified", expected: "Verified", sheetAlert: "mod-1", colour: "Green", call: "answered", flag: 3, outcome: "Customer verified on the call (flag 3). Freeze lifted, no case." },
  { key: "s3", title: "Call answered, high flags: case open", expected: "System blocked", sheetAlert: "i4c-3", colour: "Red", caseId: "CASE-2092", call: "answered", flag: 11, outcome: "Flag 11 on the call. Case sent to human review." },
  { key: "s4", title: "No answer, WhatsApp answered: Amber", expected: "System blocked", sheetAlert: "mod-2", colour: "Amber", caseId: "CASE-2093", call: "no_response", whatsapp: "submitted", flag: 9, outcome: "Call not answered (3 tries). WhatsApp form flag 9, Amber." },
  { key: "s5", title: "No response on any channel: manual review", expected: "System blocked", sheetAlert: "i4c-2", colour: "Manual", caseId: "CASE-2094", call: "no_response", whatsapp: "no_response", outcome: "No response to call, WhatsApp, email or app alert. Manual review." },
  { key: "s6", title: "Reviewed and blocked", expected: "Blocked", sheetAlert: "mod-2", colour: "Red", caseId: "CASE-2095", decision: "Block", call: "answered", flag: 12, outcome: "Flag 12. Reviewer blocked the account." },
  { key: "s7", title: "Reviewed and unblocked", expected: "Unblocked", sheetAlert: "i4c-1", colour: "Amber", caseId: "CASE-2096", decision: "Unblock", call: "no_response", whatsapp: "submitted", flag: 8, outcome: "WhatsApp flag 8. Reviewer unblocked after checking documents." },
];

const ago = (now: number, min: number) => new Date(now - min * 60_000).toISOString();

export function buildSamples(now = Date.now()) {
  const alerts: Alert[] = [];
  const cases: EDDCase[] = [];
  const enforcement: EnforcementEntry[] = [];
  const runs: DemoRun[] = [];

  SAMPLE_SCENARIOS.forEach((s, i) => {
    const w = workbookAlerts.find((a) => a.id === s.sheetAlert)!;
    const base = (i + 1) * 180; // minutes ago
    const alertId = `AL-SAMPLE-${i + 1}`;
    const number = `+91 ••••••${w.account.slice(-4)}`;
    const trigger = `${w.type === "I4C" ? "I4C complaint" : "Model alert"}: ${w.reason} (Rs ${w.amount.toLocaleString("en-IN")})`;
    alerts.push({ id: alertId, source: w.type === "I4C" ? "External Intelligence" : "Risk Model", feed: w.type === "I4C" ? "I4C" : "MODEL", account: w.account, upi: "—", customer: w.holder, trigger, receivedAt: ago(now, base), preliminarySignal: "H", status: "Triaged", ...(s.caseId ? { caseId: s.caseId } : {}) });

    const calls: CallRecord[] = [];
    if (s.call === "answered") {
      calls.push({ id: `CALL-S${i}-1`, attempt: 1, number, real: false, startedAt: ago(now, base - 5), endedAt: ago(now, base - 9), status: "completed", outcome: "answered", disposition: "Answered", summary: `Customer confirmed identity and explained the Rs ${w.amount.toLocaleString("en-IN")} credit. Risk flag ${s.flag}.`, transcript: [
        { role: "bot", text: `Am I speaking to ${w.holder}?` }, { role: "customer", text: "Yes." },
        { role: "bot", text: `Regarding the credit of INR ${w.amount.toLocaleString("en-IN")}, do you know the sender?` },
        { role: "customer", text: (s.flag ?? 0) > 9 ? "No, I don't know them." : "Yes, it is from my employer." },
      ], answers: [{ question: "Do you know the sender?", answer: (s.flag ?? 0) > 9 ? "No" : "Yes", points: (s.flag ?? 0) > 9 ? 4 : 0 }], flag: s.flag, colour: s.colour });
    } else if (s.call === "no_response") {
      for (let a = 1; a <= 3; a++) calls.push({ id: `CALL-S${i}-${a}`, attempt: a, number, real: false, startedAt: ago(now, base - 4 * a), status: "no-answer", outcome: "no_response", disposition: "Not answered", transcript: [] });
    }
    const forms: QuestionnaireRecord[] = s.whatsapp ? [{ id: `Q-S${i}`, number, real: false, sentAt: ago(now, base - 15), ...(s.whatsapp === "submitted" ? { submittedAt: ago(now, base - 25), answers: [{ question: "What was the payment for?", answer: "Business", points: 0 }], flag: s.flag, colour: s.colour } : {}), outcome: s.whatsapp }] : [];

    const run: DemoRun = { id: `RUN-SAMPLE-${i + 1}`, sample: true, alertId, at: ago(now, base - 30), alertType: w.type, account: w.account, customer: w.holder, number, colour: s.colour, outcome: s.outcome, caseId: s.caseId, callAnswered: s.call === "answered", callAttempts: calls.length, whatsappSent: forms.length > 0, formSubmitted: s.whatsapp === "submitted" };
    runs.push(run);

    if (!s.caseId) return;
    const t = (min: number, actor: string, action: string, detail: string, channel: TimelineEntry["channel"]): TimelineEntry => ({ id: `T-S${i}-${min}`, at: ago(now, base - min), actor, action, detail, channel });
    const timeline: TimelineEntry[] = [
      t(1, "EDSquare engine", "Alert received", trigger, "system"),
      t(2, "EDSquare engine", "Step 1 Data checks", s.checkFired ? `Fired: ${s.checkFired}` : "No check fired", "checks"),
      ...calls.map((c, k) => t(5 + 4 * k, "AI voice agent", `Voice call attempt ${c.attempt}`, c.outcome === "answered" ? `Answered. Flag ${s.flag}` : "Not answered", "voice")),
      ...(forms.length ? [t(20, "EDSquare engine", "WhatsApp questionnaire", forms[0]!.outcome === "submitted" ? `Submitted. Flag ${s.flag}` : "Sent, no reply", "whatsapp")] : []),
      ...(s.colour === "Manual" ? [t(26, "EDSquare engine", "Email & app alert", "Sent, no response. Exit to manual review", "whatsapp")] : []),
      t(28, "EDSquare engine", "Case created", `${s.caseId} from ${alertId}`, "decision"),
      ...(s.decision ? [t(30, "Arjun Rao", `Decision: ${s.decision}`, s.outcome, "decision" as const)] : []),
    ];
    cases.push({
      id: s.caseId, customer: w.holder, account: w.account, upi: "—", category: w.reason.includes("Job") ? "Job Scam" : w.reason.includes("Investment") ? "Investment Scam" : "Mule",
      stage: s.decision ? "Closed" : "Human Review", riskScore: s.colour === "Red" ? 86 : s.colour === "Amber" ? 68 : 60, grade: s.colour === "Red" ? "VH" : "H",
      assignee: "Priya Nair", openedAt: ago(now, base - 28), slaDueAt: new Date(now + (24 - i) * 3600_000).toISOString(),
      signals: [{ label: w.type === "I4C" ? "I4C complaint" : "Model alert", weight: 15, detail: w.reason }, ...(s.flag ? [{ label: "Customer risk flag", weight: s.flag, detail: `Flag ${s.flag} from customer answers` }] : [])],
      rulesTriggered: [], enrichment: { matchCriteria: s.checkFired ?? "Workbook scenario", negbaseAttributes: s.checkFired ? ["Category: Mule", "Source: I4C"] : [], upiHandleCount: 2, mobileVintage: "2 years", mobileType: "Prepaid", socialPresence: [], telco: "Airtel", osint: [] },
      engagement: [], timeline, calls, questionnaires: forms, notes: [], documents: [], recommendation: s.decision ?? "Further Investigation",
      ...(s.decision ? { decision: { outcome: s.decision, by: "Arjun Rao", at: ago(now, base - 30), reason: s.outcome } } : {}),
    });
    if (s.decision) enforcement.push({ id: `EN-S${i}`, caseId: s.caseId, account: w.account, customer: w.holder, action: s.decision, decidedBy: "Arjun Rao", reason: s.outcome, at: ago(now, base - 30), accountStatus: s.decision === "Block" ? "Debit freeze applied" : "Fully operational", downstreamStatus: "Acknowledged" });
  });
  return { alerts, cases, enforcement, runs };
}

/** Maps any alert to the closest test-sheet alert so "Run triage" uses the same simulator flow. */
export function sheetAlertFor(a: Pick<Alert, "source" | "trigger" | "account">): string {
  const direct = workbookAlerts.find((w) => w.account === a.account && (a.source === "Risk Model" ? w.type === "Model" : w.type === "I4C"));
  if (direct) return direct.id;
  const t = a.trigger.toLowerCase();
  if (/job/.test(t)) return "i4c-2";
  if (/arrest/.test(t)) return "i4c-3";
  if (/invest/.test(t)) return "i4c-1";
  if (/debit|pass|mule|withdraw/.test(t)) return "mod-2";
  return a.source === "Risk Model" || a.source === "Fraud / AML Engine" ? "mod-1" : "i4c-1";
}
