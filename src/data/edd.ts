// Typed domain model + seed data for the Unified Digital EDD prototype.
// Front-end only: no backend, everything is in-memory for the demo session.

export type RiskGrade = "VH" | "H" | "M" | "L";
export type Role = "analyst" | "investigator" | "supervisor" | "admin" | "auditor";
export type Stage =
  | "Triaged"
  | "Enrichment"
  | "Engagement"
  | "Human Review"
  | "Decision Pending"
  | "Closed";
export type Category =
  | "Betting"
  | "Gambling"
  | "Investment Scam"
  | "Job Scam"
  | "Shopping Scam"
  | "Carding"
  | "Subscription Scam"
  | "Mule";
export type Recommendation = "Block" | "Unblock" | "Further Investigation";
export type AlertStatus = "New" | "Triaged" | "Dismissed";
export type Channel = "AI Call" | "WhatsApp" | "Email" | "SMS" | "Net Banking";

export interface Signal {
  label: string;
  weight: number;
  detail: string;
}

export interface Rule {
  id: string;
  name: string;
  family: string;
  weight: number;
  threshold: string;
  active: boolean;
}

export interface Alert {
  id: string;
  source: "Negative Database" | "Fraud / AML Engine" | "Risk Model" | "CRM Complaint" | "External Intelligence";
  account: string;
  upi: string;
  customer: string;
  trigger: string;
  receivedAt: string;
  preliminarySignal: RiskGrade;
  status: AlertStatus;
  caseId?: string;
}

export interface EngagementAttempt {
  id: string;
  channel: Channel;
  status: "Sent" | "Delivered" | "Responded" | "No Response";
  at: string;
  outcome: string;
  transcript?: { speaker: "Bot" | "Customer"; text: string }[];
}

export interface TimelineEntry {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
  channel?: "checks" | "voice" | "whatsapp" | "decision" | "system" | undefined;
}

export interface CallAnswer { question: string; answer: string; points: number }

export interface CallRecord {
  id: string;
  attempt: number;
  number: string; // masked
  real: boolean;
  startedAt: string;
  endedAt?: string | undefined;
  status: string;
  outcome: "answered" | "no_response" | "failed";
  disposition?: string | undefined;
  summary?: string | undefined;
  recordingUrl?: string | undefined;
  partnerRecordId?: string | undefined;
  transcript: { role: string; text: string }[];
  /** Started from the case page rather than the demo run. */
  origin?: "case" | undefined;
  answers?: CallAnswer[] | undefined;
  flag?: number | undefined;
  colour?: string | undefined;
}

export interface QuestionnaireRecord {
  id: string;
  number: string; // masked
  real: boolean;
  sentAt: string;
  submittedAt?: string | undefined;
  link?: string | undefined;
  outcome: "submitted" | "no_response" | "failed";
  origin?: "case" | undefined;
  answers?: CallAnswer[] | undefined;
  flag?: number | undefined;
  colour?: string | undefined;
}

export interface Enrichment {
  matchCriteria: string;
  negbaseAttributes: string[];
  upiHandleCount: number;
  mobileVintage: string;
  mobileType: "Prepaid" | "Postpaid";
  socialPresence: string[];
  telco: string;
  osint: string[];
}

export interface EDDCase {
  id: string;
  customer: string;
  account: string;
  upi: string;
  category: Category;
  stage: Stage;
  riskScore: number;
  grade: RiskGrade;
  assignee: string;
  openedAt: string;
  slaDueAt: string;
  signals: Signal[];
  rulesTriggered: string[];
  enrichment: Enrichment;
  engagement: EngagementAttempt[];
  timeline: TimelineEntry[];
  calls?: CallRecord[] | undefined;
  /** Person actually contacted in a demo run (name/number entered before Run). */
  contact?: { name: string; phone: string; lang: string } | undefined;
  questionnaires?: QuestionnaireRecord[] | undefined;
  notes: { id: string; author: string; at: string; text: string }[];
  documents: { id: string; name: string; kind: string; at: string }[];
  rationale?: { text: string; evidence: boolean; policy: boolean; confidence: "Low" | "Medium" | "High"; savedBy: string };
  decision?: { outcome: Recommendation; by: string; approvedBy?: string; at: string; reason: string };
  recommendation?: Recommendation;
}

