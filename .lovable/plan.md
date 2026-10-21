# Start an AI call or WhatsApp check from a case

## What you will see
On every case page, a new **"Contact customer"** card (top of the Engagement tab, plus a button in the case header) with two actions:
- **Start AI call** — places a real voice-bot call using the same script as the Demo Simulator.
- **Send WhatsApp check** — sends the real WhatsApp message with the questionnaire link.

Before starting, the card shows the number to contact, pre-filled from the case's contacted person (or the last number used), with name and language editable. Offline demo switch available so you can present without real calls.

While running, the live call status / WhatsApp waiting status appears inside the card. When finished:
- The call (recording, transcript, extracted answers, score) appears under Calls on the case.
- Questionnaire answers appear on the case.
- Timeline and audit trail get entries: "AI call started by <role>", outcome, "WhatsApp check sent", "Answers received", with risk score.
- A suggested next step is shown (e.g. low risk → "Consider unblocking", high risk → "Keep blocked"); the officer still decides.

Repeat attempts are allowed; each is logged separately. Closed cases show the card disabled.

## Technical details
- New `src/components/edd/CaseOutreach.tsx` reusing `ContactBox`, `RealVoicePanel`, `RealWhatsAppPanel` from `RealChannels.tsx`; workbook alert/profile/questions resolved from the case's linked alert (fallback to closest workbook profile).
- Results written via store `attachFlow(caseId, { events, calls, questionnaires })`, which already persists to `demo_records`.
- Scoring reuses existing `edd-flow.ts` helpers; small pure helper `outreachSuggestion(score)` with Vitest tests.
- Mount in `cases.$caseId.tsx` (Engagement tab + header button that switches to that tab).
