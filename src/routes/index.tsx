import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, IndianRupee, ShieldAlert, Timer, Zap, Bell, FolderOpen, Briefcase } from "lucide-react";

import { PageHeader } from "@/components/layout/AppShell";
import { CategoryBadge, RiskChip, SlaBadge, StageBadge } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { teamWorkload } from "@/data/edd";
import { AlertFunnel, useJourneys } from "@/components/edd/Journey";
import { LatestCases } from "@/components/edd/DemoRuns";
import { useEDD } from "@/lib/edd-store";
import { FEEDS, feedOf, type FeedId } from "@/data/ops-config";
import { useOpsConfig } from "@/lib/ops-config-store";
import { rankQueue } from "@/lib/queue-priority";
import { FlowPreview, useCaseFeeds } from "@/components/edd/SourceViews";
import { ageBucket, amountAtRisk, horizonStart, slaBucket, type Horizon, type SlaFilter } from "@/lib/dashboard-metrics";
import { roleLabels } from "@/lib/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EDD Command Dashboard — EDSquare" },
      { name: "description", content: "Source-driven EDD command centre: exposure protected, SLA ageing, queue priority and outreach analytics by alert feed." },
      { property: "og:title", content: "EDD Command Dashboard — EDSquare" },
      { property: "og:description", content: "Executive, operations and outreach views of mule and digital-scam alerts by source." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
});

