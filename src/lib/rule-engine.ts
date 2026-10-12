// Pure Decision Manager engine: evaluates the rule hierarchy against attribute values.
import type { RiskGrade, Recommendation } from "@/data/edd";
import { BASE_SCORE, OPERATORS, type Condition, type Outcome, type RuleDef, type RuleGroup, type RuleSet } from "@/data/policy";
import type { AttrMap, AttrValue, Attribute, DataSource } from "@/data/sources";

export interface CondResult {
  cond: Condition;
  actual?: AttrValue;
  pass: boolean;
  missing: boolean;
}
export interface RuleResult {
  rule: RuleDef;
  fired: boolean;
  matches: CondResult[];
  skipped?: string;
}
export interface StageTrace {
  set: RuleSet;
  results: RuleResult[];
  applied: RuleResult[];
  scoreAfter: number;
  note: string;
}
export interface PolicyResult {
  score: number;
  outcome: Outcome;
  recommendation: Recommendation;
  stages: StageTrace[];
  fired: RuleResult[];
  hardStop: boolean;
}

export function availableAttrs(values: AttrMap, sources: DataSource[], attributes: Attribute[]): AttrMap {
  const on = new Set(sources.filter((s) => s.status).map((s) => s.id));
  const out: AttrMap = {};
  for (const a of attributes) {
    if (on.has(a.sourceId) && values[a.key] !== undefined) out[a.key] = values[a.key]!;
  }
  return out;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v));

export function evaluateCondition(cond: Condition, attrs: AttrMap): CondResult {
  const actual = attrs[cond.attr];
  if (actual === undefined) return { cond, pass: false, missing: true };
  const v = cond.value;
  let pass = false;
  switch (cond.op) {
    case "gt": pass = num(actual) > num(v); break;
    case "gte": pass = num(actual) >= num(v); break;
    case "lt": pass = num(actual) < num(v); break;
    case "lte": pass = num(actual) <= num(v); break;
    case "between": {
      const [a, b] = Array.isArray(v) ? v : [v, v];
      pass = num(actual) >= num(a) && num(actual) <= num(b);
      break;
    }
    case "eq": pass = String(actual).toLowerCase() === String(v).toLowerCase(); break;
    case "neq": pass = String(actual).toLowerCase() !== String(v).toLowerCase(); break;
    case "in": pass = (Array.isArray(v) ? v : String(v).split(",")).map((x) => String(x).trim().toLowerCase()).includes(String(actual).toLowerCase()); break;
    case "contains": pass = String(actual).toLowerCase().includes(String(v).toLowerCase()); break;
    case "exists": pass = actual !== "" && actual !== "None"; break;
  }
  return { cond, actual, pass, missing: false };
}

export function evaluateRule(rule: RuleDef, attrs: AttrMap, firedIds: Set<string> = new Set()): RuleResult {
  const unmet = rule.dependsOn.filter((d) => !firedIds.has(d));
  if (unmet.length) return { rule, fired: false, matches: [], skipped: `Waits on ${unmet.join(", ")}` };
  if (rule.scope && !evaluateCondition(rule.scope, attrs).pass) return { rule, fired: false, matches: [], skipped: "Outside rule scope" };
  const matches = rule.conditions.conditions.map((cond) => evaluateCondition(cond, attrs));
  if (!matches.length) return { rule, fired: false, matches };
  const fired = rule.conditions.logic === "AND" ? matches.every((m) => m.pass) : matches.some((m) => m.pass);
  return { rule, fired, matches };
}

export const toRecommendation = (o: Outcome): Recommendation =>
  o === "Block" ? "Block" : o === "Auto clear" ? "Unblock" : "Further Investigation";

export function runPolicy(
  attrs: AttrMap,
  rules: RuleDef[],
  sets: RuleSet[],
  groups: RuleGroup[],
  prior: RiskGrade,
): PolicyResult {
  const live = rules.filter((r) => r.active && r.status === "Active");
  const groupSet = new Map(groups.map((g) => [g.id, g.setId]));
  let score: number = BASE_SCORE[prior];
  let outcome: Outcome | undefined;
  let hardStop = false;
  const firedIds = new Set<string>();
  const stages: StageTrace[] = [];

  for (const set of [...sets].sort((a, b) => a.order - b.order)) {
    const inSet = live.filter((r) => groupSet.get(r.groupId) === set.id).sort((a, b) => a.priority - b.priority);
    if (hardStop) {
      stages.push({ set, results: [], applied: [], scoreAfter: score, note: "Skipped — hard stop already decided the outcome" });
      continue;
    }
    const results: RuleResult[] = [];
    for (const r of inSet) {
      const res = evaluateRule(r, { ...attrs, "dm.score": Math.min(99, score) }, firedIds);
      results.push(res);
      if (res.fired) firedIds.add(r.id);
    }
    const fired = results.filter((r) => r.fired);
    let applied: RuleResult[] = [];
    if (set.strategy === "sum") applied = fired;
    else if (set.strategy === "all") applied = fired.length && fired.length === results.length ? fired : [];
    else applied = fired.slice(0, 1);

    score += applied.reduce((s, r) => s + r.rule.action.weight, 0);
    const decided = [...applied].reverse().find((r) => r.rule.action.outcome);
    if (decided?.rule.action.outcome) {
      outcome = decided.rule.action.outcome;
      if (set.stage === "Hard stop") hardStop = true;
    }
    stages.push({
      set,
      results,
      applied,
      scoreAfter: Math.min(99, score),
      note: applied.length
        ? `${applied.length} rule${applied.length > 1 ? "s" : ""} applied${decided ? ` → ${decided.rule.action.outcome}` : ""}`
        : "No rule applied",
    });
  }

  score = Math.min(99, Math.round(score));
  const finalOutcome: Outcome = outcome ?? (score >= 35 ? "AI calling" : "Auto clear");
  return {
    score,
    outcome: finalOutcome,
    recommendation: toRecommendation(finalOutcome),
    stages,
    fired: stages.flatMap((s) => s.applied),
    hardStop,
  };
}

