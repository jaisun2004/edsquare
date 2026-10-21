import type { CallRecord, QuestionnaireRecord } from "@/data/edd";
import type { DemoRun } from "@/lib/demo-runs";
import { createContext, useContext, useEffect, useMemo, useState, type Context, type ReactNode } from "react";
import {
  alerts as seedAlerts,
  audit as seedAudit,
  cases as seedCases,
  enforcement as seedEnforcement,
  negbase as seedNegbase,
  gradeForScore,
  type Alert,
  type AuditEntry,
  type EDDCase,
  type EnforcementEntry,
  type Channel,
  type NegbaseRecord,
  type Recommendation,
  type Role,
  type Stage,
  type TimelineEntry,
} from "@/data/edd";
import { roleActors } from "@/lib/roles";
import {
  seedRuleDefs,
  seedRuleGroups,
  seedRuleSets,
  type PolicyVersion,
  type RuleDef,
  type RuleGroup,
  type RuleSet,
  type Strategy,
} from "@/data/policy";
import { workbookSources } from "@/data/workbook";
import { alertAttributes, attributes as seedAttributes, dataSources as seedSources, type AttrMap, type Attribute, type DataSource } from "@/data/sources";
import { availableAttrs, runPolicy, type PolicyResult } from "@/lib/rule-engine";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export interface FlowLogEntry { at: string; actor: string; action: string; detail: string; channel: TimelineEntry["channel"] }

export interface TriageResult {
  alertId: string;
  score: number;
  grade: ReturnType<typeof gradeForScore>;
  recommendation: Recommendation;
  signals: { label: string; weight: number; detail: string }[];
  rulesTriggered: string[];
  segment: string;
  policy: PolicyResult;
}

interface StoreValue {
  role: Role;
  actor: string;
  setRole: (role: Role) => void;
  alerts: Alert[];
  cases: EDDCase[];
  rules: RuleDef[];
  ruleSets: RuleSet[];
  ruleGroups: RuleGroup[];
  sources: DataSource[];
  attributes: Attribute[];
  policyVersions: PolicyVersion[];
  attrsFor: (alertId: string) => AttrMap;
  evaluate: (alertId: string) => PolicyResult;
  addSource: (source: DataSource, newAttributes: Attribute[]) => void;
  toggleSource: (sourceId: string) => void;
  syncSource: (sourceId: string) => void;
  upsertRule: (rule: RuleDef, note: string) => void;
  retireRule: (ruleId: string) => void;
  approveRule: (ruleId: string) => void;
  moveRuleSet: (setId: string, dir: -1 | 1) => void;
  setStrategy: (setId: string, strategy: Strategy) => void;
  setRulePriority: (ruleId: string, priority: number) => void;
  publishPolicy: (note: string) => void;
  rollbackPolicy: (version: string) => void;
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
  injectAlert: (alert: Alert, attrs: AttrMap) => void;
  logEvent: (caseId: string | undefined, action: string, detail: string) => void;
  demoRuns: DemoRun[];
  recordRun: (run: DemoRun) => void;
  attachFlow: (caseId: string, f: { events?: FlowLogEntry[]; calls?: CallRecord[]; questionnaires?: QuestionnaireRecord[] }) => void;
}

// Keep one context object across hot reloads so an edited store module never orphans the mounted provider.
const DEMO_KEY = "edsquare.demoRuns";
const g = globalThis as { __eddStoreContext?: Context<StoreValue | null> };
const StoreContext = (g.__eddStoreContext ??= createContext<StoreValue | null>(null));

