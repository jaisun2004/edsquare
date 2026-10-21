# Real WhatsApp message at Step 3 (Airtel Payments Bank demo)

Use the partner's "account blocked" WhatsApp message in the Demo Simulator. When a run reaches **Step 3 · WhatsApp questionnaire**, the presenter can send a real message to their own phone.

## What the presenter sees

1. A new **Send real WhatsApp** box on the Step 3 card:
   - Mobile number (country code, no +), e.g. 919667335707. It is remembered for the session.
   - Account number: filled in from the sample alert (e.g. 9120303030). It can be edited.
   - Support number: defaults to 1800123456.
   - Language: English or Hindi.
   - A **Send WhatsApp** button. A confirmation pops up first: "Send a real message to +91 96673 35707?"
2. After sending, the box shows "Sent" or the exact error from the WhatsApp service. The Step outcomes panel and the Audit Trail record it as "WhatsApp sent to ••••5707", with the number masked.
3. The demo carries on as before: the presenter clicks "Customer responds" or "No response". Replies don't come back into the app, because the endpoint only sends.

The simulated flow still works without sending anything, so the demo is safe offline.

## Safeguards
- The message only goes to a number the presenter types in. It never goes to sample-data numbers automatically.
- Inputs are checked before sending: 10 to 15 digits, an account number, and the language must be en or hi.
- Each run can send at most 3 messages, to avoid accidental spam during a demo.

## Technical details
- New server function `sendAccountBlockedWhatsApp` in `src/lib/whatsapp.functions.ts`. It POSTs to `https://buddy.pharynxai.in/waba_chargeback/send-account-blocked` with `{to, account_number, support_number, language}` and validates the input first. It runs server-side, so the partner URL isn't called from the browser and browser security (CORS) doesn't block it. It returns the HTTP status plus the response body.
- The endpoint URL lives in a server env var `WHATSAPP_PARTNER_URL`, with the given URL as the fallback, so it can be swapped later without code changes. No API key was provided. If the partner later issues one, it gets added as a secret header.
- `WorkbookFlow.tsx` gets the send box in the `bitly` phase, logged via `store.logEvent`.
- A Vitest test covers the input validation (rejects a "+", short numbers, and languages other than en or hi).
- Not using Lovable's built-in WhatsApp connector, because the partner already runs the WhatsApp Business account and the approved template.

## Open points for the partner (not blocking)
- Is the endpoint protected (API key or allowed IP addresses)? The published app calls it from Lovable's servers.
- Any delivery-status or reply webhook? If they provide one, customer replies could flow back into the questionnaire later.
