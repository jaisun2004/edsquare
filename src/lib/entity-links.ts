import type { Alert, EDDCase, EnforcementEntry, NegbaseRecord } from "@/data/edd";
import type { DemoRun } from "@/lib/demo-runs";

/** Linked history: one place that decides which records share an identifier. */
export type IdKind = "account" | "phone" | "upi" | "device" | "name";
export interface Ident { kind: IdKind; value: string }
export type Strength = "strong" | "possible";
export interface LinkReason { kind: IdKind; value: string; strength: Strength }
export interface Match<T> { item: T; linkedBy: LinkReason[]; strength: Strength }

export interface LinkData {
  cases: EDDCase[];
  alerts: Alert[];
  negbase: NegbaseRecord[];
  enforcement: EnforcementEntry[];
  runs?: DemoRun[] | undefined;
}

export const KIND_LABEL: Record<IdKind, string> = { account: "Account", phone: "Phone", upi: "UPI ID", device: "Device", name: "Name" };

export function normalizeIdentifier(kind: IdKind, raw: string): string {
  const s = (raw ?? "").trim();
  if (!s || s === "—") return "";
  switch (kind) {
    case "phone": {
      let d = s.replace(/\D/g, "");
      if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
      if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
      return d;
    }
    case "upi": return s.toLowerCase().replace(/\s+/g, "");
    case "account": return s.toUpperCase().replace(/[^0-9X]/g, "");
    case "device": return s.toUpperCase().replace(/\s+/g, "");
    case "name": return s.toLowerCase().replace(/[^a-z ]/g, "").replace(/\s+/g, " ").trim();
  }
}

/** Guesses what a typed search value is. */
export function detectKind(raw: string): IdKind {
  const s = raw.trim();
  if (s.includes("@")) return "upi";
  if (/^dev[-_]/i.test(s)) return "device";
  const digits = s.replace(/[\s+\-()]/g, "");
  if (/^(\+?91)?[6-9]\d{9}$/.test(digits)) return "phone";
  if (/^[0-9xX]{4,}$/.test(digits)) return "account";
  return "name";
}

function id(kind: IdKind, raw: string | undefined): Ident[] {
  const v = raw ? normalizeIdentifier(kind, raw) : "";
  return v ? [{ kind, value: v }] : [];
}

export function identifiersOfCase(c: EDDCase): Ident[] {
  return dedupe([...id("account", c.account), ...id("upi", c.upi), ...id("phone", c.phone), ...id("phone", c.contact?.phone), ...id("device", c.deviceId), ...id("name", c.customer)]);
}
export function identifiersOfAlert(a: Alert): Ident[] {
  return dedupe([...id("account", a.account), ...id("upi", a.upi), ...id("phone", a.phone), ...id("device", a.deviceId), ...id("name", a.customer)]);
}
const NB_KIND: Record<NegbaseRecord["kind"], IdKind | null> = { UPI: "upi", Mobile: "phone", Account: "account", Name: "name", Domain: null };
export function identifiersOfNegbase(n: NegbaseRecord): Ident[] {
  const k = NB_KIND[n.kind];
  return dedupe([...(k ? id(k, n.identifier) : []), ...n.associated.flatMap((a) => id(detectKind(a), a))]);
}

function dedupe(list: Ident[]): Ident[] {
  const seen = new Set<string>();
  return list.filter((i) => (seen.has(i.kind + i.value) ? false : (seen.add(i.kind + i.value), true)));
}

/** Compares two identifiers; masked accounts (XXXX1234) only give a "possible" match on the last 4 digits. */
export function compare(a: Ident, b: Ident): Strength | null {
  // A 10-digit number may be an account or a phone; compare across those kinds by digits.
  const numeric = (k: IdKind) => k === "account" || k === "phone";
  if (a.kind !== b.kind && !(numeric(a.kind) && numeric(b.kind))) return null;
  if (a.kind === "name" || b.kind === "name") return a.value === b.value ? "possible" : null;
  if (a.value === b.value) return "strong";
  if (numeric(a.kind) && numeric(b.kind)) {
    const masked = (v: string) => v.includes("X");
    const tail = (v: string) => v.replace(/X/g, "").slice(-4);
    if ((masked(a.value) || masked(b.value)) && tail(a.value).length === 4 && tail(a.value) === tail(b.value)) return "possible";
  }
  return null;
}

