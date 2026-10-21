# WhatsApp questionnaire to check the transaction before a case is created

## New order of the flow
```text
Alert -> Step 1 data checks -> WhatsApp questionnaire -> Voice call (only if needed) -> Case created (only if still risky) -> Human review
```

## What changes
1. **No "account blocked" message.** The WhatsApp step now sends a short message: "We noticed a transaction of Rs X on your account. Please confirm a few details", with a questionnaire link.
2. **Questionnaire on the phone screen.** The workbook questions (employment, pin code, do you know the sender, reason for the credit) show up as WhatsApp chat bubbles with quick-reply buttons. The presenter taps the customer's answers.
3. **The answers decide what happens next**, scored with the existing workbook rules:
   - **Green (looks genuine):** no case is created. The alert closes as "Verified by customer" and the account is released. This is logged in the audit trail.
   - **Amber / Red, or no reply:** the flow moves to the voice call. A case is created only if the call (or 3 unanswered calls) still points to risk.
4. **Case creation moves to the end.** The flow map and engine console stop showing "Case created" right after the data checks. It now appears only after the WhatsApp and call steps fail to clear the customer.
5. A Negative Database hit (Red at Step 1) still skips the questionnaire and goes straight to a case and human review.
6. The step tracker becomes: Data checks -> WhatsApp check -> Voice bot -> Case & human review.

## Real WhatsApp sending
The partner link you shared can only send the "account blocked" message, so it can't send a questionnaire. Until the partner sets up a questionnaire message for us, the questionnaire runs on the on-screen phone and nothing real is sent. Once they give us a new link or message, we connect it here. Replies coming back to the app would also need a reply notification from them.

## Technical details
- `WorkbookFlow.tsx`: the `notice` phase becomes `wa_check` (questionnaire using `scriptFor` questions + `responseFlag`). Green goes to `closed_verified`, everything else goes to `voice`. Case creation moves after voice/exit. Remove the account-blocked `WhatsAppSender` from this step; keep the component for a future questionnaire endpoint.
- `flow-events.ts`: remove case creation from `intakeEvents`; add `whatsappEvents(answers, flag)` and `caseEvents(caseId)`. Update the tests (case is not the last intake event; Green WhatsApp check creates no case).
- `edd-flow.ts`: add a `waCheckOutcome` helper reusing the existing scoring, with a unit test.
