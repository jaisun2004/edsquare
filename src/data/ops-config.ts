// Source-driven operations config: alert feeds, per-feed process flow and queue prioritisation.
import type { Alert } from "@/data/edd";

export type FeedId = "I4C" | "NPCI" | "MODEL" | "NEGBASE";

export interface Feed { id: FeedId; name: string; short: string; description: string }
export const FEEDS: Feed[] = [
  { id: "I4C", name: "I4C / NCRP complaints", short: "I4C", description: "Victim complaints from the 1930 helpline and cyber crime portal. Funds must be held fast." },
  { id: "NPCI", name: "NPCI switch alerts", short: "NPCI", description: "UPI / IMPS velocity and mule-pattern alerts from the payment switch." },
  { id: "MODEL", name: "Bank model & AML alerts", short: "Model", description: "Internal mule model, AML monitoring and core banking pattern alerts." },
  { id: "NEGBASE", name: "mFilterIt threat intelligence", short: "Threat intel", description: "Negative Database and scam-channel hits found before any complaint." },
];
export const feedName = (id: FeedId) => FEEDS.find((f) => f.id === id)?.name ?? id;

const bySource: Record<Alert["source"], FeedId> = {
  "Negative Database": "NEGBASE",
  "External Intelligence": "NEGBASE",
  "CRM Complaint": "I4C",
  "Fraud / AML Engine": "MODEL",
  "Risk Model": "MODEL",
};
/** Which feed an alert came from: explicit feed first, else derived from its source. */
export const feedOf = (a: Pick<Alert, "source"> & { feed?: FeedId | undefined; trigger?: string | undefined }): FeedId =>
  a.feed ?? (a.trigger && /\bI4C\b/.test(a.trigger) ? "I4C" : bySource[a.source]);

export type StepKind = "lien" | "vpa_cooling" | "negbase" | "data_checks" | "voice" | "whatsapp" | "email_app" | "manual_review" | "human_decision";
export const STEP_LABELS: Record<StepKind, string> = {
  lien: "Hold disputed amount (lien)",
  vpa_cooling: "Cool UPI handle",
  negbase: "Negative Database lookup",
  data_checks: "Core banking data checks",
  voice: "AI voice call",
  whatsapp: "WhatsApp questionnaire",
  email_app: "Email & app alert",
  manual_review: "Manual review queue",
  human_decision: "Human decision",
};
export const STEP_KINDS = Object.keys(STEP_LABELS) as StepKind[];

/** When a step runs. */
export type Trigger = "always" | "prev_no_response" | "prev_red" | "prev_failed" | "amount_gte" | "amount_lt";
export const TRIGGER_LABELS: Record<Trigger, string> = {
  always: "Always",
  prev_no_response: "If previous step got no response",
  prev_red: "If checks / score are not clean",
  prev_failed: "If previous step / block failed",
  amount_gte: "If amount is at least",
  amount_lt: "If amount is below",
};

export interface FlowStep { id: string; kind: StepKind; enabled: boolean; trigger: Trigger; amount?: number; retries?: number; waitMin?: number }
export interface FlowBlock { id: string; name: string; enabled: boolean; trigger: Trigger; amount?: number; steps: FlowStep[] }
export interface FeedFlow { feed: FeedId; slaMin: number; desk: string; blocks: FlowBlock[] }

/** Default blocks, in scenario-sheet order (same groups as the Demo Simulator). */
export const BLOCK_NAMES = ["Data checks", "Customer contact (voice)", "Questionnaire (WhatsApp)", "Email & app alert", "Exit / manual review", "Human review"] as const;
export const blockOfKind: Record<StepKind, number> = { lien: 0, vpa_cooling: 0, negbase: 0, data_checks: 0, voice: 1, whatsapp: 2, email_app: 3, manual_review: 4, human_decision: 5 };

let n = 0;
let bn = 0;
const s = (kind: StepKind, trigger: Trigger = "always", extra: Partial<FlowStep> = {}): FlowStep => ({ id: `st-${++n}`, kind, enabled: true, trigger, ...extra });

/** Groups a flat step list into blocks; a block takes the trigger of its first step. Keeps first-seen block order. */
export function groupSteps(steps: FlowStep[]): FlowBlock[] {
  const out: FlowBlock[] = [];
  for (const st of steps) {
    const name: string = BLOCK_NAMES[blockOfKind[st.kind]] ?? "Steps";
    const last = out[out.length - 1];
    if (last && last.name === name) { last.steps.push({ ...st, trigger: "always" }); continue; }
    const { amount, ...rest } = st;
    out.push({ id: `bl-${++bn}`, name, enabled: true, trigger: st.trigger, ...(amount !== undefined ? { amount } : {}), steps: [{ ...rest, trigger: "always" }] });
  }
  return out;
}
/** Accepts saved flows in the old flat-steps shape and returns block-based flows. */
export function migrateFlow(f: FeedFlow | (Omit<FeedFlow, "blocks"> & { steps: FlowStep[] })): FeedFlow {
  if ("blocks" in f && Array.isArray(f.blocks)) return f;
  const { steps, ...rest } = f as Omit<FeedFlow, "blocks"> & { steps: FlowStep[] };
  return { ...rest, blocks: groupSteps(steps ?? []) };
}
export const flattenSteps = (f: FeedFlow): FlowStep[] => f.blocks.filter((b) => b.enabled).flatMap((b) => b.steps.filter((x) => x.enabled));

const flow = (feed: FeedId, slaMin: number, desk: string, steps: FlowStep[]): FeedFlow => ({ feed, slaMin, desk, blocks: groupSteps(steps) });
export const defaultFlows: FeedFlow[] = [
  flow("I4C", 30, "Nodal / LEA desk", [s("lien"), s("negbase"), s("data_checks"), s("voice", "always", { retries: 3 }), s("whatsapp", "prev_no_response", { waitMin: 60 }), s("email_app", "prev_no_response"), s("human_decision")]),
  flow("NPCI", 15, "Switch operations", [s("vpa_cooling"), s("negbase"), s("whatsapp", "amount_lt", { amount: 25000, waitMin: 10 }), s("voice", "prev_no_response", { retries: 2 }), s("manual_review", "prev_no_response"), s("human_decision")]),
  flow("MODEL", 240, "EDD analysts", [s("negbase"), s("data_checks"), s("voice", "prev_red", { retries: 3 }), s("whatsapp", "prev_no_response", { waitMin: 120 }), s("email_app", "prev_no_response"), s("manual_review", "prev_no_response"), s("human_decision")]),
  flow("NEGBASE", 120, "Threat intel desk", [s("negbase"), s("data_checks"), s("voice", "always", { retries: 2 }), s("whatsapp", "prev_no_response", { waitMin: 60 }), s("manual_review", "prev_no_response"), s("human_decision")]),
];

export interface QueueWeights { risk: number; sla: number; source: number; age: number }
export interface QueueConfig { weights: QueueWeights; feedPriority: Record<FeedId, number> }
export const defaultQueue: QueueConfig = {
  weights: { risk: 40, sla: 30, source: 20, age: 10 },
  feedPriority: { I4C: 100, NPCI: 80, NEGBASE: 60, MODEL: 40 },
};
