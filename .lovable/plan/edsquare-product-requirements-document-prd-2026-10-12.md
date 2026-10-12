# EDSquare — Product Requirements Document (PRD)

A complete, detailed PRD for EDSquare (mFilterIt), delivered as a polished Word document (plus a PDF copy) in your Files. No changes to the app itself.

It covers what the prototype does today, and clearly marks what is **Target / to build** where the prototype only simulates something or doesn't have it yet. For example, today auto routing only works as "claim next highest-risk case"; the PRD specifies full skill-, SLA- and workload-based routing.

## Document outline

1. **Cover, version and approvals**: EDSquare by mFilterIt, version, owners, revision history
2. **Executive summary**: the problem (alert volumes, manual investigation, false positives, one-size-fits-all workflow), the vision, and the principle "AI/ML prioritises. Bank experts decide."
3. **Goals, non-goals and success metrics**: turnaround time, false-positive reduction, auto-clear rate, SLA breach rate, cost per case, contact rate
4. **Users and roles**: Analyst, Investigator, Supervisor, Administrator, Auditor (plus Branch Officer and System/Bot actors), with goals and a full **permission matrix** (view / act / approve / configure / audit) per module
5. **System context and architecture**: alert sources (Govt / LEA, External, Bank systems), the Data Source layer, Decision Manager, HIVE orchestration, channels (AI calling, WhatsApp / SMS / email, net banking, branch), core banking enforcement, on-premise deployment, DPDP
6. **End-to-end workflows** (with diagrams):
   - Flow 1: Initial detection and decision
   - Flow 2: AI-led customer engagement (response / no response / self-service)
   - Flow 3: Human and branch investigation
   - Enforcement and closure, with reversal / unblock handling
7. **Module specifications**. For each module: purpose, users, screens, functional requirements (numbered FR-xx), business rules, data shown, actions, states, edge cases and acceptance criteria. Modules:
   - Command Dashboard
   - Alert Inbox and Pre-EDD Triage
   - Case Queue
   - Case Detail (signals, enrichment, engagement, timeline, notes, documents, rationale, decision)
   - Negative Database
   - Engagement Center
   - Investigations
   - Enforcement Log
   - Reports
   - Audit Trail
   - Administration (Data sources, Field catalogue, Rules, Policy & hierarchy, Integrations, Users & roles, Consent templates)
8. **Decision Manager**: data-source layer and attribute catalogue; rule model (conditions, operators, weights, outcomes); hierarchy (Policy, Rule set, Group, Rule) and execution order; combine strategies; dependencies and scope; scoring formula and risk bands; segmentation outcomes; explainability trace; testing and simulation; maker-checker, versioning and rollback; the plain-English rule authoring assistant and "Ask the rule base"; smart checks
9. **Case workflow**: stage state machine (Triaged, Enrichment, Engagement, Human Review, Decision Pending, Closed) with allowed transitions, who can trigger them, SLAs per risk grade, escalation, Very-High supervisor approval, reopen rules
10. **Auto routing of cases**: queue design; assignment by risk grade, skill / category, language, region / branch, workload and SLA; round-robin vs weighted; claim-next; reassignment and escalation; out-of-office handling; routing rules managed in the Decision Manager
11. **Intelligence across modules**: where AI/ML assists in each module, and the human checkpoint for each:
    - triage scoring and segment
    - enrichment summarisation
    - AI-call transcripts and intent / inconsistency detection
    - next-best-action
    - investigation rationale drafting
    - anomaly and duplicate detection
    - network / link analysis on the Negative Database
    - report narratives
    - rule authoring and Q&A
    - model governance (drift, bias, explainability)
12. **Data model**: core entities and key fields (Alert, Case, Signal, Enrichment, Engagement, Decision, Enforcement, Audit, DataSource, Attribute, Rule, RuleSet, Policy, User / Role)
13. **Integrations and APIs**: inbound alerts, enrichment providers, the core banking block / unblock call with acknowledgement, the channel providers, and webhooks
14. **Non-functional requirements**:
    - Performance (real-time triage targets)
    - Availability
    - Security (role-based access, encryption, maker-checker)
    - Privacy (DPDP consent, retention)
    - Auditability (immutable log)
    - On-premise deployment
    - Accessibility
15. **Compliance**: RBI digital fraud / mule guidance, RBIH Mule Hunter, NCRP / I4C, DPDP Act, record retention
16. **Release plan**: prototype → MVP → v1 → v2 milestones; risks and mitigations; open questions
17. **Appendix**: glossary, the rule catalogue (R-01…R-17, HS, SG, OV), the data-source list, sample screens (screenshots of the current app)

## App page names and links

Throughout the document, every module, workflow step and feature uses the exact page name shown in the app (e.g. "Alert Inbox", "Case Queue", "Administration → Policy & hierarchy"). Each one is a clickable link to that page on the live app at https://edsquare.mfilterit.net, for example:
- `/alerts`
- `/cases`
- `/cases/CASE-2041`
- `/engagement`
- `/investigations`
- `/enforcement`
- `/reports`
- `/audit`
- `/negative-database`
- `/admin/sources`
- `/admin/sources/SRC-NEG`
- `/admin/rules`
- `/admin/rules/new`
- `/admin/policy`
- `/admin/integrations`
- `/admin/users`
- `/admin/consent`

A "Screen index" appendix lists every page with its link, role access, and the PRD sections that cover it. Screenshot captions include the page name and link. Note: the app opens as the Analyst role by default, so the document explains which role to switch to (top-right role picker) to see each admin page.

## Deliverable

- `/mnt/documents/EDSquare-PRD.docx`: about 30–40 pages with a table of contents, numbered requirements, tables, workflow diagrams and app screenshots
- `/mnt/documents/EDSquare-PRD.pdf`: the same document as a PDF
- Visual QA: every page is rendered to an image and checked for layout issues before delivery

## Technical details

- Content comes from the current code (`src/data/edd.ts`, `src/data/sources.ts`, `src/data/policy.ts`, `src/lib/roles.ts`, `src/lib/rule-engine.ts`, the routes) and from the EDD deck (EDD_Oct.pdf).
- The document is built with python-docx. Diagrams are drawn as images (flows, state machine, hierarchy). Screenshots of the key screens are captured with Playwright as the Administrator role.
- The PDF is converted from the DOCX with LibreOffice. Pages are rendered to PNG for the visual check.
