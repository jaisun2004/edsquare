import type { FeedId, QueueConfig } from "@/data/ops-config";

export interface PriorityInput { riskScore: number; slaDueAt: string; openedAt: string; feed: FeedId }
export interface PriorityResult { score: number; parts: { risk: number; sla: number; source: number; age: number } }

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** 0-100 queue priority from weighted factors. SLA: overdue = 1, 24h+ left = 0. Age: 48h+ waiting = 1. */
export function priorityScore(c: PriorityInput, cfg: QueueConfig, now = Date.now()): PriorityResult {
  const w = cfg.weights;
  const total = w.risk + w.sla + w.source + w.age || 1;
  const hoursLeft = (new Date(c.slaDueAt).getTime() - now) / 3600_000;
  const f = {
    risk: clamp(c.riskScore / 100),
    sla: hoursLeft <= 0 ? 1 : clamp(1 - hoursLeft / 24),
    source: clamp((cfg.feedPriority[c.feed] ?? 0) / 100),
    age: clamp((now - new Date(c.openedAt).getTime()) / 3600_000 / 48),
  };
  const parts = { risk: (f.risk * w.risk * 100) / total, sla: (f.sla * w.sla * 100) / total, source: (f.source * w.source * 100) / total, age: (f.age * w.age * 100) / total };
  return { score: Math.round(parts.risk + parts.sla + parts.source + parts.age), parts };
}

export function rankQueue<T extends PriorityInput>(items: T[], cfg: QueueConfig, now = Date.now()) {
  return items.map((item) => ({ item, ...priorityScore(item, cfg, now) })).sort((a, b) => b.score - a.score);
}
