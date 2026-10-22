// Preset demo transactions for the Demo Simulator; values map to Field Catalogue attribute keys.
import type { AttrMap } from "@/data/sources";
import type { CbsProfile, WorkbookAlert } from "@/data/workbook";

export interface TxnInput {
  customer: string;
  account: string;
  upi: string;
  amount: number;
  channel: "UPI" | "IMPS" | "NEFT";
  counterparties: number;
  accountAgeDays: number;
  dormantDays: number;
  passThroughPct: number;
  simSwap: boolean;
  newDevice: boolean;
  /** Set by the Negative Database lookup, not by the presenter. */
  negbaseHit?: boolean;
  complaints: number;
  /** Core banking: average credit per day (Rs). */
  avgDailyCredit: number;
  /** Other credits received in the last 2 days, excluding this one (Rs). */
  prior2dCredits: number;
}

export interface Scenario {
  id: string;
  name: string;
  blurb: string;
  input: TxnInput;
}

export const scenarios: Scenario[] = [
  {
    id: "mule",
    name: "Classic money mule",
    blurb: "New account, rapid pass-through, many counterparties, Negative Database hit.",
    input: { customer: "Rahul Verma", account: "XXXX4821", upi: "rahul.v88@okbank", amount: 185000, channel: "UPI", counterparties: 34, accountAgeDays: 45, dormantDays: 0, passThroughPct: 94, simSwap: true, newDevice: true, complaints: 3, avgDailyCredit: 150000, prior2dCredits: 0 },
  },
  {
    id: "scam",
    name: "Scam victim inflow",
    blurb: "Credits linked to victim complaints from an investment scam.",
    input: { customer: "Sneha Pillai", account: "XXXX7712", upi: "sneha.p@ybl", amount: 92000, channel: "IMPS", counterparties: 18, accountAgeDays: 180, dormantDays: 0, passThroughPct: 72, simSwap: false, newDevice: false, complaints: 2, avgDailyCredit: 60000, prior2dCredits: 20000 },
  },
  {
    id: "dormant",
    name: "Dormant account spike",
    blurb: "Long-dormant account suddenly receiving large multi-geo credits.",
    input: { customer: "Mohan Das", account: "XXXX3390", upi: "mohan.das@paytm", amount: 260000, channel: "NEFT", counterparties: 14, accountAgeDays: 1300, dormantDays: 210, passThroughPct: 78, simSwap: false, newDevice: true, complaints: 0, avgDailyCredit: 2000, prior2dCredits: 0 },
  },
  {
    id: "clean",
    name: "Clean salary credit",
    blurb: "Regular salary into a long-standing account. Should clear.",
    input: { customer: "Anita Joshi", account: "XXXX1205", upi: "anita.j@okhdfc", amount: 78000, channel: "NEFT", counterparties: 2, accountAgeDays: 2400, dormantDays: 0, passThroughPct: 10, simSwap: false, newDevice: false, complaints: 0, avgDailyCredit: 78000, prior2dCredits: 400000 },
  },
];

