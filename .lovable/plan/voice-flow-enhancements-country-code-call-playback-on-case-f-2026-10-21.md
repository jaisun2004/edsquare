# Voice flow enhancements: country code, call playback on case, full audit trail

## 1. Auto country code
- If the mobile number is entered as 10 digits (e.g. 9081657821), automatically add India's `91` before sending. Same for a leading `0` (09081657821 -> 919081657821) and a typed `+91`.
- The field shows a small hint "Will dial +91 90816 57821" so the presenter sees the final number.
- Applies to both the voice call and the WhatsApp send boxes (shared number field).

## 2. Call playback on the case
- Every real call attempt in the simulator is kept with the run: attempt number, masked number, start/end time, status (answered / no response), duration, recording link, transcript, AI summary, disposition, and the answers the AI extracted with points.
- When the case is created at the end of the flow, these call records are attached to it.
- Case screen, Engagement tab: new "Voice calls" card listing each attempt, with an audio player for the recording, expandable transcript (customer vs agent bubbles), summary, disposition and extracted answers/score. WhatsApp questionnaire answers shown alongside (sent time, submitted time, answers, flag).
- If no recording was returned by the partner, show "Recording not available" instead of a player.

## 3. Proper event recording and audit trail on the case
- Every engine step from the run is written to the case Activity Timeline in order, with real timestamps and the actor (System / AI voice agent / Customer / analyst name):
  data checks result per check, Negative DB result, each call attempt dispatched/answered/no response, answers extracted, voice score and colour, WhatsApp sent / submitted / no response, email & app alert, exit or manual queue outcome, case created and queue assigned, human decision.
- Same entries go to the global Audit log with the case ID so `/audit` filters by case.
- Timeline gets step icons, a channel filter (All / Checks / Voice / WhatsApp / Decision), and expandable detail (e.g. masked number, partner record ID, latency).
- Phone numbers always masked in timeline and audit.

## Technical details
- `src/lib/voice.ts`: add pure `normalisePhone(raw, defaultCc = "91")`; used in `usePhone` and validation. Vitest cases: 10 digits -> 91 prefix, leading 0, +91, already 12 digits unchanged, too short rejected.
- `src/data/edd.ts`: add optional `calls: CallRecord[]` and `questionnaires: QuestionnaireRecord[]` to Case; timeline entries gain `channel` and optional `detail`.
- `RealChannels.tsx`: report finished attempts back via a new `onCall(record)` callback; `WorkbookFlow.tsx` accumulates them plus simulated attempts and a buffered step log.
- `edd-store.tsx`: `injectAlert` accepts `{ calls, questionnaires, events }` and writes them onto the case timeline and audit in one go; later `logEvent` calls keep appending.
- `cases.$caseId.tsx`: new Voice calls / Questionnaire cards in Engagement tab; enhanced timeline with filter.
- Store is in-memory, so attached recordings persist for the session (recording URLs are hosted by the voice partner).
