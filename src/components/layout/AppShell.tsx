import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Inbox,
  FolderKanban,
  Database,
  BarChart3,
  Settings,
  ScrollText,
  Bell,
  RotateCcw,
  PlayCircle,
  Search,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEDD } from "@/lib/edd-store";
import { roleLabels } from "@/lib/roles";
import { signOutApp } from "@/components/layout/AuthGate";
import type { Role } from "@/data/edd";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Inbox },
  { to: "/cases", label: "Cases", icon: FolderKanban },
  { to: "/outcomes", label: "Outcomes & Reports", icon: BarChart3 },
  { to: "/negative-database", label: "Negative Database", icon: Database },
  {
    to: "/admin",
    label: "Decision Manager",
    icon: Settings,
    children: [
      { to: "/admin", label: "How it connects" },
      { to: "/admin/sources", label: "Data sources" },
      { to: "/admin/integrations", label: "Integrations" },
      { to: "/admin/policy", label: "Policy & hierarchy" },
      { to: "/admin/rules", label: "Rules" },
      { to: "/admin/workflows", label: "Workflows & score bands" },
      { to: "/admin/queue", label: "Queue priority" },
      { to: "/admin/users", label: "Users & roles" },
      { to: "/admin/consent", label: "Consent templates" },
    ],
  },
  { to: "/audit", label: "Audit Trail", icon: ScrollText },
  { to: "/simulator", label: "Demo Simulator", icon: PlayCircle, divider: true },
] as const;


export function AppShell({ children }: { children: ReactNode }) {
  const { role, setRole, actor, alerts, resetDemo } = useEDD();
  const path = useRouterState({ select: (st) => st.location.pathname });
  if (path.startsWith("/q/")) return <>{children}</>;
  const newAlerts = alerts.filter((a) => a.status === "New").length;
  const hidden = new Set<string>();
  if (role !== "admin" && role !== "supervisor") hidden.add("/admin");
  if (!["supervisor", "admin", "auditor"].includes(role)) hidden.add("/audit");

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <p className="text-sm font-semibold tracking-tight">EDSquare</p>
          <p className="mt-1 text-xs text-sidebar-foreground/70">Digital EDD &amp; Enforcement</p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav
            .filter((item) => !hidden.has(item.to))
            .map((item) => {
              const { to, label, icon: Icon } = item;
              const children = "children" in item ? item.children : undefined;
              return (
                <div key={to}>
                  {"divider" in item && <div className="my-3 border-t border-sidebar-border" />}
                  <Link
                    to={to}
                    activeOptions={{ exact: to === "/" }}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/85 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                  {children && (
                    <div className="mt-1 space-y-1 border-l border-sidebar-border pl-3 ml-5">
                      {children.map((child) => (
                        <Link
                          key={child.to}
                          to={child.to}
                          activeOptions={{ exact: child.to === "/admin" }}
                          className="block rounded-md px-3 py-1.5 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </nav>
        <div className="border-t border-sidebar-border px-5 py-4 text-xs text-sidebar-foreground/70">
          AI/ML prioritises. Bank experts decide.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search cases, accounts, UPI handles…" className="pl-9" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="relative">
              <Bell className="size-5 text-muted-foreground" />
              {newAlerts > 0 && (
                <Badge className="absolute -right-2 -top-2 h-5 min-w-5 justify-center px-1 text-[10px]">{newAlerts}</Badge>
              )}
            </div>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-[230px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(roleLabels) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {roleLabels[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden text-sm text-muted-foreground md:inline">{actor}</span>
            <Button variant="outline" size="sm" onClick={resetDemo}>
              <RotateCcw className="mr-1 size-3.5" /> Reset demo
            </Button>
            <Button variant="ghost" size="sm" onClick={signOutApp}>
              Sign out
            </Button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
