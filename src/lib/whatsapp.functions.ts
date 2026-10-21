import { createServerFn } from "@tanstack/react-start";
import { validateAccountBlocked, type AccountBlockedInput } from "@/lib/whatsapp";

const DEFAULT_URL = "https://buddy.pharynxai.in/waba_chargeback/send-account-blocked";

export const sendAccountBlockedWhatsApp = createServerFn({ method: "POST" })
  .inputValidator((input: AccountBlockedInput) => {
    const err = validateAccountBlocked(input);
    if (err) throw new Error(err);
    return { to: input.to, account_number: input.account_number, support_number: input.support_number, language: input.language };
  })
  .handler(async ({ data }) => {
    const url = process.env["WHATSAPP_PARTNER_URL"] || DEFAULT_URL;
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = (await res.text()).slice(0, 1000);
      if (!res.ok) console.error(`WhatsApp partner send failed [${res.status}]: ${body}`);
      return { ok: res.ok, status: res.status, body };
    } catch (e) {
      return { ok: false, status: 0, body: e instanceof Error ? e.message : "Could not reach the WhatsApp service." };
    }
  });
