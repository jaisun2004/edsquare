# Demo Flow Simulator — "Trigger a transaction"

A new page, **Demo Simulator** (`/simulator`), sits in the main menu. From it, a presenter creates a sample transaction and watches it move through EDSquare one step at a time. Everything is simulated in the browser and uses the existing rule engine and session store.

## What the user sees

1. **Compose transaction** (left panel)
   - Pick a preset scenario: Classic money mule, Scam victim inflow, Clean salary credit, or Dormant account spike. You can also edit the fields yourself.
   - Fields: customer, account, UPI handle, amount, channel (UPI/IMPS/NEFT), counterparty count, account age, device/SIM-change flags, and a Negative Database hit.
   - A **Trigger transaction** button, plus a speed toggle: Step-by-step or Auto-play.

2. **Live pipeline** (centre): a horizontal tracker that lights up stage by stage, with a short delay at each stage
   ```text
   Transaction -> Alert raised -> Data enrichment -> Decision Manager -> Triage outcome -> Case routing -> Engagement -> Decision -> Enforcement
   ```
   Each stage expands to show what happened:
   - Enrichment: which data sources responded and which attributes they returned.
   - Decision Manager: rule sets in order, fired rules with actual values, score, grade and recommendation.
   - Routing: which queue or assignee gets the case, and why.
   - Engagement: a simulated AI call transcript.
   - Enforcement: the action sent to Core Banking.
   - The flow stops at the right point for its outcome. A clean transaction closes as "Clear". A high-risk one goes on to a case and engagement.

3. **Human checkpoint**: at the Decision step, the presenter can accept or override the recommendation, which reflects "AI prioritises. Bank experts decide."

4. **Results** (right panel): live links to the alert, case and enforcement records that were created, plus that run's audit trail. The records really appear in the Alerts, Case Queue, Enforcement and Audit pages, so the story can continue across the app. A **Reset** button clears the run.

## Technical details
- New route `src/routes/simulator.tsx` with its own head() metadata, and a nav entry in `AppShell`.
- New store action `injectAlert(alert, attrs)` in `edd-store.tsx`. It adds the alert and registers its attribute map so that `attrsFor` and `evaluate` (the shared `rule-engine`) score it. The existing actions `triageAlert`, `applyTriage`, `startEngagement` and `decide` are reused for the later stages.
- Preset scenarios go in `src/data/scenarios.ts` and map form fields to catalogue attribute keys.
- Routing is shown by a simple rule: VH goes to the Supervisor queue, H to the Investigator, and M/L to the Analyst, with the reason displayed.
- No backend changes.
