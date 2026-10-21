// Sample alerts, core banking profiles and scripts from "edd_flow_and_scripts_final_v1.1.xlsx".
import type { DataSource } from "@/data/sources";

export type AlertType = "I4C" | "Model";

export interface CbsProfile {
  custId: string;
  account: string;
  accountType: "Savings" | "Current";
  dob: string;
  mothersMaidenName: string;
  holderName: string;
  employment: string;
  employer: string;
  vintageMonths: number;
  avgCrTxnsPerDay: number;
  avgDrTxnsPerDay: number;
  avgCrTxnsP75: number;
  avgDrTxnsP75: number;
  avgCrAmtPerDay: number;
  avgDrAmtPerDay: number;
  avgCrAmtP75: number;
  avgDrAmtP75: number;
  beneficiaries: number;
  payees: string;
  payers: string;
  avgMonthlyBalance: number;
  avgMonthlyBalanceP75: number;
  pincode: string;
  lastAddressUpdate: string;
  risk: "H" | "M" | "L";
  blocksLast6m: boolean;
}

export const cbsProfiles: CbsProfile[] = [
  { custId: "A123", account: "9120303030", accountType: "Savings", dob: "1978-01-01", mothersMaidenName: "Arianna", holderName: "Ranga", employment: "Salaried", employer: "ABC ltd", vintageMonths: 20, avgCrTxnsPerDay: 0.5, avgDrTxnsPerDay: 2, avgCrTxnsP75: 1, avgDrTxnsP75: 3, avgCrAmtPerDay: 1000, avgDrAmtPerDay: 500, avgCrAmtP75: 1500, avgDrAmtP75: 750, beneficiaries: 5, payees: "", payers: "Jacob, ABC Ltd, abc@okaxis", avgMonthlyBalance: 50000, avgMonthlyBalanceP75: 75000, pincode: "560001", lastAddressUpdate: "May 02, 2024", risk: "L", blocksLast6m: false },
  { custId: "B1234", account: "9120303032", accountType: "Current", dob: "NA", mothersMaidenName: "NA", holderName: "Saile Enterorise", employment: "Pvt Ltd", employer: "Saile Enterorise", vintageMonths: 4, avgCrTxnsPerDay: 20, avgDrTxnsPerDay: 10, avgCrTxnsP75: 40, avgDrTxnsP75: 60, avgCrAmtPerDay: 40000, avgDrAmtPerDay: 15000, avgCrAmtP75: 60000, avgDrAmtP75: 22500, beneficiaries: 3, payees: "Jacob, ABC Ltd, abc@okaxis", payers: "", avgMonthlyBalance: 300000, avgMonthlyBalanceP75: 450000, pincode: "560004", lastAddressUpdate: "April 01, 2024", risk: "M", blocksLast6m: false },
  { custId: "C1234", account: "9120303034", accountType: "Savings", dob: "2000-10-08", mothersMaidenName: "Meghana", holderName: "Narang", employment: "Self Employed", employer: "Up Govt", vintageMonths: 12, avgCrTxnsPerDay: 0.5, avgDrTxnsPerDay: 5, avgCrTxnsP75: 2, avgDrTxnsP75: 4, avgCrAmtPerDay: 800, avgDrAmtPerDay: 300, avgCrAmtP75: 1200, avgDrAmtP75: 450, beneficiaries: 2, payees: "", payers: "A/c ending 1234, Google Pay 1234", avgMonthlyBalance: 40000, avgMonthlyBalanceP75: 60000, pincode: "560007", lastAddressUpdate: "June 01, 2026", risk: "L", blocksLast6m: false },
];

export interface WorkbookAlert {
  id: string;
  type: AlertType;
  label: string;
  account: string;
  holder: string;
  gender: string;
  reason: string;
  amount: number;
  date: string;
  complainant?: { name: string; gender: string; mobile: string };
  credits: number[];
  debits: number[];
  receivedFrom?: string;
  sentTo?: string;
  balance?: number;
}

