import { describe, expect, it } from "vitest";
import { alerts, cases, enforcement, negbase } from "@/data/edd";
import { caseHistory, compare, detectKind, findLinked, normalizeIdentifier, queryIdents, summarise } from "./entity-links";

const data = { cases, alerts, negbase, enforcement };

describe("entity links", () => {
  it("normalises phones with +91 and spaces", () => {
    expect(normalizeIdentifier("phone", "+91 98765 00021")).toBe("9876500021");
    expect(normalizeIdentifier("upi", " Sneha.Rao1@YBL ")).toBe("sneha.rao1@ybl");
  });
  it("detects the kind of typed value", () => {
    expect(detectKind("abc@ybl")).toBe("upi");
    expect(detectKind("+919876500021")).toBe("phone");
    expect(detectKind("XXXX3388")).toBe("account");
    expect(detectKind("Imran Shaikh")).toBe("name");
  });
  it("masked account only gives a possible match", () => {
    expect(compare({ kind: "account", value: "XXXX3388" }, { kind: "account", value: "50100033883388" })).toBe("possible");
    expect(compare({ kind: "account", value: "XXXX3388" }, { kind: "account", value: "XXXX3388" })).toBe("strong");
  });
  it("case history excludes the case itself and finds the earlier block", () => {
    const c = cases.find((x) => x.id === "CASE-2043")!;
    const { result, summary } = caseHistory(c, data);
    expect(result.cases.some((m) => m.item.id === "CASE-2043")).toBe(false);
    expect(result.cases.some((m) => m.item.id === "CASE-1987")).toBe(true);
    expect(summary.blocked).toBe(1);
    expect(summary.flag).toBe("red");
  });
  it("shared phone links two different customers", () => {
    const r = findLinked(queryIdents("9876500021"), data);
    expect(r.cases.map((m) => m.item.id).sort()).toEqual(["CASE-2048", "CASE-2051"]);
  });
  it("name-only matches never count as prior cases", () => {
    const s = summarise(findLinked(queryIdents("Lata Sharma"), data), enforcement);
    expect(s.priorCases).toBe(0);
    expect(s.possible).toBeGreaterThan(0);
  });
});
