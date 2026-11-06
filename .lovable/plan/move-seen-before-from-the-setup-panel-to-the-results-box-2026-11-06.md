# Move "Seen before" from the setup panel to the results box

## What changes
- Remove the "Seen before" strip and the "+5 risk points" line from the Sample alert panel (above the contact fields).
- Show it in the **Step outcomes** box on the right, as a "Case history" entry under the step results, once the run has finished (decision reached or case created).
- The entry shows: number of earlier linked cases, how many were blocked, the most recent linked case with its decision and date, and an "Open network view" link.
- The case created by this run is excluded, so it never counts itself.
- Before a run (or with no history) nothing extra appears; with no earlier cases after a run it shows "No earlier cases for this account".

## Technical details
- `WorkbookFlow.tsx`: delete `<PriorHistory …/>` from the alert panel; render it inside the Step outcomes card when `final || caseId` is set, passing `excludeCaseId={caseId}`.
- `AlertHistory.tsx` `PriorHistory`: accept `excludeCaseId`, compute live via `findLinked(..., { excludeCaseId })` instead of the pre-run snapshot, use the full (non-compact) strip so the latest case and date show.
