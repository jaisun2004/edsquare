// Data-source integration layer: pluggable sources, the attributes they expose
// (Field Catalogue) and per-alert attribute values used by the rule engine.

export type SourceCategory = "Govt / LEA" | "External" | "Bank systems" | "Alternate data" | "Platform";
export type Connector = "REST API" | "SFTP batch" | "Kafka stream" | "Database view" | "File upload" | "Computed";
export type AttrType = "number" | "boolean" | "string";
export type Health = "Healthy" | "Degraded" | "Down";

export interface FieldMapping {
  sourceField: string;
  attribute: string;
}

export interface SyncRun {
  at: string;
  records: number;
  status: "Success" | "Partial" | "Failed";
  durationSec: number;
}

export interface DataSource {
  id: string;
  name: string;
  category: SourceCategory;
  connector: Connector;
  endpoint: string;
  auth: string;
  schedule: string;
  status: boolean;
  health: Health;
  lastSync: string;
  records: number;
  description: string;
  fields: FieldMapping[];
  syncHistory: SyncRun[];
  samplePayload: Record<string, unknown>;
}

export interface Attribute {
  key: string;
  label: string;
  type: AttrType;
  sourceId: string;
  pii: boolean;
  options?: string[];
}

export type AttrValue = number | boolean | string;
export type AttrMap = Record<string, AttrValue>;

const now = Date.now();
const hrs = (h: number) => new Date(now - h * 3600_000).toISOString();
const history = (records: number, partial = false): SyncRun[] =>
  [1, 7, 13, 19, 25].map((h, i) => ({
    at: hrs(h),
    records: Math.round(records / 40) + i * 7,
    status: partial && i === 1 ? "Partial" : "Success",
    durationSec: 12 + i * 3,
  }));

