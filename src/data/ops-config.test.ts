import { describe, expect, it } from "vitest";
import { BLOCK_NAMES, TRIGGER_LABELS, defaultFlows, flattenSteps, migrateFlow } from "./ops-config";

describe("workflow blocks", () => {
  it("has a 'previous failed' trigger", () => {
    expect(TRIGGER_LABELS.prev_failed).toBeTruthy();
  });
  it("groups old flat steps into blocks, keeping the block trigger", () => {
    const f = migrateFlow({ feed: "I4C", slaMin: 30, desk: "x", steps: [
      { id: "a", kind: "lien", enabled: true, trigger: "always" },
      { id: "b", kind: "negbase", enabled: true, trigger: "always" },
      { id: "c", kind: "whatsapp", enabled: true, trigger: "prev_no_response" },
    ] });
    expect(f.blocks.map((b) => b.name)).toEqual([BLOCK_NAMES[0], BLOCK_NAMES[2]]);
    expect(f.blocks[0]!.steps).toHaveLength(2);
    expect(f.blocks[1]!.trigger).toBe("prev_no_response");
  });
  it("I4C default keeps sheet order", () => {
    const i4c = defaultFlows.find((f) => f.feed === "I4C")!;
    expect(flattenSteps(i4c).map((s) => s.kind)).toEqual(["lien", "negbase", "data_checks", "voice", "whatsapp", "email_app", "human_decision"]);
    expect(i4c.blocks.map((b) => b.name)).toEqual([...BLOCK_NAMES.filter((n) => n !== "Exit / manual review")]);
  });
});
