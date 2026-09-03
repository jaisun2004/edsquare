# Administration: split tabs into separate pages

Today `/admin` is one page with four tabs (Rules & thresholds, Integrations, Users & roles, Consent templates). For a governance console this is cramped — each area has its own audience, its own actions, and deserves its own URL so it can be linked, bookmarked and audited.

## Recommended path

Turn Administration into a section with its own sub-navigation and one route per area:

```text
/admin                  -> redirects to /admin/rules
/admin/rules            Rules & thresholds (risk bands + rule catalogue)
/admin/integrations     Integration toggles
/admin/users            Users & roles
/admin/consent          DPDP consent templates
```

Navigation changes in the left sidebar: "Administration" becomes an expandable group with the four child links (visible only to the Admin role, same gating as today). The active child highlights; the group auto-expands when on any `/admin/*` route.

Each page keeps a shared Administration layout: page header ("Administration" + section subtitle) and the same read-only behaviour for non-admin roles (switches disabled).

## Page content (unchanged data, better room to breathe)

- **Rules & thresholds** — risk-band summary strip, then the full rule table with family, threshold, weight and active toggle. Room added for a family filter and a search box since the catalogue is long.
- **Integrations** — cards per integration with name, status toggle and a short description line instead of a bare list.
- **Users & roles** — table of users with role and status, plus a small role-capability legend so the permission model is visible.
- **Consent templates** — list of templates with version and last-updated, each opening a read-only preview panel.

## Technical notes

- `src/routes/admin.tsx` becomes a layout route rendering `<Outlet />` plus the section sub-nav; `src/routes/admin.index.tsx` redirects to `/admin/rules`.
- New leaf routes: `admin.rules.tsx`, `admin.integrations.tsx`, `admin.users.tsx`, `admin.consent.tsx`, each with its own `head()` metadata (title/description/og).
- `AppShell` nav config gains optional `children` for grouped items; Administration uses it. Existing role gating (`role !== "admin"`) is preserved.
- No data-layer changes: still reads `rules`, `integrations`, `users`, `consentTemplates`, `RISK_BANDS` from `src/data/edd.ts` and `toggleRule` from the store.
- No backend work; everything stays front-end and session-scoped.
