// Client-safe validation for the partner "account blocked" WhatsApp message.
export interface AccountBlockedInput {
  to: string;
  account_number: string;
  support_number: string;
  language: "en" | "hi";
}

export function validateAccountBlocked(i: AccountBlockedInput): string | null {
  if (!/^\d{10,15}$/.test(i.to ?? "")) return "Mobile number must be 10 to 15 digits with country code and no + (e.g. 919667335707).";
  if (!/^\d{4,20}$/.test(i.account_number ?? "")) return "Account number must be 4 to 20 digits.";
  if (!/^\d{6,15}$/.test(i.support_number ?? "")) return "Support number must be 6 to 15 digits.";
  if (i.language !== "en" && i.language !== "hi") return "Language must be English (en) or Hindi (hi).";
  return null;
}

export const maskNumber = (n: string) => `••••${n.slice(-4)}`;

export const SUPPORT_NUMBER = "1800123456";
export const templateLang = (lang: string): "en" | "hi" => (lang === "HINDI" ? "hi" : "en");
/** Account numbers like "XXXX4417" or "9120 3030 30" -> digits only, padded to the 4-digit minimum. */
export const accountDigits = (acc: string) => { const d = (acc ?? "").replace(/\D/g, ""); return d.length >= 4 ? d.slice(0, 20) : d.padStart(4, "0"); };

/** Reads the partner reply: "sent" status and a WhatsApp message id mean WhatsApp accepted it. */
export function parsePartnerReply(httpOk: boolean, body: string): { sent: boolean; messageId?: string; error?: string } {
  try {
    const j = JSON.parse(body);
    const messageId: string | undefined = j?.whatsapp_response?.messages?.[0]?.id;
    const err = j?.error?.message ?? j?.whatsapp_response?.error?.message ?? j?.detail ?? (j?.status && j.status !== "sent" ? `status ${j.status}` : undefined);
    const sent = httpOk && (j?.status ? j.status === "sent" : !!messageId) && !err;
    return { sent, ...(messageId ? { messageId } : {}), ...(err ? { error: String(err) } : {}) };
  } catch {
    return httpOk ? { sent: true } : { sent: false, error: body.slice(0, 200) };
  }
}
