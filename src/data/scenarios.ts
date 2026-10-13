// Preset demo transactions for the Demo Simulator; values map to Field Catalogue attribute keys.
import type { AttrMap } from "@/data/sources";

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
  negbaseHit: boolean;
  complaints: number;
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
    input: { customer: "Rahul Verma", account: "XXXX4821", upi: "rahul.v88@okbank", amount: 185000, channel: "UPI", counterparties: 34, accountAgeDays: 45, dormantDays: 0, passThroughPct: 94, simSwap: true, newDevice: true, negbaseHit: true, complaints: 3 },
  },
  {
    id: "scam",
    name: "Scam victim inflow",
    blurb: "Credits linked to victim complaints from an investment scam.",
    input: { customer: "Sneha Pillai", account: "XXXX7712", upi: "sneha.p@ybl", amount: 92000, channel: "IMPS", counterparties: 18, accountAgeDays: 180, dormantDays: 0, passThroughPct: 72, simSwap: false, newDevice: false, negbaseHit: false, complaints: 2 },
  },
  {
    id: "dormant",
    name: "Dormant account spike",
    blurb: "Long-dormant account suddenly receiving large multi-geo credits.",
    input: { customer: "Mohan Das", account: "XXXX3390", upi: "mohan.das@paytm", amount: 260000, channel: "NEFT", counterparties: 14, accountAgeDays: 1300, dormantDays: 210, passThroughPct: 78, simSwap: false, newDevice: true, negbaseHit: false, complaints: 0 },
  },
  {
    id: "clean",
    name: "Clean salary credit",
    blurb: "Regular salary into a long-standing account. Should clear.",
    input: { customer: "Anita Joshi", account: "XXXX1205", upi: "anita.j@okhdfc", amount: 78000, channel: "NEFT", counterparties: 2, accountAgeDays: 2400, dormantDays: 0, passThroughPct: 10, simSwap: false, newDevice: false, negbaseHit: false, complaints: 0 },
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
    "negbase.hit": t.negbaseHit,
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
