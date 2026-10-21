# Simpler menu: Alerts -> Cases -> Outcomes

## Problems today
- **Alert Inbox** is just a list waiting for a manual "Run triage". It doesn't show what happened to each alert (blocked, cleared, case open), and the alerts you run in the Demo Simulator use different sample data from the ones listed here.
- **Case Queue** and **Investigations** show the same cases in two different layouts.
- **Enforcement Log**, **Engagement Center** and **Reports** each hold a piece of the outcome story.

## New menu (9 items down to 6)
```text
Dashboard
Demo Simulator        (key differentiator, moved up)
Alerts                (inbox + outcome tracker)
Cases                 (Case Queue + Investigations merged)
Outcomes & Reports    (Enforcement + Engagement + Reports)
Negative Database
Decision Manager      (renamed Administration, phase 2)
```
The old links keep working and send you to the new pages.

## 1. Alerts: from inbox to "alert journey"
- A pipeline bar at the top with counts you can click to filter: **New -> In checks -> Customer contacted -> Case open -> Blocked / Unblocked / Dismissed**.
- Each row shows its **journey dots**: data checks, voice call, WhatsApp, case, decision, each coloured Red/Amber/Green. The final result is a clear badge: **Blocked**, **Unblocked: verified**, **Case open**, **Dismissed**.
- Filters: source (I4C, Model, AML, Negative DB...), result, date. Simulator alerts carry a "Live demo" tag.
- Clicking a row opens a side panel with that alert's full story: checks fired, call and WhatsApp results, the case link and the decision with its reason.
- "Run triage" stays for new alerts. The simulator's sample alerts also appear here, so you can start a run from Alerts ("Run in simulator").

## 2. Cases: one screen, three views
- Tabs: **My work** (the Investigations view, with "Claim next case"), **Board** (by stage), **Table**.
- Quick filters: risk grade, stage, SLA at risk, Live demo, outcome.
- Each case card shows how it got here, e.g. "I4C · call not answered · WhatsApp flag 9 · Amber".
- The case page stays as it is, plus a short "Journey" strip at the top showing the same steps as the alert.

## 3. Outcomes & Reports: one place for results
- Tabs: **Overview** (the current Reports page plus the demo run stats), **Enforcement log** (blocked/unblocked list, linked back to the alert and case), **Engagement** (the current Engagement Center).
- A new "Alert to outcome" funnel: alerts received -> cleared at checks -> cleared by customer -> cases -> blocked.

## 4. Dashboard
- Today's funnel (same counts as the Alerts pipeline), my work, latest demo runs, SLA breaches. "Run a demo" button.

## 5. Decision Manager (phase 2, separate plan)
- Rename Administration to Decision Manager, with the thresholds from the scenario sheet editable there (flag cut-offs 8/10, voice retries, check limits). The simulator and the Alerts flow will both read them. I'll plan this in detail once this restructure is approved.

## Technical details
- New pure `src/lib/alert-journey.ts`: derives an alert's journey steps and final result from the alert, its case, enforcement entries and demo runs; Vitest tests for each result (Blocked, Unblocked, Case open, Dismissed, Cleared at checks).
- Store: link demo runs to their injected alert ID (`alertId` on `DemoRun`).
- Routes: rewrite `alerts.tsx`; merge `investigations.tsx` into `cases.index.tsx` as a tab; new `outcomes.tsx` with tabs that reuse the existing Enforcement, Engagement and Reports bodies (moved into components); `investigations`, `enforcement`, `engagement`, `reports` become redirects.
- `AppShell.tsx` nav updated to the 6 items.
