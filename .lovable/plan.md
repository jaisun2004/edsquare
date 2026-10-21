# Replace the WhatsApp phone with a questionnaire window

## What changes
1. Step 2 becomes **"Customer questionnaire"** (no WhatsApp wording anywhere in this step: step tracker, headings, flow map, engine console, step log).
2. Instead of the WhatsApp phone, a **questionnaire window** opens on screen, styled like a secure bank web form: bank header, "Verify a recent transaction of Rs X on A/c ending XXXX", then the workbook questions (employment, pin code, do you know the sender, reason for credit/transfer) as clickable answer options.
3. The window shows progress (e.g. "2 of 5 answered") and a **Submit** button. On submit, it shows "Answers received" with each answer and its risk points, then the result:
   - Green: transaction verified, freeze lifted, no case created (same as today).
   - Amber/Red: moves to the voice call, as today.
4. **No reply** button stays, and still moves to the voice call.
5. Voice call, case creation, human review and scoring rules stay exactly as they are.

## Technical details
- New `QuestionnaireWindow` component in `src/components/edd/live/LiveFlow.tsx` (browser-window frame, uses semantic tokens), taking questions, answers, onAnswer, onSubmit, result.
- `WorkbookFlow.tsx`: in the `wa_check` phase render `QuestionnaireWindow` instead of `PhoneWhatsApp`; rename labels; drop the WhatsApp message bubbles for this step. Keep `PhoneWhatsApp` for the post-voice-retries link.
- `flow-events.ts`: rename the `whatsapp` lane label to "Questionnaire" for this step's events; update the existing test labels if they assert on it.
