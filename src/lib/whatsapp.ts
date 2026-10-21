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
