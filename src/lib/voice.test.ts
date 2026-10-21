import { describe, expect, it } from "vitest";
import { normalisePhone, validateVoiceDispatch } from "./voice";

describe("normalisePhone", () => {
  it("adds 91 to a 10-digit number", () => expect(normalisePhone("9081657821")).toBe("919081657821"));
  it("replaces a leading 0 with 91", () => expect(normalisePhone("09081657821")).toBe("919081657821"));
  it("keeps a typed +91", () => expect(normalisePhone("+91 90816 57821")).toBe("919081657821"));
  it("leaves a full number unchanged", () => expect(normalisePhone("919081657821")).toBe("919081657821"));
  it("still rejects a too-short number", () => {
    const phone = normalisePhone("90816");
    expect(validateVoiceDispatch({ phone, session: { customer_name: "A", bank_name: "B", acct_last4: "1234", credit_amt: "1", credit_date: "d", recent_credit_amt: "1", preferred_language: "ENGLISH" } })).not.toBeNull();
  });
});
