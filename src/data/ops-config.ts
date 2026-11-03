// Source-driven operations config: alert feeds, per-feed process flow and queue prioritisation.
import type { Alert } from "@/data/edd";
import { defaultThresholds, type Thresholds } from "@/lib/edd-flow";

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
/** Which policy rule sets the Data checks block runs, and the score bands the call / questionnaire blocks use. */
export interface FeedDecision { ruleSets: string[]; thresholds: Thresholds }
export interface FeedFlow { feed: FeedId; slaMin: number; desk: string; blocks: FlowBlock[]; decision: FeedDecision }
const DEFAULT_SETS: Record<FeedId, string[]> = { I4C: ["S-HARD", "S-SCORE"], NPCI: ["S-HARD", "S-SCORE", "S-SEG"], MODEL: ["S-SCORE", "S-SEG", "S-OV"], NEGBASE: ["S-SCORE", "S-SEG"] };
export const defaultDecision = (feed: FeedId): FeedDecision => ({ ruleSets: [...(DEFAULT_SETS[feed] ?? [])], thresholds: { ...defaultThresholds } });
/** Blocks that make a decision: 0 = data checks (runs rule sets), 1 = call scoring, 2 = questionnaire scoring. */
export const DECISION_BLOCKS: Record<string, "checks" | "score"> = { "Data checks": "checks", "Customer contact (voice)": "score", "Questionnaire (WhatsApp)": "score" };

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
export function migrateFlow(f: Partial<FeedFlow> & { feed: FeedId; steps?: FlowStep[] }): FeedFlow {
  const d = defaultDecision(f.feed);
  const decision: FeedDecision = { ruleSets: f.decision?.ruleSets ?? d.ruleSets, thresholds: { ...d.thresholds, ...(f.decision?.thresholds ?? {}) } };
  const { steps, ...rest } = f;
  const blocks = Array.isArray(f.blocks) ? f.blocks : groupSteps(steps ?? []);
  return { slaMin: 60, desk: "", ...rest, blocks, decision } as FeedFlow;
}
export const flattenSteps = (f: FeedFlow): FlowStep[] => f.blocks.filter((b) => b.enabled).flatMap((b) => b.steps.filter((x) => x.enabled));

const flow = (feed: FeedId, slaMin: number, desk: string, steps: FlowStep[]): FeedFlow => ({ feed, slaMin, desk, blocks: groupSteps(steps), decision: defaultDecision(feed) });
export const defaultFlows: FeedFlow[] = [
  flow("I4C", 30, "Nodal / LEA desk", [s("lien"), s("negbase"), s("data_checks"), s("voice", "always", { retries: 3 }), s("whatsapp", "prev_no_response", { waitMin: 60 }), s("email_app", "prev_no_response"), s("human_decision")]),
  flow("NPCI", 15, "Switch operations", [s("vpa_cooling"), s("negbase"), s("whatsapp", "amount_lt", { amount: 25000, waitMin: 10 }), s("voice", "prev_no_response", { retries: 2 }), s("manual_review", "prev_no_response"), s("human_decision")]),
  flow("MODEL", 240, "EDD analysts", [s("negbase"), s("data_checks"), s("voice", "prev_red", { retries: 3 }), s("whatsapp", "prev_no_response", { waitMin: 120 }), s("email_app", "prev_no_response"), s("manual_review", "prev_no_response"), s("human_decision")]),
  flow("NEGBASE", 120, "Threat intel desk", [s("negbase"), s("data_checks"), s("voice", "always", { retries: 2 }), s("whatsapp", "prev_no_response", { waitMin: 60 }), s("manual_review", "prev_no_response"), s("human_decision")]),
];

export interface QueueWeights { risk: number; sla: number; source: number; age: number }

