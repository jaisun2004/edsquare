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
export type Trigger = "always" | "prev_no_response" | "prev_red" | "amount_gte" | "amount_lt";
export const TRIGGER_LABELS: Record<Trigger, string> = {
  always: "Always",
  prev_no_response: "If previous step got no response",
  prev_red: "If checks / score are not clean",
  amount_gte: "If amount is at least",
  amount_lt: "If amount is below",
};

export interface FlowStep { id: string; kind: StepKind; enabled: boolean; trigger: Trigger; amount?: number; retries?: number; waitMin?: number }
export interface FeedFlow { feed: FeedId; slaMin: number; desk: string; steps: FlowStep[] }

let n = 0;
const s = (kind: StepKind, trigger: Trigger = "always", extra: Partial<FlowStep> = {}): FlowStep => ({ id: `st-${++n}`, kind, enabled: true, trigger, ...extra });

export const defaultFlows: FeedFlow[] = [
  { feed: "I4C", slaMin: 30, desk: "Nodal / LEA desk", steps: [s("lien"), s("negbase"), s("data_checks"), s("voice", "always", { retries: 3 }), s("whatsapp", "prev_no_response", { waitMin: 60 }), s("email_app", "prev_no_response"), s("human_decision")] },
  { feed: "NPCI", slaMin: 15, desk: "Switch operations", steps: [s("vpa_cooling"), s("negbase"), s("whatsapp", "amount_lt", { amount: 25000, waitMin: 10 }), s("voice", "prev_no_response", { retries: 2 }), s("manual_review", "prev_no_response"), s("human_decision")] },
  { feed: "MODEL", slaMin: 240, desk: "EDD analysts", steps: [s("negbase"), s("data_checks"), s("voice", "prev_red", { retries: 3 }), s("whatsapp", "prev_no_response", { waitMin: 120 }), s("email_app", "prev_no_response"), s("manual_review", "prev_no_response"), s("human_decision")] },
  { feed: "NEGBASE", slaMin: 120, desk: "Threat intel desk", steps: [s("negbase"), s("data_checks"), s("voice", "always", { retries: 2 }), s("whatsapp", "prev_no_response", { waitMin: 60 }), s("manual_review", "prev_no_response"), s("human_decision")] },
];

export interface QueueWeights { risk: number; sla: number; source: number; age: number }
export interface QueueConfig { weights: QueueWeights; feedPriority: Record<FeedId, number> }
export const defaultQueue: QueueConfig = {
  weights: { risk: 40, sla: 30, source: 20, age: 10 },
  feedPriority: { I4C: 100, NPCI: 80, NEGBASE: 60, MODEL: 40 },
};
