# Real voice agent + WhatsApp, following the scenario sheet exactly

## 1. Flow order (matches the "scenarios" sheet)
```text
Step 1 Data checks -> Step 2 Voice bot -> Step 3 WhatsApp / self-service questionnaire
-> Step 4 Email & mobile app alert -> Step 5 Exit (I4C) / Manual queue (Model) -> Human in the loop
```
- This undoes the earlier change that put WhatsApp before the call. The sheet puts the voice bot first.
- **Step 1:** Negative DB hit means Red, continue block. Otherwise: amount > Rs 5,000 and at least 2x the average means continue block. A transaction over 20% of the last two credits also means continue block. If none of these apply, go to Step 2. Red leads to a case and human review.
- **Steps 2 to 4**, each scored on the response flag: over 10 means continue block. 8 to 10 on a non-merchant account means continue block. 8 to 10 on a merchant account goes to the Manual review queue. Below 8 means Green, unblock. No response moves to the next step.
- **Step 2 voice:** up to 3 attempts. No answer or a dropped call counts as no response and is retried. Uses the I4C Script or Mod Script (Debits & Credits when there are debits).
- **Step 3:** sends the I4C Bitly or Mod Bitly questionnaire.
- **Step 4:** the same Bitly questions, sent as an email and mobile-app alert. This stays simulated, with an on-screen notice.
- **Step 5:** I4C: continue block and exit, with self-service links sent by WhatsApp, email, SMS and app. Model: Manual queue.
- **Human in the loop:** an AI summary of every step, then Block or Unblock.
- Outcomes use the sheet's labels: Red = Continue block, Amber = Next step, Green = Unblock, Manual.

## 2. Real voice call (Step 2)
- The presenter types the customer mobile number and presses **Place real call**. A confirmation appears first. The app dispatches the AI agent with customer name, bank name, last 4 digits, credit amount and date, recent credit and language. Names are sent in normal capitals, e.g. "Rakesh Roshon".
- The step card shows the call status live (pending, ringing, completed or no answer) by checking call history every few seconds. When the call ends it shows the transcript, a recording player and the agent's call summary.
- **Scoring:** AI reads the transcript and maps each answer to the matching script option (employment, pin code, knows sender, reason). The presenter sees the picked answers and can correct them. The existing scoring then gives the response flag and the colour.
- If the call is unanswered or not completed, that counts as an attempt. After 3 attempts the flow moves to Step 3.
- The simulated call (presenter picks answers) stays as a fallback.

## 3. Real WhatsApp (Step 3)
- Uses the new **send-text** endpoint. It sends: "Dear {name}, we noticed a credit of Rs X on A/c ending XXXX. Please confirm a few details: {link}". The **send-image** endpoint can optionally attach the bank logo.
- The link opens a real questionnaire page in the app that works on a phone. The customer's answers are saved and appear live in the presenter's Step 3 window, then get scored. This needs Lovable Cloud to store the answers.
- The on-screen questionnaire window stays as the offline fallback.
- WhatsApp only accepts free text if the customer messaged the business in the last 24 hours. Before the demo, the presenter should message the business number from the test phone first.

## 4. Safeguards
- Messages and calls only go to numbers the presenter types in. Each run allows up to 3 calls and 3 messages. Numbers are masked in the audit trail.
- The voice API key from the document goes into a server secret, never into the code. The document also shows the key in plain text, so I recommend asking the partner to rotate it.

## Technical details
- `edd-flow.ts`: add a `stepOutcome(flag, merchant)` helper. Phases become data, voice, bitly, alert, exit and review. Tests are updated to the sheet order.
- `src/lib/voice.functions.ts`: `dispatchVoiceCall` and `getVoiceCall`, matching a call by `calleeNumber` and a time after dispatch, because the dispatch response returns a record id and not a call id. Secrets: `VOICE_API_KEY`, plus `VOICE_AGENT_ID`, `VOICE_ORG_ID` and the base URL with defaults.
- `src/lib/rule-ai.functions.ts`: `extractAnswers(transcript, questions)` uses the AI Gateway and must return one of the option labels for each question.
- `whatsapp.functions.ts`: add `sendWhatsAppText` and `sendWhatsAppImage`. Remove the account-blocked sender from the flow.
- Lovable Cloud: a `questionnaire_sessions` table with token, questions, answers and status. A public route `/q/$token` lets the customer answer, with access limited to that one token. The simulator polls the answers.
- `flow-events.ts` and the flow map are re-ordered for voice then questionnaire. Real API latencies are shown on the arrows.

## Open points for the partner
- Does a callback exist when a call ends? Without one, the app polls call history.
- Do they have an approved questionnaire template for customers outside the 24-hour window?
