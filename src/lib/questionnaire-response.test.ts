import { describe, expect, it } from "vitest";
import { cbsProfiles, type ScriptQuestion } from "@/data/workbook";
import { defaultThresholds, responseFlag, scoreResponse, type Thresholds } from "@/lib/edd-flow";

const profile = cbsProfiles[0];
if (!profile) throw new Error("Missing test profile");
const questions: ScriptQuestion[] = [{ id: "response", text: "Confirm transaction", options: [{ label: "Genuine", points: 0 }, { label: "Suspicious", points: 11 }] }];
const three: ScriptQuestion[] = ["q1", "q2", "q3"].map((id) => ({ id, text: `Q ${id}`, options: [{ label: "Genuine", points: 0 }, { label: "Suspicious", points: 11 }] }));

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

describe("Unanswered questions add risk points", () => {
  it("scores a blank answer as risk points instead of dropping it", () => {
    const qs: ScriptQuestion[] = [
      { id: "a", text: "Q1 identity", options: [{ label: "Genuine", points: 0 }] },
      { id: "b", text: "Q2 pincode", options: [{ label: "Genuine", points: 0 }] },
    ];
    const r = scoreResponse(qs, { a: "Genuine" }, profile, "Model");
    expect(r.answers).toEqual([
      { question: "Q1 identity", answer: "Genuine", points: 0 },
      { question: "Q2 pincode", answer: "Not answered", points: defaultThresholds.unansweredPoints },
    ]);
    expect(r.flag).toBe(defaultThresholds.unansweredPoints);
    expect(r.unanswered).toBe(1);
  });

  it("treats an empty answer from the AI extraction as not answered", () => {
    const r = scoreResponse(three, { q1: "Genuine", q2: "", q3: "Genuine" }, profile, "Model");
    expect(r.unanswered).toBe(1);
    expect(r.flag).toBe(defaultThresholds.unansweredPoints);
  });

  it("pushes an otherwise clean case to continue block when enough questions go unanswered", () => {
    const answered = scoreResponse(three, { q1: "Genuine", q2: "Genuine", q3: "Genuine" }, profile, "Model");
    expect(answered.flag).toBe(0);
    expect(answered.outcome.action).toBe("unblock");
    const refused = scoreResponse(three, {}, profile, "Model");
    expect(refused.flag).toBe(3 * defaultThresholds.unansweredPoints);
    expect(refused.outcome.action).toBe("continue_block");
  });

  it("uses the decision-manager threshold for the penalty", () => {
    const t = (points: number): Thresholds => ({ ...defaultThresholds, unansweredPoints: points });
    expect(scoreResponse(three, {}, profile, "Model", t(0)).flag).toBe(0);
    expect(scoreResponse(three, {}, profile, "Model", t(6)).flag).toBe(18);
    expect(scoreResponse(three, {}, profile, "Model", t(6)).outcome.action).toBe("continue_block");
  });

  it("keeps the live flag and the scored flag identical when answers are missing", () => {
    const answers = { q1: "Genuine" };
    expect(responseFlag(three, answers, profile, "Model")).toBe(scoreResponse(three, answers, profile, "Model").flag);
  });
});