# Make the Demo Simulator feel like a live engine

## Goal
When a sample alert is triggered, the presenter sees the engine working step by step, like a live call flow: each system lights up, sends and receives messages, and hands off to the next one, ending in a created case.

## What the presenter will see

1. **Live flow diagram (top of the I4C & Model alert flow tab)**
   - Lanes for each system: Alert source (I4C / Model) -> EDSquare engine -> Negative DB -> Core Banking -> Decision Manager -> WhatsApp -> Voice bot -> Case Manager -> Enforcement.
   - Animated arrows show each request and reply moving between lanes (like a sequence diagram), with the current step pulsing and timing shown (for example "Core Banking - 412 ms").

2. **Engine console (side panel)**
   - Scrolling, timestamped log lines in plain wording: "Querying Negative DB for 9120303030... no match", "Fetched CBS profile: avg daily credit Rs 2,300, P75 Rs 4,100", "Rule 'Amount >= 2x avg credit' fired +6".
   - Click a line to see the request/response details (sample data).

3. **Richer step cards**
   - Negative DB: search animation, matched/not matched record card.
   - Core Banking: profile card filling in field by field, with the comparison against the alert amount.
   - Decision Manager: rules evaluated one by one with a running score meter and Red / Amber / Green result.
   - WhatsApp: a phone mock-up showing the real message being sent (uses the existing partner send), delivery ticks, and questionnaire answers appearing as chat bubbles.
   - Voice call: a phone call screen (ringing, connected, timer, retry 1/3), questions and answers shown as a live transcript, with a waveform animation. Answers still chosen by the presenter.
   - Case creation: case card created with ID, risk, assigned queue/person, SLA countdown, then a link into the real case page.

4. **Playback controls**
   - Auto-play / Step-by-step, speed (1x, 2x), pause and restart.
   - "Presenter mode" that hides editing panels so the screen looks like a live operations console.

## What stays the same
- All decisions still come from the existing workbook rules and Decision Manager; only presentation changes.
- Real WhatsApp send stays behind the confirmation dialog and send limit.
- Voice call remains simulated (no real phone call) unless a voice provider is added later.
- Transaction pipeline tab unchanged.

## Technical details
- New presentational components under `src/components/edd/live/`: `FlowLanes`, `EngineConsole`, `PhoneWhatsApp`, `PhoneCall`, `CaseCreatedCard`, `RuleMeter`.
- A small event timeline helper (`src/lib/flow-events.ts`) turns `edd-flow.ts` step results into ordered timed events (lane from/to, label, payload, delay); pure and unit tested.
- `WorkbookFlow.tsx` emits events at each phase and drives the components; no change to rule logic.
- Animations via CSS/Tailwind tokens; no new heavy libraries.
