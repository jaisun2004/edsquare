import { describe, expect, it } from "vitest";
import { cbsProfiles, workbookAlerts } from "@/data/workbook";
import { dataChecks, waCheckOutcome } from "@/lib/edd-flow";
import { intakeEvents, totalDelay, whatsappEvents } from "@/lib/flow-events";

const alert = workbookAlerts[0]!;
const profile = cbsProfiles[0]!;

describe("intakeEvents", () => {
  it("queries Negative DB before Core Banking and does not create a case yet", () => {
    const r = dataChecks(alert, profile, false);
    const ev = intakeEvents(alert, profile, false, r.checks, r.outcome);
    const neg = ev.findIndex((e) => e.to === "negdb");
    const cbs = ev.findIndex((e) => e.to === "cbs");
    expect(neg).toBeGreaterThan(-1);
    expect(cbs).toBeGreaterThan(neg);
    expect(ev.some((e) => e.to === "cases")).toBe(false);
    expect(totalDelay(ev)).toBeGreaterThan(0);
  });
  it("marks the Negative DB reply Red on a hit", () => {
    const r = dataChecks(alert, profile, true);
    const ev = intakeEvents(alert, profile, true, r.checks, r.outcome);
    expect(ev.find((e) => e.from === "negdb")!.colour).toBe("Red");
  });
});

describe("WhatsApp pre-call check", () => {
  it("a Green response clears the customer and creates no case", () => {
    const o = waCheckOutcome(0, false);
    expect(o.clears).toBe(true);
    const ev = whatsappEvents({ q1: "a" }, 0, o.colour, o.clears);
    expect(ev.some((e) => e.to === "cases")).toBe(false);
    expect(ev.at(-1)!.to).toBe("enforce");
  });
  it("a flag above 10 does not clear and moves to the voice bot", () => {
    const o = waCheckOutcome(11, false);
    expect(o).toEqual({ colour: "Red", clears: false });
    expect(whatsappEvents({}, 11, o.colour, o.clears).at(-1)!.to).toBe("voice");
  });
});