export function toAttrs(t: TxnInput): AttrMap {
  const risk = Math.min(
    0.98,
    0.08 + (t.passThroughPct / 100) * 0.35 + Math.min(t.counterparties, 40) / 40 * 0.2 + (t.negbaseHit ? 0.2 : 0) + (t.accountAgeDays < 90 ? 0.1 : 0) + (t.simSwap ? 0.05 : 0) + t.complaints * 0.04,
  );
  return {
    "lea.freezeRequest": false,
    "ncrp.complaintCount": t.complaints,
    "rbih.muleHunterHit": risk > 0.8,
    "reg.watchlist": false,
    "account.vintageDays": t.accountAgeDays,
    "account.type": t.accountAgeDays > 2000 ? "Salary" : "Savings",
    "account.dormantDays": t.dormantDays,
    "txn.passThroughPct": t.passThroughPct,
    "txn.uniqueCounterparties7d": t.counterparties,
    "txn.credits30d": t.amount * (t.counterparties > 10 ? 3 : 1),
    "txn.structuringCount24h": t.amount > 100000 && t.counterparties > 20 ? 3 : 0,
    "txn.roundTripCycles48h": 0,
    "txn.geoCount24h": t.dormantDays > 90 ? 4 : 1,
    "txn.highRiskMcc": false,
    "device.cifsPerDevice": t.newDevice ? 3 : 1,
    "crm.victimComplaints": t.complaints,
    "aml.alertCount90d": t.complaints > 0 ? 1 : 0,
    "model.mulePropensity": Math.round(risk * 100) / 100,
    "negbase.hit": !!t.negbaseHit,
    "negbase.matchType": t.negbaseHit ? "Exact" : "None",
    "negbase.similarity": t.negbaseHit ? 1 : 0,
    "negbase.reason": t.negbaseHit ? "Betting" : "None",
    "scam.channelMentions": t.complaints > 1 ? 2 : 0,
    "scam.category": t.complaints > 1 ? "Investment" : "None",
    "mobile.vintageDays": t.simSwap ? 30 : 900,
    "mobile.type": t.simSwap ? "Prepaid" : "Postpaid",
    "mobile.simSwaps90d": t.simSwap ? 2 : 0,
    "upi.handleCount": t.counterparties > 20 ? 6 : 2,
    "osint.mentions": t.negbaseHit ? 2 : 0,
    "osint.adverseMedia": false,
  };
}

/** Turn a composed transaction into a Model alert + core banking profile so it runs through the sheet flow (edd-flow). */
export function toWorkbook(t: TxnInput): { alert: WorkbookAlert; profile: CbsProfile; negbase: boolean; upi: string } {
  // Earlier credits are split into parts no bigger than this transaction, so rule 3 measures this transaction's share.
  const parts = t.prior2dCredits > 0 ? Math.ceil(t.prior2dCredits / Math.max(t.amount, 1)) : 0;
  const credits = [t.amount, ...Array.from({ length: parts }, (_, i) => Math.floor(t.prior2dCredits / parts) + (i === 0 ? t.prior2dCredits % parts : 0))];
  const debits = t.passThroughPct >= 50 ? [Math.round((t.amount * t.passThroughPct) / 100)] : [];
  const salaried = t.accountAgeDays > 2000;
  const avgCr = t.avgDailyCredit;
  const alert: WorkbookAlert = {
    id: `TXN-${t.account}`,
    type: "Model",
    label: `Transaction: ${t.customer}`,
    account: t.account,
    holder: t.customer,
    gender: "",
    reason: debits.length ? "Multiple Debits and Credits" : "Multiple Credits in short period of time",
    amount: t.amount,
    date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }),
    credits,
    debits,
    receivedFrom: `${t.counterparties} ${t.channel} senders`,
    ...(debits.length ? { sentTo: "Onward beneficiaries" } : {}),
  };
  const profile: CbsProfile = {
    custId: `SIM-${t.account}`, account: t.account, accountType: "Savings", dob: "", mothersMaidenName: "", holderName: t.customer,
    employment: salaried ? "Salaried" : "Self Employed", employer: "", vintageMonths: Math.round(t.accountAgeDays / 30),
    avgCrTxnsPerDay: 0.5, avgDrTxnsPerDay: 1, avgCrTxnsP75: 1, avgDrTxnsP75: 2, avgCrAmtPerDay: avgCr, avgDrAmtPerDay: avgCr / 2,
    avgCrAmtP75: avgCr * 2, avgDrAmtP75: avgCr, beneficiaries: 2, payees: "", payers: "", avgMonthlyBalance: avgCr * 5, avgMonthlyBalanceP75: avgCr * 8,
    pincode: "110001", lastAddressUpdate: "", risk: t.negbaseHit || t.complaints > 1 ? "H" : "M", blocksLast6m: t.complaints > 0,
  };
  return { alert, profile, negbase: !!t.negbaseHit, upi: t.upi };
}
