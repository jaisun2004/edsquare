// Rule hierarchy: Policy > Rule set (stage) > Rule group > Rule.
import { rules as baseRules, type Rule } from "@/data/edd";
import type { AttrValue } from "@/data/sources";

export type Operator = "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "between" | "in" | "contains" | "exists";
export const OPERATORS: { value: Operator; label: string; types: ("number" | "boolean" | "string")[] }[] = [
  { value: "gt", label: ">", types: ["number"] },
  { value: "gte", label: "≥", types: ["number"] },
  { value: "lt", label: "<", types: ["number"] },
  { value: "lte", label: "≤", types: ["number"] },
  { value: "between", label: "between", types: ["number"] },
  { value: "eq", label: "equals", types: ["number", "boolean", "string"] },
  { value: "neq", label: "not equals", types: ["number", "boolean", "string"] },
  { value: "in", label: "in list", types: ["string"] },
  { value: "contains", label: "contains", types: ["string"] },
  { value: "exists", label: "has a value", types: ["number", "boolean", "string"] },
];

export interface Condition {
  attr: string;
  op: Operator;
  value: AttrValue | AttrValue[];
}
export interface ConditionGroup {
  logic: "AND" | "OR";
  conditions: Condition[];
}

export type Outcome = "Auto clear" | "AI calling" | "Branch referral" | "Block";
export const OUTCOMES: Outcome[] = ["Auto clear", "AI calling", "Branch referral", "Block"];
export type RuleStatus = "Draft" | "Pending approval" | "Active" | "Retired";
export type Stage = "Hard stop" | "Scoring" | "Segmentation" | "Override";
export type Strategy = "first-match" | "highest-priority" | "sum" | "all";
export const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "first-match", label: "First match wins" },
  { value: "highest-priority", label: "Highest priority wins" },
  { value: "sum", label: "Sum of weights" },
  { value: "all", label: "All must fire" },
];

export interface RuleSet {
  id: string;
  name: string;
  stage: Stage;
  order: number;
  strategy: Strategy;
  description: string;
}
export interface RuleGroup {
  id: string;
  setId: string;
  name: string;
  defaultWeight: number;
}
export interface RuleVersion {
  version: number;
  at: string;
  by: string;
  note: string;
}
export interface RuleDef extends Rule {
  groupId: string;
  priority: number;
  description: string;
  conditions: ConditionGroup;
  action: { weight: number; outcome?: Outcome };
  status: RuleStatus;
  version: number;
  author: string;
  dependsOn: string[];
  scope?: Condition;
  history: RuleVersion[];
}

export interface PolicyVersion {
  version: string;
  at: string;
  by: string;
  note: string;
  rules: RuleDef[];
  sets: RuleSet[];
}

export const seedRuleSets: RuleSet[] = [
  { id: "S-HARD", name: "Hard stops", stage: "Hard stop", order: 1, strategy: "first-match", description: "Non-negotiable regulatory and LEA triggers. A match ends evaluation." },
  { id: "S-SCORE", name: "Risk scoring", stage: "Scoring", order: 2, strategy: "sum", description: "Weighted behavioural, identity and intelligence signals build the risk score." },
  { id: "S-SEG", name: "Customer segmentation", stage: "Segmentation", order: 3, strategy: "highest-priority", description: "Routes the customer to Auto clear, AI calling, Branch referral or Block." },
  { id: "S-OV", name: "Overrides", stage: "Override", order: 4, strategy: "first-match", description: "Business exceptions applied last, e.g. low-risk salary accounts." },
];

export const seedRuleGroups: RuleGroup[] = [
  { id: "G-LEA", setId: "S-HARD", name: "Govt / LEA", defaultWeight: 0 },
  { id: "G-BEH", setId: "S-SCORE", name: "Behavioural", defaultWeight: 10 },
  { id: "G-ID", setId: "S-SCORE", name: "Identity / KYC", defaultWeight: 7 },
  { id: "G-NEG", setId: "S-SCORE", name: "Negative Database / OSINT", defaultWeight: 12 },
  { id: "G-VEL", setId: "S-SCORE", name: "Velocity / Geo", defaultWeight: 7 },
  { id: "G-SEG", setId: "S-SEG", name: "Segment routing", defaultWeight: 0 },
  { id: "G-OV", setId: "S-OV", name: "Business exceptions", defaultWeight: 0 },
];

const c = (attr: string, op: Operator, value: Condition["value"]): Condition => ({ attr, op, value });
const and = (...conditions: Condition[]): ConditionGroup => ({ logic: "AND", conditions });
const or = (...conditions: Condition[]): ConditionGroup => ({ logic: "OR", conditions });