function link(query: Ident[], target: Ident[]): LinkReason[] {
  const out: LinkReason[] = [];
  for (const q of query) for (const t of target) {
    const s = compare(q, t);
    if (s && !out.some((o) => o.kind === t.kind && o.value === t.value)) out.push({ kind: t.kind, value: t.value, strength: s });
  }
  return out;
}

function toMatch<T>(item: T, linkedBy: LinkReason[]): Match<T> | null {
  if (!linkedBy.length) return null;
  return { item, linkedBy, strength: linkedBy.some((l) => l.strength === "strong") ? "strong" : "possible" };
}

/** Turns typed text into identifiers to search for. Numbers are searched as both account and phone. */
export function queryIdents(raw: string): Ident[] {
  const kind = detectKind(raw);
  if (kind === "phone") return dedupe([...id("phone", raw), ...id("account", raw)]);
  if (kind === "account") {
    const v = normalizeIdentifier("account", raw);
    // A short number like "4417" is treated as the last 4 digits of an account.
    return v.length <= 6 && !v.includes("X") ? [{ kind: "account", value: `XXXX${v.slice(-4)}` }] : [{ kind: "account", value: v }];
  }
  return id(kind, raw);
}

export interface LinkedResult {
  cases: Match<EDDCase>[];
  alerts: Match<Alert>[];
  negbase: Match<NegbaseRecord>[];
}

export function findLinked(query: Ident[], data: LinkData, opts: { excludeCaseId?: string | undefined; excludeAlertId?: string | undefined } = {}): LinkedResult {
  const byStrengthThenDate = <T,>(date: (t: T) => string) => (a: Match<T>, b: Match<T>) =>
    a.strength !== b.strength ? (a.strength === "strong" ? -1 : 1) : date(b.item).localeCompare(date(a.item));
  const cases = data.cases
    .filter((c) => c.id !== opts.excludeCaseId)
    .map((c) => toMatch(c, link(query, identifiersOfCase(c))))
    .filter((m): m is Match<EDDCase> => !!m)
    .sort(byStrengthThenDate((c) => c.openedAt));
  const alerts = data.alerts
    .filter((a) => a.id !== opts.excludeAlertId && (!opts.excludeCaseId || a.caseId !== opts.excludeCaseId))
    .map((a) => toMatch(a, link(query, identifiersOfAlert(a))))
    .filter((m): m is Match<Alert> => !!m)
    .sort(byStrengthThenDate((a) => a.receivedAt));
  const negbase = data.negbase
    .map((n) => toMatch(n, link(query, identifiersOfNegbase(n))))
    .filter((m): m is Match<NegbaseRecord> => !!m)
    .sort(byStrengthThenDate((n) => n.lastSeen));
  return { cases, alerts, negbase };
}

export type CaseDecision = "Blocked" | "Unblocked" | "Verified" | "Open" | "Closed";
export function caseDecision(c: EDDCase, enforcement: EnforcementEntry[]): { label: CaseDecision; reason?: string | undefined; at?: string | undefined } {
  const enf = enforcement.find((e) => e.caseId === c.id);
  const out = enf?.action ?? (c.decision?.outcome === "Block" || c.decision?.outcome === "Unblock" ? c.decision.outcome : undefined);
  if (out === "Block") return { label: "Blocked", reason: enf?.reason ?? c.decision?.reason, at: enf?.at ?? c.decision?.at };
  if (out === "Unblock") return { label: "Unblocked", reason: enf?.reason ?? c.decision?.reason, at: enf?.at ?? c.decision?.at };
  if (c.stage === "Closed") return { label: "Closed", reason: c.decision?.reason };
  return { label: "Open" };
}

