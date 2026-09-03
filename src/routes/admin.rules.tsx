import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RISK_BANDS } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";

export const Route = createFileRoute("/admin/rules")({
  head: () => ({
    meta: [
      { title: "Rules & Thresholds — Sentinel EDD" },
      { name: "description", content: "Manage the EDD rule catalogue, risk bands, thresholds and scoring weights." },
      { property: "og:title", content: "Rules & Thresholds — Sentinel EDD" },
      { property: "og:description", content: "Risk bands and the full decision-rule catalogue with weights and toggles." },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const { rules, toggleRule, role } = useEDD();
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState("all");

  const families = useMemo(() => Array.from(new Set(rules.map((r) => r.family))), [rules]);
  const filtered = rules.filter(
    (r) =>
      (family === "all" || r.family === family) &&
      (r.name.toLowerCase().includes(query.toLowerCase()) || r.id.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-sm">Risk bands</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-sm">
          {RISK_BANDS.map((b) => (
            <Badge key={b.grade} variant="outline">{b.grade} · {b.label} · {b.range}</Badge>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search rules…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-xs"
        />
        <Select value={family} onValueChange={setFamily}>
          <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All families</SelectItem>
            {families.map((f) => (
              <SelectItem key={f} value={f}>{f}</SelectItem>
            ))}
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
                <TableHead>Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Threshold</TableHead>
                <TableHead>Weight</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.id}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.family}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.threshold}</TableCell>
                  <TableCell>{r.weight}</TableCell>
                  <TableCell className="text-right">
                    <Switch checked={r.active} disabled={role !== "admin"} onCheckedChange={() => toggleRule(r.id)} />
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
