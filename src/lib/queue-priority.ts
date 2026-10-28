import type { EscLevel, FeedFactor, FeedId, FeedQueue, Member, QueueConfig } from "@/data/ops-config";
import { ESC_ACTION_LABELS } from "@/data/ops-config";

export interface PriorityInput {
  riskScore: number; slaDueAt: string; openedAt: string; feed: FeedId;
  amount?: number | undefined; negHits?: number | undefined; assignee?: string | undefined; grade?: string | undefined;
}
export interface PriorityResult { score: number; pinned: string | undefined; parts: { risk: number; sla: number; source: number; age: number } }

const clamp = (v: number) => Math.max(0, Math.min(1, v));
const H = 3600_000;

/** 0-100 cross-queue score from weighted factors. SLA: overdue = 1, 24h+ left = 0. Age: 48h+ waiting = 1. */
export function priorityScore(c: PriorityInput, cfg: QueueConfig, now = Date.now()): PriorityResult {
  const w = cfg.weights;
  const total = w.risk + w.sla + w.source + w.age || 1;
  const hoursLeft = (new Date(c.slaDueAt).getTime() - now) / H;
  const f = {
    risk: clamp(c.riskScore / 100),
    sla: hoursLeft <= 0 ? 1 : clamp(1 - hoursLeft / 24),
    source: clamp((cfg.feedPriority[c.feed] ?? 0) / 100),
    age: clamp((now - new Date(c.openedAt).getTime()) / H / 48),
  };
  const parts = { risk: (f.risk * w.risk * 100) / total, sla: (f.sla * w.sla * 100) / total, source: (f.source * w.source * 100) / total, age: (f.age * w.age * 100) / total };
  return { score: Math.round(parts.risk + parts.sla + parts.source + parts.age), pinned: undefined, parts };
}

/** Normalised 0-1 value of each per-source factor. Amount full at Rs 5 lakh, NegBase full at 3 hits. */
export function factorValues(c: PriorityInput, now = Date.now()): Record<FeedFactor, number> {
  const hoursLeft = (new Date(c.slaDueAt).getTime() - now) / H;
  return {
    risk: clamp(c.riskScore / 100),
    sla: hoursLeft <= 0 ? 1 : clamp(1 - hoursLeft / 24),
    amount: clamp((c.amount ?? 0) / 500000),
    age: clamp((now - new Date(c.openedAt).getTime()) / H / 48),
    negHits: clamp((c.negHits ?? 0) / 3),
  };
}

/** 0-100 score inside one source's queue. */
export function feedScore(c: PriorityInput, q: FeedQueue, now = Date.now()): number {
  const v = factorValues(c, now);
  const keys = Object.keys(q.weights) as FeedFactor[];
  const total = keys.reduce((s, k) => s + q.weights[k], 0) || 1;
  return Math.round((keys.reduce((s, k) => s + v[k] * q.weights[k], 0) * 100) / total);
}

/** Override that forces a case to the top of its queue, if any. */
export function pinReason(c: PriorityInput, q: FeedQueue, now = Date.now()): string | undefined {
  if (q.overrides.breachedTop && new Date(c.slaDueAt).getTime() <= now) return "Breached";
  if (q.overrides.amountTopGte && (c.amount ?? 0) >= q.overrides.amountTopGte) return "Large amount";
  return undefined;
}

/**
 * Ranks cases: pinned cases first, then by score. With per-source settings the score is
 * 60% the case's own-queue score and 40% the cross-queue score.
 */
export function rankQueue<T extends PriorityInput>(items: T[], cfg: QueueConfig, now = Date.now()) {
  return items
    .map((item) => {
      const base = priorityScore(item, cfg, now);
      const q = cfg.perFeed?.[item.feed];
      if (!q) return { item, ...base };
      return { item, ...base, score: Math.round(0.6 * feedScore(item, q, now) + 0.4 * base.score), pinned: pinReason(item, q, now) };
    })
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.score - a.score);
}

/** Ranks one source's queue by its own settings only. */
export function rankFeed<T extends PriorityInput>(items: T[], q: FeedQueue, now = Date.now()) {
  return items
    .map((item) => ({ item, score: feedScore(item, q, now), pinned: pinReason(item, q, now) }))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.score - a.score);
}

