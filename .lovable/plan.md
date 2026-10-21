# Show real demo runs across the app

Today a demo run creates a case that appears in the Case queue, but its real call, WhatsApp and questionnaire details only show inside the case. Other screens ignore them, and runs that end "Verified" (no case) leave no trace.

## What changes
1. **Demo run record** – every simulator run (case or no case) is saved as a run: alert, customer (masked number), path taken (call answered? WhatsApp sent? form submitted?), score, final colour, case ID if any. Kept for the browser session so a page reload does not wipe it (Reset demo still clears).
2. **Engagement Center**
   - Real voice calls and WhatsApp/questionnaire sends show in "Recent activity" with a "Live demo" tag, status (Answered / No answer / Sent / Submitted), duration, and a play button for the recording.
   - Counters (attempts, responses, response rate, no response) include them.
   - New "Channel results" strip: calls answered vs not, forms sent vs submitted.
3. **Case summary (case page + Case queue)**
   - Overview tab gets a "Demo run summary" card: path taken, call result, questionnaire answers with points, final colour, recording.
   - Case queue shows a "Live demo" tag and a channel icon for cases from real runs.
4. **Dashboard** – "Latest demo runs" card (last 5) with colour, outcome and case link; KPIs include demo cases.
5. **Reports** – new "Demo runs" section: outcomes by colour, cleared without a case vs case created, voice answer rate, WhatsApp completion rate; existing charts already count demo cases.
6. **Audit** – each real call / message / submission appears as an audit line (already logged per case; make sure they also show in the Audit page list).

## Technical details
- `edd-store.tsx`: add `demoRuns` + `recordRun()`; persist `demoRuns` and demo-created cases to sessionStorage; include case `calls`/`questionnaires` in a derived `activity` list.
- `WorkbookFlow.tsx`: call `recordRun()` at the end summary.
- Update `engagement.tsx`, `cases.$caseId.tsx`, `cases.index.tsx`, `index.tsx`, `reports.tsx`, `audit.tsx` to read the shared data; reuse `CaseCalls` for playback.
- Pure helper for run statistics (answer rate, completion rate) with a Vitest test.
