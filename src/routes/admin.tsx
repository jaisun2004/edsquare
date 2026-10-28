import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/AppShell";

export const adminSections = [
  { to: "/admin/sources", label: "Data sources" },
  { to: "/admin/rules", label: "Rules & thresholds" },
  { to: "/admin/policy", label: "Policy & hierarchy" },
      { to: "/admin/workflows", label: "Workflows by source" },
      { to: "/admin/queue", label: "Queue priority" },
  { to: "/admin/integrations", label: "Integrations" },
  { to: "/admin/users", label: "Users & roles" },
  { to: "/admin/consent", label: "Consent templates" },
] as const;

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div>
      <PageHeader title="Administration" description="Data sources, Decision Manager rules and platform governance." />
      <nav className="mb-6 flex flex-wrap gap-1 border-b border-border pb-2">
        {adminSections.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            activeProps={{ className: "bg-secondary text-foreground font-medium" }}
          >
            {s.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
