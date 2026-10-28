import { describe, expect, it } from "vitest";
import { defaultQueue, feedOf } from "@/data/ops-config";
import { priorityScore, rankQueue } from "@/lib/queue-priority";

const now = Date.parse("2026-10-28T10:00:00Z");
const base = { riskScore: 50, slaDueAt: "2026-10-29T10:00:00Z", openedAt: "2026-10-28T10:00:00Z" };

describe("queue priority", () => {
  it("ranks an I4C case above a model case with the same risk", () => {
    const ranked = rankQueue([{ ...base, feed: "MODEL" as const, id: "m" }, { ...base, feed: "I4C" as const, id: "i" }], { ...defaultQueue, perFeed: undefined as never }, now);
    expect(ranked[0]!.item.id).toBe("i");
  });
  it("an overdue SLA gets the full SLA weight", () => {
    const r = priorityScore({ ...base, slaDueAt: "2026-10-28T09:00:00Z", feed: "MODEL" }, defaultQueue, now);
    expect(Math.round(r.parts.sla)).toBe(30);
  });
  it("setting source weight to 0 removes the feed advantage", () => {
    const cfg = { ...defaultQueue, weights: { ...defaultQueue.weights, source: 0 } };
    const a = priorityScore({ ...base, feed: "I4C" }, cfg, now).score;
    const b = priorityScore({ ...base, feed: "MODEL" }, cfg, now).score;
    expect(a).toBe(b);
  });
  it("maps CRM complaints to I4C unless a feed is set", () => {
    expect(feedOf({ source: "CRM Complaint" })).toBe("I4C");
    expect(feedOf({ source: "Risk Model", feed: "NPCI" })).toBe("NPCI");
    expect(feedOf({ source: "External Intelligence", trigger: "I4C complaint: Investment scam" })).toBe("I4C");
  });
});

import { defaultPerFeed, PRESETS, type FeedQueue } from "@/data/ops-config";
import { rankFeed, suggestAssignee, nextEscalation, explainOrder } from "@/lib/queue-priority";

const q = (over: Partial<FeedQueue> = {}): FeedQueue => ({ ...defaultPerFeed.MODEL, overrides: { breachedTop: false }, ...over });

describe("per-source queues", () => {
  it("Deadline first puts the case nearer its SLA above a riskier one", () => {
    const near = { ...base, riskScore: 40, slaDueAt: "2026-10-28T11:00:00Z", feed: "I4C" as const, id: "near" };
    const risky = { ...base, riskScore: 95, slaDueAt: "2026-10-29T09:00:00Z", feed: "I4C" as const, id: "risky" };
    expect(rankFeed([risky, near], q({ weights: PRESETS.deadline.weights }), now)[0]!.item.id).toBe("near");
  });
  it("Riskiest first puts the riskier case first", () => {
    const near = { ...base, riskScore: 40, slaDueAt: "2026-10-28T11:00:00Z", feed: "MODEL" as const, id: "near" };
    const risky = { ...base, riskScore: 95, feed: "MODEL" as const, id: "risky" };
    expect(rankFeed([near, risky], q({ weights: PRESETS.risk.weights }), now)[0]!.item.id).toBe("risky");
  });
  it("breached cases go on top when the switch is on", () => {
    const breached = { ...base, riskScore: 10, slaDueAt: "2026-10-28T09:00:00Z", feed: "MODEL" as const, id: "b" };
    const hot = { ...base, riskScore: 99, feed: "MODEL" as const, id: "h" };
    expect(rankFeed([hot, breached], q({ overrides: { breachedTop: true } }), now)[0]!.item.id).toBe("b");
  });
  it("amounts at or over the set limit go on top", () => {
    const big = { ...base, riskScore: 10, amount: 100000, feed: "MODEL" as const, id: "big" };
    const hot = { ...base, riskScore: 99, amount: 5000, feed: "MODEL" as const, id: "h" };
    expect(rankFeed([hot, big], q({ overrides: { breachedTop: false, amountTopGte: 100000 } }), now)[0]!.item.id).toBe("big");
  });
  const dist = (mode: FeedQueue["distribution"]["mode"], seniorOnlyVH = false) => q({ distribution: { mode, seniorOnlyVH, members: [
    { name: "A", role: "analyst", cap: 5, langs: ["English"], senior: false },
    { name: "S", role: "investigator", cap: 2, langs: ["Hindi"], senior: true },
  ] } });
  it("least busy picks the member with the lowest load", () => {
    expect(suggestAssignee({ ...base, feed: "MODEL" }, dist("least_loaded"), { A: 4, S: 0 })).toBe("S");
  });
  it("members at their limit are skipped", () => {
    expect(suggestAssignee({ ...base, feed: "MODEL" }, dist("least_loaded"), { A: 4, S: 2 })).toBe("A");
  });
  it("VH cases only go to senior members when set", () => {
    expect(suggestAssignee({ ...base, grade: "VH", feed: "MODEL" }, dist("least_loaded", true), { A: 0, S: 1 })).toBe("S");
    expect(suggestAssignee({ ...base, grade: "VH", feed: "MODEL" }, dist("least_loaded", true), { A: 0, S: 2 })).toBeUndefined();
  });
  it("pull mode suggests nobody", () => {
    expect(suggestAssignee({ ...base, feed: "MODEL" }, dist("pull"), {})).toBeUndefined();
  });
  it("escalation: 80% of a 10h SLA fires at 8h", () => {
    const c = { ...base, openedAt: "2026-10-28T10:00:00Z", slaDueAt: "2026-10-28T20:00:00Z", assignee: "A", feed: "MODEL" as const };
    const cfg = q({ escalation: [{ id: "x", trigger: "sla_pct", value: 80, action: "notify", target: "Supervisor" }] });
    expect(nextEscalation(c, cfg, 600, now)!.inMin).toBe(480);
  });
  it("escalation: unassigned rule applies only to unassigned cases", () => {
    const cfg = q({ escalation: [{ id: "x", trigger: "unassigned_min", value: 15, action: "reassign", target: "Supervisor" }] });
    expect(nextEscalation({ ...base, assignee: "A", feed: "MODEL" }, cfg, 60, now)).toBeUndefined();
    expect(nextEscalation({ ...base, assignee: "Unassigned", feed: "MODEL" }, cfg, 60, now)!.inMin).toBe(15);
  });
  it("explains the order in words", () => {
    expect(explainOrder(q({ weights: PRESETS.deadline.weights, overrides: { breachedTop: true } }))).toBe(
      "Breached cases always go to the top. Cases close to their deadline go first. Then bigger amounts, then higher risk scores break ties.");
  });
});
