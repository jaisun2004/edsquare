import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/layout/AppShell";
import { CategoryBadge, RiskChip, SlaBadge, StageBadge } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inflowSeries, teamWorkload } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";
import { roleLabels } from "@/lib/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EDD Command Dashboard — Sentinel EDD" },
      { name: "description", content: "Role-aware dashboard for digital enhanced due diligence: open cases, SLA breaches, risk mix and the priority worklist." },
      { property: "og:title", content: "EDD Command Dashboard — Sentinel EDD" },
      { property: "og:description", content: "Monitor mule and digital-scam case flow from alert to enforcement." },
    ],
  }),
  component: DashboardPage,
});

const RISK_COLORS: Record<string, string> = {
  VH: "var(--color-destructive)",
  H: "var(--color-warning)",
  M: "var(--color-info)",
  L: "var(--color-success)",
};

function DashboardPage() {
  const { cases, alerts, enforcement, role, actor } = useEDD();

  const open = cases.filter((c) => c.stage !== "Closed");
  const mine = open.filter((c) => c.assignee === actor);
  const breaches = open.filter((c) => new Date(c.slaDueAt).getTime() < Date.now());

  const kpis = [
    { label: "Open cases", value: open.length },
    { label: "Pending my action", value: mine.length },
    { label: "New alerts", value: alerts.filter((a) => a.status === "New").length },
    { label: "Blocked accounts", value: enforcement.filter((e) => e.action === "Block").length },
    { label: "Cleared accounts", value: enforcement.filter((e) => e.action === "Unblock").length },
    { label: "SLA breaches", value: breaches.length },
  ];

  const riskMix = (["VH", "H", "M", "L"] as const).map((g) => ({
    name: g,
    value: open.filter((c) => c.grade === g).length,
  }));

  const worklist = [...open]
    .sort((a, b) => b.riskScore - a.riskScore || new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="EDD Command Dashboard"
        description={`${roleLabels[role]} view — AI/ML prioritises, bank experts decide.`}
        actions={
          <Button asChild>
            <Link to="/alerts">Go to alert inbox</Link>
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="py-5">
              <p className="text-2xl font-semibold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle className="text-sm">Risk grade mix</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {riskMix.map((r) => (
                    <Cell key={r.name} fill={RISK_COLORS[r.name]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Inflow vs resolved (last 7 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inflowSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inflow" stroke="var(--color-chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="var(--color-chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Priority worklist</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>SLA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {worklist.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link to="/cases/$caseId" params={{ caseId: c.id }} className="hover:underline">{c.id}</Link>
                    </TableCell>
                    <TableCell>{c.customer}</TableCell>
                    <TableCell><CategoryBadge category={c.category} /></TableCell>
                    <TableCell><StageBadge stage={c.stage} /></TableCell>
                    <TableCell><RiskChip grade={c.grade} score={c.riskScore} /></TableCell>
                    <TableCell><SlaBadge dueAt={c.slaDueAt} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              {role === "supervisor" ? "Team workload" : "Oldest open cases"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {role === "supervisor"
              ? teamWorkload.map((t) => (
                  <div key={t.name} className="flex items-center justify-between rounded-md border border-border p-3">
                    <span>{t.name}</span>
                    <span className="text-muted-foreground">{t.open} open · {t.breaching} breaching</span>
                  </div>
                ))
              : [...open]
                  .sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime())
                  .slice(0, 5)
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3">
                      <Link to="/cases/$caseId" params={{ caseId: c.id }} className="hover:underline">{c.id}</Link>
                      <SlaBadge dueAt={c.slaDueAt} />
                    </div>
                  ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