export interface NegbaseRecord {
  id: string;
  identifier: string;
  kind: "UPI" | "Mobile" | "Account" | "Domain" | "Name";
  category: Category;
  source: string;
  firstSeen: string;
  lastSeen: string;
  associated: string[];
  website?: string;
  gateway?: string;
  evidence: string;
}

export interface EnforcementEntry {
  id: string;
  caseId: string;
  account: string;
  customer: string;
  action: "Block" | "Unblock";
  decidedBy: string;
  approvedBy?: string;
  reason: string;
  at: string;
  accountStatus: string;
  downstreamStatus: "Sent to Core Banking" | "Acknowledged" | "Pending";
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: string;
  role: Role;
  caseId?: string;
  action: string;
  before: string;
  after: string;
}

export const RISK_BANDS: { grade: RiskGrade; label: string; range: string }[] = [
  { grade: "VH", label: "Very High", range: "80 – 100" },
  { grade: "H", label: "High", range: "60 – 79" },
  { grade: "M", label: "Medium", range: "35 – 59" },
  { grade: "L", label: "Low", range: "0 – 34" },
];

export function gradeForScore(score: number): RiskGrade {
  if (score >= 80) return "VH";
  if (score >= 60) return "H";
  if (score >= 35) return "M";
  return "L";
}

export const rules: Rule[] = [
  { id: "R-01", name: "Rapid pass-through of funds", family: "Behavioural", weight: 14, threshold: "> 80% credits withdrawn < 60 min", active: true },
  { id: "R-02", name: "Structuring below reporting limit", family: "Behavioural", weight: 11, threshold: "≥ 5 credits of ₹45k–₹49.9k / 24h", active: true },
  { id: "R-03", name: "Fan-in / fan-out pattern", family: "Behavioural", weight: 12, threshold: "≥ 15 unique counterparties / 7d", active: true },
  { id: "R-04", name: "Dormant then suddenly active", family: "Behavioural", weight: 9, threshold: "90d dormancy → ₹2L+ throughput", active: true },
  { id: "R-05", name: "New account, high throughput", family: "Behavioural", weight: 10, threshold: "< 60d vintage, > ₹5L credits", active: true },
  { id: "R-06", name: "Round-tripping between linked accounts", family: "Behavioural", weight: 8, threshold: "≥ 3 cycles / 48h", active: true },
  { id: "R-07", name: "Low mobile vintage", family: "Identity / KYC", weight: 7, threshold: "SIM age < 90 days", active: true },
  { id: "R-08", name: "Prepaid SIM on high-value account", family: "Identity / KYC", weight: 5, threshold: "Prepaid + > ₹3L monthly", active: true },
  { id: "R-09", name: "Device shared across customers", family: "Identity / KYC", weight: 10, threshold: "≥ 3 CIFs per device ID", active: true },
  { id: "R-10", name: "Excessive UPI handles", family: "Identity / KYC", weight: 8, threshold: "> 4 handles on one account", active: true },
  { id: "R-11", name: "Negative Database exact hit", family: "Negative Database / OSINT", weight: 20, threshold: "Exact UPI / mobile match", active: true },
  { id: "R-12", name: "Negative Database fuzzy hit", family: "Negative Database / OSINT", weight: 9, threshold: "Similarity ≥ 0.85", active: true },
  { id: "R-13", name: "Regulatory watchlist presence", family: "Negative Database / OSINT", weight: 15, threshold: "Any watchlist match", active: true },
  { id: "R-14", name: "Adverse media mention", family: "Negative Database / OSINT", weight: 7, threshold: "≥ 1 credible article", active: true },
  { id: "R-15", name: "Scam infrastructure linkage", family: "Negative Database / OSINT", weight: 13, threshold: "UPI on scam site / gateway", active: true },
  { id: "R-16", name: "Cross-border velocity spike", family: "Velocity / Geo", weight: 9, threshold: "> 3 geos / 24h", active: true },
  { id: "R-17", name: "High-risk merchant category", family: "Velocity / Geo", weight: 6, threshold: "Betting / gaming MCC", active: true },
];

