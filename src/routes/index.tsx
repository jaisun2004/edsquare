import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/layout/AppShell";
import { CategoryBadge, RiskChip, SlaBadge, StageBadge } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inflowSeries, teamWorkload } from "@/data/edd";
import { AlertFunnel, useJourneys } from "@/components/edd/Journey";
import { LatestCases } from "@/components/edd/DemoRuns";
import { useEDD } from "@/lib/edd-store";
import { useState } from "react";
import { FEEDS, feedOf, type FeedId } from "@/data/ops-config";
import { useOpsConfig } from "@/lib/ops-config-store";
import { rankQueue } from "@/lib/queue-priority";
import { FlowPreview, useCaseFeeds } from "@/components/edd/SourceViews";

import { roleLabels } from "@/lib/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EDD Command Dashboard — EDSquare" },
      { name: "description", content: "Role-aware dashboard for digital enhanced due diligence: open cases, SLA breaches, risk mix and the priority worklist." },
      { property: "og:title", content: "EDD Command Dashboard — EDSquare" },
      { property: "og:description", content: "Monitor mule and digital-scam case flow from alert to enforcement." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const { alerts, enforcement, role, actor } = useEDD();
  const js = useJourneys();
  const { flows, queue } = useOpsConfig();
  const allRows = useCaseFeeds();
  const [feed, setFeed] = useState<FeedId | "all">("all");

  const inFeed = <T,>(f: FeedId) => feed === "all" || f === feed;
  const rows = allRows.filter((r) => inFeed(r.feed));
  const fjs = js.filter((x) => inFeed(feedOf(x.alert)));
  const open = rows.map((r) => r.c);
  const caseIds = new Set(open.map((c) => c.id));
  const mine = open.filter((c) => c.assignee === actor);
  const breaches = open.filter((c) => new Date(c.slaDueAt).getTime() < Date.now());
  const fEnf = feed === "all" ? enforcement : enforcement.filter((e) => caseIds.has(e.caseId) || fjs.some((x) => x.j.enforcement === e));
  const flow = feed === "all" ? undefined : flows.find((f) => f.feed === feed);

  const kpis = [
    { label: "Alerts", value: fjs.length },
    { label: "New alerts", value: fjs.filter((x) => x.alert.status === "New").length },
    { label: "Open cases", value: open.length },
    { label: "Pending my action", value: mine.length },
    { label: "System blocked", value: fjs.filter((x) => x.j.result === "System blocked").length },
    { label: "Blocked after review", value: fEnf.filter((e) => e.action === "Block").length },
    { label: "SLA breaches", value: breaches.length },
  ];

  const riskMix = (["VH", "H", "M", "L"] as const).map((g) => ({ name: g, value: open.filter((c) => c.grade === g).length }));
  const ranked = rankQueue(rows, queue).slice(0, 8);
  const perFeed = FEEDS.map((f) => {
    const r = allRows.filter((x) => x.feed === f.id);
    return { f, alerts: js.filter((x) => feedOf(x.alert) === f.id).length, open: r.length, breach: r.filter((x) => new Date(x.slaDueAt).getTime() < Date.now()).length, flow: flows.find((x) => x.feed === f.id) };
  });

  return (
    <div>
      <PageHeader
        title="EDD Command Dashboard"
        description={`${roleLabels[role]} view — each alert source has its own flow and queue.`}
        actions={<Button asChild><Link to="/simulator">Run a demo</Link></Button>}
      />

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Alert source">
        <Button size="sm" variant={feed === "all" ? "default" : "outline"} onClick={() => setFeed("all")}>All sources</Button>
        {FEEDS.map((f) => (
          <Button key={f.id} size="sm" variant={feed === f.id ? "default" : "outline"} onClick={() => setFeed(f.id)}>{f.name}</Button>
        ))}
      </div>

      {feed === "all" ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {perFeed.map((p) => (
            <button key={p.f.id} type="button" onClick={() => setFeed(p.f.id)} className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary">
              <p className="text-sm font-medium">{p.f.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{p.flow?.desk} · SLA {p.flow?.slaMin} min · priority {queue.feedPriority[p.f.id]}</p>
              <div className="mt-3 flex gap-4 text-sm">
                <span><b>{p.alerts}</b> <span className="text-muted-foreground">alerts</span></span>
                <span><b>{p.open}</b> <span className="text-muted-foreground">open</span></span>
                <span className={p.breach ? "text-destructive" : ""}><b>{p.breach}</b> <span className="text-muted-foreground">breached</span></span>
              </div>
            </button>
          ))}
        </div>
      ) : flow && (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">How {FEEDS.find((f) => f.id === feed)?.name} alerts are handled · {flow.desk} · SLA {flow.slaMin} min</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/admin/workflows">Change flow</Link></Button>
          </CardHeader>
          <CardContent><FlowPreview flow={flow} /></CardContent>
        </Card>
      )}

      {feed === "all" && <div className="mb-6"><AlertFunnel /></div>}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (
          <Card key={k.label}><CardContent className="py-5"><p className="text-2xl font-semibold">{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></CardContent></Card>
        ))}
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm">Priority queue</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/admin/queue">Change ranking</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow><TableHead>Case</TableHead><TableHead>Customer</TableHead><TableHead>Source</TableHead><TableHead>Category</TableHead><TableHead>Stage</TableHead><TableHead>Risk</TableHead><TableHead>SLA</TableHead><TableHead className="text-right">Priority</TableHead></TableRow>
              </TableHeader>
              <TableBody>
                {ranked.length === 0 && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">No open cases for this source.</TableCell></TableRow>}
                {ranked.map(({ item, score }) => (
                  <TableRow key={item.c.id}>
                    <TableCell className="font-medium"><Link to="/cases/$caseId" params={{ caseId: item.c.id }} className="hover:underline">{item.c.id}</Link></TableCell>
                    <TableCell>{item.c.customer}</TableCell>
                    <TableCell className="text-xs">{FEEDS.find((f) => f.id === item.feed)?.short}</TableCell>
                    <TableCell><CategoryBadge category={item.c.category} /></TableCell>
                    <TableCell><StageBadge stage={item.c.stage} /></TableCell>
                    <TableCell><RiskChip grade={item.c.grade} score={item.c.riskScore} /></TableCell>
                    <TableCell><SlaBadge dueAt={item.c.slaDueAt} /></TableCell>
                    <TableCell className="text-right font-semibold">{score}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Risk grade mix</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={riskMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {riskMix.map((r) => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}
                </Pie>
                <Tooltip /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Inflow vs resolved (last 7 days)</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inflowSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="day" stroke="var(--color-muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--color-muted-foreground)" fontSize={12} />
                <Tooltip /><Legend />
                <Line type="monotone" dataKey="inflow" stroke="var(--color-chart-1)" strokeWidth={2} />
                <Line type="monotone" dataKey="resolved" stroke="var(--color-chart-2)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">{role === "supervisor" ? "Team workload" : "Oldest open cases"}</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {role === "supervisor"
              ? teamWorkload.map((t) => (
                  <div key={t.name} className="flex items-center justify-between rounded-md border border-border p-3"><span>{t.name}</span><span className="text-muted-foreground">{t.open} open · {t.breaching} breaching</span></div>
                ))
              : [...open].sort((a, b) => new Date(a.openedAt).getTime() - new Date(b.openedAt).getTime()).slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <Link to="/cases/$caseId" params={{ caseId: c.id }} className="hover:underline">{c.id}</Link><SlaBadge dueAt={c.slaDueAt} />
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
      {feed === "all" && <div className="mt-6"><LatestCases /></div>}
    </div>
  );
}
