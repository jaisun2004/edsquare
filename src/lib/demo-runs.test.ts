import { describe, expect, it } from "vitest";
import { runStats, type DemoRun } from "./demo-runs";
import type { CallRecord, QuestionnaireRecord } from "@/data/edd";

const run = (colour: DemoRun["colour"], caseId?: string): DemoRun => ({ id: Math.random().toString(), at: "", alertType: "I4C", account: "1", customer: "A", colour, outcome: "", caseId, callAnswered: false, callAttempts: 0, whatsappSent: false, formSubmitted: false });
const call = (outcome: CallRecord["outcome"]) => ({ id: Math.random().toString(), outcome }) as CallRecord;
const form = (outcome: QuestionnaireRecord["outcome"]) => ({ id: Math.random().toString(), outcome }) as QuestionnaireRecord;

describe("runStats", () => {
  it("counts runs cleared without a case vs with a case", () => {
    const s = runStats([run("Green"), run("Red", "CASE-1"), run("Amber", "CASE-2")], [], []);
    expect(s.cleared).toBe(1);
    expect(s.withCase).toBe(2);
    expect(s.byColour.Red).toBe(1);
  });
  it("voice answer rate is answered calls over all calls", () => {
    expect(runStats([], [call("answered"), call("no_response"), call("no_response"), call("answered")], []).answerRate).toBe(50);
  });
  it("WhatsApp completion rate is submitted forms over sent forms", () => {
    expect(runStats([], [], [form("submitted"), form("no_response"), form("no_response")]).completionRate).toBe(33);
  });
  it("rates are 0 with nothing sent", () => {
    const s = runStats([], [], []);
    expect(s.answerRate).toBe(0);
    expect(s.completionRate).toBe(0);
  });
});
