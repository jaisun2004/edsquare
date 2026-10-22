import { describe, expect, it } from "vitest";
import { scenarios, toWorkbook } from "./scenarios";
import { dataChecks, scriptFor } from "@/lib/edd-flow";

const get = (id: string) => toWorkbook(scenarios.find((s) => s.id === id)!.input);

describe("transaction pipeline uses the sheet flow", () => {
  it("Negative Database hit is Red at data checks", () => {
    const w = get("mule");
    expect(dataChecks(w.alert, w.profile, w.negbase).outcome).toBe("Red");
  });
  it("clean salary credit passes data checks and goes to the voice call", () => {
    const w = get("clean");
    expect(dataChecks(w.alert, w.profile, w.negbase).outcome).toBe("Amber");
  });
  it("pass-through transaction uses the Mod debits & credits script", () => {
    expect(scriptFor(get("mule").alert, "voice")).toBe("Mod Script Debits and Credits");
    expect(scriptFor(get("clean").alert, "voice")).toBe("Mod Script");
  });
});