export function EDDProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("analyst");
  const [alerts, setAlerts] = useState<Alert[]>(() => clone(seedAlerts));
  const [cases, setCases] = useState<EDDCase[]>(() => clone(seedCases));
  const [rules, setRules] = useState<RuleDef[]>(() => clone(seedRuleDefs));
  const [ruleSets, setRuleSets] = useState<RuleSet[]>(() => clone(seedRuleSets));
  const [ruleGroups] = useState<RuleGroup[]>(() => clone(seedRuleGroups));
  const [sources, setSources] = useState<DataSource[]>(() => clone([...seedSources, ...workbookSources]));
  const [attributes, setAttributes] = useState<Attribute[]>(() => clone(seedAttributes));
  const [policyVersions, setPolicyVersions] = useState<PolicyVersion[]>(() => [
    { version: "v3.0", at: new Date(Date.now() - 20 * 86400_000).toISOString(), by: "Policy team", note: "Baseline money-mule EDD policy", rules: clone(seedRuleDefs), sets: clone(seedRuleSets) },
  ]);
  const [negbase] = useState<NegbaseRecord[]>(() => clone(seedNegbase));
  const [enforcement, setEnforcement] = useState<EnforcementEntry[]>(() => clone(seedEnforcement));
  const [audit, setAudit] = useState<AuditEntry[]>(() => clone(seedAudit));
  const [extraAttrs, setExtraAttrs] = useState<Record<string, AttrMap>>({});
  const [demoRuns, setDemoRuns] = useState<DemoRun[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Keep demo runs and the cases they created for the browser session.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(DEMO_KEY) ?? "null") as { runs: DemoRun[]; cases: EDDCase[] } | null;
      if (saved) {
        setDemoRuns(saved.runs);
        setCases((prev) => [...saved.cases.filter((c) => !prev.some((p) => p.id === c.id)), ...prev]);
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const ids = new Set(demoRuns.map((r) => r.caseId).filter(Boolean));
    sessionStorage.setItem(DEMO_KEY, JSON.stringify({ runs: demoRuns, cases: cases.filter((c) => ids.has(c.id)) }));
  }, [loaded, demoRuns, cases]);

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

    const attrsFor = (alertId: string) => availableAttrs(extraAttrs[alertId] ?? alertAttributes[alertId] ?? {}, sources, attributes);
    const evaluate = (alertId: string) => {
      const alert = alerts.find((a) => a.id === alertId);
      return runPolicy(attrsFor(alertId), rules, ruleSets, ruleGroups, alert?.preliminarySignal ?? "M");
    };

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

      attrsFor,
      evaluate,
      triageAlert: (alertId) => {
        const policy = evaluate(alertId);
        const grade = gradeForScore(policy.score);
        return {
          alertId,
          score: policy.score,
          grade,
          recommendation: policy.recommendation,
          rulesTriggered: policy.fired.map((r) => r.rule.id),
          segment: policy.outcome,
          policy,
          signals: policy.fired
            .filter((r) => r.rule.action.weight > 0)
            .slice(0, 5)
            .map((r) => ({ label: r.rule.name, weight: r.rule.action.weight, detail: r.rule.description })),
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

      ruleSets,
      ruleGroups,
      sources,
      attributes,
      policyVersions,

      addSource: (source, newAttributes) => {
        setSources((prev) => [...prev, source]);
        setAttributes((prev) => [...prev, ...newAttributes.filter((a) => !prev.some((p) => p.key === a.key))]);
        logAudit("Data source added", "—", `${source.name} (${newAttributes.length} fields)`);
      },
      toggleSource: (sourceId) => {
        const src = sources.find((x) => x.id === sourceId);
        setSources((prev) => prev.map((x) => (x.id === sourceId ? { ...x, status: !x.status } : x)));
        logAudit("Data source toggled", `${src?.name} ${src?.status ? "on" : "off"}`, src?.status ? "off" : "on");
      },
      syncSource: (sourceId) => {
        setSources((prev) =>
          prev.map((x) =>
            x.id === sourceId
              ? { ...x, lastSync: new Date().toISOString(), health: "Healthy", syncHistory: [{ at: new Date().toISOString(), records: 120 + Math.round(Math.random() * 300), status: "Success", durationSec: 9 }, ...x.syncHistory] }
              : x,
          ),
        );
      },
      upsertRule: (rule, note) => {
        const existing = rules.find((r) => r.id === rule.id);
        const version = existing ? existing.version + 1 : 1;
        const next: RuleDef = {
          ...rule,
          version,
          weight: rule.action.weight,
          threshold: rule.description,
          history: [{ version, at: new Date().toISOString(), by: actor, note }, ...(existing?.history ?? [])],
        };
        setRules((prev) => (existing ? prev.map((r) => (r.id === rule.id ? next : r)) : [...prev, next]));
        logAudit(existing ? "Rule updated" : "Rule created", existing ? `${rule.id} v${existing.version}` : "—", `${rule.id} v${version} ${rule.status}`);
      },
      retireRule: (ruleId) => {
        setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, status: "Retired", active: false } : r)));
        logAudit("Rule retired", ruleId, "Retired");
      },
      approveRule: (ruleId) => {
        setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, status: "Active", active: true, history: [{ version: r.version, at: new Date().toISOString(), by: actor, note: "Approved (checker)" }, ...r.history] } : r)));
        logAudit("Rule approved", `${ruleId} Pending approval`, "Active");
      },
      moveRuleSet: (setId, dir) => {
        setRuleSets((prev) => {
          const sorted = [...prev].sort((a, b) => a.order - b.order);
          const i = sorted.findIndex((x) => x.id === setId);
          const j = i + dir;
          if (j < 0 || j >= sorted.length) return prev;
          const a = sorted[i]!, b = sorted[j]!;
          return prev.map((x) => (x.id === a.id ? { ...x, order: b.order } : x.id === b.id ? { ...x, order: a.order } : x));
        });
        logAudit("Rule set reordered", setId, dir < 0 ? "moved up" : "moved down");
      },
      setStrategy: (setId, strategy) => {
        setRuleSets((prev) => prev.map((x) => (x.id === setId ? { ...x, strategy } : x)));
        logAudit("Combine strategy changed", setId, strategy);
      },
      setRulePriority: (ruleId, priority) => {
        setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, priority } : r)));
      },
      publishPolicy: (note) => {
        const last = policyVersions[0]?.version ?? "v3.0";
        const [maj, min] = last.slice(1).split(".").map(Number);
        const version = `v${maj}.${(min ?? 0) + 1}`;
        setPolicyVersions((prev) => [{ version, at: new Date().toISOString(), by: actor, note, rules: clone(rules), sets: clone(ruleSets) }, ...prev]);
        logAudit("Policy published", last, version);
      },
      rollbackPolicy: (version) => {
        const v = policyVersions.find((p) => p.version === version);
        if (!v) return;
        setRules(clone(v.rules));
        setRuleSets(clone(v.sets));
        logAudit("Policy rolled back", "Working copy", version);
      },

      toggleRule: (ruleId) => {
        setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, active: !r.active } : r)));
        logAudit("Rule toggled", ruleId, "state changed");
      },

      logEvent: (caseId, action, detail) => {
        logAudit(action, "—", detail, caseId);
        if (caseId) appendTimeline(caseId, action, detail);
      },

      demoRuns,
      recordRun: (run) => setDemoRuns((prev) => [run, ...prev.filter((r) => r.id !== run.id)]),

      attachFlow: (caseId, f) => {
        const evs = (f.events ?? []).map((e) => ({ id: uid("T"), at: e.at, actor: e.actor, action: e.action, detail: e.detail, channel: e.channel }) satisfies TimelineEntry);
        setCases((prev) => prev.map((c) => {
          if (c.id !== caseId) return c;
          const merge = <T extends { id: string }>(a: T[] = [], b: T[] = []) => [...a.filter((x) => !b.some((y) => y.id === x.id)), ...b];
          return { ...c, timeline: [...c.timeline, ...evs].sort((a, b) => a.at.localeCompare(b.at)), calls: merge(c.calls, f.calls), questionnaires: merge(c.questionnaires, f.questionnaires) };
        }));
        for (const e of f.events ?? []) logAudit(e.action, "—", e.detail, caseId);
      },

      injectAlert: (alert, attrs) => {
        setExtraAttrs((prev) => ({ ...prev, [alert.id]: attrs }));
        setAlerts((prev) => [alert, ...prev]);
        logAudit("Simulated transaction ingested", "—", `${alert.id} New`);
      },

      resetDemo: () => {
        setExtraAttrs({});
        setDemoRuns([]);
        setAlerts(clone(seedAlerts));
        setCases(clone(seedCases));
        setRules(clone(seedRuleDefs));
        setRuleSets(clone(seedRuleSets));
        setSources(clone([...seedSources, ...workbookSources]));
        setAttributes(clone(seedAttributes));
        setEnforcement(clone(seedEnforcement));
        setAudit(clone(seedAudit));
      },
    };
  }, [role, actor, alerts, cases, rules, ruleSets, ruleGroups, sources, attributes, policyVersions, negbase, enforcement, audit, extraAttrs, demoRuns]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useEDD() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useEDD must be used inside EDDProvider");
  return ctx;
}