/** Per-source queue: what comes first, who works it, when it escalates. */
export type FeedFactor = "risk" | "sla" | "amount" | "age" | "negHits";
export type FeedWeights = Record<FeedFactor, number>;
export type PresetId = "deadline" | "money" | "risk" | "repeat" | "custom";
export const PRESETS: Record<Exclude<PresetId, "custom">, { label: string; weights: FeedWeights }> = {
  deadline: { label: "Deadline first", weights: { sla: 3, amount: 2, risk: 1, age: 0, negHits: 0 } },
  money: { label: "Fastest money first", weights: { amount: 3, sla: 2, risk: 1, age: 0, negHits: 0 } },
  risk: { label: "Riskiest first", weights: { risk: 3, age: 2, sla: 1, amount: 0, negHits: 0 } },
  repeat: { label: "Repeat offenders first", weights: { negHits: 3, risk: 2, sla: 1, amount: 0, age: 0 } },
};
export type DistMode = "round_robin" | "least_loaded" | "skill" | "pull";
export const DIST_LABELS: Record<DistMode, string> = {
  round_robin: "Round robin (take turns)",
  least_loaded: "Least busy first",
  skill: "Skill / language match",
  pull: "Pick from queue (people pull work)",
};
export interface Member { name: string; role: "analyst" | "investigator" | "supervisor"; cap: number; langs: string[]; senior: boolean }
export type EscTrigger = "unassigned_min" | "sla_pct" | "sla_breached" | "at_capacity" | "high_risk_idle";
export type EscAction = "notify" | "reassign" | "move_desk" | "raise_priority";
export const ESC_TRIGGER_LABELS: Record<EscTrigger, string> = {
  unassigned_min: "If unassigned for (min)",
  sla_pct: "If share of SLA used reaches (%)",
  sla_breached: "If SLA is breached",
  at_capacity: "If the assignee is at capacity",
  high_risk_idle: "If high risk and no action for (min)",
};
export const ESC_ACTION_LABELS: Record<EscAction, string> = { notify: "notify", reassign: "reassign to", move_desk: "move to desk", raise_priority: "raise priority" };
export interface EscLevel { id: string; trigger: EscTrigger; value?: number; action: EscAction; target: string }
export interface FeedQueue {
  preset: PresetId;
  weights: FeedWeights;
  overrides: { breachedTop: boolean; amountTopGte?: number | undefined };
  distribution: { mode: DistMode; members: Member[]; seniorOnlyVH: boolean };
  escalation: EscLevel[];
}
const m = (name: string, role: Member["role"], cap: number, senior = false, langs = ["English", "Hindi"]): Member => ({ name, role, cap, langs, senior });
export const defaultPerFeed: Record<FeedId, FeedQueue> = {
  I4C: { preset: "deadline", weights: PRESETS.deadline.weights, overrides: { breachedTop: true, amountTopGte: 100000 },
    distribution: { mode: "least_loaded", members: [m("Arjun Rao", "investigator", 6, true), m("Priya Nair", "analyst", 8)], seniorOnlyVH: true },
    escalation: [{ id: "e1", trigger: "unassigned_min", value: 10, action: "reassign", target: "Supervisor" }, { id: "e2", trigger: "sla_pct", value: 80, action: "notify", target: "Supervisor" }, { id: "e3", trigger: "sla_breached", action: "notify", target: "Nodal officer" }] },
  NPCI: { preset: "money", weights: PRESETS.money.weights, overrides: { breachedTop: true },
    distribution: { mode: "round_robin", members: [m("Priya Nair", "analyst", 10), m("Arjun Rao", "investigator", 6, true)], seniorOnlyVH: false },
    escalation: [{ id: "e1", trigger: "unassigned_min", value: 5, action: "reassign", target: "Supervisor" }, { id: "e2", trigger: "sla_breached", action: "raise_priority", target: "Switch operations" }] },
  MODEL: { preset: "risk", weights: PRESETS.risk.weights, overrides: { breachedTop: false },
    distribution: { mode: "pull", members: [m("Priya Nair", "analyst", 12), m("Arjun Rao", "investigator", 8, true)], seniorOnlyVH: true },
    escalation: [{ id: "e1", trigger: "sla_pct", value: 75, action: "notify", target: "Supervisor" }, { id: "e2", trigger: "sla_breached", action: "reassign", target: "Investigator" }] },
  NEGBASE: { preset: "repeat", weights: PRESETS.repeat.weights, overrides: { breachedTop: true },
    distribution: { mode: "skill", members: [m("Arjun Rao", "investigator", 8, true), m("Priya Nair", "analyst", 8, false, ["English"])], seniorOnlyVH: false },
    escalation: [{ id: "e1", trigger: "high_risk_idle", value: 60, action: "move_desk", target: "Nodal / LEA desk" }, { id: "e2", trigger: "sla_breached", action: "notify", target: "Supervisor" }] },
};

export interface QueueConfig { weights: QueueWeights; feedPriority: Record<FeedId, number>; perFeed: Record<FeedId, FeedQueue> }
export const defaultQueue: QueueConfig = {
  weights: { risk: 40, sla: 30, source: 20, age: 10 },
  feedPriority: { I4C: 100, NPCI: 80, NEGBASE: 60, MODEL: 40 },
  perFeed: defaultPerFeed,
};
/** Fills in per-source settings missing from older saved configs. */
export const migrateQueue = (q: Partial<QueueConfig> | undefined): QueueConfig => ({
  ...defaultQueue, ...q, perFeed: { ...defaultPerFeed, ...(q?.perFeed ?? {}) },
});
