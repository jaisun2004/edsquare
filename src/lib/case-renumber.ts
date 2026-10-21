// Pure helper: move a case to a new number and re-link everything that points at it.
import type { Alert, EDDCase, EnforcementEntry } from "@/data/edd";
import type { DemoRun } from "@/lib/demo-runs";

export interface CaseLinks { cases: EDDCase[]; alerts: Alert[]; runs: DemoRun[]; enforcement: EnforcementEntry[] }

export function renumberCase(s: CaseLinks, from: string, to: string): CaseLinks {
  return {
    cases: s.cases.map((c) => (c.id === from ? { ...c, id: to } : c)),
    alerts: s.alerts.map((a) => (a.caseId === from ? { ...a, caseId: to } : a)),
    runs: s.runs.map((r) => (r.caseId === from ? { ...r, caseId: to } : r)),
    enforcement: s.enforcement.map((e) => (e.caseId === from ? { ...e, caseId: to } : e)),
  };
}

/** Follows renames (old -> new, possibly chained) to the case's current number. */
export function resolveCaseId(renames: Record<string, string>, id: string): string {
  let cur = id;
  for (let i = 0; i < 20 && renames[cur]; i++) cur = renames[cur]!;
  return cur;
}
