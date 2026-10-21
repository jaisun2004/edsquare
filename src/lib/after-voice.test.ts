import { describe, expect, it } from "vitest";
import { afterVoice } from "@/lib/edd-flow";

describe("optional WhatsApp after the voice call", () => {
  it("skipped after no answer goes to email & app alert", () => expect(afterVoice(false, false)).toBe("alert"));
  it("skipped after an answered call scores the call", () => expect(afterVoice(true, false)).toBe("score"));
  it("sending goes to the WhatsApp questionnaire", () => { expect(afterVoice(true, true)).toBe("bitly"); expect(afterVoice(false, true)).toBe("bitly"); });
});