const now = Date.now();
const hrs = (h: number) => new Date(now - h * 3600_000).toISOString();
const inHrs = (h: number) => new Date(now + h * 3600_000).toISOString();

export const alerts: Alert[] = [
  { id: "AL-1041", source: "Negative Database", account: "XXXX4417", upi: "rahul.mehra@okaxis", customer: "Rahul Mehra", trigger: "UPI handle found on betting collection page", receivedAt: hrs(2), preliminarySignal: "VH", status: "New" },
  { id: "AL-1042", source: "Fraud / AML Engine", account: "XXXX9082", upi: "sneha.rao1@ybl", customer: "Sneha Rao", trigger: "Rapid pass-through, 22 counterparties in 3 days", receivedAt: hrs(4), preliminarySignal: "H", status: "New" },
  { id: "AL-1043", source: "Risk Model", account: "XXXX1120", upi: "kmurthy@okhdfcbank", customer: "K. Murthy", trigger: "Model score 0.71 — mule propensity", receivedAt: hrs(6), preliminarySignal: "M", status: "New" },
  { id: "AL-1044", source: "CRM Complaint", account: "XXXX3388", upi: "quickjobs.hr@paytm", customer: "Imran Shaikh", trigger: "3 victim complaints — fake job offers", receivedAt: hrs(9), preliminarySignal: "VH", status: "New" },
  { id: "AL-1045", source: "External Intelligence", account: "XXXX7761", upi: "deepa.k@ibl", customer: "Deepa Krishnan", trigger: "Handle referenced in scam Telegram channel", receivedAt: hrs(12), preliminarySignal: "H", status: "New" },
  { id: "AL-1046", source: "Risk Model", account: "XXXX5093", upi: "arvind.s@okicici", customer: "Arvind Suresh", trigger: "Salary account, benign velocity uplift", receivedAt: hrs(18), preliminarySignal: "L", status: "New" },
  { id: "AL-1047", source: "Fraud / AML Engine", account: "XXXX2210", upi: "shopmarttrend@ybl", customer: "Nikhil Bansal", trigger: "Structuring below ₹50k threshold", receivedAt: hrs(22), preliminarySignal: "H", status: "New" },
  { id: "AL-1048", source: "Negative Database", account: "XXXX6644", upi: "trader.pro9@okaxis", customer: "Vikas Yadav", trigger: "Fuzzy match to known investment-scam handle", receivedAt: hrs(26), preliminarySignal: "M", status: "New" },
  { id: "AL-1049", source: "Risk Model", account: "XXXX8890", upi: "meena.g@okhdfcbank", customer: "Meena Gupta", trigger: "Dormant 120d then ₹4.2L throughput", receivedAt: hrs(30), preliminarySignal: "H", status: "New" },
  { id: "AL-1050", source: "CRM Complaint", account: "XXXX7005", upi: "prime.subs@ybl", customer: "Rohit Nair", trigger: "Unauthorised subscription debits reported", receivedAt: hrs(34), preliminarySignal: "M", status: "New" },
];

function baseEnrichment(p: Partial<Enrichment> = {}): Enrichment {
  return {
    matchCriteria: "UPI handle exact match",
    negbaseAttributes: ["Category: Betting", "Source: Web crawl", "Confidence: High"],
    upiHandleCount: 3,
    mobileVintage: "8 months",
    mobileType: "Prepaid",
    socialPresence: ["Telegram: active", "Instagram: promotional"],
    telco: "Airtel — circle Maharashtra, prepaid, 1 port-out in 6m",
    osint: ["Handle listed on 2 crawled payment pages"],
    ...p,
  };
}