export interface HistorySummary {
  priorCases: number;
  blocked: number;
  negbaseHits: number;
  possible: number;
  last?: { caseId: string; decision: CaseDecision; category: string; at: string } | undefined;
  flag: "red" | "amber" | "none";
}

/** Summary used by the case card, alert strip, lists and simulator. Only strong links count toward risk. */
export function summarise(result: LinkedResult, enforcement: EnforcementEntry[]): HistorySummary {
  const strong = result.cases.filter((m) => m.strength === "strong");
  const blocked = strong.filter((m) => caseDecision(m.item, enforcement).label === "Blocked").length;
  const negbaseHits = result.negbase.filter((m) => m.strength === "strong").length;
  const latest = strong[0] ? [...strong].sort((a, b) => b.item.openedAt.localeCompare(a.item.openedAt))[0] : undefined;
  const last = latest ? { caseId: latest.item.id, decision: caseDecision(latest.item, enforcement).label, category: latest.item.category, at: latest.item.openedAt } : undefined;
  return {
    priorCases: strong.length,
    blocked,
    negbaseHits,
    possible: result.cases.length - strong.length,
    last,
    flag: blocked > 0 || negbaseHits > 0 ? "red" : strong.length > 0 ? "amber" : "none",
  };
}

export function caseHistory(c: EDDCase, data: LinkData) {
  const result = findLinked(identifiersOfCase(c), data, { excludeCaseId: c.id });
  return { result, summary: summarise(result, data.enforcement) };
}

export function alertHistory(a: Alert, data: LinkData) {
  const result = findLinked(identifiersOfAlert(a), data, { excludeAlertId: a.id, excludeCaseId: a.caseId });
  return { result, summary: summarise(result, data.enforcement) };
}

/** Extra risk points for prior history (shown in the simulator; name-only matches never score). */
export function priorHistoryPoints(s: HistorySummary, pointsPerBlocked = 5): number {
  return s.blocked * pointsPerBlocked;
}

// ---------- Graph ----------
export interface GraphNode { id: string; type: "ident" | "case" | "negbase"; label: string; sub?: string | undefined; kind?: IdKind | undefined; tone: "red" | "green" | "amber" | "neutral"; center?: boolean | undefined }
export interface GraphEdge { from: string; to: string; strength: Strength }

export function buildGraph(query: Ident[], result: LinkedResult, enforcement: EnforcementEntry[], opts: { includeNames?: boolean } = {}): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const identNode = (i: Ident, center = false) => {
    const key = `i:${i.kind}:${i.value}`;
    if (!nodes.has(key)) nodes.set(key, { id: key, type: "ident", kind: i.kind, label: i.value, sub: KIND_LABEL[i.kind], tone: "neutral", center });
    else if (center) nodes.get(key)!.center = true;
    return key;
  };
  query.filter((q) => opts.includeNames || q.kind !== "name").forEach((q) => identNode(q, true));
  for (const m of result.cases) {
    const d = caseDecision(m.item, enforcement).label;
    const key = `c:${m.item.id}`;
    nodes.set(key, { id: key, type: "case", label: m.item.id, sub: `${m.item.customer} · ${d}`, tone: d === "Blocked" ? "red" : d === "Unblocked" || d === "Verified" ? "green" : "amber" });
    for (const i of identifiersOfCase(m.item)) {
      if (i.kind === "name" && !opts.includeNames) continue;
      const linked = m.linkedBy.find((l) => l.kind === i.kind && l.value === i.value);
      edges.push({ from: key, to: identNode(i), strength: linked?.strength ?? "strong" });
    }
  }
  for (const m of result.negbase) {
    const key = `n:${m.item.id}`;
    nodes.set(key, { id: key, type: "negbase", label: m.item.id, sub: `Negative DB · ${m.item.category}`, tone: "red" });
    for (const i of identifiersOfNegbase(m.item)) edges.push({ from: key, to: identNode(i), strength: m.linkedBy.find((l) => l.value === i.value)?.strength ?? "strong" });
  }
  return { nodes: [...nodes.values()], edges };
}
