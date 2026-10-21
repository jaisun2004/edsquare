import { createServerFn } from "@tanstack/react-start";
import { parsePartnerReply, validateAccountBlocked, type AccountBlockedInput } from "@/lib/whatsapp";

const DEFAULT_URL = "https://buddy.pharynxai.in/waba_chargeback/send-account-blocked";

export const sendAccountBlockedWhatsApp = createServerFn({ method: "POST" })
  .inputValidator((input: AccountBlockedInput) => {
    const err = validateAccountBlocked(input);
    if (err) throw new Error(err);
    return { to: input.to, account_number: input.account_number, support_number: input.support_number, language: input.language };
  })
  .handler(async ({ data }) => {
    const url = process.env["WHATSAPP_PARTNER_URL"] || DEFAULT_URL;
    const started = Date.now();
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = (await res.text()).slice(0, 1000);
      const r = parsePartnerReply(res.ok, body);
      if (!r.sent) console.error(`WhatsApp template send not accepted [${res.status}]: ${body}`);
      return { ok: r.sent, status: res.status, body, messageId: r.messageId, error: r.error, ms: Date.now() - started };
    } catch (e) {
      return { ok: false, status: 0, body: e instanceof Error ? e.message : "Could not reach the WhatsApp service.", ms: Date.now() - started };
    }
  });

const TEXT_URL = "https://buddy.pharynxai.in/waba_chargeback/send-text";

export const sendWhatsAppText = createServerFn({ method: "POST" })
  .inputValidator((input: { to: string; message: string }) => {
    if (!/^\d{10,15}$/.test(input.to ?? "")) throw new Error("Mobile number must be 10 to 15 digits with country code and no +.");
    if (!input.message?.trim() || input.message.length > 1000) throw new Error("Message must be 1 to 1000 characters.");
    return input;
  })
  .handler(async ({ data }) => {
    const url = process.env["WHATSAPP_TEXT_URL"] || TEXT_URL;
    const started = Date.now();
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = (await res.text()).slice(0, 1000);
      const r = parsePartnerReply(res.ok, body);
      if (!r.sent) console.error(`WhatsApp send-text not accepted [${res.status}]: ${body}`);
      return { ok: r.sent, status: res.status, body, messageId: r.messageId, error: r.error, ms: Date.now() - started };
    } catch (e) {
      return { ok: false, status: 0, body: e instanceof Error ? e.message : "Could not reach the WhatsApp service.", ms: Date.now() - started };
    }
  });