export const attributes: Attribute[] = [
  { key: "lea.freezeRequest", label: "LEA freeze / lien request", type: "boolean", sourceId: "SRC-LEA", pii: false },
  { key: "ncrp.complaintCount", label: "NCRP complaints", type: "number", sourceId: "SRC-NCRP", pii: false },
  { key: "rbih.muleHunterHit", label: "RBIH Mule Hunter hit", type: "boolean", sourceId: "SRC-RBIH", pii: false },
  { key: "reg.watchlist", label: "Regulatory watchlist match", type: "boolean", sourceId: "SRC-REG", pii: false },
  { key: "account.vintageDays", label: "Account vintage (days)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "account.type", label: "Account type", type: "string", sourceId: "SRC-CBS", pii: false, options: ["Savings", "Salary", "Current"] },
  { key: "account.dormantDays", label: "Dormancy before activity (days)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "txn.passThroughPct", label: "Pass-through % (< 60 min)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "txn.uniqueCounterparties7d", label: "Unique counterparties (7d)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "txn.credits30d", label: "Credits in 30 days (₹)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "txn.structuringCount24h", label: "Sub-threshold credits (24h)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "txn.roundTripCycles48h", label: "Round-trip cycles (48h)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "txn.geoCount24h", label: "Distinct geos (24h)", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "txn.highRiskMcc", label: "High-risk merchant category", type: "boolean", sourceId: "SRC-CBS", pii: false },
  { key: "device.cifsPerDevice", label: "Customers per device", type: "number", sourceId: "SRC-CBS", pii: false },
  { key: "crm.victimComplaints", label: "Victim complaints (CRM)", type: "number", sourceId: "SRC-CRM", pii: false },
  { key: "aml.alertCount90d", label: "AML alerts (90d)", type: "number", sourceId: "SRC-AML", pii: false },
  { key: "model.mulePropensity", label: "Mule propensity score", type: "number", sourceId: "SRC-MODEL", pii: false },
  { key: "negbase.hit", label: "Found in Negative Database", type: "boolean", sourceId: "SRC-NEG", pii: false },
  { key: "negbase.matchType", label: "Negative DB match type", type: "string", sourceId: "SRC-NEG", pii: false, options: ["Exact", "Fuzzy", "None"] },
  { key: "negbase.similarity", label: "Negative DB similarity", type: "number", sourceId: "SRC-NEG", pii: false },
  { key: "negbase.reason", label: "Negative DB reason", type: "string", sourceId: "SRC-NEG", pii: false, options: ["Betting", "Gambling", "Gaming", "Forex", "Pornography", "Investment Scam", "None"] },
  { key: "scam.channelMentions", label: "Scam channel mentions", type: "number", sourceId: "SRC-SCAM", pii: false },
  { key: "scam.category", label: "Scam category", type: "string", sourceId: "SRC-SCAM", pii: false, options: ["Investment", "Shopping", "Carding", "Job", "Subscription", "None"] },
  { key: "mobile.vintageDays", label: "SIM vintage (days)", type: "number", sourceId: "SRC-TEL", pii: true },
  { key: "mobile.type", label: "SIM type", type: "string", sourceId: "SRC-TEL", pii: false, options: ["Prepaid", "Postpaid"] },
  { key: "mobile.simSwaps90d", label: "SIM swaps (90d)", type: "number", sourceId: "SRC-TEL", pii: false },
  { key: "upi.handleCount", label: "UPI handles on account", type: "number", sourceId: "SRC-UPI", pii: false },
  { key: "osint.mentions", label: "OSINT mentions", type: "number", sourceId: "SRC-OSINT", pii: false },
  { key: "osint.adverseMedia", label: "Adverse media", type: "boolean", sourceId: "SRC-OSINT", pii: false },
  { key: "dm.score", label: "Decision Manager score", type: "number", sourceId: "SRC-DM", pii: false },
];

const map = (pairs: [string, string][]): FieldMapping[] => pairs.map(([sourceField, attribute]) => ({ sourceField, attribute }));

export const dataSources: DataSource[] = [
  {
    id: "SRC-LEA", name: "LEA / CBI / ED requests", category: "Govt / LEA", connector: "SFTP batch",
    endpoint: "sftp://lea-gw.bank.internal/inbound", auth: "SSH key", schedule: "Every 1 hour", status: true, health: "Healthy",
    lastSync: hrs(1), records: 1840, description: "Freeze, lien and information requests from law enforcement agencies.",
    fields: map([["freeze_flag", "lea.freezeRequest"]]), syncHistory: history(1840),
    samplePayload: { request_id: "LEA/MH/2026/4410", account: "XXXX3388", freeze_flag: true, agency: "Cyber Cell Mumbai" },
  },
  {
    id: "SRC-NCRP", name: "MHA NCRP portal", category: "Govt / LEA", connector: "REST API",
    endpoint: "https://ncrp-gw.bank.internal/v2/complaints", auth: "Mutual TLS", schedule: "Every 15 min", status: true, health: "Healthy",
    lastSync: hrs(0.2), records: 12450, description: "National Cyber Crime Reporting Portal complaints linked to accounts and UPI IDs.",
    fields: map([["complaint_count", "ncrp.complaintCount"]]), syncHistory: history(12450),
    samplePayload: { ack_no: "31509260012345", upi: "quickjobs.hr@paytm", complaint_count: 4, category: "Job fraud" },
  },
  {
    id: "SRC-RBIH", name: "RBIH Mule Hunter", category: "External", connector: "REST API",
    endpoint: "https://api.rbih.in/mulehunter/v1/score", auth: "OAuth client credentials", schedule: "Real-time", status: true, health: "Degraded",
    lastSync: hrs(0.5), records: 56200, description: "RBI Innovation Hub's centralised mule-account intelligence.",
    fields: map([["is_mule", "rbih.muleHunterHit"]]), syncHistory: history(56200, true),
    samplePayload: { account_hash: "a91f…", is_mule: true, confidence: 0.93 },
  },
  {
    id: "SRC-REG", name: "Regulatory advisories & watchlists", category: "External", connector: "File upload",
    endpoint: "Manual upload (CSV)", auth: "Maker-checker", schedule: "On upload", status: true, health: "Healthy",
    lastSync: hrs(48), records: 930, description: "Circulars, advisories and sanctioned / watchlisted identifiers.",
    fields: map([["listed", "reg.watchlist"]]), syncHistory: history(930),
    samplePayload: { identifier: "trader.pro9@okaxis", listed: false, list: "RBI caution list" },
  },
  {
    id: "SRC-CBS", name: "Core Banking (customer + transactions)", category: "Bank systems", connector: "Kafka stream",
    endpoint: "kafka://cbs-events.bank.internal/txn.v3", auth: "SASL / SCRAM", schedule: "Streaming", status: true, health: "Healthy",
    lastSync: hrs(0.05), records: 8_420_000, description: "Account master, transaction events, device and channel metadata.",
    fields: map([
      ["acct_open_days", "account.vintageDays"], ["acct_type", "account.type"], ["dormant_days", "account.dormantDays"],
      ["passthru_pct_60m", "txn.passThroughPct"], ["cpty_uniq_7d", "txn.uniqueCounterparties7d"], ["cr_amt_30d", "txn.credits30d"],
      ["sub_ctr_cnt_24h", "txn.structuringCount24h"], ["rt_cycles_48h", "txn.roundTripCycles48h"], ["geo_cnt_24h", "txn.geoCount24h"],
      ["mcc_risk_flag", "txn.highRiskMcc"], ["cif_per_device", "device.cifsPerDevice"],
    ]),
    syncHistory: history(8_420_000),
    samplePayload: { cif: "C00912873", acct_open_days: 42, passthru_pct_60m: 94, cpty_uniq_7d: 31, cr_amt_30d: 740000 },
  },
  {
    id: "SRC-CRM", name: "CRM complaints", category: "Bank systems", connector: "Database view",
    endpoint: "oracle://crm-db/v_fraud_complaints", auth: "Service account", schedule: "Every 30 min", status: true, health: "Healthy",
    lastSync: hrs(0.4), records: 21800, description: "Customer and victim complaints logged at branches and contact centre.",
    fields: map([["victim_cnt", "crm.victimComplaints"]]), syncHistory: history(21800),
    samplePayload: { account: "XXXX3388", victim_cnt: 3, last_complaint: "2026-10-10" },
  },
  {
    id: "SRC-AML", name: "AML transaction monitoring", category: "Bank systems", connector: "Database view",
    endpoint: "mssql://aml-db/v_alerts", auth: "Service account", schedule: "Every 1 hour", status: true, health: "Healthy",
    lastSync: hrs(0.8), records: 64300, description: "Alerts and scenarios from the bank's AML engine.",
    fields: map([["alert_cnt_90d", "aml.alertCount90d"]]), syncHistory: history(64300),
    samplePayload: { account: "XXXX2210", alert_cnt_90d: 2, scenarios: ["Structuring"] },
  },
  {
    id: "SRC-MODEL", name: "Internal mule propensity model", category: "Bank systems", connector: "REST API",
    endpoint: "https://ml.bank.internal/mule/v2.1/predict", auth: "API key", schedule: "Real-time", status: true, health: "Healthy",
    lastSync: hrs(0.1), records: 410000, description: "Bank's proprietary money-mule propensity model.",
    fields: map([["score", "model.mulePropensity"]]), syncHistory: history(410000),
    samplePayload: { account: "XXXX1120", score: 0.71, model_version: "2.1" },
  },
  {
    id: "SRC-NEG", name: "mFilterIt Negative Database", category: "Alternate data", connector: "REST API",
    endpoint: "https://api.mfilterit.com/negbase/v3/match", auth: "API key + IP allow-list", schedule: "Real-time", status: true, health: "Healthy",
    lastSync: hrs(0.1), records: 2_310_000, description: "Payment instruments found on betting, gambling, gaming, forex and adult sites.",
    fields: map([["found", "negbase.hit"], ["match_type", "negbase.matchType"], ["similarity", "negbase.similarity"], ["reason", "negbase.reason"]]),
    syncHistory: history(2_310_000),
    samplePayload: { input: "vipulsolanki40022@oksbi", found: true, match_type: "Exact", reason: "Betting", site: "king567.com" },
  },
  {
    id: "SRC-SCAM", name: "mFilterIt Investment Scam intelligence", category: "Alternate data", connector: "REST API",
    endpoint: "https://api.mfilterit.com/scamintel/v1/lookup", auth: "API key", schedule: "Every 1 hour", status: true, health: "Healthy",
    lastSync: hrs(0.7), records: 184000, description: "UPI IDs and accounts harvested from scam channels on Instagram, Telegram and WhatsApp.",
    fields: map([["mention_cnt", "scam.channelMentions"], ["scam_type", "scam.category"]]), syncHistory: history(184000),
    samplePayload: { upi: "rm9017080-tj@okhdfcbank", mention_cnt: 3, scam_type: "Investment", channel: "instagram" },
  },
  {
    id: "SRC-TEL", name: "Telco enrichment", category: "Alternate data", connector: "REST API",
    endpoint: "https://telco-hub.example/v1/msisdn", auth: "OAuth + consent token", schedule: "Real-time", status: true, health: "Healthy",
    lastSync: hrs(0.2), records: 350000, description: "SIM vintage, prepaid / postpaid and SIM-swap history (DPDP consent required).",
    fields: map([["msisdn_age_days", "mobile.vintageDays"], ["conn_type", "mobile.type"], ["swap_cnt_90d", "mobile.simSwaps90d"]]),
    syncHistory: history(350000),
    samplePayload: { msisdn: "98XXXXXX21", msisdn_age_days: 61, conn_type: "Prepaid", swap_cnt_90d: 2 },
  },
  {
    id: "SRC-UPI", name: "UPI handle lookup", category: "Alternate data", connector: "REST API",
    endpoint: "https://upi-switch.bank.internal/handles", auth: "Mutual TLS", schedule: "Real-time", status: true, health: "Healthy",
    lastSync: hrs(0.1), records: 990000, description: "Count of VPAs linked to the account or mobile number.",
    fields: map([["vpa_cnt", "upi.handleCount"]]), syncHistory: history(990000),
    samplePayload: { account: "XXXX4470", vpa_cnt: 5 },
  },
  {
    id: "SRC-OSINT", name: "OSINT / social presence", category: "Alternate data", connector: "REST API",
    endpoint: "https://osint.example/v2/search", auth: "API key", schedule: "Every 6 hours", status: true, health: "Healthy",
    lastSync: hrs(3), records: 72000, description: "Adverse media and social-media presence for names, numbers and handles.",
    fields: map([["mentions", "osint.mentions"], ["adverse", "osint.adverseMedia"]]), syncHistory: history(72000),
    samplePayload: { query: "Imran Shaikh 98XXXX", mentions: 4, adverse: true },
  },
  {
    id: "SRC-DM", name: "Decision Manager (computed)", category: "Platform", connector: "Computed",
    endpoint: "Internal", auth: "—", schedule: "Per evaluation", status: true, health: "Healthy",
    lastSync: hrs(0), records: 0, description: "Values computed while rules run, such as the running risk score.",
    fields: map([["score", "dm.score"]]), syncHistory: [], samplePayload: { score: 72 },
  },
];

// Attribute values each seeded alert would receive from connected sources.
export const alertAttributes: Record<string, AttrMap> = {
  "AL-1041": { "lea.freezeRequest": false, "ncrp.complaintCount": 1, "rbih.muleHunterHit": true, "reg.watchlist": false, "account.vintageDays": 210, "account.type": "Savings", "account.dormantDays": 0, "txn.passThroughPct": 92, "txn.uniqueCounterparties7d": 27, "txn.credits30d": 610000, "txn.structuringCount24h": 1, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 1, "txn.highRiskMcc": true, "device.cifsPerDevice": 1, "crm.victimComplaints": 0, "aml.alertCount90d": 1, "model.mulePropensity": 0.84, "negbase.hit": true, "negbase.matchType": "Exact", "negbase.similarity": 1, "negbase.reason": "Betting", "scam.channelMentions": 0, "scam.category": "None", "mobile.vintageDays": 61, "mobile.type": "Prepaid", "mobile.simSwaps90d": 1, "upi.handleCount": 6, "osint.mentions": 2, "osint.adverseMedia": false },
  "AL-1042": { "lea.freezeRequest": false, "ncrp.complaintCount": 0, "rbih.muleHunterHit": false, "reg.watchlist": false, "account.vintageDays": 140, "account.type": "Savings", "account.dormantDays": 0, "txn.passThroughPct": 88, "txn.uniqueCounterparties7d": 22, "txn.credits30d": 380000, "txn.structuringCount24h": 2, "txn.roundTripCycles48h": 3, "txn.geoCount24h": 2, "txn.highRiskMcc": false, "device.cifsPerDevice": 2, "crm.victimComplaints": 0, "aml.alertCount90d": 3, "model.mulePropensity": 0.66, "negbase.hit": false, "negbase.matchType": "None", "negbase.similarity": 0.2, "negbase.reason": "None", "scam.channelMentions": 0, "scam.category": "None", "mobile.vintageDays": 400, "mobile.type": "Prepaid", "mobile.simSwaps90d": 0, "upi.handleCount": 3, "osint.mentions": 0, "osint.adverseMedia": false },
  "AL-1043": { "lea.freezeRequest": false, "ncrp.complaintCount": 0, "rbih.muleHunterHit": false, "reg.watchlist": false, "account.vintageDays": 55, "account.type": "Savings", "account.dormantDays": 0, "txn.passThroughPct": 45, "txn.uniqueCounterparties7d": 9, "txn.credits30d": 520000, "txn.structuringCount24h": 0, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 1, "txn.highRiskMcc": false, "device.cifsPerDevice": 1, "crm.victimComplaints": 0, "aml.alertCount90d": 0, "model.mulePropensity": 0.71, "negbase.hit": false, "negbase.matchType": "None", "negbase.similarity": 0.1, "negbase.reason": "None", "scam.channelMentions": 0, "scam.category": "None", "mobile.vintageDays": 75, "mobile.type": "Postpaid", "mobile.simSwaps90d": 0, "upi.handleCount": 2, "osint.mentions": 0, "osint.adverseMedia": false },
  "AL-1044": { "lea.freezeRequest": true, "ncrp.complaintCount": 4, "rbih.muleHunterHit": true, "reg.watchlist": false, "account.vintageDays": 95, "account.type": "Current", "account.dormantDays": 0, "txn.passThroughPct": 81, "txn.uniqueCounterparties7d": 40, "txn.credits30d": 910000, "txn.structuringCount24h": 0, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 2, "txn.highRiskMcc": false, "device.cifsPerDevice": 3, "crm.victimComplaints": 3, "aml.alertCount90d": 2, "model.mulePropensity": 0.9, "negbase.hit": true, "negbase.matchType": "Exact", "negbase.similarity": 1, "negbase.reason": "None", "scam.channelMentions": 2, "scam.category": "Job", "mobile.vintageDays": 40, "mobile.type": "Prepaid", "mobile.simSwaps90d": 2, "upi.handleCount": 4, "osint.mentions": 4, "osint.adverseMedia": true },
  "AL-1045": { "lea.freezeRequest": false, "ncrp.complaintCount": 1, "rbih.muleHunterHit": false, "reg.watchlist": false, "account.vintageDays": 300, "account.type": "Savings", "account.dormantDays": 0, "txn.passThroughPct": 70, "txn.uniqueCounterparties7d": 16, "txn.credits30d": 260000, "txn.structuringCount24h": 0, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 1, "txn.highRiskMcc": false, "device.cifsPerDevice": 1, "crm.victimComplaints": 1, "aml.alertCount90d": 0, "model.mulePropensity": 0.58, "negbase.hit": false, "negbase.matchType": "None", "negbase.similarity": 0.3, "negbase.reason": "None", "scam.channelMentions": 3, "scam.category": "Investment", "mobile.vintageDays": 500, "mobile.type": "Postpaid", "mobile.simSwaps90d": 0, "upi.handleCount": 3, "osint.mentions": 1, "osint.adverseMedia": false },
  "AL-1046": { "lea.freezeRequest": false, "ncrp.complaintCount": 0, "rbih.muleHunterHit": false, "reg.watchlist": false, "account.vintageDays": 1600, "account.type": "Salary", "account.dormantDays": 0, "txn.passThroughPct": 20, "txn.uniqueCounterparties7d": 4, "txn.credits30d": 140000, "txn.structuringCount24h": 0, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 1, "txn.highRiskMcc": false, "device.cifsPerDevice": 1, "crm.victimComplaints": 0, "aml.alertCount90d": 0, "model.mulePropensity": 0.18, "negbase.hit": false, "negbase.matchType": "None", "negbase.similarity": 0, "negbase.reason": "None", "scam.channelMentions": 0, "scam.category": "None", "mobile.vintageDays": 2400, "mobile.type": "Postpaid", "mobile.simSwaps90d": 0, "upi.handleCount": 2, "osint.mentions": 0, "osint.adverseMedia": false },
  "AL-1047": { "lea.freezeRequest": false, "ncrp.complaintCount": 0, "rbih.muleHunterHit": false, "reg.watchlist": false, "account.vintageDays": 420, "account.type": "Current", "account.dormantDays": 0, "txn.passThroughPct": 60, "txn.uniqueCounterparties7d": 12, "txn.credits30d": 470000, "txn.structuringCount24h": 7, "txn.roundTripCycles48h": 1, "txn.geoCount24h": 1, "txn.highRiskMcc": false, "device.cifsPerDevice": 1, "crm.victimComplaints": 0, "aml.alertCount90d": 2, "model.mulePropensity": 0.62, "negbase.hit": false, "negbase.matchType": "None", "negbase.similarity": 0.1, "negbase.reason": "None", "scam.channelMentions": 0, "scam.category": "None", "mobile.vintageDays": 900, "mobile.type": "Postpaid", "mobile.simSwaps90d": 0, "upi.handleCount": 5, "osint.mentions": 0, "osint.adverseMedia": false },
  "AL-1048": { "lea.freezeRequest": false, "ncrp.complaintCount": 0, "rbih.muleHunterHit": false, "reg.watchlist": true, "account.vintageDays": 80, "account.type": "Savings", "account.dormantDays": 0, "txn.passThroughPct": 55, "txn.uniqueCounterparties7d": 8, "txn.credits30d": 210000, "txn.structuringCount24h": 0, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 1, "txn.highRiskMcc": false, "device.cifsPerDevice": 1, "crm.victimComplaints": 0, "aml.alertCount90d": 0, "model.mulePropensity": 0.49, "negbase.hit": true, "negbase.matchType": "Fuzzy", "negbase.similarity": 0.89, "negbase.reason": "Investment Scam", "scam.channelMentions": 1, "scam.category": "Investment", "mobile.vintageDays": 150, "mobile.type": "Prepaid", "mobile.simSwaps90d": 0, "upi.handleCount": 3, "osint.mentions": 1, "osint.adverseMedia": false },
  "AL-1049": { "lea.freezeRequest": false, "ncrp.complaintCount": 0, "rbih.muleHunterHit": false, "reg.watchlist": false, "account.vintageDays": 1100, "account.type": "Savings", "account.dormantDays": 120, "txn.passThroughPct": 76, "txn.uniqueCounterparties7d": 14, "txn.credits30d": 420000, "txn.structuringCount24h": 0, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 4, "txn.highRiskMcc": false, "device.cifsPerDevice": 1, "crm.victimComplaints": 0, "aml.alertCount90d": 1, "model.mulePropensity": 0.6, "negbase.hit": false, "negbase.matchType": "None", "negbase.similarity": 0, "negbase.reason": "None", "scam.channelMentions": 0, "scam.category": "None", "mobile.vintageDays": 1800, "mobile.type": "Postpaid", "mobile.simSwaps90d": 0, "upi.handleCount": 2, "osint.mentions": 0, "osint.adverseMedia": false },
  "AL-1050": { "lea.freezeRequest": false, "ncrp.complaintCount": 2, "rbih.muleHunterHit": false, "reg.watchlist": false, "account.vintageDays": 260, "account.type": "Current", "account.dormantDays": 0, "txn.passThroughPct": 35, "txn.uniqueCounterparties7d": 30, "txn.credits30d": 190000, "txn.structuringCount24h": 0, "txn.roundTripCycles48h": 0, "txn.geoCount24h": 1, "txn.highRiskMcc": false, "device.cifsPerDevice": 1, "crm.victimComplaints": 2, "aml.alertCount90d": 0, "model.mulePropensity": 0.42, "negbase.hit": false, "negbase.matchType": "None", "negbase.similarity": 0.1, "negbase.reason": "None", "scam.channelMentions": 1, "scam.category": "Subscription", "mobile.vintageDays": 700, "mobile.type": "Postpaid", "mobile.simSwaps90d": 0, "upi.handleCount": 2, "osint.mentions": 1, "osint.adverseMedia": false },
};
