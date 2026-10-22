import { describe, expect, it } from "vitest";
import { makeShortCode, shortCodeOk } from "@/lib/whatsapp";

describe("questionnaire short links", () => {
  it("are 8 characters with no look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const c = makeShortCode();
      expect(c).toHaveLength(8);
      expect(c).not.toMatch(/[0O1lI]/);
      expect(shortCodeOk(c)).toBe(true);
    }
  });
  it("reject codes of the wrong shape", () => {
    expect(shortCodeOk("abc")).toBe(false);
    expect(shortCodeOk("abcd/efg")).toBe(false);
  });
});
