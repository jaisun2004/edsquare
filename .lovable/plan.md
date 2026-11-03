# EDSquare PRD v2 — updated for recent changes

Produce a new versioned PRD (`EDSquare-PRD_v2.docx` + `.pdf` in Files), keeping v1 untouched. Same branding/style as v1, with app page names and links throughout.

## What the new PRD covers

1. **Overview and change log** — what changed since v1 (source-driven ops, connected Decision Manager, real voice/WhatsApp, questionnaire, sign-in, case numbering, dashboard rebuild).
2. **Roles and permissions** — Analyst, Investigator, Supervisor, Admin, Auditor, per page and action.
3. **Navigation and modules** — Dashboard (Executive / Operations / Outreach views, filters, charts), Alerts, Cases (overview step summary, outreach actions, recordings, timeline), Outcomes & Reports, Negative Database, Decision Manager group (Inputs, Decisions, Actions, Setup), Demo Simulator (sheet flow + Transaction pipeline).
4. **Alert sources** — I4C, NPCI, Model, NegBase: what each feeds, SLA, and how flows differ.
5. **Workflow configurator** — blocks, steps, triggers (incl. "previous block failed"), retries, score bands.
6. **Queue prioritisation** — overall weights, per-source factors, overrides, team distribution, capacity, escalation ladder, with worked example.
7. **Decision Manager** — source → workflow → policy/rule sets → score bands → outcome → queue chain; rules, hierarchy, AI drafting, simulation, versioning, health warnings.
8. **End-to-end EDD flow** — data checks → voice bot → WhatsApp/short link questionnaire → email/app alert → exit/manual → human review; scoring (unanswered = +3 points, configurable), branching, retries.
9. **Case lifecycle and routing** — case creation, shared ID counter, alert↔case links, outcome derivation (System blocked + reason, Blocked, Unblocked, Verified, Case open).
10. **Backend logic** — server functions per area (sign-in, voice, WhatsApp, questionnaire, demo records, AI rules), public pages (`/q/…`, `/s/…`), what runs in browser vs server, secrets handled server-side.
11. **Integrations** — partner voice API (language codes ENGLISH/HI), WhatsApp send-account-blocked and send-url, short links, AI gateway; request/response examples.
12. **Data model and schema** — database tables (`questionnaire_sessions`, `demo_records`, case counter function) with columns, access rules; plus app data objects (Alert, Case, FeedFlow, QueueConfig, RuleSet, Policy, DemoRun) and an entity diagram.
13. **Module connection diagrams** — architecture, data flow, sequence diagrams for the call/WhatsApp flow.
14. **Security, audit and compliance**, **non-functional requirements**, **known gaps and roadmap** (per-browser settings, escalations preview-only, assumed staff/limits, inbound/outbound connectors not yet built, amount fields), **glossary**.

## Approach

- Read the current code and database schema so every statement matches the app as built.
- Capture fresh screenshots of key pages (signed in as the demo account).
- Generate diagrams, build the document, convert to PDF, and check every page as an image for layout issues before delivering.

## Technical details

- Sources: `src/data/ops-config.ts`, `src/lib/queue-priority.ts`, `decision-graph.ts`, `rule-engine.ts`, `edd-flow.ts`, `alert-journey.ts`, `case-steps.ts`, `*.functions.ts`, migrations under `supabase/migrations`.
- Built with python-docx (or docx-js) + LibreOffice PDF conversion; Playwright for screenshots; diagrams rendered to PNG.