type View = "exec" | "ops" | "outreach";
type Outcome = "all" | "System blocked" | "Verified" | "Blocked" | "Pending";
const GRADES = ["VH", "H", "M", "L"] as const;
const RISK_COLORS: Record<string, string> = { VH: "var(--color-destructive)", H: "var(--color-warning)", M: "var(--color-info)", L: "var(--color-success)" };
const FEED_COLORS: Record<FeedId, string> = { I4C: "var(--color-chart-1)", NPCI: "var(--color-chart-2)", MODEL: "var(--color-chart-3)", NEGBASE: "var(--color-chart-4)" };
const axis = { stroke: "var(--color-muted-foreground)", fontSize: 11 };
const tip = { contentStyle: { background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 } };
const inr = (n: number) => (n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${(n / 1e3).toFixed(1)}k`);

function ChartCard({ title, sub, children, className = "" }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-2"><CardTitle className="text-sm">{title}</CardTitle>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function Pill<T extends string>({ value, current, onClick, children }: { value: T; current: T; onClick: (v: T) => void; children: React.ReactNode }) {
  return <Button size="sm" variant={value === current ? "default" : "outline"} className="h-7 px-2.5 text-xs" onClick={() => onClick(value)}>{children}</Button>;
}

function DashboardPage() {
  const { enforcement, role, actor, demoRuns } = useEDD();
  const js = useJourneys();
  const { flows, queue } = useOpsConfig();
  const allRows = useCaseFeeds(true);

  const [view, setView] = useState<View>("exec");
  const [feed, setFeed] = useState<FeedId | "all">("all");
  const [horizon, setHorizon] = useState<Horizon>("all");
  const [grades, setGrades] = useState<string[]>([]);
  const [category, setCategory] = useState("all");
  const [sla, setSla] = useState<SlaFilter>("all");
  const [outcome, setOutcome] = useState<Outcome>("all");

  const d = useMemo(() => {
    const since = horizonStart(horizon);
    const resOf = (r: string): Outcome => (r === "System blocked" || r === "Verified" || r === "Blocked" ? r : r === "Unblocked" ? "Verified" : "Pending");
    const fjs = js.filter((x) => {
      const f = feedOf(x.alert);
      if (feed !== "all" && f !== feed) return false;
      if (new Date(x.alert.receivedAt).getTime() < since) return false;
      if (grades.length && !grades.includes(x.j.caseItem?.grade ?? x.alert.preliminarySignal)) return false;
      if (category !== "all" && x.j.caseItem?.category !== category) return false;
      if (outcome !== "all" && resOf(x.j.result) !== outcome) return false;
      if (sla !== "all" && (!x.j.caseItem || slaBucket(x.j.caseItem.slaDueAt) !== sla)) return false;
      return true;
    });
    const alertByCase = new Map(js.filter((x) => x.j.caseItem).map((x) => [x.j.caseItem!.id, x.alert]));
    const rows = allRows.filter((r) => {
      if (feed !== "all" && r.feed !== feed) return false;
      if (new Date(r.openedAt).getTime() < since) return false;
      if (grades.length && !grades.includes(r.c.grade)) return false;
      if (category !== "all" && r.c.category !== category) return false;
      if (sla !== "all" && slaBucket(r.slaDueAt) !== sla) return false;
      return true;
    });
    const open = rows.filter((r) => r.c.stage !== "Closed");
    const amt = (x: (typeof js)[number]) => amountAtRisk(x.alert, x.j.caseItem);
    const exposure = fjs.reduce((s, x) => s + amt(x), 0);
    const protectedAmt = fjs.filter((x) => x.j.result === "System blocked" || x.j.result === "Blocked").reduce((s, x) => s + amt(x), 0);
    const released = fjs.filter((x) => x.j.result === "Verified" || x.j.result === "Unblocked").reduce((s, x) => s + amt(x), 0);
    const breached = open.filter((r) => slaBucket(r.slaDueAt) === "breached").length;
    const sysBlocked = fjs.filter((x) => x.j.result === "System blocked").length;
    const auto = fjs.filter((x) => x.j.result === "System blocked" || x.j.result === "Verified").length;

    // Daily trend (last 7 days) by feed + exposure
    const days = Array.from({ length: 7 }, (_, i) => {
      const dt = new Date(Date.now() - (6 - i) * 864e5);
      return { key: dt.toDateString(), day: dt.toLocaleDateString("en-IN", { weekday: "short" }) };
    });
    const trend = days.map(({ key, day }) => {
      const row: Record<string, number | string> = { day, exposure: 0, protected: 0 };
      for (const f of FEEDS) row[f.id] = 0;
      for (const x of fjs) {
        if (new Date(x.alert.receivedAt).toDateString() !== key) continue;
        row[feedOf(x.alert)] = (row[feedOf(x.alert)] as number) + 1;
        row["exposure"] = (row["exposure"] as number) + amt(x);
        if (x.j.result === "System blocked" || x.j.result === "Blocked") row["protected"] = (row["protected"] as number) + amt(x);
      }
      return row;
    });

    const catMap = new Map<string, { count: number; amount: number }>();
    for (const r of rows) {
      const e = catMap.get(r.c.category) ?? { count: 0, amount: 0 };
      e.count++; e.amount += amountAtRisk(alertByCase.get(r.c.id), r.c);
      catMap.set(r.c.category, e);
    }
    const categories = [...catMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.count - a.count);

    const results = ["New", "Case open", "System blocked", "Blocked", "Verified", "Unblocked", "Dismissed"].map((r) => ({ name: r, value: fjs.filter((x) => x.j.result === r).length })).filter((r) => r.value);

    const buckets = ["Breached", "< 30 min", "< 4 h", "< 24 h", "> 24 h"] as const;
    const ageing = buckets.map((b) => {
      const row: Record<string, number | string> = { bucket: b };
      for (const f of FEEDS) row[f.id] = open.filter((r) => r.feed === f.id && ageBucket(r.slaDueAt) === b).length;
      return row;
    });

    const stages = new Map<string, number>();
    for (const r of open) stages.set(r.c.stage, (stages.get(r.c.stage) ?? 0) + 1);
    const stageData = [...stages.entries()].map(([name, value]) => ({ name, value }));

    const team = teamWorkload.map((t) => ({ name: t.name, healthy: Math.max(0, t.open - t.breaching), breaching: t.breaching }));
    const riskMix = GRADES.map((g) => ({ name: g, value: open.filter((r) => r.c.grade === g).length }));

    // Outreach
    const runIds = new Set(fjs.map((x) => x.alert.id));
    const runs = demoRuns.filter((r) => !r.alertId || runIds.has(r.alertId) || feed === "all");
    const called = runs.filter((r) => r.callAttempts > 0);
    const answered = runs.filter((r) => r.callAnswered);
    const wa = runs.filter((r) => r.whatsappSent);
    const forms = runs.filter((r) => r.formSubmitted);
    const outreachFunnel = [
      { name: "Runs", value: runs.length },
      { name: "Called", value: called.length },
      { name: "Answered", value: answered.length },
      { name: "WhatsApp sent", value: wa.length },
      { name: "Form returned", value: forms.length },
    ];
    const attempts = [1, 2, 3, 4].map((n) => ({ name: n === 4 ? "4+" : String(n), runs: called.filter((r) => (n === 4 ? r.callAttempts >= 4 : r.callAttempts === n)).length }));
    const colours = (["Green", "Amber", "Red"] as const).map((c) => ({ name: c, value: runs.filter((r) => r.colour === c).length }));

    return { fjs, rows, open, exposure, protectedAmt, released, breached, sysBlocked, auto, trend, categories, results, ageing, stageData, team, riskMix, runs, called, answered, wa, forms, outreachFunnel, attempts, colours };
  }, [js, allRows, demoRuns, feed, horizon, grades, category, sla, outcome]);

  const allCats = useMemo(() => [...new Set(allRows.map((r) => r.c.category))].sort(), [allRows]);
  const flow = feed === "all" ? undefined : flows.find((f) => f.feed === feed);
  const ranked = rankQueue(d.open, queue).slice(0, 8);
  const mine = d.open.filter((r) => r.c.assignee === actor).length;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
  const filtersOn = horizon !== "all" || grades.length || category !== "all" || sla !== "all" || outcome !== "all";

  const kpis = view === "exec"
    ? [
        { label: "Exposure flagged", value: inr(d.exposure), icon: IndianRupee },
        { label: "Funds protected", value: inr(d.protectedAmt), icon: ShieldAlert, tone: "text-success" },
        { label: "Released to customers", value: inr(d.released), icon: IndianRupee },
        { label: "System blocked", value: d.sysBlocked, icon: ShieldAlert, tone: "text-destructive" },
        { label: "Auto-resolved", value: `${pct(d.auto, d.fjs.length)}%`, icon: Zap },
      ]
    : view === "ops"
      ? [
          { label: "Alerts", value: d.fjs.length, icon: Bell },
          { label: "Open cases", value: d.open.length, icon: FolderOpen },
          { label: "Pending my action", value: mine, icon: Briefcase },
          { label: "SLA breaches", value: d.breached, icon: AlertTriangle, tone: d.breached ? "text-destructive" : "" },
          { label: "Breach rate", value: `${pct(d.breached, d.open.length)}%`, icon: Timer },
        ]
      : [
          { label: "Engagement runs", value: d.runs.length, icon: Zap },
          { label: "Call answer rate", value: `${pct(d.answered.length, d.called.length)}%`, icon: Bell },
          { label: "WhatsApp sent", value: d.wa.length, icon: Bell },
          { label: "Form return rate", value: `${pct(d.forms.length, d.wa.length)}%`, icon: FolderOpen },
          { label: "Avg call attempts", value: d.called.length ? (d.called.reduce((s, r) => s + r.callAttempts, 0) / d.called.length).toFixed(1) : "0", icon: Timer },
        ];

  return (
    <div>
      <PageHeader
        title="EDD Command Dashboard"
        description={`${roleLabels[role]} view — each alert source has its own flow and queue.`}
        actions={<Button asChild><Link to="/simulator">Run a demo</Link></Button>}
      />

      {/* View switcher + source tabs */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border bg-muted p-1" role="tablist" aria-label="Dashboard view">
          {([["exec", "Executive & financial"], ["ops", "Operations & nodal desk"], ["outreach", "Outreach & channels"]] as const).map(([v, l]) => (
            <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Alert source">
          <Pill value="all" current={feed} onClick={setFeed}>All sources <span className="ml-1 opacity-70">{js.length}</span></Pill>
          {FEEDS.map((f) => (
            <Pill key={f.id} value={f.id} current={feed} onClick={setFeed}>{f.short} <span className="ml-1 opacity-70">{js.filter((x) => feedOf(x.alert) === f.id).length}</span></Pill>
          ))}
        </div>
      </div>

      {/* Filter bar */}
      <Card className="mb-5">
        <CardContent className="flex flex-wrap items-center gap-x-5 gap-y-3 py-3 text-xs">
          <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Time</span>
            {([["today", "Today"], ["24h", "24h"], ["7d", "7d"], ["mtd", "MTD"], ["all", "All"]] as const).map(([v, l]) => <Pill key={v} value={v} current={horizon} onClick={setHorizon}>{l}</Pill>)}
          </div>
          <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Risk</span>
            {GRADES.map((g) => (
              <Button key={g} size="sm" variant={grades.includes(g) ? "default" : "outline"} className="h-7 px-2.5 text-xs"
                onClick={() => setGrades((s) => (s.includes(g) ? s.filter((x) => x !== g) : [...s, g]))}>{g}</Button>
            ))}
          </div>
          <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Modus</span>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-7 w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All categories</SelectItem>{allCats.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1.5"><span className="text-muted-foreground">SLA</span>
            {([["all", "All"], ["breached", "Breached"], ["imminent", "< 30 min"], ["within", "Within"]] as const).map(([v, l]) => <Pill key={v} value={v} current={sla} onClick={setSla}>{l}</Pill>)}
          </div>
          <div className="flex items-center gap-1.5"><span className="text-muted-foreground">Outcome</span>
            <Select value={outcome} onValueChange={(v) => setOutcome(v as Outcome)}>
              <SelectTrigger className="h-7 w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All outcomes</SelectItem>
                <SelectItem value="System blocked">System blocked</SelectItem>
                <SelectItem value="Verified">Customer cleared</SelectItem>
                <SelectItem value="Blocked">Blocked after review</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {filtersOn ? <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setHorizon("all"); setGrades([]); setCategory("all"); setSla("all"); setOutcome("all"); }}>Clear filters</Button> : null}
        </CardContent>
      </Card>

      {flow && (
        <Card className="mb-5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">How {FEEDS.find((f) => f.id === feed)?.name} alerts are handled · {flow.desk} · SLA {flow.slaMin} min</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/admin/workflows">Change flow</Link></Button>
          </CardHeader>
          <CardContent><FlowPreview flow={flow} /></CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-start justify-between py-5">
              <div><p className={`text-2xl font-semibold ${k.tone ?? ""}`}>{k.value}</p><p className="text-xs text-muted-foreground">{k.label}</p></div>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardContent>
          </Card>
        ))}
      </div>

      {view === "exec" && (
        <>
          <div className="mb-5 grid gap-5 lg:grid-cols-3">
            <ChartCard className="lg:col-span-2" title="Financial exposure vs funds protected" sub="Last 7 days · amounts from alert text, estimated where missing">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={d.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" {...axis} /><YAxis {...axis} tickFormatter={inr} />
                  <Tooltip {...tip} formatter={(v: number) => inr(v)} /><Legend />
                  <Area type="monotone" dataKey="exposure" name="Exposure" fill="var(--color-chart-1)" fillOpacity={0.15} stroke="var(--color-chart-1)" />
                  <Bar dataKey="protected" name="Protected" fill="var(--color-success)" radius={[4, 4, 0, 0]} barSize={22} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Outcome mix" sub="Where alerts ended up">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.results} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                    {d.results.map((r, i) => <Cell key={r.name} fill={r.name === "System blocked" || r.name === "Blocked" ? "var(--color-destructive)" : r.name === "Verified" || r.name === "Unblocked" ? "var(--color-success)" : `var(--color-chart-${(i % 5) + 1})`} />)}
                  </Pie>
                  <Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <ChartCard title="Fraud modus operandi" sub="Cases and exposure by category">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.categories} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" {...axis} width={90} />
                  <Tooltip {...tip} formatter={(v: number, n: string) => (n === "Exposure" ? inr(v) : v)} />
                  <Bar dataKey="count" name="Cases" fill="var(--color-chart-2)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Alert inflow by source" sub="Last 7 days, stacked by feed">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="day" {...axis} /><YAxis {...axis} allowDecimals={false} />
                  <Tooltip {...tip} /><Legend />
                  {FEEDS.map((f) => <Bar key={f.id} dataKey={f.id} name={f.short} stackId="a" fill={FEED_COLORS[f.id]} />)}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="mb-5"><AlertFunnel /></div>
        </>
      )}

      {view === "ops" && (
        <>
          <div className="mb-5 grid gap-5 lg:grid-cols-3">
            <ChartCard className="lg:col-span-2" title="SLA ageing by source" sub="Open cases by time left to SLA">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.ageing}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="bucket" {...axis} /><YAxis {...axis} allowDecimals={false} />
                  <Tooltip {...tip} /><Legend />
                  {FEEDS.map((f) => <Bar key={f.id} dataKey={f.id} name={f.short} fill={FEED_COLORS[f.id]} radius={[3, 3, 0, 0]} />)}
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Risk grade mix" sub="Open cases">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.riskMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                    {d.riskMix.map((r) => <Cell key={r.name} fill={RISK_COLORS[r.name]} />)}
                  </Pie>
                  <Tooltip {...tip} /><Legend />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
          <div className="mb-5 grid gap-5 lg:grid-cols-2">
            <ChartCard title="Team capacity vs breach exposure" sub="Open cases per team member">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.team} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis type="number" {...axis} /><YAxis type="category" dataKey="name" {...axis} width={100} />
                  <Tooltip {...tip} /><Legend />
                  <Bar dataKey="healthy" name="Within SLA" stackId="t" fill="var(--color-info)" />
                  <Bar dataKey="breaching" name="Breaching" stackId="t" fill="var(--color-destructive)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
            <ChartCard title="Cases by stage" sub="Where open work is sitting">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.stageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" {...axis} /><YAxis {...axis} allowDecimals={false} />
                  <Tooltip {...tip} />
                  <Bar dataKey="value" name="Cases" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {view === "outreach" && (
        <div className="mb-5 grid gap-5 lg:grid-cols-3">
          <ChartCard className="lg:col-span-2" title="Engagement funnel" sub="From run to customer response">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.outreachFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" {...axis} /><YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tip} />
                <Bar dataKey="value" name="Cases" radius={[4, 4, 0, 0]}>
                  {d.outreachFunnel.map((_, i) => <Cell key={i} fill={`var(--color-chart-${(i % 5) + 1})`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Customer response risk" sub="Green / Amber / Red flags">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={d.colours} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                  {d.colours.map((c) => <Cell key={c.name} fill={c.name === "Green" ? "var(--color-success)" : c.name === "Amber" ? "var(--color-warning)" : "var(--color-destructive)"} />)}
                </Pie>
                <Tooltip {...tip} /><Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard className="lg:col-span-2" title="Call attempts needed" sub="How many tries before the outcome">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.attempts}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" {...axis} /><YAxis {...axis} allowDecimals={false} />
                <Tooltip {...tip} />
                <Bar dataKey="runs" name="Cases" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
          <ChartCard title="Channel reach" sub="Share of cases reached per channel">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{ name: "Voice", value: pct(d.answered.length, d.runs.length) }, { name: "WhatsApp", value: pct(d.wa.length, d.runs.length) }, { name: "Form", value: pct(d.forms.length, d.runs.length) }]}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="name" {...axis} /><YAxis {...axis} unit="%" domain={[0, 100]} />
                <Tooltip {...tip} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="value" name="Reach" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}

      {/* Priority queue */}
      <Card className="mb-5">
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
              {ranked.length === 0 && <TableRow><TableCell colSpan={8} className="py-6 text-center text-muted-foreground">No open cases match these filters.</TableCell></TableRow>}
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

      {feed === "all" && <LatestCases />}
      <p className="sr-only">{enforcement.length} enforcement entries</p>
    </div>
  );
}
