import { describe, expect, it } from "vitest";
import { defaultFlows, type FeedFlow } from "@/data/ops-config";
import { seedRuleDefs, seedRuleGroups, seedRuleSets } from "@/data/policy";
import { attributes, dataSources } from "@/data/sources";
import { activeSets, healthWarnings, ruleUsage, setUsage } from "./decision-graph";

const clone = (f: FeedFlow[]): FeedFlow[] => JSON.parse(JSON.stringify(f));

describe("decision graph", () => {
  it("links hard-stop rules to the feeds that run the hard-stop set", () => {
    const u = ruleUsage(defaultFlows, seedRuleDefs, seedRuleGroups);
    expect(u["HS-01"]).toEqual(["I4C", "NPCI"]);
  });
  it("a feed with all check steps switched off runs no rule sets", () => {
    const flows = clone(defaultFlows);
    const i4c = flows.find((f) => f.feed === "I4C")!;
    for (const b of i4c.blocks) for (const s of b.steps) if (["lien", "negbase", "data_checks"].includes(s.kind)) s.enabled = false;
    expect(activeSets(i4c)).toEqual([]);
    expect(setUsage(flows)["S-HARD"]).toEqual(["NPCI"]);
  });
  it("warns when a rule set is not linked to any workflow", () => {
    const flows = clone(defaultFlows).map((f) => ({ ...f, decision: { ...f.decision, ruleSets: f.decision.ruleSets.filter((s) => s !== "S-OV") } }));
    const w = healthWarnings(flows, seedRuleDefs, seedRuleGroups, seedRuleSets, attributes, dataSources);
    expect(w.some((x) => x.text.includes("Overrides"))).toBe(true);
    expect(w.some((x) => x.text.includes("not used by any workflow"))).toBe(true);
  });
  it("warns when the review band starts above the block band", () => {
    const flows = clone(defaultFlows);
    flows[0]!.decision.thresholds.flagReview = 12;
    const w = healthWarnings(flows, seedRuleDefs, seedRuleGroups, seedRuleSets, attributes, dataSources);
    expect(w.some((x) => x.text.startsWith("I4C: review band"))).toBe(true);
  });
});
