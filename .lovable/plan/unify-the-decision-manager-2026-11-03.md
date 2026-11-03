# Unify the Decision Manager

## The problem
Today Data sources, Rules & thresholds, Policy & hierarchy, Workflows by source and Queue priority are separate screens with no visible links. A workflow step like "Data checks" doesn't say which rules or policy it runs, and a rule doesn't say which workflows use it.

## The idea: one chain, shown everywhere

```text
Data source -> Alert feed (I4C / NPCI / Model / Threat intel)
   -> Workflow (blocks: Data checks, Call, Questionnaire, Email, Manual, Human review)
        -> each decision block runs a Policy (ordered rule sets)
             -> Rules (use fields from Data sources)
             -> Thresholds (score bands -> Green / Amber / Red)
   -> Outcome -> Queue (per-source priority, team, escalation)
```

## What changes for the user

1. **Decision Manager overview page (new landing page)**
   - One visual map per alert source: source -> workflow blocks -> policy -> outcome -> queue.
   - Every box is clickable and opens the right screen, already filtered.
   - Health badges: "3 rules unused", "Policy not linked to any workflow", "Field missing from source".

2. **Menu regrouped into three steps**
   - Inputs: Data sources, Integrations
   - Decisions: Policies & rules (policy, hierarchy, rules and thresholds merged into one screen)
   - Actions: Workflows by source, Queue priority
   - Setup: Users & roles, Consent templates

3. **Workflow blocks link to a policy**
   - Data checks, Call scoring and Questionnaire scoring blocks get a "Decision policy" picker plus the threshold bands they use (e.g. over 10 = keep blocked, 8-10 = manual review, below 8 = unblock).
   - Branch triggers ("previous block Red / failed") read those bands, so it's clear why the flow moved on.

4. **Policies & rules screen shows where it's used**
   - Each policy and rule shows "Used in: I4C -> Data checks, Model -> Call scoring".
   - Thresholds move inside the policy they belong to, not a separate list.
   - Rules show which data source each field comes from.

5. **"Try it" panel shared across screens**
   - Pick a sample alert, see the path: which blocks run, which rules fire, score, band, next step and the queue it lands in. Same engine as the Demo Simulator.

6. **Demo Simulator follows the configuration**
   - Step 1 rules and score bands are read from the linked policy and thresholds, so editing them changes the demo. A "Using: I4C workflow v3" label shows which setup ran.

## Technical details
- Add `policyId` and `bandId` fields on decision blocks in `src/data/ops-config.ts`; migrate saved configs.
- New pure `src/lib/decision-graph.ts`: builds source -> feed -> block -> policy -> rule -> field links, plus "used in" lookups and health warnings; Vitest tests.
- New `src/routes/admin.index.tsx` overview; merge `admin.rules.*` and `admin.policy.tsx` into one tabbed "Policies & rules" screen (old URLs redirect).
- `WorkbookFlow`/`edd-flow.ts` read thresholds from the linked policy through `rule-engine.ts` so one evaluator is kept.
- Update `AGENTS.md` rule for the decision chain.

## Suggested order
1. Linking data + overview map. 2. Merged Policies & rules with "used in". 3. Workflow policy picker. 4. Try-it panel and simulator wiring.