export const cases: EDDCase[] = [
  {
    id: "CASE-2041", customer: "Suresh Pillai", account: "XXXX1188", upi: "spillai.pay@okaxis", category: "Betting",
    stage: "Triaged", riskScore: 88, grade: "VH", assignee: "Priya Nair", openedAt: hrs(5), slaDueAt: inHrs(3),
    signals: [
      { label: "Negbase exact hit", weight: 20, detail: "Handle on 3 betting collection pages" },
      { label: "Rapid pass-through", weight: 14, detail: "94% of credits withdrawn in 40 min" },
      { label: "Fan-in pattern", weight: 12, detail: "31 unique payers in 7 days" },
    ],
    rulesTriggered: ["R-11", "R-01", "R-03"], enrichment: baseEnrichment(), engagement: [],
    timeline: [{ id: "T1", at: hrs(5), actor: "System", action: "Case created", detail: "From alert AL-1032 (Negative Database)" }],
    notes: [], documents: [{ id: "D1", name: "negbase-evidence.pdf", kind: "Evidence", at: hrs(5) }],
    recommendation: "Block",
  },
  {
    id: "CASE-2042", customer: "Anita Desai", account: "XXXX4470", upi: "anita.desai@ybl", category: "Investment Scam",
    stage: "Enrichment", riskScore: 76, grade: "H", assignee: "Priya Nair", openedAt: hrs(11), slaDueAt: inHrs(9),
    signals: [
      { label: "Fuzzy Negbase hit", weight: 9, detail: "0.89 similarity to trader.pro handles" },
      { label: "New account throughput", weight: 10, detail: "42 days vintage, ₹7.4L credits" },
    ],
    rulesTriggered: ["R-12", "R-05", "R-07"], enrichment: baseEnrichment({ matchCriteria: "Fuzzy match (0.89)", upiHandleCount: 5 }), engagement: [],
    timeline: [{ id: "T1", at: hrs(11), actor: "System", action: "Triage completed", detail: "Recommendation: Further Investigation" }],
    notes: [], documents: [], recommendation: "Further Investigation",
  },
  {
    id: "CASE-2043", customer: "Imran Shaikh", account: "XXXX3388", upi: "quickjobs.hr@paytm", category: "Job Scam",
    stage: "Engagement", riskScore: 91, grade: "VH", assignee: "Arjun Rao", openedAt: hrs(20), slaDueAt: inHrs(-2),
    signals: [
      { label: "Victim complaints", weight: 15, detail: "3 CRM complaints in 5 days" },
      { label: "Negbase exact hit", weight: 20, detail: "Handle on fake recruitment portal" },
    ],
    rulesTriggered: ["R-11", "R-15", "R-09"], enrichment: baseEnrichment({ negbaseAttributes: ["Category: Job Scam", "Source: Victim complaint", "Confidence: High"] }),
    engagement: [
      {
        id: "E1", channel: "AI Call", status: "Responded", at: hrs(6), outcome: "Customer denied operating recruitment page; inconsistent answers on fund source",
        transcript: [
          { speaker: "Bot", text: "This is an automated verification call from your bank regarding recent activity on your account." },
          { speaker: "Customer", text: "Yes, go ahead." },
          { speaker: "Bot", text: "Can you confirm the purpose of the frequent small credits received this week?" },
          { speaker: "Customer", text: "Those are… from friends. I do not run any business." },
          { speaker: "Bot", text: "Our records show a recruitment website using your UPI handle. Are you aware of it?" },
          { speaker: "Customer", text: "No. I gave my details to someone who promised me commission." },
        ],
      },
      { id: "E2", channel: "WhatsApp", status: "Delivered", at: hrs(5), outcome: "Document request delivered, no reply" },
    ],
    timeline: [
      { id: "T1", at: hrs(20), actor: "System", action: "Case created", detail: "From alert AL-1044" },
      { id: "T2", at: hrs(6), actor: "AI Calling Bot", action: "Engagement completed", detail: "Customer responded — admitted handing over credentials" },
    ],
    notes: [{ id: "N1", author: "Arjun Rao", at: hrs(5), text: "Statements inconsistent with transaction pattern. Likely rented account." }],
    documents: [], recommendation: "Block",
  },
  {
    id: "CASE-2044", customer: "Nikhil Bansal", account: "XXXX2210", upi: "shopmarttrend@ybl", category: "Shopping Scam",
    stage: "Human Review", riskScore: 68, grade: "H", assignee: "Arjun Rao", openedAt: hrs(28), slaDueAt: inHrs(12),
    signals: [{ label: "Structuring", weight: 11, detail: "7 credits of ₹48,500 in 24h" }, { label: "Adverse media", weight: 7, detail: "Consumer forum complaints" }],
    rulesTriggered: ["R-02", "R-14"], enrichment: baseEnrichment({ mobileType: "Postpaid", mobileVintage: "4 years" }),
    engagement: [{ id: "E1", channel: "Email", status: "Responded", at: hrs(10), outcome: "Provided GST invoice and supplier contracts" }],
    timeline: [{ id: "T1", at: hrs(28), actor: "System", action: "Case created", detail: "From alert AL-1047" }],
    notes: [], documents: [{ id: "D1", name: "gst-invoices.pdf", kind: "Customer document", at: hrs(10) }],
    rationale: { text: "Merchant provided verifiable invoices matching credit volumes. No Negbase linkage.", evidence: true, policy: true, confidence: "Medium", savedBy: "Arjun Rao" },
    recommendation: "Further Investigation",
  },
  {
    id: "CASE-2045", customer: "Deepa Krishnan", account: "XXXX7761", upi: "deepa.k@ibl", category: "Gambling",
    stage: "Decision Pending", riskScore: 84, grade: "VH", assignee: "Arjun Rao", openedAt: hrs(40), slaDueAt: inHrs(-6),
    signals: [{ label: "Scam infrastructure", weight: 13, detail: "Handle on 2 offshore gambling sites" }, { label: "Cross-border velocity", weight: 9, detail: "4 geos in 24h" }],
    rulesTriggered: ["R-15", "R-16", "R-17"], enrichment: baseEnrichment({ negbaseAttributes: ["Category: Gambling", "Source: External intel", "Confidence: High"] }),
    engagement: [{ id: "E1", channel: "AI Call", status: "No Response", at: hrs(14), outcome: "3 attempts, unanswered" }],
    timeline: [{ id: "T1", at: hrs(40), actor: "System", action: "Case created", detail: "From alert AL-1045" }],
    notes: [], documents: [],
    rationale: { text: "No customer response across channels. Strong external intelligence linkage to gambling collection.", evidence: true, policy: true, confidence: "High", savedBy: "Arjun Rao" },
    recommendation: "Block",
  },
  {
    id: "CASE-2046", customer: "Arvind Suresh", account: "XXXX5093", upi: "arvind.s@okicici", category: "Mule",
    stage: "Closed", riskScore: 22, grade: "L", assignee: "Priya Nair", openedAt: hrs(60), slaDueAt: hrs(12),
    signals: [{ label: "Velocity uplift", weight: 6, detail: "Explained by annual bonus credit" }],
    rulesTriggered: ["R-05"], enrichment: baseEnrichment({ matchCriteria: "No Negbase match", mobileType: "Postpaid", negbaseAttributes: ["No hits"] }),
    engagement: [{ id: "E1", channel: "WhatsApp", status: "Responded", at: hrs(50), outcome: "Salary slip and bonus letter provided" }],
    timeline: [{ id: "T1", at: hrs(48), actor: "Priya Nair", action: "Decision recorded", detail: "Unblock — cleared" }],
    notes: [], documents: [],
    decision: { outcome: "Unblock", by: "Priya Nair", at: hrs(48), reason: "Documented legitimate source of funds; no negative linkage." },
    recommendation: "Unblock",
  },
  {
    id: "CASE-2047", customer: "Vikas Yadav", account: "XXXX6644", upi: "trader.pro9@okaxis", category: "Investment Scam",
    stage: "Enrichment", riskScore: 63, grade: "H", assignee: "Unassigned", openedAt: hrs(15), slaDueAt: inHrs(6),
    signals: [{ label: "Fuzzy Negbase hit", weight: 9, detail: "Matches trader.pro cluster" }, { label: "Excessive UPI handles", weight: 8, detail: "6 handles active" }],
    rulesTriggered: ["R-12", "R-10"], enrichment: baseEnrichment({ upiHandleCount: 6 }), engagement: [],
    timeline: [{ id: "T1", at: hrs(15), actor: "System", action: "Case created", detail: "From alert AL-1048" }], notes: [], documents: [],
    recommendation: "Further Investigation",
  },
  {
    id: "CASE-2048", customer: "Meena Gupta", account: "XXXX8890", upi: "meena.g@okhdfcbank", category: "Mule",
    stage: "Engagement", riskScore: 71, grade: "H", assignee: "Priya Nair", openedAt: hrs(33), slaDueAt: inHrs(2),
    signals: [{ label: "Dormant then active", weight: 9, detail: "120d dormancy, ₹4.2L throughput" }, { label: "Device shared", weight: 10, detail: "3 CIFs on same device" }],
    rulesTriggered: ["R-04", "R-09"], enrichment: baseEnrichment(),
    engagement: [{ id: "E1", channel: "SMS", status: "Sent", at: hrs(3), outcome: "Verification link sent" }],
    timeline: [{ id: "T1", at: hrs(33), actor: "System", action: "Case created", detail: "From alert AL-1049" }], notes: [], documents: [],
    recommendation: "Further Investigation",
  },
  {
    id: "CASE-2049", customer: "Rohit Nair", account: "XXXX7005", upi: "prime.subs@ybl", category: "Subscription Scam",
    stage: "Human Review", riskScore: 57, grade: "M", assignee: "Arjun Rao", openedAt: hrs(36), slaDueAt: inHrs(14),
    signals: [{ label: "Victim complaints", weight: 15, detail: "Unauthorised recurring debits" }],
    rulesTriggered: ["R-14"], enrichment: baseEnrichment({ mobileType: "Postpaid" }), engagement: [],
    timeline: [{ id: "T1", at: hrs(36), actor: "System", action: "Case created", detail: "From alert AL-1050" }], notes: [], documents: [],
    recommendation: "Further Investigation",
  },
  {
    id: "CASE-2050", customer: "Farhan Qureshi", account: "XXXX9931", upi: "cardbin.fq@ybl", category: "Carding",
    stage: "Triaged", riskScore: 93, grade: "VH", assignee: "Unassigned", openedAt: hrs(3), slaDueAt: inHrs(1),
    signals: [{ label: "Negbase exact hit", weight: 20, detail: "Handle on carding marketplace" }, { label: "Watchlist presence", weight: 15, detail: "Regulatory watchlist match" }],
    rulesTriggered: ["R-11", "R-13", "R-15"], enrichment: baseEnrichment({ negbaseAttributes: ["Category: Carding", "Source: Dark web crawl", "Confidence: High"] }), engagement: [],
    timeline: [{ id: "T1", at: hrs(3), actor: "System", action: "Case created", detail: "From alert AL-1039" }], notes: [], documents: [],
    recommendation: "Block",
  },
  {
    id: "CASE-2051", customer: "Lata Sharma", account: "XXXX2277", upi: "lata.sharma@okaxis", category: "Mule",
    stage: "Closed", riskScore: 81, grade: "VH", assignee: "Arjun Rao", openedAt: hrs(80), slaDueAt: hrs(30),
    signals: [{ label: "Fan-out pattern", weight: 12, detail: "24 payees in 4 days" }],
    rulesTriggered: ["R-03", "R-01"], enrichment: baseEnrichment(), engagement: [],
    timeline: [{ id: "T1", at: hrs(60), actor: "Kavita Menon", action: "Decision approved", detail: "Block approved (VH)" }], notes: [], documents: [],
    decision: { outcome: "Block", by: "Arjun Rao", approvedBy: "Kavita Menon", at: hrs(60), reason: "Classic mule fan-out with no plausible economic purpose." },
    recommendation: "Block",
  },
  {
    id: "CASE-2052", customer: "Sneha Rao", account: "XXXX9082", upi: "sneha.rao1@ybl", category: "Betting",
    stage: "Decision Pending", riskScore: 79, grade: "H", assignee: "Priya Nair", openedAt: hrs(24), slaDueAt: inHrs(-1),
    signals: [{ label: "Rapid pass-through", weight: 14, detail: "88% withdrawn within an hour" }, { label: "High-risk MCC", weight: 6, detail: "Gaming merchants" }],
    rulesTriggered: ["R-01", "R-17"], enrichment: baseEnrichment(),
    engagement: [{ id: "E1", channel: "AI Call", status: "Responded", at: hrs(8), outcome: "Admitted collecting funds for a gaming group" }],
    timeline: [{ id: "T1", at: hrs(24), actor: "System", action: "Case created", detail: "From alert AL-1042" }], notes: [], documents: [],
    rationale: { text: "Customer admission plus behavioural pattern support enforcement action.", evidence: true, policy: true, confidence: "High", savedBy: "Priya Nair" },
    recommendation: "Block",
  },
];

