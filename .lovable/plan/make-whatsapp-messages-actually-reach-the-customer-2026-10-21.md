# Make WhatsApp messages actually reach the customer

## What the documents say vs what the app does
- The partner gives two WhatsApp options:
  1. **"Account blocked" template** (`send-account-blocked`): an approved WhatsApp template. It can be sent to any customer at any time.
  2. **Free text** (`send-text`): any message, such as our questionnaire link.
- Today the questionnaire is sent **only as free text**. WhatsApp delivers free text only if that customer messaged the bank's WhatsApp number in the last 24 hours. For a fresh customer, the partner replies "sent" but WhatsApp quietly drops the message. This is the most likely reason nothing arrives. It still needs confirming with one live test, the first step below.
- The "account blocked" template is built into the app but is not used in the current flow.

## What changes
1. **Confirm the cause first.** I'll send one live test to a number you choose, using both message types, and record exactly what the partner replies. If the template arrives and the free text doesn't, the cause is confirmed.
2. **Send the template first, then the questionnaire link.** In the demo flow (and from a case), "Send WhatsApp" will:
   - send the approved "account blocked" template (account number, support number, English/Hindi from the language picked before Run), which always arrives;
   - then send the questionnaire link as free text.
   The screen shows each message separately: "Template: delivered to WhatsApp", "Questionnaire link: sent".
3. **Clear status, not false success.** The app shows the partner's real reply for each message. It also warns that the link may not arrive unless the customer has messaged the bank's number in the last 24 hours, or replies to the template.
4. **WhatsApp test on the Integrations page.** A "Send test" box (number + type) under Decision Manager > Integrations, to check the WhatsApp service before a demo.
5. **Request for the partner.** A short ready-to-send note asking the partner to approve a **questionnaire template with a link field**. Once they approve it, the link will always arrive and step 2 becomes a single message.

## Details to confirm
- The support number in the template: I'll use 1800123456 (from the partner's example) unless you give the real one.

## Technical details
- `src/lib/whatsapp.functions.ts`: both server functions return the parsed partner body (`status`, message id, any error) and log non-"sent" replies.
- `RealWhatsAppPanel` in `src/components/edd/RealChannels.tsx`: calls `sendAccountBlockedWhatsApp` (to, account digits, support number, `en`/`hi` from contact language), then `sendWhatsAppText` with the link; logs both to the run/case timeline.
- New "WhatsApp test" card on `src/routes/admin.integrations.tsx`.
- Vitest: language mapping (ENGLISH→en, HINDI→hi) and account-number cleaning for the template input.