const scoringConditions: Record<string, { groupId: string; conditions: ConditionGroup; dependsOn?: string[]; description: string }> = {
  "R-01": { groupId: "G-BEH", conditions: and(c("txn.passThroughPct", "gt", 80)), description: "Most credits leave the account within an hour." },
  "R-02": { groupId: "G-BEH", conditions: and(c("txn.structuringCount24h", "gte", 5)), description: "Repeated credits just below the reporting limit." },
  "R-03": { groupId: "G-BEH", conditions: and(c("txn.uniqueCounterparties7d", "gte", 15)), description: "Many unique payers or payees in a week." },
  "R-04": { groupId: "G-BEH", conditions: and(c("account.dormantDays", "gte", 90), c("txn.credits30d", "gte", 200000)), description: "Long dormancy followed by heavy throughput." },
  "R-05": { groupId: "G-BEH", conditions: and(c("account.vintageDays", "lt", 60), c("txn.credits30d", "gt", 500000)), description: "Young account with unusually high credits." },
  "R-06": { groupId: "G-BEH", conditions: and(c("txn.roundTripCycles48h", "gte", 3)), dependsOn: ["R-03"], description: "Funds cycling between linked accounts. Only counted when fan-in / fan-out also fired." },
  "R-07": { groupId: "G-ID", conditions: and(c("mobile.vintageDays", "lt", 90)), description: "Recently issued SIM." },
  "R-08": { groupId: "G-ID", conditions: and(c("mobile.type", "eq", "Prepaid"), c("txn.credits30d", "gt", 300000)), description: "Prepaid SIM on a high-value account." },
  "R-09": { groupId: "G-ID", conditions: and(c("device.cifsPerDevice", "gte", 3)), description: "Same device used by several customers." },
  "R-10": { groupId: "G-ID", conditions: and(c("upi.handleCount", "gt", 4)), description: "Unusually many UPI handles." },
  "R-11": { groupId: "G-NEG", conditions: and(c("negbase.hit", "eq", true), c("negbase.matchType", "eq", "Exact")), description: "Exact match in the mFilterIt Negative Database." },
  "R-12": { groupId: "G-NEG", conditions: and(c("negbase.matchType", "eq", "Fuzzy"), c("negbase.similarity", "gte", 0.85)), description: "Close match in the Negative Database." },
  "R-13": { groupId: "G-NEG", conditions: and(c("reg.watchlist", "eq", true)), description: "Present on a regulatory watchlist." },
  "R-14": { groupId: "G-NEG", conditions: and(c("osint.adverseMedia", "eq", true)), description: "Credible adverse media found." },
  "R-15": { groupId: "G-NEG", conditions: and(c("scam.channelMentions", "gte", 1)), description: "UPI seen in scam channels (Instagram, Telegram)." },
  "R-16": { groupId: "G-VEL", conditions: and(c("txn.geoCount24h", "gt", 3)), description: "Activity from many locations in a day." },
  "R-17": { groupId: "G-VEL", conditions: and(c("txn.highRiskMcc", "eq", true)), description: "Payments to betting / gaming merchants." },
};

const t0 = new Date(Date.now() - 30 * 86400_000).toISOString();
const firstVersion = (by: string): RuleVersion[] => [{ version: 1, at: t0, by, note: "Initial version" }];

const scoring: RuleDef[] = baseRules.map((r, i) => {
  const def = scoringConditions[r.id] ?? { groupId: "G-BEH", conditions: and(), description: r.threshold };
  return {
    ...r,
    groupId: def.groupId,
    priority: i + 1,
    description: def.description,
    conditions: def.conditions,
    action: { weight: r.weight },
    status: "Active",
    version: 1,
    author: "Policy team",
    dependsOn: def.dependsOn ?? [],
    history: firstVersion("Policy team"),
  };
});

const extra = (
  id: string, name: string, groupId: string, priority: number, conditions: ConditionGroup, outcome: Outcome, description: string,
): RuleDef => ({
  id, name, family: groupId, groupId, priority, conditions, description, threshold: description,
  weight: 0, active: true, action: { weight: 0, outcome }, status: "Active", version: 1, author: "Policy team",
  dependsOn: [], history: firstVersion("Policy team"),
});

export const seedRuleDefs: RuleDef[] = [
  extra("HS-01", "LEA freeze request received", "G-LEA", 1, and(c("lea.freezeRequest", "eq", true)), "Block", "A law-enforcement freeze or lien request exists for the account."),
  extra("HS-02", "Mule Hunter + NCRP corroboration", "G-LEA", 2, and(c("rbih.muleHunterHit", "eq", true), c("ncrp.complaintCount", "gte", 3)), "Block", "RBIH flags the account and 3+ NCRP complaints exist."),
  ...scoring,
  extra("SG-01", "Confirmed mule — block", "G-SEG", 1, and(c("dm.score", "gte", 85), c("negbase.hit", "eq", true)), "Block", "Very high score backed by Negative Database evidence."),
  extra("SG-02", "Victim complaints — branch", "G-SEG", 2, or(c("crm.victimComplaints", "gte", 2), c("ncrp.complaintCount", "gte", 2)), "Branch referral", "Customers with victim complaints go to a bank officer."),
  extra("SG-03", "Medium / high risk — AI calling", "G-SEG", 3, and(c("dm.score", "gte", 35)), "AI calling", "Agentic AI call to verify source of funds."),
  extra("SG-04", "Low risk — auto clear", "G-SEG", 4, and(c("dm.score", "lt", 35)), "Auto clear", "Not a suspected mule."),
  extra("OV-01", "Salary account exception", "G-OV", 1, and(c("account.type", "eq", "Salary"), c("negbase.hit", "eq", false), c("dm.score", "lt", 50)), "Auto clear", "Long-standing salary accounts without negative hits are cleared."),
];

export const BASE_SCORE = { VH: 40, H: 30, M: 20, L: 8 } as const;
