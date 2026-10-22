# Make "Transaction pipeline" run the same real flow

## What is wrong today
The "Transaction pipeline" tab is the original prototype. Its Engagement stage only shows a pre-written fake call transcript. It never places a real AI call, never sends the WhatsApp questionnaire, skips the Negative Database / core banking checks, and the case it creates has no call recording, questionnaire answers or step status. So it behaves nothing like the "I4C & Model alert flow" tab.

## What changes
1. **One engine for both tabs.** A transaction composed in the pipeline tab (customer, account, amount, channel, Negative Database hit, etc.) is turned into an alert and handed to the same step flow as the I4C/Model tab: data checks -> AI voice call -> optional WhatsApp questionnaire -> email & app alert -> exit/manual -> human review.
2. **Same contact box before Run.** Mobile number, name and language are entered once; the call and WhatsApp are real (offline demo switch stays available).
3. **Pipeline view kept as the visual.** The top tracker (Transaction -> Alert -> Enrichment -> Decision Manager -> ... -> Enforcement) stays, but each stage lights up from the real flow's progress instead of its own fake timers. The Decision Manager stage still shows fired rules and score.
4. **Cases get the full record.** Call playback, transcript, questionnaire answers, step status, timeline and audit are saved on the case exactly like runs from the other tab, and show on Alerts, Cases, Dashboard and Outcomes.
5. **Fake transcript removed.** No pre-written call text anywhere.
6. **Call script from the uploaded sheet.** A composed transaction is treated as a Model alert, so the AI call uses the sheet's "Mod Script" questions (greeting, identity check, employment, office/home pin code, sender known, reason for credit). If the transaction has outgoing payments too, it uses "Mod Script Debits and Credits". The WhatsApp step uses "Mod Bitly". Outcomes follow the sheet: flag over 10 continue block, 8-10 block (merchant goes to Manual review), below 8 unblock; no answer retries 3 times, then WhatsApp, then email & app alert, then Manual review queue.

## Technical details
- Add a mapper in `src/data/scenarios.ts`: `TxnInput` -> `WorkbookAlert` + CBS-like profile (type "Model" for transactions), so `edd-flow.ts` stays the single evaluator.
- Refactor `ClassicSimulator.tsx` to render `WorkbookFlow` with a `customAlert` prop (new prop on `WorkbookFlow`) plus a stage-mapping header; drop its own `startEngagement`/timer logic.
- `WorkbookFlow` accepts an injected alert (registered via `store.injectAlert`) and reuses existing contact, `RealVoicePanel`, `RealWhatsAppPanel`, `recordRun`, `attachFlow`, `reserveCaseId`.
- Add a Vitest test for the mapper (Negative Database hit -> Red at data checks; small clean credit -> goes to voice call).
