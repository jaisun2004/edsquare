# Run in simulator starts straight away, and Alerts link to Cases

## 1. "Run in simulator" starts the run automatically
- Clicking it on an alert opens the Demo Simulator with that alert's data and starts the run immediately. No need to pick the alert or press Run.
- Customer contact: if a mobile number was entered before (it's remembered), the run uses it and places the real call. If no number is saved, the run starts in offline demo mode, with a small note "Add a number for a real call" and a button to restart with one.
- The run is tied to the alert you clicked. It no longer adds a second, duplicate alert to the Alerts list.
- A "Back to alert" link sits at the top of the simulator during the run.

## 2. Alerts and Cases connected both ways
- **Alerts list:** a new "Case" column shows the case number (e.g. CASE-2101) as a link that opens the case. Alerts still running show "Running..." and update to the case number as soon as the case is created.
- **Alert side panel:** the case number appears at the top as a link.
- **Simulator:** once the case is created, its number appears as a link with "Open case".
- **Case page:** a "From alert AL-..." link at the top opens the Alerts page with that alert's side panel already open.

## 3. Check
Click Run in simulator from Alerts, let it create a case, go back to Alerts and confirm the case number shows and opens the right case with the right customer. Then follow the link from the case back to the alert.

## Technical details
- `/simulator` search: `alert` (sheet alert id), `from` (originating alert id), `auto=1`. `alerts.tsx` passes all three.
- `WorkbookFlow`: when `auto`, it runs `start()` once on mount after reading the saved phone (offline if no saved phone). When `from` is set, it reuses that alert id instead of `injectAlert` and sets `alertIdRef` to it, so `applyTriage` links `alert.caseId`.
- `/alerts` search: `open` (alert id) opens the side panel. The case page finds its alert via `alerts.find(a => a.caseId === id)`.
- Test: the case id written to the originating alert matches the case the run created (store-level helper, Vitest).
