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

import { nextOnNoResponse, stepOutcome } from "@/lib/edd-flow";
describe("Scenario sheet order", () => {
  it("merchant with flag above 10 continues block (not manual)", () => expect(flagOutcome(11, true)).toBe("Red"));
  it("no response: voice -> WhatsApp/Bitly -> email & app alert -> exit", () => {
    expect(nextOnNoResponse("voice")).toBe("bitly");
    expect(nextOnNoResponse("bitly")).toBe("alert");
    expect(nextOnNoResponse("alert")).toBe("exit");
  });
  it("flag 8-10 merchant goes to manual queue, below 8 unblocks", () => {
    expect(stepOutcome(9, true).action).toBe("manual_queue");
    expect(stepOutcome(7, false).action).toBe("unblock");
    expect(stepOutcome(8, false).action).toBe("continue_block");
  });
});

describe("Step 1 rules are each evaluated", () => {
  it("rule 2 is still checked when the Negative Database hits", () => {
    const r = dataChecks({ ...base, amount: 9000, credits: [9000] }, { ...ranga, avgCrAmtPerDay: 1000 }, true);
    expect(r.checks[0]!.status).toBe("fired");
    expect(r.checks[1]!.status).toBe("also");
  });
  it("exactly 2x the average fires rule 2", () => {
    expect(dataChecks({ ...base, amount: 6000, credits: [6000] }, { ...ranga, avgCrAmtPerDay: 3000 }, false).checks[1]!.fired).toBe(true);
  });
  it("exactly 20% of 2-day credits does not fire rule 3", () => {
    expect(dataChecks({ ...base, amount: 1000, credits: [1000, 4000] }, { ...ranga, avgCrAmtPerDay: 100000 }, false).checks[2]!.fired).toBe(false);
  });
});
