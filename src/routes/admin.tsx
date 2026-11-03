import { Link, Outlet, createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/AppShell";

export const adminGroups = [
  { label: "Overview", items: [{ to: "/admin", label: "How it connects" }] },
  { label: "1 · Inputs", items: [{ to: "/admin/sources", label: "Data sources" }, { to: "/admin/integrations", label: "Integrations" }] },
  { label: "2 · Decisions", items: [{ to: "/admin/policy", label: "Policy & hierarchy" }, { to: "/admin/rules", label: "Rules" }] },
  { label: "3 · Actions", items: [{ to: "/admin/workflows", label: "Workflows & score bands" }, { to: "/admin/queue", label: "Queue priority" }] },
  { label: "Setup", items: [{ to: "/admin/users", label: "Users & roles" }, { to: "/admin/consent", label: "Consent templates" }] },
] as const;
export const adminSections = adminGroups.flatMap((g): readonly { to: string; label: string }[] => g.items);

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <div>
      <PageHeader title="Decision Manager" description="Inputs feed decisions, decisions drive actions: data sources → policy & rules → workflows & queues." />
      <nav className="mb-6 flex flex-wrap items-end gap-x-5 gap-y-2 border-b border-border pb-2">
        {adminGroups.map((g) => (
          <div key={g.label}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>
            <div className="flex gap-1">
              {g.items.map((s) => (
                <Link
                  key={s.to}
                  to={s.to}
                  activeOptions={{ exact: s.to === "/admin" }}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  activeProps={{ className: "bg-secondary text-foreground font-medium" }}
                >
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
