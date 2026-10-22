# Cleaner reports, menu order, clear system blocks

## 1. Reports and Dashboard talk about cases, not "demo runs"
- Outcomes & Reports > Overview: replace the "Demo runs" stats card with a **"Case results"** card built from all cases (total cases, cleared with no case, case created, voice answer rate, WhatsApp completion, Red/Amber/Green/Manual split).
- Replace "Latest demo runs" with **"Latest cases"** on both Reports and Dashboard: customer, alert type, path taken (call / WhatsApp), result, case number link.
- Remove the words "demo run", "Live demo" and "Sample" from these screens. The "Open the Demo Simulator" empty-state link becomes "No cases yet".
- Case page summary card renamed from "Demo run summary" to "Engagement summary" (tags removed).

## 2. Menu order
- Demo Simulator moves to the bottom of the left menu, after Audit Trail, separated by a divider line.

## 3. Clear marking of system-blocked transactions
- New result **"System blocked"** (distinct from "Blocked" by an analyst), shown wherever results appear: Alerts list, alert side panel, Cases list, case header, Dashboard funnel, Outcomes funnel and Enforcement log.
- Red badge with a shield/lock icon and the label "System blocked", plus a one-line **reason**, e.g.:
  - "Negative Database hit (UPI handle on I4C list)"
  - "Failed data checks: KYC mismatch / velocity over limit"
  - "No customer response on call, WhatsApp and email"
  - "High-risk answers on verification call (score 12)"
- Enforcement log gets a "Blocked by" column (System / analyst name) and a "Reason" column; a filter chip "System blocked only".
- Dashboard KPI "Blocked accounts" splits into "System blocked" and "Blocked after review".

## Technical details
- `src/lib/alert-journey.ts`: add `"System blocked"` result and a `blockReason` string derived from the run's step log / case timeline (data-check failures, negative DB hit, no-response exit, red score). Human Block decision still yields "Blocked". Add Vitest cases for each reason.
- `src/components/edd/DemoRuns.tsx`: rename exports to `CaseResultStats` / `LatestCases` (data still from runs + cases); update `ReportsBody.tsx`, `routes/index.tsx`, `cases.$caseId.tsx`, `cases.index.tsx`.
- `Journey.tsx`: new badge style + reason line; `AlertFunnel` includes the new bucket.
- `EnforcementBody.tsx`: system entries use `decidedBy: "System"`; add columns and filter.
- `AppShell.tsx`: reorder nav, render a separator before Demo Simulator.
- Update AGENTS.md rule on alert outcomes to mention the system-block reason.
