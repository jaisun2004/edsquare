import type { Alert, EDDCase, EnforcementEntry } from "@/data/edd";
import type { DemoRun } from "@/lib/demo-runs";

export type StepState = "red" | "amber" | "green" | "skip" | "pending";
export type AlertResult = "New" | "Case open" | "System blocked" | "Blocked" | "Unblocked" | "Verified" | "Dismissed";
export const RESULTS: AlertResult[] = ["New", "Case open", "System blocked", "Blocked", "Unblocked", "Verified", "Dismissed"];

export interface JourneyStep { key: "checks" | "voice" | "whatsapp" | "case" | "decision"; label: string; state: StepState; detail: string }
export interface Journey { result: AlertResult; steps: JourneyStep[]; run?: DemoRun | undefined; caseItem?: EDDCase | undefined; enforcement?: EnforcementEntry | undefined; blockReason?: string | undefined }

/** Derives what happened to an alert from its case, enforcement entries and demo run. */
export function alertJourney(alert: Alert, cases: EDDCase[], enforcement: EnforcementEntry[], runs: DemoRun[]): Journey {
  const run = runs.find((r) => r.alertId === alert.id);
  const caseId = alert.caseId ?? run?.caseId;
  const caseItem = caseId ? cases.find((c) => c.id === caseId) : undefined;
  const enf = caseId ? enforcement.find((e) => e.caseId === caseId) : undefined;
  const decision = enf?.action ?? (caseItem?.decision?.outcome === "Block" || caseItem?.decision?.outcome === "Unblock" ? caseItem.decision.outcome : undefined);

  let result: AlertResult;
  if (alert.status === "Dismissed") result = "Dismissed";
  else if (decision === "Block") result = "Blocked";
  else if (decision === "Unblock") result = "Unblocked";
  else if (caseId && run && run.colour !== "Green") result = "System blocked";
  else if (caseId) result = "Case open";
  else if (run && run.colour === "Green") result = "Verified";
  else result = "New";

  const engaged = !!run && (run.callAttempts > 0 || run.whatsappSent);
  const touched = result !== "New" && result !== "Dismissed";
  const steps: JourneyStep[] = [
    {
      key: "checks", label: "Data checks",
      state: !touched && !run ? "pending" : run && caseId && !engaged ? "red" : run ? "amber" : "green",
      detail: run && caseId && !engaged ? "Check fired: blocked at Step 1" : touched || run ? "Checks run" : "Not run yet",
    },
    {
      key: "voice", label: "Voice call",
      state: !run || run.callAttempts === 0 ? "skip" : run.callAnswered ? "green" : "red",
      detail: !run || run.callAttempts === 0 ? "No call" : run.callAnswered ? "Customer answered" : `Not answered (${run.callAttempts})`,
    },
    {
      key: "whatsapp", label: "WhatsApp",
      state: !run?.whatsappSent ? "skip" : run.formSubmitted ? "green" : "amber",
      detail: !run?.whatsappSent ? "Not sent" : run.formSubmitted ? "Form submitted" : "Sent, no reply",
    },
    { key: "case", label: "Case", state: caseId ? "amber" : "skip", detail: caseId ?? "No case" },
    {
      key: "decision", label: "Decision",
      state: decision === "Block" ? "red" : decision === "Unblock" || result === "Verified" ? "green" : result === "Dismissed" ? "skip" : "pending",
      detail: decision ? `${decision === "Block" ? "Blocked" : "Unblocked"}${enf ? ` by ${enf.decidedBy}` : ""}` : result === "Verified" ? "Verified by customer, freeze lifted" : result === "Dismissed" ? "Dismissed" : "Awaiting decision",
    },
  ];
  const blockReason = result === "System blocked" && run ? systemBlockReason(run) : result === "Blocked" ? (enf?.reason ?? caseItem?.decision?.reason) : undefined;
  return { result, steps, run, caseItem, enforcement: enf, blockReason };
}

/** Why the engine held the account blocked (no human decision yet). */
export function systemBlockReason(run: DemoRun): string {
  const engaged = run.callAttempts > 0 || run.whatsappSent;
  const base = !engaged ? "Failed data checks at Step 1"
    : run.colour === "Manual" ? "No customer response on call, WhatsApp, email and app alert"
    : run.colour === "Red" ? "High-risk answers during customer verification"
    : "Medium-risk answers, needs human review";
  return run.outcome ? `${base}: ${run.outcome}` : base;
}

export function countResults(journeys: Journey[]): Record<AlertResult, number> {
  const out = Object.fromEntries(RESULTS.map((r) => [r, 0])) as Record<AlertResult, number>;
  for (const j of journeys) out[j.result] += 1;
  return out;
}
