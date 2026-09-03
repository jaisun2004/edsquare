import type { Role } from "@/data/edd";

export const roleLabels: Record<Role, string> = {
  analyst: "Analyst / Triage Officer",
  investigator: "Investigator",
  supervisor: "Supervisor / Case Manager",
  admin: "Administrator",
  auditor: "Auditor (read-only)",
};

export const roleActors: Record<Role, string> = {
  analyst: "Priya Nair",
  investigator: "Arjun Rao",
  supervisor: "Kavita Menon",
  admin: "Devang Shah",
  auditor: "Ritu Balan",
};

export type Capability =
  | "runTriage"
  | "acceptRecommendation"
  | "decide"
  | "approveVeryHigh"
  | "override"
  | "engage"
  | "assign"
  | "editRationale"
  | "configure"
  | "viewAudit";

const matrix: Record<Role, Capability[]> = {
  analyst: ["runTriage", "acceptRecommendation", "engage", "editRationale"],
  investigator: ["runTriage", "acceptRecommendation", "decide", "engage", "assign", "editRationale"],
  supervisor: [
    "runTriage",
    "acceptRecommendation",
    "decide",
    "approveVeryHigh",
    "override",
    "engage",
    "assign",
    "editRationale",
    "viewAudit",
  ],
  admin: ["configure", "viewAudit", "assign"],
  auditor: ["viewAudit"],
};

export function can(role: Role, capability: Capability): boolean {
  return matrix[role].includes(capability);
}
