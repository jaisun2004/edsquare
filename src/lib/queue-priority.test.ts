import { describe, expect, it } from "vitest";
import { defaultQueue, feedOf } from "@/data/ops-config";
import { priorityScore, rankQueue } from "@/lib/queue-priority";

const now = Date.parse("2026-10-28T10:00:00Z");
const base = { riskScore: 50, slaDueAt: "2026-10-29T10:00:00Z", openedAt: "2026-10-28T10:00:00Z" };

describe("queue priority", () => {
  it("ranks an I4C case above a model case with the same risk", () => {
    const ranked = rankQueue([{ ...base, feed: "MODEL" as const, id: "m" }, { ...base, feed: "I4C" as const, id: "i" }], defaultQueue, now);
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
  });
});
