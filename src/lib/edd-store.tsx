import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import {
  alerts as seedAlerts,
  audit as seedAudit,
  cases as seedCases,
  enforcement as seedEnforcement,
  negbase as seedNegbase,
  rules as seedRules,
  gradeForScore,
  type Alert,
  type AuditEntry,
  type EDDCase,
  type EnforcementEntry,
  type Channel,
  type NegbaseRecord,
  type Recommendation,
  type Role,
  type Rule,
  type Stage,
  type TimelineEntry,
} from "@/data/edd";
import { roleActors } from "@/lib/roles";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export interface TriageResult {
  alertId: string;
  score: number;
  grade: ReturnType<typeof gradeForScore>;
  recommendation: Recommendation;
  signals: { label: string; weight: number; detail: string }[];
  rulesTriggered: string[];
  segment: string;
}

interface StoreValue {
  role: Role;
  actor: string;
  setRole: (role: Role) => void;
  alerts: Alert[];
  cases: EDDCase[];
  rules: Rule[];
  negbase: NegbaseRecord[];
  enforcement: EnforcementEntry[];
  audit: AuditEntry[];
  triageAlert: (alertId: string) => TriageResult;
  applyTriage: (result: TriageResult, outcome: Recommendation, reason?: string) => string;
  dismissAlert: (alertId: string) => void;
  requestEnrichment: (caseId: string) => void;
  startEngagement: (caseId: string, channel: Channel) => void;
  saveRationale: (caseId: string, rationale: NonNullable<EDDCase["rationale"]>) => void;
  decide: (caseId: string, outcome: Recommendation, reason: string) => void;
  moveStage: (caseId: string, stage: Stage) => void;
  assignCase: (caseId: string, assignee: string) => void;
  claimNext: () => string | undefined;
  addNote: (caseId: string, text: string) => void;
  attachEvidence: (caseId: string, identifier: string) => void;
  toggleRule: (ruleId: string) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function EDDProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("analyst");
  const [alerts, setAlerts] = useState<Alert[]>(() => clone(seedAlerts));
  const [cases, setCases] = useState<EDDCase[]>(() => clone(seedCases));
  const [rules, setRules] = useState<Rule[]>(() => clone(seedRules));
  const [negbase] = useState<NegbaseRecord[]>(() => clone(seedNegbase));
  const [enforcement, setEnforcement] = useState<EnforcementEntry[]>(() => clone(seedEnforcement));
  const [audit, setAudit] = useState<AuditEntry[]>(() => clone(seedAudit));

  const actor = roleActors[role];