export const negbase: NegbaseRecord[] = [
  { id: "NB-01", identifier: "spillai.pay@okaxis", kind: "UPI", category: "Betting", source: "Web crawl", firstSeen: hrs(700), lastSeen: hrs(6), associated: ["XXXX1188", "9820011223"], website: "https://fastbet-win.co", gateway: "pg.fastbetwin.co/collect", evidence: "Handle rendered on live deposit page; screenshot captured 2 days ago." },
  { id: "NB-02", identifier: "quickjobs.hr@paytm", kind: "UPI", category: "Job Scam", source: "Victim complaint", firstSeen: hrs(400), lastSeen: hrs(20), associated: ["XXXX3388"], website: "https://hire-quickjobs.in", evidence: "Three victims paid 'registration fees' to this handle." },
  { id: "NB-03", identifier: "trader.pro9@okaxis", kind: "UPI", category: "Investment Scam", source: "External intelligence", firstSeen: hrs(300), lastSeen: hrs(26), associated: ["XXXX6644", "trader.pro7@ybl"], evidence: "Cluster of sequential handles promoted in stock-tip channels." },
  { id: "NB-04", identifier: "fastbet-win.co", kind: "Domain", category: "Betting", source: "Web crawl", firstSeen: hrs(900), lastSeen: hrs(4), associated: ["spillai.pay@okaxis"], website: "https://fastbet-win.co", evidence: "Domain hosts betting deposit flow with rotating UPI handles." },
  { id: "NB-05", identifier: "9880045512", kind: "Mobile", category: "Carding", source: "Dark web crawl", firstSeen: hrs(500), lastSeen: hrs(3), associated: ["cardbin.fq@ybl"], evidence: "Contact number posted alongside card dumps." },
  { id: "NB-06", identifier: "prime.subs@ybl", kind: "UPI", category: "Subscription Scam", source: "CRM complaint", firstSeen: hrs(200), lastSeen: hrs(34), associated: ["XXXX7005"], evidence: "Recurring debits without mandate consent." },
  { id: "NB-07", identifier: "shopmarttrend@ybl", kind: "UPI", category: "Shopping Scam", source: "Adverse media", firstSeen: hrs(250), lastSeen: hrs(22), associated: ["XXXX2210"], evidence: "Consumer forum threads alleging non-delivery." },
  { id: "NB-08", identifier: "deepa.k@ibl", kind: "UPI", category: "Gambling", source: "External intelligence", firstSeen: hrs(320), lastSeen: hrs(12), associated: ["XXXX7761"], website: "https://royal-play.bet", gateway: "checkout.royalplay.bet", evidence: "Listed as collection handle on offshore casino." },
];

