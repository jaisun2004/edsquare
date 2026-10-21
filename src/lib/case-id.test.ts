import { describe, expect, it } from "vitest";
import { nextCaseId } from "@/data/edd";

describe("nextCaseId", () => {
  it("goes one above the highest existing case", () => {
    expect(nextCaseId(["CASE-2041", "CASE-2550", "CASE-2101"])).toBe("CASE-2551");
  });
  it("never reuses an id across many demo runs", () => {
    const ids: string[] = ["CASE-2041"];
    for (let i = 0; i < 200; i++) ids.push(nextCaseId(ids));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

import { renumberCase, resolveCaseId } from "@/lib/case-renumber";
describe("renumberCase", () => {
  it("moves a clashing case and re-links its alert, run and enforcement", () => {
    const s = renumberCase({
      cases: [{ id: "CASE-2105" } as never, { id: "CASE-2104" } as never],
      alerts: [{ id: "AL-1", caseId: "CASE-2105" } as never, { id: "AL-2", caseId: "CASE-2104" } as never],
      runs: [{ id: "R1", caseId: "CASE-2105" } as never],
      enforcement: [{ id: "E1", caseId: "CASE-2105" } as never],
    }, "CASE-2105", "CASE-2106");
    expect(s.cases.map((c) => c.id)).toEqual(["CASE-2106", "CASE-2104"]);
    expect(s.alerts.map((a) => a.caseId)).toEqual(["CASE-2106", "CASE-2104"]);
    expect(s.runs[0]!.caseId).toBe("CASE-2106");
    expect(s.enforcement[0]!.caseId).toBe("CASE-2106");
  });
  it("follows chained renames", () => {
    expect(resolveCaseId({ "CASE-2105": "CASE-2106", "CASE-2106": "CASE-2109" }, "CASE-2105")).toBe("CASE-2109");
  });
});
