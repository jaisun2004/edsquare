# Case numbers never repeat in the shared demo

## What is wrong today
- The next case number is worked out in each browser from the cases that browser has loaded. Two people (or two tabs) running demos at the same time both pick the same number, e.g. CASE-2105.
- A run started before the saved demo has finished loading can also pick a number already in use.
- When saved, the second case overwrites the first one, so the first alert's "Case" link opens someone else's case.
- Only the oldest 500 saved demo items are loaded, so once the demo grows the newest cases can go missing and their numbers get reused.

## What changes
1. **Shared counter for case numbers.** When a demo run (or "Run in simulator" from Alerts) starts, it asks the shared demo for a case number. The demo hands out each number once, even if several people run at the same time. Numbers always start above the built-in sample cases and any saved case.
2. **Wait for the saved demo before Run.** The Run button shows "Loading demo…" until saved cases are in, so numbers are never picked from a half-loaded list.
3. **No silent overwrites.** Saving a new case refuses to replace a different run's case with the same number. If that ever happens, the run takes a fresh number and re-links its alert.
4. **Load newest items first** so recent cases are never dropped.
5. **Reset demo** also resets the counter.

## How it will be checked
- Automated tests: numbers stay unique and above samples; a clash is detected and re-numbered.
- Live check with two browser windows running offline demo runs at the same time from different alerts: each gets its own case number, each alert's "Case" link opens the right case with the right customer, the case's "From alert" link opens the right alert, and both survive a refresh.

## Technical details
- Migration: `demo_case_counter` table (single row) + `public.next_demo_case_id(floor int)` SECURITY DEFINER function that does `greatest(counter, floor) + 1` atomically and returns it; execute granted to service role only. Reset sets counter back to 0.
- `src/lib/demo-records.functions.ts`: `reserveCaseId({ floor })` server function calling the RPC via `supabaseAdmin`; `listDemoRecords` orders by `updated_at desc` then reverses; `saveDemoRecords` checks for an existing `case:` row whose `alertId`/run differs and returns the clash list; `clearDemoRecords` resets the counter.
- `src/lib/edd-store.tsx`: expose `loaded` and `reserveCaseId()`; `applyTriage` accepts `extra.caseId` and falls back to `nextCaseId` (still the floor). On save clash, re-number the case and update the alert's `caseId`, run's `caseId`, enforcement entries.
- `WorkbookFlow.tsx`: reserve the number at Run start, pass it to `applyTriage`; Run disabled until `loaded`.
- Tests in `src/lib/case-id.test.ts` for the floor and clash re-numbering helper.