export const enforcement: EnforcementEntry[] = [
  { id: "EN-501", caseId: "CASE-2051", account: "XXXX2277", customer: "Lata Sharma", action: "Block", decidedBy: "Arjun Rao", approvedBy: "Kavita Menon", reason: "Mule fan-out with no economic purpose", at: hrs(60), accountStatus: "Debit freeze applied", downstreamStatus: "Acknowledged" },
  { id: "EN-502", caseId: "CASE-2046", account: "XXXX5093", customer: "Arvind Suresh", action: "Unblock", decidedBy: "Priya Nair", reason: "Source of funds documented", at: hrs(48), accountStatus: "Fully operational", downstreamStatus: "Acknowledged" },
];

export const audit: AuditEntry[] = [
  { id: "AU-901", at: hrs(60), actor: "Kavita Menon", role: "supervisor", caseId: "CASE-2051", action: "Approved block decision", before: "Decision Pending", after: "Closed" },
  { id: "AU-902", at: hrs(48), actor: "Priya Nair", role: "analyst", caseId: "CASE-2046", action: "Accepted unblock recommendation", before: "Human Review", after: "Closed" },
  { id: "AU-903", at: hrs(20), actor: "System", role: "admin", action: "Rule weight updated", before: "R-11 weight 18", after: "R-11 weight 20" },
];

