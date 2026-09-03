# Unified Digital EDD Case Management & Enforcement Platform — Prototype

A clickable, data-realistic bank-facing prototype for Enhanced Due Diligence on suspected money-mule and digital-scam accounts. Front-end only, seeded with believable mock data, session-persistent so a case moves through stages during a live demo. Core story: **AI/ML prioritises, bank experts decide.**

## Design system

Enterprise fintech SaaS: data-dense but calm, card + table layouts, generous whitespace, no decorative flourishes.

- Primary deep violet `#4A1D96`, accent violet `#6D28D9`
- Semantics: Block/High-risk red `#DC2626`, Unblock/Cleared green `#16A34A`, Further Investigation amber `#F59E0B`, Info blue `#2563EB`
- Risk chips: VH red, H orange, M amber, L green
- Inter typography, clear hierarchy
- Shell: left vertical nav + top bar (global search, notifications, role badge, role switcher)

## Roles (demo role switcher, no logins)

Analyst/Triage Officer · Investigator · Supervisor/Case Manager · Admin · Auditor (read-only). The switcher gates visible/enabled actions — Analysts cannot make the final call; VH decisions need Supervisor approval; Auditor sees everything read-only. Each role lands on its own default screen.

## Screens

**Phase 1 — the demo spine (80% of the story)**
1. App shell, nav, role switcher, seed data store (12–15 cases across all categories, grades, stages, a few SLA-breaching; ~15 rules; enrichment payloads; 2 call transcripts).
2. Dashboard — role-aware KPI cards (open, pending my action, avg resolution, blocked, unblocked, SLA breaches), risk-grade donut, inflow vs resolved line, stage funnel, decision split, priority worklist. Supervisor adds team workload, oldest cases, override activity.
3. Alert Inbox — alerts table (source, account/UPI, customer, trigger, received, preliminary signal, status), filters, single + bulk "Run Triage", Decision Manager badge.
4. Pre-EDD Triage result drawer — input summary, applied rules + model, risk score/segment, contributing signals with weights, rules triggered, recommendation (Block / Unblock / Further Investigation) with Accept & Block, Accept & Unblock, Send for Further Investigation, Supervisor Override (mandatory reason). Simulated processing spinner.
5. Case Queue — Kanban (New/Triaged → Enrichment → Engagement → Human Review → Decision Pending → Closed) with drag-and-drop under permission checks, plus sortable table view, filters, bulk assign/escalate/tag.
6. Case Detail (richest screen) — header with risk chip, category, stage, assignee, SLA timer, persistent Decision bar. Tabs: Overview · Intelligence & Enrichment (match criteria, Negbase attributes, UPI handle count, mobile vintage/type, social presence, telco + OSINT enrichment blocks, "Request additional enrichment") · Engagement (AI calling bot panel with transcript and outcome, WhatsApp/Email/SMS/banking channels, "Initiate engagement" with Sent → Delivered → Responded progression feeding a re-score) · Investigation (rationale editor: free text + evidence/policy/confidence checklist, required before decision; linked evidence) · Activity Timeline · Documents & Notes.

**Phase 2 — supporting surfaces**
7. Negative Database — search by UPI/mobile/name/account/domain, result table with category, source, first/last seen, associated identifiers, category browse tiles with counts, evidence detail modal (website URL, payment gateway URL, extracted UPI handle, screenshot).
8. Engagement Center — cross-case call/message activity, channel performance KPIs, template library.
9. Investigations Workbench — "assigned to me / my team", sorted by risk + SLA, "Claim next case".
10. Enforcement Log — block/unblock records with decided by, approved by, reason, account status, downstream status; filters + mock export.
11. Audit Trail — global filterable log, timestamp/actor/role/case/action/before→after, read-only.
12. Reports & Analytics and Admin/Configuration (rules & thresholds with weights, integrations toggles, users & roles, Negbase settings, DPDP consent templates) — UI-only.

## Demo click-paths wired end to end

- A: Alert → Triage = Further Investigation → Case → Enrichment → AI call responds → re-score → rationale → Block → Enforcement Log → closed
- B: Triage = Unblock → analyst accepts → closed as cleared
- C: Strong Negbase hit → Triage = Block → Supervisor VH approval → Enforcement
- D: AI call + WhatsApp no response → auto-escalate to Investigations
- E: Standalone Negbase UPI search → attach evidence to an open case

Every state-changing action appends to the case Activity timeline and, where relevant, the Enforcement and Audit logs.

## Technical notes

- TanStack Start routes: `/` (dashboard), `/alerts`, `/cases`, `/cases/$caseId`, `/negative-database`, `/engagement`, `/investigations`, `/enforcement`, `/reports`, `/admin`, `/audit`.
- No backend. A React context store holds cases, alerts, rules, enrichment, engagement, enforcement and audit entries, seeded from typed JSON modules; mutations are in-memory so demo progress sticks for the session (resettable via a "Reset demo data" control).
- Role state in the same store; permission helper drives disabled/hidden actions.
- shadcn/ui for tables, tabs, cards, badges, dialogs, drawers, toasts; Recharts for dashboard charts; simulated latency for triage/enrichment/engagement.
- Design tokens added to `src/styles.css` in oklch; no hardcoded color utilities in components.
- Per-route SEO head metadata.

If Cloud-backed persistence, real user logins, or live integrations are wanted later, that is a separate follow-up on top of this prototype.
