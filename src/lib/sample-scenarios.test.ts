import { describe, expect, it } from "vitest";
import { buildSamples, SAMPLE_SCENARIOS, sheetAlertFor } from "@/data/sample-scenarios";
import { alertJourney } from "./alert-journey";

describe("sample scenarios from the test sheet", () => {
  const s = buildSamples(Date.parse("2026-10-21T10:00:00Z"));
  for (const [i, sc] of SAMPLE_SCENARIOS.entries()) {
    it(`${sc.title} -> ${sc.expected}`, () => {
      expect(alertJourney(s.alerts[i]!, s.cases, s.enforcement, s.runs).result).toBe(sc.expected);
    });
  }
  it("case customer matches the sheet account holder", () => {
    for (const c of s.cases) expect(s.alerts.find((a) => a.caseId === c.id)!.customer).toBe(c.customer);
  });
  it("maps a job-fraud alert to the I4C job fraud sheet alert", () => {
    expect(sheetAlertFor({ source: "CRM Complaint", trigger: "Fake job offer payments", account: "X" })).toBe("i4c-2");
  });
});
