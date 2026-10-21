import { describe, expect, it } from "vitest";
import { validateAccountBlocked } from "@/lib/whatsapp";

const ok = { to: "919667335707", account_number: "23434541234", support_number: "1800123456", language: "en" as const };

describe("WhatsApp account-blocked input", () => {
  it("accepts the partner sample request", () => expect(validateAccountBlocked(ok)).toBeNull());
  it("rejects a leading +", () => expect(validateAccountBlocked({ ...ok, to: "+919667335707" })).not.toBeNull());
  it("rejects a short number", () => expect(validateAccountBlocked({ ...ok, to: "96673" })).not.toBeNull());
  it("accepts Hindi", () => expect(validateAccountBlocked({ ...ok, language: "hi" })).toBeNull());
  it("rejects other languages", () => expect(validateAccountBlocked({ ...ok, language: "ta" as never })).not.toBeNull());
});

import { accountDigits, parsePartnerReply, templateLang } from "@/lib/whatsapp";
describe("template input", () => {
  it("maps language", () => { expect(templateLang("HINDI")).toBe("hi"); expect(templateLang("ENGLISH")).toBe("en"); });
  it("cleans account numbers", () => { expect(accountDigits("9120 3030 30")).toBe("9120303030"); expect(accountDigits("XXXX4417")).toBe("4417"); });
});
describe("parsePartnerReply", () => {
  it("sent with a message id is accepted", () => { expect(parsePartnerReply(true, '{"status":"sent","whatsapp_response":{"messages":[{"id":"wamid.X"}]}}')).toEqual({ sent: true, messageId: "wamid.X" }); });
  it("a non-sent status is not accepted", () => { expect(parsePartnerReply(true, '{"status":"failed"}').sent).toBe(false); });
});
