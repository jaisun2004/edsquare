# Fix linked history: wrong phone links + show what is most recent

## Issue 1: everything links to the demo phone number
**Cause:** linked history treats the number typed into the Demo Simulator (the person actually called, e.g. 9884800553) as the customer's own phone. Every demo run uses the same tester number, so every demo case looks linked to every other.

**Fix:**
- Only the customer's phone on record links cases. The number called in a demo run no longer counts as a link.
- On the case page, the called number still shows as "Contacted number (demo)" so the information isn't lost.
- Cases created from the simulator keep linking by account, UPI ID and the alert's own data, so genuine repeats (same account run twice) still show.

## Issue 2: can't see which case is the most recent
- Linked cases list: newest first, with a **Latest** badge on the top row and "x days ago" next to the date.
- Network map: each case box shows its date, the most recent gets a "Latest" label and a thicker outline, and the boxes are ordered newest first around the circle.
- "Seen before" line and lookup summary: "Last decision" always means the newest linked case, with its date.
- Case page Linked history tab: adds "Earlier than this case" / "After this case" labels so the analyst sees what came before the current case.

## Technical details
- `src/lib/entity-links.ts`: drop `c.contact?.phone` from `identifiersOfCase`; sort matches by date only (strength shown via badge); expose `latestId` on results; add `relation: "before" | "after"` when a reference case date is given.
- `buildGraph`: add date to case node subtitle, `latest` flag, order ring by date.
- `LinkedHistory.tsx` / `NetworkGraph.tsx`: Latest badge, relative time, before/after label, thicker outline for latest.
- Case page: show contacted demo number as plain info, not a link.
- Tests: demo cases sharing only the called number are not linked; latest is the newest by date; existing shared-phone test (customer phone on record) still passes.
