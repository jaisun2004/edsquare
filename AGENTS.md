<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Decision Manager logic lives in the pure `src/lib/rule-engine.ts`, with data in `src/data/sources.ts` (sources/attributes) and `src/data/policy.ts` (hierarchy); why: triage, the rule builder and the simulation must share one evaluator.
- AI rule drafting / Q&A runs only in `src/lib/rule-ai.functions.ts` server functions via the Lovable AI Gateway; why: keeps the API key server-side and AI output is constrained to the attribute catalogue.
- The workbook EDD flow (data checks, voice bot, questionnaire, exit, human review) lives in the pure `src/lib/edd-flow.ts` with sample data in `src/data/workbook.ts`, tested by Vitest; why: the simulator and future case screens must share one tested step engine.
- Real WhatsApp sends go through the partner endpoint only via `src/lib/whatsapp.functions.ts` (URL overridable with `WHATSAPP_PARTNER_URL`), with shared input checks in `src/lib/whatsapp.ts`; why: the partner owns the WhatsApp Business account and template, and server-side calls avoid browser CORS issues.
- The workbook flow follows the scenario sheet order (data checks -> voice bot -> WhatsApp/Bitly questionnaire -> email & app alert -> exit/manual -> human review) via `stepOutcome`/`nextOnNoResponse` in `src/lib/edd-flow.ts`; why: the bank's scenario sheet is the source of truth.
- Real partner voice calls go through `src/lib/voice.functions.ts` (secret `VOICE_API_KEY`, polling call history), and customer questionnaire answers are stored in the `questionnaire_sessions` table accessed only by server functions in `src/lib/questionnaire.functions.ts` behind the public `/q/$token` page; why: keys stay server-side and the table has no public policies.
- Simulator runs buffer their step log, call records and questionnaire records until the case exists, then attach them via the store's `attachFlow` (case timeline + audit); why: cases are created late in the sheet flow but must hold the full history.
- The simulator takes the customer contact once before Run and passes it to the real voice/WhatsApp panels; WhatsApp after the call is an optional presenter choice decided by `afterVoice` in `src/lib/edd-flow.ts`; why: one input point and one tested branching rule.
- An alert's outcome (journey dots, System blocked + reason/Blocked/Unblocked/Verified/Case open) is derived only by the pure `src/lib/alert-journey.ts` from alerts, cases, enforcement and demo runs; why: Alerts, Cases, Dashboard and Outcomes must show the same result. Old pages (/enforcement, /engagement, /reports, /investigations) redirect to /outcomes tabs or /cases.
- Case ids are handed out by the shared database counter `next_demo_case_id` via `reserveCaseId` in `src/lib/demo-records.functions.ts` (floor = `nextCaseId` in `src/data/edd.ts`), save refuses to overwrite a different case with the same id and the store re-numbers via `src/lib/case-renumber.ts`; demo cases store the contacted person in `EDDCase.contact`; why: per-browser numbering collided across concurrent demo runs.
- Demo runs, demo-created cases/alerts and enforcement persist in the `demo_records` table via `src/lib/demo-records.functions.ts` (no public policies), and built-in sample cases come from `buildSamples()` in `src/data/sample-scenarios.ts`; why: demo cases must survive refresh/new tabs, and samples must follow the test sheet. Alert "Run triage" opens the simulator (`/simulator?alert=`) so there is one flow.
- Case-page outreach (AI call / WhatsApp started from a case) and the per-step status summary derive from the pure `src/lib/case-steps.ts`; records started on the case carry `origin: "case"`; why: channels are offered only when the demo run did not trigger them, and one helper decides that.
