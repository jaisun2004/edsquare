import { describe, expect, it } from "vitest";
import { nextCaseId } from "@/data/edd";

describe("nextCaseId", () => {
  it("goes one above the highest existing case", () => {
    expect(nextCaseId(["CASE-2041", "CASE-2550", "CASE-2101"])).toBe("CASE-2551");
  });
  it("never reuses an id across many demo runs", () => {
    const ids: string[] = ["CASE-2041"];
    for (let i = 0; i < 200; i++) ids.push(nextCaseId(ids));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
