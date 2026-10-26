import { describe, expect, it } from "vitest";
import { cbsProfiles, type ScriptQuestion } from "@/data/workbook";
import { scoreResponse } from "@/lib/edd-flow";

const profile = cbsProfiles[0];
if (!profile) throw new Error("Missing test profile");
const questions: ScriptQuestion[] = [{ id: "response", text: "Confirm transaction", options: [{ label: "Genuine", points: 0 }, { label: "Suspicious", points: 11 }] }];

describe("Customer questionnaire submission", () => {
  it("scores the received answers, not an earlier empty UI response", () => {
    const result = scoreResponse(questions, { response: "Suspicious" }, profile, "Model");
    expect(result.flag).toBe(11);
    expect(result.outcome.action).toBe("continue_block");
    expect(result.answers).toEqual([{ question: "Confirm transaction", answer: "Suspicious", points: 11 }]);
  });
  it("automatically produces the verified outcome for genuine submitted answers", () => {
    expect(scoreResponse(questions, { response: "Genuine" }, profile, "Model").outcome.action).toBe("unblock");
  });
});