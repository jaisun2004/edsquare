# Workflow configurator: step blocks + "previous block failed" trigger

## What changes for the user
- Each source's workflow is shown as **blocks**, the same way the Demo Simulator shows them: Data checks, Customer contact (voice), Questionnaire (WhatsApp), Email & app alert, Exit / manual review, Human review. Each block is a card with its own steps inside.
- You can **add, rename, reorder (up/down), turn off or delete a block**, and move a step into another block.
- Each block has its own **"Run this block when"** setting: Always, Previous block got no response, Previous block not clean, **Previous block failed** (new), amount at least / below.
- Steps also get the new trigger **"If previous step / action failed"** (e.g. lien could not be placed, call could not connect, WhatsApp send was rejected) as well as the existing ones.
- The flow preview on the configurator and Dashboard draws blocks as grouped chips with the trigger shown between blocks.
- Existing saved settings keep working: old flat step lists are turned into blocks automatically.

## Technical details
- `src/data/ops-config.ts`: add `prev_failed` to `Trigger` + label; new `FlowBlock { id, name, enabled, trigger, amount?, steps: FlowStep[] }`; `FeedFlow` gets `blocks` (replacing `steps`); `defaultFlows` rebuilt as blocks matching the scenario-sheet order; `flattenSteps(flow)` helper; `migrateFlow()` turns old `steps` into blocks by mapping each step kind to its default block.
- `src/lib/ops-config-store.ts`: run `migrateFlow` when loading saved config.
- `src/routes/admin.workflows.tsx`: block-card editor (block header controls + nested step list, "Move to block" select, Add block / Add step).
- `src/components/edd/SourceViews.tsx` `FlowPreview`: grouped rendering.
- Tests: migration of a flat flow, `prev_failed` present in labels, defaults keep sheet order.
- Demo Simulator still runs its own fixed flow (unchanged, as today).
