import { describe, expect, it } from "vitest";
import { outreachAvailability, outreachSuggestion } from "./case-steps";
import type { CallRecord, QuestionnaireRecord } from "@/data/edd";

const call = (origin?: "case"): CallRecord => ({ id: "c", attempt: 1, number: "x", real: false, startedAt: "", status: "", outcome: "answered", transcript: [], origin });
const form = (origin?: "case"): QuestionnaireRecord => ({ id: "q", number: "x", real: false, sentAt: "", outcome: "submitted", origin });

describe("outreachAvailability", () => {
  it("offers both when the demo run triggered neither", () => {
    expect(outreachAvailability({ calls: [], questionnaires: [] })).toEqual({ call: true, whatsapp: true });
  });
  it("hides the call when the demo run placed one", () => {
    expect(outreachAvailability({ calls: [call()] }).call).toBe(false);
    expect(outreachAvailability({}, { callAttempts: 2, whatsappSent: false })).toEqual({ call: false, whatsapp: true });
  });
  it("hides WhatsApp when the demo run sent it", () => {
    expect(outreachAvailability({ questionnaires: [form()] }).whatsapp).toBe(false);
  });
  it("keeps offering a channel started only from the case", () => {
    expect(outreachAvailability({ calls: [call("case")], questionnaires: [form("case")] })).toEqual({ call: true, whatsapp: true });
  });
});

describe("outreachSuggestion", () => {
  it("low flag suggests unblocking, high flag keeps blocked", () => {
    expect(outreachSuggestion(0, false).text).toMatch(/unblock/i);
    expect(outreachSuggestion(12, false).text).toMatch(/keep blocked/i);
  });
});
