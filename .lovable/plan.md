# Linked history ("Network view") across EDSquare

## Goal
Search any identifier (account, phone, UPI ID, customer name, device) and see every alert, case, decision and Negative Database hit tied to it. Show the same linked history everywhere an analyst makes a decision: alerts, cases, simulator, Negative Database.

## Core idea: one "Entity" model, one lookup, one panel
Every record gets its identifiers pulled out into a common shape. One shared lookup function finds related records. One reusable panel shows them. Every screen uses the same panel, so results match wherever you look.

```text
Identifiers: Account | Phone | UPI | Customer name | Device
        |
  shared lookup  ->  alerts, cases (+ decision), Negative DB hits, call/WhatsApp contacts
        |
  Linked History panel  (Alerts drawer, Case view, Simulator, Neg DB, Search page)
```

## What the user will see

1. **Global search (top bar, now working)**
   - Recognises the type of input: 10-digit or +91 number = phone, contains "@" = UPI, digits = account, else name.
   - Dropdown with quick matches; Enter opens a new **Customer 360 / Lookup** page.

2. **Lookup page `/lookup?q=`**
   - Header: identifier, type, risk summary (cases count, last decision, highest risk, Negative DB hit yes/no).
   - Tabs: **Cases** (id, date, feed, risk, stage, decision + reason, link), **Alerts** (with journey outcome), **Negative DB**, **Contacts** (calls/WhatsApp to this number).
   - **Network graph**: centre identifier, linked accounts/phones/UPIs/devices, colour by outcome (blocked red, verified green, open amber). Click a node to pivot the search.
   - Timeline of all events across cases, newest first.

3. **Case view: "Linked history" card + tab**
   - Overview card: "3 past cases on this account/phone - last: Blocked (Mule, 12 Sep)". Red flag when a past case was blocked or a Negative DB hit exists.
   - New **Network** tab with the same panel/graph as the lookup page, excluding the current case.
   - Each match shows *why* it is linked ("same phone", "same UPI").

4. **Alerts drawer**: compact "Seen before" strip (prior cases + decisions) before triage.

5. **Demo Simulator**: Step 1 data checks gain a "Prior case history" check; the live flow shows it, and a prior blocked case raises risk (new rule "Repeat offender", weight configurable in Decision Manager, appears in rule catalogue so it is usable in workflows).

6. **Negative Database**: each entry shows linked cases/alerts count and opens the lookup page.

7. **Dashboard / Cases list**: "Repeat" badge on cases whose identifiers appear in earlier cases; Cases list gets a filter "has prior history".

## Matching rules (kept simple, explainable)
- Exact match after normalising: phone (strip spaces, add +91), UPI (lowercase), account (digits only, also last-4 masked matches marked "possible").
- Strength: Strong = account/phone/UPI/device; Weak = name only (shown separately, never auto-raises risk).
- One hop by default in lists; graph allows a second hop (e.g. account -> phone -> other account).

## Data gaps to fill
- Cases/alerts today store account, UPI, customer, and demo contact phone; no customer phone or device on sample cases. Add optional `phone`, `deviceId` to cases and alerts and fill sample data so seeded scenarios share identifiers (e.g. two sample cases on one phone, one blocked) to make the demo meaningful.
- Negative DB `associated` list is used as extra links.

## Technical details
- `src/lib/entity-links.ts` (pure, tested): `normalizeIdentifier`, `detectKind`, `identifiersOf(case|alert|negbase)`, `findLinked(query, {cases, alerts, negbase, runs})` returning matches with `linkedBy` + strength, `buildGraph(...)` for nodes/edges, `priorHistorySummary(caseId)`.
- `src/components/edd/LinkedHistory.tsx` (list + summary) and `NetworkGraph.tsx` (SVG, no new heavy library) reused on every screen.
- New route `src/routes/lookup.tsx` with head metadata; AppShell search wired to it.
- Rule engine gets attribute `priorBlockedCases` / `priorCaseCount` in `src/data/sources.ts` catalogue; data checks step in `edd-flow.ts` consumes it.
- Data works off the existing store (built-in samples + shared demo records), so demo-created cases link automatically; no new tables needed now. Later: server-side search index when real bank data arrives.
- Vitest: normalisation (phone +91, UPI case), link detection, weak-name exclusion from risk, prior-history summary excludes current case.
- AGENTS.md rule: linked history derives only from `entity-links.ts`.

## Questions to confirm while building (defaults chosen)
- Name-only matches shown as "possible" but not scored - default yes.
- Prior blocked case adds risk - default +5 points, configurable.