export const engagementTemplates = [
  { id: "TPL-1", channel: "AI Call" as Channel, name: "Source of funds verification", usage: 148, responseRate: "62%" },
  { id: "TPL-2", channel: "WhatsApp" as Channel, name: "Document request — KYC refresh", usage: 96, responseRate: "48%" },
  { id: "TPL-3", channel: "Email" as Channel, name: "Merchant invoice substantiation", usage: 61, responseRate: "55%" },
  { id: "TPL-4", channel: "SMS" as Channel, name: "Secure verification link", usage: 210, responseRate: "31%" },
];

export const inflowSeries = [
  { day: "Mon", inflow: 34, resolved: 28 },
  { day: "Tue", inflow: 41, resolved: 33 },
  { day: "Wed", inflow: 29, resolved: 36 },
  { day: "Thu", inflow: 47, resolved: 39 },
  { day: "Fri", inflow: 52, resolved: 44 },
  { day: "Sat", inflow: 23, resolved: 26 },
  { day: "Sun", inflow: 18, resolved: 21 },
];

export const teamWorkload = [
  { name: "Priya Nair", open: 9, breaching: 2 },
  { name: "Arjun Rao", open: 12, breaching: 3 },
  { name: "Sanjay Iyer", open: 7, breaching: 0 },
  { name: "Nisha Verma", open: 5, breaching: 1 },
];

