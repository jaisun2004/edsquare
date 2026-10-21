// Client-safe helpers for the partner voice agent.
export interface VoiceDispatchInput {
  phone: string; // digits with country code, no +
  session: {
    customer_name: string;
    bank_name: string;
    acct_last4: string;
    credit_amt: string;
    credit_date: string;
    recent_credit_amt: string;
    preferred_language: "ENGLISH" | "HINDI";
  };
}

/** "RAKESH roshon" -> "Rakesh Roshon" (partner requires normal capitals). */
export const normalName = (s: string) => s.trim().toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());

export function validateVoiceDispatch(i: VoiceDispatchInput): string | null {
  if (!/^\d{10,15}$/.test(i.phone ?? "")) return "Mobile number must be 10 to 15 digits with country code and no + (e.g. 919081657821).";
  const s = i.session;
  if (!s?.customer_name?.trim() || s.customer_name.length > 80) return "Customer name is required.";
  if (!s.bank_name?.trim() || s.bank_name.length > 80) return "Bank name is required.";
  if (!/^\d{4}$/.test(s.acct_last4 ?? "")) return "Account last 4 digits are required.";
  if (s.preferred_language !== "ENGLISH" && s.preferred_language !== "HINDI") return "Language must be English or Hindi.";
  return null;
}

const TERMINAL_OK = ["completed"];
const PENDING = ["pending", "queued", "initiated", "dispatched", "ringing", "in-progress", "in_progress", "ongoing", "active", "connected", "started"];

/** Classifies a call status: still running, answered, or treated as no response. */
export function callState(status: string | undefined, userTurns: number): "running" | "answered" | "no_response" {
  const s = (status ?? "pending").toLowerCase();
  if (PENDING.includes(s)) return "running";
  if (TERMINAL_OK.includes(s) && userTurns > 0) return "answered";
  return "no_response";
}
