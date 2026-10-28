# Queue priority: one queue per source, plain-language setup

## What changes for the user

The Queue priority page becomes a page with one tab per source (I4C, NPCI, Model, NegBase), plus an "Across queues" tab. Today's overall weights move into "Across queues" and work as they do now. They decide which queue's work comes first when a team covers more than one queue.

Each source tab has four simple cards:

1. **What comes first in this queue**: pick one ready-made style, then adjust it if needed.
   - I4C, "Deadline first": golden-hour SLA, then amount, then risk.
   - NPCI, "Fastest money first": amount, then minutes left, then risk.
   - Model, "Riskiest first": risk score, then how long it has waited.
   - NegBase, "Repeat offenders first": number of negative-database hits, then risk.
   - Four sliders show as "Matters a lot / some / little / not at all" instead of raw numbers. Under them, a sentence explains the result, e.g. "Cases close to their deadline go to the top. Bigger amounts break ties."
   - Two override switches: "Always put breached cases on top" and "Always put amounts over Rs X on top".

2. **Who works this queue (distribution)**
   - Team: the desk from Workflows, plus its members and each member's limit on open cases.
   - Assignment style: Round robin, Least busy, Skill/language match, or Pick from queue (pull).
   - Optional rule: "VH cases only go to senior analysts".

3. **When it escalates**: a short ladder of up to three levels, each written as a sentence:
   - "If unassigned for 15 min → move to Supervisor"
   - "If 80% of SLA used → alert Supervisor"
   - "If SLA breached → reassign to Investigator and notify Nodal officer"
   - Triggers: unassigned for X min, % of SLA used, SLA breached, member at capacity, high risk with no action.
   - Actions: notify, reassign to role/person, move to another desk's queue, raise priority.

4. **Live preview**: this queue's cases ranked, with a "why it's here" chip on each (e.g. "Breached", "Rs 2.4L", "Risk 91"), who it would go to, and the next escalation step and when it happens.

The "Across queues" tab shows how much attention each queue gets (today's source criticality), the overall weights, and a team load view: each member's open cases against their limit, and breached cases.

The Dashboard priority queue and the Cases "My work" list use the per-source ranking. "Suggested assignee" and "Escalates in" columns are added.

## Out of scope for now
- Real automatic reassignment over time. Escalations are calculated and shown in the preview and on cases, not run in the background.
- Settings stay per browser, as with Workflows. Only Admin and Supervisor can edit them.

## Technical details
- `src/data/ops-config.ts`: `QueueConfig` adds `perFeed: Record<FeedId, FeedQueue>`, where `FeedQueue = { preset, weights {risk,sla,amount,age,negHits}, overrides {breachedTop, amountTopGte?}, distribution {mode: round_robin|least_loaded|skill|pull, members[{name, role, cap, langs, senior}], seniorOnlyVH}, escalation: EscLevel[] }`. Defaults per source as above. The existing `weights`/`feedPriority` stay as cross-queue settings. The store migrates old saved settings.
- `src/lib/queue-priority.ts` (pure): `feedScore()`, `explainOrder()` (builds the sentence), `reasonChips()`, `suggestAssignee()`, `nextEscalation()`. `rankQueue` uses the per-feed score and then the cross-queue blend.
- `src/routes/admin.queue.tsx` is rewritten with the tabs. Dashboard and Cases add the two columns.
- Vitest: one test per rule (preset ordering, breached override, amount override, least-busy pick, cap respected, VH to senior only, escalation level timing).
