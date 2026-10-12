import { Link, createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { RuleAssistant } from "@/components/edd/RuleAssistant";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RISK_BANDS } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";
import { checkRule, describeRule } from "@/lib/rule-engine";

export const Route = createFileRoute("/admin/rules/")({
  head: () => ({
    meta: [
      { title: "Rules & Thresholds — EDSquare" },
      { name: "description", content: "Build, test and approve Decision Manager rules on top of connected data sources." },
      { property: "og:title", content: "Rules & Thresholds — EDSquare" },
      { property: "og:description", content: "Dynamic rule catalogue with plain-English authoring and maker-checker approval." },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const { rules, ruleGroups, attributes, sources, toggleRule, approveRule, role, actor } = useEDD();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [status, setStatus] = useState("live");

  const filtered = rules
    .filter((r) => (group === "all" || r.groupId === group) && (status === "all" || (status === "live" ? r.status !== "Retired" : r.status === status)))
    .filter((r) => `${r.id} ${r.name}`.toLowerCase().includes(query.toLowerCase()));
  const pending = rules.filter((r) => r.status === "Pending approval");
  const canApprove = (author?: string) => (role === "supervisor" || role === "admin") && author !== actor;
  const issues = useMemo(
    () => new Map(rules.map((r) => [r.id, checkRule(r, rules, attributes, sources, []).filter((f) => f.level !== "info").length])),
    [rules, attributes, sources],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2 text-sm">
          {RISK_BANDS.map((b) => <Badge key={b.grade} variant="outline">{b.grade} · {b.label} · {b.range}</Badge>)}
        </div>
        {role === "admin" && (
          <Button asChild><Link to="/admin/rules/new"><Plus className="size-4" /> New rule</Link></Button>
        )}
      </div>

      {pending.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader><CardTitle className="text-sm">Waiting for approval ({pending.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3 text-sm">
                <div>
                  <Link to="/admin/rules/$ruleId" params={{ ruleId: r.id }} className="font-medium text-primary hover:underline">{r.id} · {r.name}</Link>
                  <p className="text-muted-foreground">{describeRule(r, attributes)}</p>
                  <p className="text-xs text-muted-foreground">Maker: {r.history[0]?.by ?? r.author}</p>
                </div>
                {canApprove(r.history[0]?.by) ? (
                  <Button size="sm" onClick={() => approveRule(r.id)}>Approve &amp; activate</Button>
                ) : (
                  <span className="text-xs text-muted-foreground">Needs a different checker (switch to Supervisor)</span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <RuleAssistant />

      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search rules…" value={query} onChange={(e) => setQuery(e.target.value)} className="max-w-xs" />
        <Select value={group} onValueChange={setGroup}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All groups</SelectItem>
            {ruleGroups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="live">Not retired</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Draft">Draft</SelectItem>
            <SelectItem value="Pending approval">Pending approval</SelectItem>
            <SelectItem value="Retired">Retired</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{filtered.length} of {rules.length} rules</span>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rule</TableHead>
                <TableHead>Name &amp; logic</TableHead>
                <TableHead>Group</TableHead>
                <TableHead>Weight / route</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">On</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    <Link to="/admin/rules/$ruleId" params={{ ruleId: r.id }} className="text-primary hover:underline">{r.id}</Link>
                    <p className="text-xs text-muted-foreground">v{r.version}</p>
                  </TableCell>
                  <TableCell className="max-w-md">
                    <p>{r.name}</p>
                    <p className="text-xs text-muted-foreground">{describeRule(r, attributes)}</p>
                    {(issues.get(r.id) ?? 0) > 0 && <p className="text-xs text-warning">{issues.get(r.id)} check{issues.get(r.id)! > 1 ? "s" : ""} need attention</p>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{ruleGroups.find((g) => g.id === r.groupId)?.name}</TableCell>
                  <TableCell className="text-sm">{r.action.outcome ? <Badge variant="outline">{r.action.outcome}</Badge> : `+${r.action.weight}`}</TableCell>
                  <TableCell><Badge variant={r.status === "Active" ? "secondary" : "outline"}>{r.status}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Switch checked={r.active} disabled={role !== "admin" || r.status === "Retired"} onCheckedChange={() => toggleRule(r.id)} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
