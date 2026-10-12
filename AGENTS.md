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
