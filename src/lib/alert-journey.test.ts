import { describe, expect, it } from "vitest";
import { alertJourney } from "./alert-journey";
import type { Alert, EDDCase, EnforcementEntry } from "@/data/edd";
import type { DemoRun } from "./demo-runs";

const alert = (p: Partial<Alert> = {}): Alert => ({ id: "AL-1", source: "Risk Model", account: "1", upi: "", customer: "A", trigger: "", receivedAt: "", preliminarySignal: "H", status: "New", ...p });
const run = (p: Partial<DemoRun> = {}): DemoRun => ({ id: "R", alertId: "AL-1", at: "", alertType: "I4C", account: "1", customer: "A", colour: "Amber", outcome: "", callAnswered: false, callAttempts: 0, whatsappSent: false, formSubmitted: false, ...p });
const enf = (action: "Block" | "Unblock") => ({ caseId: "C1", action, decidedBy: "X" }) as EnforcementEntry;
const kase = { id: "C1" } as EDDCase;

describe("system block", () => {
  it("System blocked with Step 1 reason when engine opened a case with no contact", () => {
    const j = alertJourney(alert({ caseId: "C1" }), [kase], [], [run({ caseId: "C1", colour: "Red", outcome: "Negative Database hit" })]);
    expect(j.result).toBe("System blocked");
    expect(j.blockReason).toBe("Failed data checks at Step 1: Negative Database hit");
  });
  it("no-response reason for Manual runs", () => {
    const j = alertJourney(alert({ caseId: "C1" }), [kase], [], [run({ caseId: "C1", colour: "Manual", callAttempts: 3 })]);
    expect(j.blockReason).toBe("No customer response on call, WhatsApp, email and app alert");
  });
  it("human Block stays Blocked", () => {
    expect(alertJourney(alert({ caseId: "C1" }), [kase], [enf("Block")], [run({ caseId: "C1", colour: "Red" })]).result).toBe("Blocked");
  });
});

describe("alertJourney result", () => {
  it("New when nothing happened", () => expect(alertJourney(alert(), [], [], []).result).toBe("New"));
  it("Dismissed", () => expect(alertJourney(alert({ status: "Dismissed" }), [], [], []).result).toBe("Dismissed"));
  it("Case open when a case exists without a decision", () => expect(alertJourney(alert({ caseId: "C1" }), [kase], [], []).result).toBe("Case open"));
  it("Blocked when enforcement blocked the case", () => expect(alertJourney(alert({ caseId: "C1" }), [kase], [enf("Block")], []).result).toBe("Blocked"));
  it("Unblocked when enforcement unblocked the case", () => expect(alertJourney(alert({ caseId: "C1" }), [kase], [enf("Unblock")], []).result).toBe("Unblocked"));
  it("Verified when a demo run cleared the customer without a case", () => expect(alertJourney(alert(), [], [], [run({ colour: "Green", callAttempts: 1, callAnswered: true })]).result).toBe("Verified"));
  it("checks step is red when a case was opened at Step 1 with no contact", () => {
    const j = alertJourney(alert({ caseId: "C1" }), [kase], [], [run({ caseId: "C1", colour: "Red" })]);
    expect(j.steps[0]!.state).toBe("red");
  });
});