const FACTOR_TEXT: Record<FeedFactor, string> = {
  risk: "higher risk scores", sla: "cases close to their deadline", amount: "bigger amounts", age: "cases waiting longest", negHits: "more Negative Database hits",
};
/** Plain-English sentence describing the ordering. */
export function explainOrder(q: FeedQueue): string {
  const ks = (Object.keys(q.weights) as FeedFactor[]).filter((k) => q.weights[k] > 0).sort((a, b) => q.weights[b] - q.weights[a]);
  const parts: string[] = [];
  if (q.overrides.breachedTop) parts.push("Breached cases always go to the top.");
  if (q.overrides.amountTopGte) parts.push(`Amounts of Rs ${q.overrides.amountTopGte.toLocaleString("en-IN")} or more always go to the top.`);
  if (!ks.length) return [...parts, "No factors set, so cases stay in arrival order."].join(" ");
  const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);
  parts.push(`${cap(FACTOR_TEXT[ks[0]!])} go first.`);
  if (ks.length > 1) parts.push(`Then ${ks.slice(1).map((k) => FACTOR_TEXT[k]).join(", then ")} break ties.`);
  return parts.join(" ");
}

/** Short "why it's here" chips. */
export function reasonChips(c: PriorityInput, now = Date.now()): string[] {
  const out: string[] = [];
  const left = new Date(c.slaDueAt).getTime() - now;
  if (left <= 0) out.push("Breached");
  else if (left < 30 * 60e3) out.push("< 30 min left");
  if ((c.amount ?? 0) >= 100000) out.push(`Rs ${((c.amount ?? 0) / 100000).toFixed(1)}L`);
  if (c.riskScore >= 80) out.push(`Risk ${c.riskScore}`);
  if ((c.negHits ?? 0) >= 2) out.push(`${c.negHits} NegBase hits`);
  return out;
}

/**
 * Suggests who gets a case. Members at capacity are skipped; with seniorOnlyVH, VH cases
 * go only to senior members. `load` is each member's current open-case count.
 */
export function suggestAssignee(
  c: PriorityInput, q: FeedQueue, load: Record<string, number>, opts: { turn?: number; lang?: string } = {},
): string | undefined {
  if (q.distribution.mode === "pull") return undefined;
  let pool: Member[] = q.distribution.members.filter((m) => (load[m.name] ?? 0) < m.cap);
  if (q.distribution.seniorOnlyVH && c.grade === "VH") pool = pool.filter((m) => m.senior);
  if (!pool.length) return undefined;
  if (q.distribution.mode === "skill" && opts.lang) {
    const match = pool.filter((m) => m.langs.includes(opts.lang!));
    if (match.length) pool = match;
  }
  if (q.distribution.mode === "round_robin") return pool[(opts.turn ?? 0) % pool.length]!.name;
  return [...pool].sort((a, b) => (load[a.name] ?? 0) / a.cap - (load[b.name] ?? 0) / b.cap)[0]!.name;
}

export interface NextEsc { level: number; esc: EscLevel; text: string; inMin: number; due: boolean }
/** First escalation level not yet passed (or due now), and minutes until it fires. */
export function nextEscalation(c: PriorityInput, q: FeedQueue, slaMin: number, now = Date.now()): NextEsc | undefined {
  const opened = new Date(c.openedAt).getTime();
  const due = new Date(c.slaDueAt).getTime();
  const span = Math.max(due - opened, slaMin * 60e3);
  const minsTo = (t: number) => Math.round((t - now) / 60e3);
  const res: NextEsc[] = [];
  q.escalation.forEach((e, i) => {
    let at: number | undefined;
    if (e.trigger === "unassigned_min") { if (c.assignee && c.assignee !== "Unassigned") return; at = opened + (e.value ?? 0) * 60e3; }
    else if (e.trigger === "sla_pct") at = opened + (span * (e.value ?? 100)) / 100;
    else if (e.trigger === "sla_breached") at = due;
    else if (e.trigger === "high_risk_idle") { if (c.riskScore < 80) return; at = opened + (e.value ?? 0) * 60e3; }
    else return; // at_capacity is decided at assignment time
    const inMin = minsTo(at);
    res.push({ level: i + 1, esc: e, text: escText(e), inMin, due: inMin <= 0 });
  });
  // The highest level already due wins; else the soonest upcoming.
  const dueNow = res.filter((r) => r.due);
  if (dueNow.length) return dueNow[dueNow.length - 1];
  return res.sort((a, b) => a.inMin - b.inMin)[0];
}

export function escText(e: EscLevel): string {
  const when = {
    unassigned_min: `If unassigned for ${e.value ?? 0} min`,
    sla_pct: `If ${e.value ?? 0}% of SLA used`,
    sla_breached: "If SLA breached",
    at_capacity: "If assignee is at capacity",
    high_risk_idle: `If high risk and idle for ${e.value ?? 0} min`,
  }[e.trigger];
  return `${when} → ${ESC_ACTION_LABELS[e.action]}${e.action === "raise_priority" ? "" : ` ${e.target}`}`;
}

export const fmtMins = (m: number) => (m <= 0 ? "now" : m < 60 ? `${m} min` : m < 1440 ? `${Math.round(m / 60)} h` : `${Math.round(m / 1440)} d`);
