// Pure links between Decision Manager parts: source -> feed workflow -> block -> rule sets -> rules -> fields.
import type { RuleDef, RuleGroup, RuleSet, Condition } from "@/data/policy";
import type { Attribute, DataSource } from "@/data/sources";
import { FEEDS, blockOfKind, type FeedFlow, type FeedId } from "@/data/ops-config";

/** Rule sets run in the first (checks) block: any enabled check step (lien, VPA cooling, Negative DB, data checks). */
const checksOn = (f: FeedFlow) => f.blocks.some((b) => b.enabled && b.steps.some((s) => s.enabled && blockOfKind[s.kind] === 0));

/** Rule sets that actually run for a feed (empty if its Data checks step is switched off). */
export const activeSets = (f: FeedFlow): string[] => (checksOn(f) ? f.decision.ruleSets : []);

/** Feeds that run each rule set. */
export function setUsage(flows: FeedFlow[]): Record<string, FeedId[]> {
  const out: Record<string, FeedId[]> = {};
  for (const f of flows) for (const id of activeSets(f)) (out[id] ??= []).push(f.feed);
  return out;
}

/** Feeds that run each rule (through its group's rule set). */
export function ruleUsage(flows: FeedFlow[], rules: RuleDef[], groups: RuleGroup[]): Record<string, FeedId[]> {
  const sets = setUsage(flows);
  const out: Record<string, FeedId[]> = {};
  for (const r of rules) {
    const setId = groups.find((g) => g.id === r.groupId)?.setId;
    out[r.id] = setId ? sets[setId] ?? [] : [];
  }
  return out;
}

const conds = (r: RuleDef): Condition[] => [...r.conditions.conditions, ...(r.scope ? [r.scope] : [])];

/** Data source ids whose fields a rule reads (computed fields like dm.score are skipped when unknown). */
export function ruleSources(r: RuleDef, attributes: Attribute[]): string[] {
  const ids = new Set<string>();
  for (const c of conds(r)) { const a = attributes.find((x) => x.key === c.attr); if (a) ids.add(a.sourceId); }
  return [...ids];
}

export interface Warning { level: "warn" | "info"; text: string; to: "/admin/rules" | "/admin/policy" | "/admin/workflows" | "/admin/sources" }

export function healthWarnings(flows: FeedFlow[], rules: RuleDef[], groups: RuleGroup[], sets: RuleSet[], attributes: Attribute[], sources: DataSource[]): Warning[] {
  const w: Warning[] = [];
  const used = ruleUsage(flows, rules, groups);
  const unused = rules.filter((r) => r.active && r.status === "Active" && !(used[r.id]?.length));
  if (unused.length) w.push({ level: "warn", text: `${unused.length} active rule(s) not used by any workflow`, to: "/admin/rules" });
  const su = setUsage(flows);
  const idle = sets.filter((s) => !su[s.id]?.length);
  for (const s of idle) w.push({ level: "info", text: `Rule set "${s.name}" is not linked to any workflow`, to: "/admin/policy" });
  for (const f of flows) {
    if (checksOn(f) && f.decision.ruleSets.length === 0) w.push({ level: "warn", text: `${FEEDS.find((x) => x.id === f.feed)?.short ?? f.feed}: Data checks has no rule set`, to: "/admin/workflows" });
    const t = f.decision.thresholds;
    if (t.flagReview > t.flagBlock) w.push({ level: "warn", text: `${f.feed}: review band starts above the block band`, to: "/admin/workflows" });
  }
  const known = new Set(attributes.map((a) => a.key));
  const missing = new Set<string>();
  for (const r of rules) if (r.active) for (const c of conds(r)) if (!known.has(c.attr) && !c.attr.startsWith("dm.")) missing.add(c.attr);
  if (missing.size) w.push({ level: "warn", text: `Rules use ${missing.size} field(s) no data source provides: ${[...missing].join(", ")}`, to: "/admin/sources" });
  const down = sources.filter((s) => s.status && s.health === "Down");
  for (const s of down) w.push({ level: "warn", text: `Data source "${s.name}" is down; its rules cannot fire`, to: "/admin/sources" });
  return w;
}

/** Plain band text for a feed's score bands, e.g. "over 10 keep blocked · 8-10 review · below 8 unblock". */
export const bandText = (f: FeedFlow) => {
  const t = f.decision.thresholds;
  return `over ${t.flagBlock} keep blocked · ${t.flagReview}-${t.flagBlock} review · below ${t.flagReview} unblock`;
};