// ---------- read-back and checks ----------

const opLabel = (op: string) => OPERATORS.find((o) => o.value === op)?.label ?? op;

export function describeCondition(cond: Condition, attributes: Attribute[]) {
  const label = attributes.find((a) => a.key === cond.attr)?.label ?? cond.attr;
  if (cond.op === "exists") return `${label} has a value`;
  const value = Array.isArray(cond.value) ? cond.value.join(cond.op === "between" ? " and " : ", ") : String(cond.value);
  return `${label} ${opLabel(cond.op)} ${value}`;
}

export function describeRule(rule: Pick<RuleDef, "conditions" | "action">, attributes: Attribute[]) {
  const parts = rule.conditions.conditions.map((c) => describeCondition(c, attributes));
  const when = parts.length ? parts.join(rule.conditions.logic === "AND" ? " and " : " or ") : "(no conditions)";
  const then = [rule.action.weight ? `add ${rule.action.weight} to the risk score` : "", rule.action.outcome ? `route to ${rule.action.outcome}` : ""]
    .filter(Boolean)
    .join(" and ");
  return `If ${when}, then ${then || "do nothing"}.`;
}

export interface Finding {
  ruleId: string;
  level: "error" | "warning" | "info";
  message: string;
}

const conditionKey = (r: RuleDef) =>
  r.conditions.logic + JSON.stringify([...r.conditions.conditions].map((c) => [c.attr, c.op, c.value]).sort());

export function checkRule(
  rule: RuleDef,
  all: RuleDef[],
  attributes: Attribute[],
  sources: DataSource[],
  sample: AttrMap[],
): Finding[] {
  const out: Finding[] = [];
  const srcOn = new Map(sources.map((s) => [s.id, s]));
  if (!rule.conditions.conditions.length) out.push({ ruleId: rule.id, level: "error", message: "Rule has no conditions." });
  for (const c of rule.conditions.conditions) {
    const attr = attributes.find((a) => a.key === c.attr);
    if (!attr) out.push({ ruleId: rule.id, level: "error", message: `“${c.attr}” is not provided by any data source.` });
    else if (srcOn.get(attr.sourceId) && !srcOn.get(attr.sourceId)!.status)
      out.push({ ruleId: rule.id, level: "warning", message: `${attr.label} comes from ${srcOn.get(attr.sourceId)!.name}, which is switched off.` });
  }
  for (const d of rule.dependsOn) if (!all.some((r) => r.id === d)) out.push({ ruleId: rule.id, level: "error", message: `Depends on missing rule ${d}.` });
  const key = conditionKey(rule);
  for (const other of all) {
    if (other.id === rule.id || other.status === "Retired") continue;
    if (conditionKey(other) === key) {
      if ((other.action.outcome ?? "") !== (rule.action.outcome ?? ""))
        out.push({ ruleId: rule.id, level: "error", message: `Conflicts with ${other.id}: same conditions, different outcome.` });
      else out.push({ ruleId: rule.id, level: "warning", message: `Duplicates ${other.id} (${other.name}).` });
    } else {
      const shared = rule.conditions.conditions.filter((c) => other.conditions.conditions.some((o) => o.attr === c.attr && o.op === c.op));
      if (shared.length && shared.length === rule.conditions.conditions.length && rule.conditions.conditions.length === other.conditions.conditions.length)
        out.push({ ruleId: rule.id, level: "info", message: `Overlaps with ${other.id} on the same attributes with different thresholds.` });
    }
  }
  if (sample.length && rule.conditions.conditions.length && !sample.some((s) => evaluateRule({ ...rule, dependsOn: [] }, s).fired))
    out.push({ ruleId: rule.id, level: "info", message: `Would not fire on any of the ${sample.length} sample alerts.` });
  return out;
}
