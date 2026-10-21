# Send WhatsApp right after the account is blocked

## What changes
- As soon as Step 1 (data checks) finishes and the account is blocked, a WhatsApp "account blocked" notice step appears before the voice call.
- The existing WhatsApp send box (with confirmation and 3-send limit) moves to this new step. The phone screen shows the message and the questionnaire link.
- Presenter can press **Send WhatsApp** or **Skip**, then the flow continues to the voice call (Step 2) as today.
- This happens for every run, whether Step 1 ended Red (keep blocked) or Amber (continue checks). On Red, after the notice the flow goes to human review as today.
- The later Step 3 (WhatsApp questionnaire after 3 failed calls) stays, but reuses the same chat on the phone screen instead of a second send box.
- Step tracker gains "WhatsApp block notice" between Data checks and Voice bot. Flow map and engine console log the send.
- Add a small hint under the Negative Database switch: "Pretend this account is already on the Negative Database. Step 1 fails immediately (Red)."

## Technical details
- `WorkbookFlow.tsx`: new phase `notice` between `checks` and `voice`; `finishStart` moves to `notice`; Continue/Skip sets the next phase (`voice` if Amber, `human` if Red). Move `WhatsAppSender` and the WhatsApp phone mock-up into the notice card; Step 3 shows only the questionnaire.
- `edd-flow.ts` rules unchanged.
