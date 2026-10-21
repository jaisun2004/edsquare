import { describe, expect, it } from "vitest";
import { cbsProfiles, workbookAlerts, type WorkbookAlert } from "@/data/workbook";
import { dataChecks, defaultThresholds, exitOutcome, flagOutcome, scriptFor } from "@/lib/edd-flow";

const ranga = cbsProfiles[0]!;
const base: WorkbookAlert = { ...workbookAlerts[0]! };

describe("Step 1 data checks", () => {
  it("Negative Database hit is Red", () => {
    expect(dataChecks(base, ranga, true).outcome).toBe("Red");
  });
  it("amount > 5000 and 2x average credit blocks", () => {
    const r = dataChecks({ ...base, amount: 5001, credits: [5001] }, { ...ranga, avgCrAmtPerDay: 2500 }, false);
    expect(r.checks[1]!.fired).toBe(true);
  });
  it("amount of exactly 5000 does not trigger the amount check", () => {
    const r = dataChecks({ ...base, amount: 5000, credits: [5000] }, { ...ranga, avgCrAmtPerDay: 100 }, false);
    expect(r.checks[1]!.fired).toBe(false);
  });
  it("one credit above 20% of 2-day credits blocks", () => {
    const r = dataChecks({ ...base, amount: 3000, credits: [2500, 500] }, ranga, false);
    expect(r.checks[2]!.fired).toBe(true);
    expect(r.outcome).toBe("Red");
  });
  it("no rule fired moves to next step (Amber)", () => {
    const r = dataChecks({ ...base, amount: 4000, credits: [4000] }, ranga, false);
    expect(r.outcome).toBe("Amber");
  });
});

describe("Response flag", () => {
  it("flag above 10 blocks", () => expect(flagOutcome(11, false)).toBe("Red"));
  it("flag 8-10 on a non-merchant account blocks", () => {
    expect(flagOutcome(8, false)).toBe("Red");
    expect(flagOutcome(10, false)).toBe("Red");
  });
  it("merchant account with flag 8+ goes to manual review", () => expect(flagOutcome(9, true)).toBe("Manual"));
  it("flag below 8 is Green", () => expect(flagOutcome(7, false)).toBe("Green"));
});

describe("Flow", () => {
  it("voice bot retries 3 times", () => expect(defaultThresholds.voiceRetries).toBe(3));
  it("I4C no-response exits with continue block; Model goes to manual queue", () => {
    expect(exitOutcome("I4C").colour).toBe("Red");
    expect(exitOutcome("Model").colour).toBe("Manual");
  });
  it("Model alert with debits uses the Debits and Credits script", () => {
    expect(scriptFor(workbookAlerts[4]!, "voice")).toBe("Mod Script Debits and Credits");
    expect(scriptFor(workbookAlerts[3]!, "voice")).toBe("Mod Script");
  });
});
