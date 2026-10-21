# One flow everywhere + sample cases from the test sheet

## Problems
1. **Run triage on Alerts** opens a separate older drawer that scores the alert differently from the Demo Simulator (no data checks, call, WhatsApp steps).
2. **Cases from the simulator don't reliably show up on Cases.** Demo cases are only kept once a run fully finishes, and only for the current browser tab, so a run that is stopped midway, or opening the app in a new tab, loses them. (Exact cause will be confirmed with a full test run before fixing.)
3. Sample alerts and cases aren't built from the bank's test sheet, so most alerts show "New".

## Changes
### 1. Run triage = the demo flow
- Remove the old triage drawer. "Run triage" on an alert opens the Demo Simulator with that alert pre-selected (same steps, same rules, same case creation).
- Alerts that come from the test sheet get a "Run in simulator" button; other alerts are mapped to the closest sheet scenario.

### 2. Sample cases from the test sheet
Pre-built, ready-to-open alerts and cases, one per scenario, using the sheet's customers (3 core-banking profiles) and 5 alert types:
- Blocked at data checks (Step 1 check fired)
- Call answered, low risk: verified, no case
- Call answered, high flags: case open, awaiting review
- Call not answered, WhatsApp answered, Amber: case open
- No response on any channel: email and app alert, manual review
- Reviewed and blocked; reviewed and unblocked
Each comes with a full timeline, call summary and transcript (sample text, no recording), questionnaire answers and the decision, so Alerts, Cases, Outcomes and Dashboard all show real results from the start.

### 3. Demo cases always appear on Cases
- Save the case and its run as soon as the case is created, not only at the end.
- Keep demo cases in the shared database so they survive a refresh, a new tab and the published app, and appear for everyone viewing the demo.
- "Reset demo data" button to clear them.

### 4. Full end-to-end test
Run each scenario in the simulator and confirm the case appears on Cases, Alerts shows the right result, and the case page shows the correct customer, timeline and call.

## Technical details
- `src/data/workbook.ts` -> derive seed alerts/cases/enforcement/demoRuns in a new `src/data/sample-scenarios.ts`; merge into store seeds; ids from `nextCaseId`.
- `alerts.tsx`: "Run triage" navigates to `/simulator?alert=<id>`; simulator reads the search param to preselect. Delete `TriageDrawer.tsx`.
- `WorkbookFlow.tsx`: call `recordRun` (partial, status "in progress") at case creation, update at end.
- New `demo_cases` table (case JSON + run JSON) accessed via server functions; store loads it on start and writes on create/attach. Replaces sessionStorage.
- Vitest: each sample scenario yields its expected `alertJourney` result; a recorded run's case is retrievable after reload.