export const integrations = [
  { id: "INT-1", name: "Core Banking (block / unblock)", status: true },
  { id: "INT-2", name: "Negative Database service", status: true },
  { id: "INT-3", name: "Telco enrichment API", status: true },
  { id: "INT-4", name: "AI calling bot", status: true },
  { id: "INT-5", name: "WhatsApp Business API", status: false },
  { id: "INT-6", name: "OSINT / adverse media feed", status: true },
];

export const consentTemplates = [
  { id: "CT-1", name: "DPDP notice — enrichment", version: "v2.1", updated: hrs(300) },
  { id: "CT-2", name: "Call recording consent", version: "v1.4", updated: hrs(700) },
  { id: "CT-3", name: "Data retention disclosure", version: "v1.0", updated: hrs(1200) },
];

export const users = [
  { id: "U-1", name: "Priya Nair", role: "analyst" as Role, status: "Active" },
  { id: "U-2", name: "Arjun Rao", role: "investigator" as Role, status: "Active" },
  { id: "U-3", name: "Kavita Menon", role: "supervisor" as Role, status: "Active" },
  { id: "U-4", name: "Devang Shah", role: "admin" as Role, status: "Active" },
  { id: "U-5", name: "Ritu Balan", role: "auditor" as Role, status: "Active" },
];

export const STAGES: Stage[] = ["Triaged", "Enrichment", "Engagement", "Human Review", "Decision Pending", "Closed"];

/** Next free case id: one above the highest existing CASE-n, never reusing an id. */
export function nextCaseId(existing: string[]): string {
  const max = existing.reduce((m, id) => { const n = Number(/^CASE-(\d+)$/.exec(id)?.[1]); return Number.isFinite(n) && n > m ? n : m; }, 2100);
  return `CASE-${max + 1}`;
}
