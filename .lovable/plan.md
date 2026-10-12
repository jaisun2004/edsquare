# Data Sources + Dynamic Rule Builder (Decision Manager)

You're right. Today rules are a fixed list with a text threshold and an on/off switch, and "Integrations" is just six toggles. Nothing links a rule to the data it reads. The EDD deck (Orchestration Overview) says the Decision Manager should read from three kinds of input: Alerts / Instances, the bank's own systems (customer and transaction data), and Alternate Data. This plan adds the missing layer in three parts.

```text
 Data Sources  ──>  Field Catalogue  ──>  Rule Builder  ──>  Decision Manager (triage)
 (connect, map)     (attributes)          (IF / THEN)        (score, segment, outcome)
```

## 1. Data Sources (new page: Administration > Data sources)

A registry of pluggable sources, grouped the same way as the deck:
- **Govt / LEAs**: MHA NCRP portal, LEA / CBI / ED requests
- **External**: RBIH Mule Hunter, regulatory advisories
- **Bank (RE) systems**: Core Banking (customer + transactions), CRM complaints, AML engine, internal mule models
- **Alternate data**: mFilterIt Negative Database, Investment Scam intelligence, Telco (SIM vintage, prepaid / postpaid), UPI handle lookup, OSINT / social presence

Each source card shows the connection type (REST API, SFTP batch, Kafka stream, database view, file upload), refresh schedule, last sync, records ingested, health status and whether it is on.

**"Add data source" wizard** (4 steps):
1. Pick a type and template, or choose "Custom".
2. Connection details (endpoint, auth method, schedule). These are simulated; no real calls are made.
3. Field mapping: the sample fields the source returns are mapped to platform attributes (e.g. `msisdn_age_days` maps to `mobile.vintageDays`), with a data type and a PII flag.
4. Test connection: a fake success with a sample record preview. Then save.

Clicking a source opens a detail page with its fields, sample payload, sync history, and the rules that use it.

## 2. Field Catalogue

Every mapped field becomes an attribute that rules can use, e.g. `txn.passThroughPct`, `account.vintageDays`, `negbase.hit`, `negbase.reason`, `mobile.vintageDays`, `upi.handleCount`, `osint.mentions`, `ncrp.complaintCount`. Each one shows its source, type, and which rules use it. Turning a source off marks its fields "unavailable", and any rule that depends on them is flagged.

## 3. Dynamic Rule Builder (upgrade Administration > Rules)

- **"New rule"** opens a builder:
  - Name, family, description
  - **Conditions**: AND / OR groups of `attribute + operator + value`. Attributes are picked from the catalogue. Operators depend on the type: `>`, `<`, `between`, `equals`, `in list`, `contains`, `exists`, `within last N days`.
  - **Then**: add a score weight, and optionally force a segment / outcome (Auto clear, AI calling, Branch referral, Block)
  - Status: Draft, then Active. Version number and author.
- **Test rule**: runs the rule against the seeded alerts and cases and shows "would fire on X of Y", listing which ones and why.
- Existing rules R-01 to R-16 are rewritten in the same condition format, so they can all be edited.
- Edit, duplicate, retire and version history. Every change is written to the Audit log, and new rules can require supervisor approval (maker-checker).

## 4. Decision Manager wiring

Triage stops using the current fixed logic. Instead it evaluates the active rules against each alert's attribute values, which come from the connected sources. The triage drawer then shows exactly which rules fired, the values that triggered them, and which source each value came from. Turning a source off visibly changes the outcome.

## Scope

Front-end prototype only, like the rest of the app: everything is simulated and kept for the session, with no real connections. The navigation gains "Data sources" (and the field catalogue as a tab on it) under Administration, Admin role only. Other roles see it read-only.

## Technical details

- `src/data/edd.ts`: add `DataSource` (id, name, category, connector, schedule, status, fields[], health, lastSync), `Attribute` (key, label, type, sourceId, pii), and `RuleCondition` / `ConditionGroup` trees. `Rule` gains `conditions`, `action`, `version`, `status`. Seed about 12 sources and about 40 attributes, and give each seeded alert attribute values.
- `src/lib/rule-engine.ts`: a pure `evaluate(rule, attrs)` that returns fired / not fired with matched values, plus `scoreAlert(alert, rules, sources)`.
- Store: `addSource`, `updateSource`, `toggleSource`, `upsertRule`, `retireRule`, `testRule`. All of them write to the audit log. `triageAlert` uses the engine.
- New routes: `admin.sources.tsx` (list + wizard), `admin.sources.$sourceId.tsx`, `admin.rules.new.tsx`, `admin.rules.$ruleId.tsx`. Each gets its own `head()`. Add Data sources to `adminSections` and the AppShell nav.
- `TriageDrawer` shows the fired-rule explanation with where each value came from.
