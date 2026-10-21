# Simpler, more natural demo run

## 1. Customer details before the run
- New "Customer contact" box above the Run button: mobile number (country code added automatically), customer name, call language.
- Run stays disabled until a valid number is entered. Number is remembered for the session.
- Voice call and WhatsApp use these details automatically; no re-typing inside the steps.
- Presenter mode shows a compact version of the same box next to Run.

## 2. Voice call is real only
- Remove "Customer responds (simulated)" and the presenter-picked answers on the voice step.
- On run, after data checks, the real call is placed straight away (one confirm), with live status: Dialling -> Ringing -> Connected -> Ended.
- Answers come from the real transcript (AI-extracted), shown with the score; presenter can correct a wrongly read answer before confirming.
- If no answer, the next attempt is offered with a countdown ("Retry in 10s", attempt 2 of 3), with "Retry now" / "Stop calling".

## 3. WhatsApp as an optional step after the call
- After the voice call ends (answered or not), a card asks: "Send WhatsApp questionnaire to the customer?" with **Send WhatsApp** and **Skip**.
  - Answered call: optional extra confirmation; skip goes straight to scoring outcome.
  - No answer after 3 attempts: recommended per the scenario sheet, but still skippable (skip -> email & app alert step).
- When sent, the window waits for the customer's form answers and shows them live.

## 4. Making it more intuitive
- One clear "What happens next" line under the step tracker at every step.
- Single primary button per step; secondary actions as small links.
- Waiting states show a timer and what we are waiting for ("Waiting for customer to submit the form - 0:42").
- End summary card: path taken (call answered? WhatsApp sent?), final colour, case link, call recording.
- Keep a hidden "Offline demo" switch (off by default) that brings back the simulated answers for when there is no network/phone.

## Technical details
- `WorkbookFlow.tsx`: add contact state + pre-run form; new phase `wa_offer` between `voice` and `bitly`; pass contact props into `RealVoicePanel` / `RealWhatsAppPanel`; gate simulated buttons behind `offlineDemo`.
- `RealChannels.tsx`: accept phone/name/language as props, auto-dispatch on mount, retry countdown, editable extracted answers.
- `edd-flow.ts` rules unchanged; add test for "WhatsApp skipped after no answer -> alert step".
