import { describe, expect, it } from "vitest";
import { ageBucket, amountAtRisk, slaBucket } from "./dashboard-metrics";

const now = Date.parse("2026-10-28T06:00:00Z");
const at = (min: number) => new Date(now + min * 60e3).toISOString();

describe("dashboard metrics", () => {
  it("imminent means under 30 minutes left", () => {
    expect(slaBucket(at(29), now)).toBe("imminent");
    expect(slaBucket(at(31), now)).toBe("within");
    expect(slaBucket(at(-1), now)).toBe("breached");
  });
  it("buckets ageing", () => {
    expect(ageBucket(at(120), now)).toBe("< 4 h");
    expect(ageBucket(at(600), now)).toBe("< 24 h");
  });
  it("reads rupee amount from trigger text", () => {
    expect(amountAtRisk({ trigger: "Credit of Rs 48,500 from flagged UPI" })).toBe(48500);
  });
});
