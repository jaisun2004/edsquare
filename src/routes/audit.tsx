import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEDD } from "@/lib/edd-store";
import { roleLabels } from "@/lib/roles";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — Sentinel EDD" },
      { name: "description", content: "Read-only chronological log of every actor, action and before/after state change across the platform." },
      { property: "og:title", content: "Audit Trail — Sentinel EDD" },
      { property: "og:description", content: "Immutable audit evidence for regulators and internal review." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { audit } = useEDD();
  const [query, setQuery] = useState("");

  const rows = audit.filter((a) =>
    [a.actor, a.action, a.caseId ?? "", a.before, a.after].join(" ").toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Audit Trail"
        description="Read-only. Every state change is captured with actor, role and before/after values."
        actions={<Input className="w-64" placeholder="Filter log…" value={query} onChange={(e) => setQuery(e.target.value)} />}
      />

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Before → After</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(a.at)}</TableCell>
                  <TableCell className="font-medium">{a.actor}</TableCell>
                  <TableCell><Badge variant="outline">{roleLabels[a.role]}</Badge></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.caseId ?? "—"}</TableCell>
                  <TableCell>{a.action}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.before} → {a.after}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