export const workbookAlerts: WorkbookAlert[] = [
  { id: "i4c-1", type: "I4C", label: "I4C #1 · Ranga · Investment scam", account: "9120303030", holder: "Ranga", gender: "Male", reason: "Investment scam", amount: 100000, date: "October 10, 2026", complainant: { name: "Ragini", gender: "Female", mobile: "9120303035" }, credits: [100000], debits: [] },
  { id: "i4c-2", type: "I4C", label: "I4C #2 · Sailee · Job fraud", account: "9120303032", holder: "Sailee", gender: "Female", reason: "Job fraud", amount: 100000, date: "October 10, 2026", complainant: { name: "Ragini", gender: "Female", mobile: "9120303037" }, credits: [100000], debits: [] },
  { id: "i4c-3", type: "I4C", label: "I4C #3 · Narang · Digital arrest", account: "9120303034", holder: "Narang", gender: "Male", reason: "Digital arrest", amount: 100000, date: "October 12, 2026", complainant: { name: "Noel", gender: "Female", mobile: "9120303039" }, credits: [100000], debits: [] },
  { id: "mod-1", type: "Model", label: "Model #1 · Ranga · Multiple credits", account: "9120303030", holder: "Ranga", gender: "Male", reason: "Multiple credits in short period of time", amount: 120000, date: "02/10/2026", credits: [40000, 30000, 50000], debits: [], receivedFrom: "Jacob, ABC Ltd, abc@okaxis", balance: 5000 },
  { id: "mod-2", type: "Model", label: "Model #2 · Sailee · Debits and credits", account: "9120303032", holder: "Sailee", gender: "Female", reason: "Multiple debits and credits", amount: 120000, date: "02/10/2026", credits: [40000, 30000, 50000], debits: [30000, 50000, 20000], receivedFrom: "A/c ending 1234, Google Pay 1234", sentTo: "Jacob, ABC Ltd, abc@okaxis", balance: 10000 },
];

export type ScriptKey = "I4C Script" | "Mod Script" | "Mod Script Debits and Credits" | "I4C Bitly" | "Mod Bitly";

export interface ScriptOption { label: string; points: number }
export interface ScriptQuestion { id: string; text: string; options: ScriptOption[]; kind?: "employment" | "pincode" | "reason" | "sender" }

export const greeting = [
  "Hi, good morning.",
  "Am I speaking to Mr/Ms {name}?",
  "I'm calling from ABC Bank, regarding your account ending {last4}.",
  "Is it a good time to discuss and assist you in resolving your account related issues? This will take approx 3-5 minutes.",
];

const reasonOpts = ["Business", "Friendly transfer", "Fees / receipt"].map((label) => ({ label, points: 0 }));

export function questionsFor(key: ScriptKey, amount: number, date: string, credits: number, debits: number): ScriptQuestion[] {
  const q: ScriptQuestion[] = [
    { id: "q1", kind: "employment", text: "Q1. Are you working / salaried, self employed / business, self employed professional, or retired?", options: ["Working / salaried", "Self employed / Business", "Self employed professional", "Retired"].map((label) => ({ label, points: 0 })) },
    { id: "q2", kind: "pincode", text: "Q2. Can we have the pincode of your current office / residence address?", options: [{ label: "Matches our records", points: 0 }, { label: "Different pincode", points: 3 }] },
    { id: "q3a", kind: "sender", text: `Q3a. Regarding the credit of INR ${amount.toLocaleString("en-IN")} on ${date}: do you know the sender?`, options: [{ label: "Yes", points: 0 }, { label: "No", points: 4 }] },
    { id: "q3b", kind: "reason", text: "Q3b. What was the payment for?", options: reasonOpts },
    { id: "q4", kind: "reason", text: `Q4. You received INR ${credits.toLocaleString("en-IN")} in the last 2 days. What is the reason for receipt?`, options: reasonOpts },
  ];
  if (key === "Mod Script" || key === "Mod Script Debits and Credits" || key === "Mod Bitly") {
    if (debits > 0) q.push({ id: "q5", kind: "reason", text: `Q5. You transferred INR ${debits.toLocaleString("en-IN")} in the last 2 days. What is the reason for transfer?`, options: reasonOpts });
  }
  return q;
}

export const workbookSources: DataSource[] = [
  {
    id: "src-cbs-wb", name: "Core Banking (CBS) profile", category: "Bank systems", connector: "Database view", endpoint: "cbs.customer_profile_v", auth: "Service account", schedule: "Real-time lookup", status: true, health: "Healthy", lastSync: new Date().toISOString(), records: cbsProfiles.length,
    description: "Customer and 75th-percentile transaction baselines used by the Step 1 data checks (from the Core Bank DB Sample sheet).",
    fields: [
      { sourceField: "AVG_CR_AMT_PER_DAY", attribute: "cbs.avgCrAmtPerDay" },
      { sourceField: "ACCT_TYPE", attribute: "cbs.accountType" },
      { sourceField: "EMPLOYMENT", attribute: "cbs.employment" },
      { sourceField: "MAIL_PIN", attribute: "cbs.pincode" },
    ],
    syncHistory: [], samplePayload: cbsProfiles[0] as unknown as Record<string, unknown>,
  },
  {
    id: "src-airtel-wb", name: "Bank / Airtel 60-day summary", category: "Alternate data", connector: "SFTP batch", endpoint: "sftp://partner/edd_60d_summary", auth: "SSH key (pending)", schedule: "Daily EOD refresh (temp table)", status: false, health: "Down", lastSync: "—", records: 0,
    description: "60-day summarised data, refreshed EOD into a temp table. Multiple accounts retained separately. Not yet connected.",
    fields: [], syncHistory: [], samplePayload: {},
  },
];
