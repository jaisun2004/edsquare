import { describe, expect, it } from "vitest";
import { scenarios, toWorkbook } from "./scenarios";
import { dataChecks, scriptFor } from "@/lib/edd-flow";

const get = (id: string) => toWorkbook(scenarios.find((s) => s.id === id)!.input);
const firedId = (id: string) => {
  const w = get(id);
  return dataChecks(w.alert, w.profile, w.negbase).checks.find((c) => c.fired)?.id;
};

describe("transaction pipeline uses the sheet flow", () => {
  it("money mule blocks on rule 1 (Negative Database)", () => expect(firedId("mule")).toBe("C1"));
  it("dormant spike blocks on rule 2 (amount vs average)", () => expect(firedId("dormant")).toBe("C2"));
  it("scam inflow blocks on rule 3 (share of 2-day credits)", () => expect(firedId("scam")).toBe("C3"));
  it("clean salary credit fires no rule and goes to the voice call", () => {
    const w = get("clean");
    expect(dataChecks(w.alert, w.profile, w.negbase).outcome).toBe("Amber");
  });
  it("pass-through transaction uses the Mod debits & credits script", () => {
    expect(scriptFor(get("mule").alert, "voice")).toBe("Mod Script Debits and Credits");
    expect(scriptFor(get("clean").alert, "voice")).toBe("Mod Script");
  });
});
