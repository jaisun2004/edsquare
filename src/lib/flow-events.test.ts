import { describe, expect, it } from "vitest";
import { cbsProfiles, workbookAlerts } from "@/data/workbook";
import { dataChecks } from "@/lib/edd-flow";
import { intakeEvents, totalDelay } from "@/lib/flow-events";

const alert = workbookAlerts[0]!;
const profile = cbsProfiles[0]!;

describe("intakeEvents", () => {
  it("queries Negative DB before Core Banking and ends with case creation", () => {
    const r = dataChecks(alert, profile, false);
    const ev = intakeEvents(alert, profile, false, r.checks, r.outcome, "CASE-1");
    const neg = ev.findIndex((e) => e.to === "negdb");
    const cbs = ev.findIndex((e) => e.to === "cbs");
    expect(neg).toBeGreaterThan(-1);
    expect(cbs).toBeGreaterThan(neg);
    expect(ev.at(-1)!.to).toBe("cases");
    expect(totalDelay(ev)).toBeGreaterThan(0);
  });
  it("marks the Negative DB reply Red on a hit", () => {
    const r = dataChecks(alert, profile, true);
    const ev = intakeEvents(alert, profile, true, r.checks, r.outcome, "C");
    expect(ev.find((e) => e.from === "negdb")!.colour).toBe("Red");
  });
});
