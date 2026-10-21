import { describe, expect, it } from "vitest";
import { cbsProfiles, workbookAlerts } from "@/data/workbook";
import { dataChecks } from "@/lib/edd-flow";
import { intakeEvents, scoreEvents, totalDelay } from "@/lib/flow-events";

const alert = workbookAlerts[0]!;
const profile = cbsProfiles[0]!;

describe("intakeEvents", () => {
  it("queries Negative DB before Core Banking and does not create a case yet", () => {
    const r = dataChecks(alert, profile, false);
    const ev = intakeEvents(alert, profile, false, r.checks, r.outcome);
    expect(ev.findIndex((e) => e.to === "cbs")).toBeGreaterThan(ev.findIndex((e) => e.to === "negdb"));
    expect(ev.some((e) => e.to === "cases")).toBe(false);
    expect(totalDelay(ev)).toBeGreaterThan(0);
  });
  it("marks the Negative DB reply Red on a hit", () => {
    const r = dataChecks(alert, profile, true);
    expect(intakeEvents(alert, profile, true, r.checks, r.outcome).find((e) => e.from === "negdb")!.colour).toBe("Red");
  });
});

describe("scoreEvents", () => {
  it("Green unblocks without a case", () => {
    const ev = scoreEvents("voice", {}, 0, "Green");
    expect(ev.at(-1)!.to).toBe("enforce");
  });
  it("Manual goes to the case manager", () => expect(scoreEvents("whatsapp", {}, 9, "Manual").at(-1)!.to).toBe("cases"));
});
