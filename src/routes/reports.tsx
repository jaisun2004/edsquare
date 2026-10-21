import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { inflowSeries, STAGES } from "@/data/edd";
import { DemoRunStats, LatestDemoRuns } from "@/components/edd/DemoRuns";
import { useEDD } from "@/lib/edd-store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — EDSquare" },
      { name: "description", content: "Portfolio analytics on EDD volumes, risk mix, stage distribution and enforcement outcomes." },
      { property: "og:title", content: "Reports & Analytics — EDSquare" },
      { property: "og:description", content: "Trend and outcome analytics for the digital EDD programme." },
    ],
  }),
  component: ReportsPage,
});

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

function ReportsPage() {
  const { cases, enforcement } = useEDD();

  const byCategory = Object.entries(
    cases.reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.category]: (acc[c.category] ?? 0) + 1 }), {}),
  ).map(([name, value]) => ({ name, value }));

  const byStage = STAGES.map((s) => ({ stage: s, count: cases.filter((c) => c.stage === s).length }));

  const outcomes = [
    { name: "Blocked", value: enforcement.filter((e) => e.action === "Block").length },
    { name: "Unblocked", value: enforcement.filter((e) => e.action === "Unblock").length },
    { name: "In progress", value: cases.filter((c) => c.stage !== "Closed").length },
  ];

  return (
    <div>
      <PageHeader title="Reports & Analytics" description="Programme-level view of EDD throughput and enforcement outcomes." />

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <DemoRunStats />
        <LatestDemoRuns />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Inflow vs resolved</CardTitle></CardHeader>
          <CardContent className="h-72">
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

        <Card>
          <CardHeader><CardTitle className="text-sm">Cases by category</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                  {byCategory.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Stage funnel</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byStage}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="stage" stroke="var(--color-muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Decision outcomes</CardTitle></CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={outcomes} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis type="category" dataKey="name" width={100} stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--color-chart-4)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