  const value = useMemo<StoreValue>(() => {
    const logAudit = (action: string, before: string, after: string, caseId?: string) =>
      setAudit((prev) => [
        { id: uid("AU"), at: new Date().toISOString(), actor, role, action, before, after, ...(caseId ? { caseId } : {}) },
        ...prev,
      ]);

    const appendTimeline = (caseId: string, action: string, detail: string, who = actor) =>
      setCases((prev) =>
        prev.map((c) =>
          c.id === caseId
            ? {
                ...c,
                timeline: [
                  ...c.timeline,
                  { id: uid("T"), at: new Date().toISOString(), actor: who, action, detail } satisfies TimelineEntry,
                ],
              }
            : c,
        ),
      );

    const patch = (caseId: string, fn: (c: EDDCase) => EDDCase) =>
      setCases((prev) => prev.map((c) => (c.id === caseId ? fn(c) : c)));

    return {
      role,
      actor,
      setRole,
      alerts,
      cases,
      rules,
      negbase,
      enforcement,
      audit,

      triageAlert: (alertId) => {
        const alert = alerts.find((a) => a.id === alertId)!;
        const base = { VH: 88, H: 72, M: 51, L: 24 }[alert.preliminarySignal];
        const active = rules.filter((r) => r.active);
        const negHit = alert.source === "Negative Database" || alert.source === "External Intelligence";
        const triggered = active
          .filter((r) => (negHit ? r.family !== "Velocity / Geo" : r.family === "Behavioural" || r.family === "Identity / KYC"))
          .slice(0, negHit ? 4 : 3)
          .map((r) => r.id);
        const score = Math.min(99, base + (negHit ? 4 : 0));
        const grade = gradeForScore(score);
        const recommendation: Recommendation = score >= 80 ? "Block" : score >= 35 ? "Further Investigation" : "Unblock";
        return {
          alertId,
          score,
          grade,
          recommendation,
          rulesTriggered: triggered,
          segment: negHit ? "Negative-database linked mule network" : "Behavioural mule pattern",
          signals: [
            { label: "Preliminary signal", weight: base / 4, detail: alert.trigger },
            { label: negHit ? "Negative Database linkage" : "Transaction behaviour", weight: negHit ? 20 : 14, detail: negHit ? "Identifier present in negative database" : "Pass-through and counterparty spread" },
            { label: "Identity attributes", weight: 8, detail: "Mobile vintage and handle count outside norm" },
          ],
        };
      },

      applyTriage: (result, outcome, reason) => {
        const alert = alerts.find((a) => a.id === result.alertId)!;
        const caseId = `CASE-${2100 + Math.floor(Math.random() * 800)}`;
        const nowIso = new Date().toISOString();
        const newCase: EDDCase = {
          id: caseId,
          customer: alert.customer,
          account: alert.account,
          upi: alert.upi,
          category: "Mule",
          stage: outcome === "Further Investigation" ? "Enrichment" : "Closed",
          riskScore: result.score,
          grade: result.grade,
          assignee: actor,
          openedAt: nowIso,
          slaDueAt: new Date(Date.now() + 24 * 3600_000).toISOString(),
          signals: result.signals,
          rulesTriggered: result.rulesTriggered,
          enrichment: {
            matchCriteria: result.segment,
            negbaseAttributes: ["Derived at triage"],
            upiHandleCount: 3,
            mobileVintage: "6 months",
            mobileType: "Prepaid",
            socialPresence: [],
            telco: "Pending enrichment",
            osint: [],
          },
          engagement: [],
          timeline: [
            { id: uid("T"), at: nowIso, actor, action: "Triage completed", detail: `Score ${result.score} (${result.grade}) — recommendation ${result.recommendation}` },
            { id: uid("T"), at: nowIso, actor, action: `Action: ${outcome}`, detail: reason ?? "Recommendation accepted" },
          ],
          notes: [],
          documents: [],
          recommendation: result.recommendation,
          ...(outcome !== "Further Investigation"
            ? { decision: { outcome, by: actor, at: nowIso, reason: reason ?? "Accepted triage recommendation" } }
            : {}),
        };
        setCases((prev) => [newCase, ...prev]);
        setAlerts((prev) => prev.map((a) => (a.id === alert.id ? { ...a, status: "Triaged", caseId } : a)));
        if (outcome !== "Further Investigation") {
          setEnforcement((prev) => [
            {
              id: uid("EN"),
              caseId,
              account: alert.account,
              customer: alert.customer,
              action: outcome,
              decidedBy: actor,
              reason: reason ?? "Accepted triage recommendation",
              at: nowIso,
              accountStatus: outcome === "Block" ? "Debit freeze applied" : "Fully operational",
              downstreamStatus: "Sent to Core Banking",
            },
            ...prev,
          ]);
        }
        logAudit(`Triage action: ${outcome}`, `Alert ${alert.id} New`, `${caseId} ${newCase.stage}`, caseId);
        return caseId;
      },

      dismissAlert: (alertId) => {
        setAlerts((prev) => prev.map((a) => (a.id === alertId ? { ...a, status: "Dismissed" } : a)));
        logAudit("Alert dismissed", `${alertId} New`, `${alertId} Dismissed`);
      },

      requestEnrichment: (caseId) => {
        patch(caseId, (c) => ({
          ...c,
          enrichment: {
            ...c.enrichment,
            osint: [...c.enrichment.osint, "Additional OSINT sweep — 2 new mentions found"],
            telco: "Airtel — prepaid, 2 SIM swaps in 90 days",
          },
        }));
        appendTimeline(caseId, "Additional enrichment requested", "Telco + OSINT refresh returned new attributes");
        logAudit("Enrichment requested", "Baseline enrichment", "Extended enrichment", caseId);
      },

      startEngagement: (caseId, channel) => {
        const nowIso = new Date().toISOString();
        const responded = channel === "AI Call";
        patch(caseId, (c) => {
          const newScore = Math.min(99, responded ? c.riskScore + 6 : c.riskScore + 3);
          return {
            ...c,
            stage: "Human Review",
            riskScore: newScore,
            grade: gradeForScore(newScore),
            engagement: [
              ...c.engagement,
              {
                id: uid("E"),
                channel,
                status: responded ? "Responded" : "Delivered",
                at: nowIso,
                outcome: responded
                  ? "Customer gave inconsistent explanation of fund source"
                  : "Message delivered, awaiting response",
                ...(responded
                  ? {
                      transcript: [
                        { speaker: "Bot" as const, text: "This is an automated verification call from your bank." },
                        { speaker: "Customer" as const, text: "Okay." },
                        { speaker: "Bot" as const, text: "Can you confirm the source of recent credits to your account?" },
                        { speaker: "Customer" as const, text: "Someone sends me money and I forward it for a small commission." },
                      ],
                    }
                  : {}),
              },
            ],
          };
        });
        appendTimeline(caseId, `Engagement via ${channel}`, responded ? "Customer responded — risk re-scored" : "Sent → Delivered");
        logAudit(`Engagement started (${channel})`, "Engagement", "Human Review", caseId);
      },

      saveRationale: (caseId, rationale) => {
        patch(caseId, (c) => ({ ...c, rationale, stage: c.stage === "Closed" ? c.stage : "Decision Pending" }));
        appendTimeline(caseId, "Investigation rationale saved", `Confidence: ${rationale.confidence}`);
        logAudit("Rationale saved", "No rationale", `Confidence ${rationale.confidence}`, caseId);
      },

      decide: (caseId, outcome, reason) => {
        const target = cases.find((c) => c.id === caseId);
        const nowIso = new Date().toISOString();
        const needsApproval = target?.grade === "VH";
        patch(caseId, (c) => ({
          ...c,
          stage: outcome === "Further Investigation" ? "Enrichment" : "Closed",
          ...(outcome === "Further Investigation"
            ? {}
            : {
                decision: {
                  outcome,
                  by: actor,
                  at: nowIso,
                  reason,
                  ...(needsApproval && role === "supervisor" ? { approvedBy: actor } : {}),
                },
              }),
        }));
        appendTimeline(caseId, `Decision: ${outcome}`, reason);
        if (outcome !== "Further Investigation" && target) {
          setEnforcement((prev) => [
            {
              id: uid("EN"),
              caseId,
              account: target.account,
              customer: target.customer,
              action: outcome,
              decidedBy: actor,
              reason,
              at: nowIso,
              accountStatus: outcome === "Block" ? "Debit freeze applied" : "Fully operational",
              downstreamStatus: "Sent to Core Banking",
              ...(needsApproval && role === "supervisor" ? { approvedBy: actor } : {}),
            },
            ...prev,
          ]);
        }
        logAudit(`Decision recorded: ${outcome}`, target?.stage ?? "", outcome === "Further Investigation" ? "Enrichment" : "Closed", caseId);
      },

      moveStage: (caseId, stage) => {
        const before = cases.find((c) => c.id === caseId)?.stage ?? "";
        patch(caseId, (c) => ({ ...c, stage }));
        appendTimeline(caseId, "Stage changed", `${before} → ${stage}`);
        logAudit("Stage changed", before, stage, caseId);
      },

      assignCase: (caseId, assignee) => {
        const before = cases.find((c) => c.id === caseId)?.assignee ?? "";
        patch(caseId, (c) => ({ ...c, assignee }));
        appendTimeline(caseId, "Case assigned", `${before} → ${assignee}`);
        logAudit("Case assigned", before, assignee, caseId);
      },

      claimNext: () => {
        const next = [...cases]
          .filter((c) => c.stage !== "Closed" && c.assignee === "Unassigned")
          .sort((a, b) => b.riskScore - a.riskScore)[0];
        if (!next) return undefined;
        patch(next.id, (c) => ({ ...c, assignee: actor }));
        appendTimeline(next.id, "Case claimed", `Claimed by ${actor}`);
        logAudit("Case claimed", "Unassigned", actor, next.id);
        return next.id;
      },

      addNote: (caseId, text) => {
        patch(caseId, (c) => ({
          ...c,
          notes: [...c.notes, { id: uid("N"), author: actor, at: new Date().toISOString(), text }],
        }));
        appendTimeline(caseId, "Note added", text.slice(0, 80));
      },

      attachEvidence: (caseId, identifier) => {
        patch(caseId, (c) => ({
          ...c,
          documents: [...c.documents, { id: uid("D"), name: `negbase-${identifier}.pdf`, kind: "Negative Database evidence", at: new Date().toISOString() }],
        }));
        appendTimeline(caseId, "Evidence attached", `Negative Database record for ${identifier}`);
        logAudit("Evidence attached", "No linkage", identifier, caseId);
      },

      toggleRule: (ruleId) => {
        setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r)));
        logAudit("Rule toggled", ruleId, "state changed");
      },

      resetDemo: () => {
        setAlerts(clone(seedAlerts));
        setCases(clone(seedCases));
        setRules(clone(seedRules));
        setEnforcement(clone(seedEnforcement));
        setAudit(clone(seedAudit));
      },
    };
  }, [role, actor, alerts, cases, rules, negbase, enforcement, audit]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useEDD() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useEDD must be used inside EDDProvider");
  return ctx;
}
