import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { RiskChip } from "@/components/edd/chips";
import { timeAgo } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TriageDrawer } from "@/components/edd/TriageDrawer";
import { useEDD } from "@/lib/edd-store";
import { can } from "@/lib/roles";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alert Inbox — EDSquare" },
      { name: "description", content: "Triage incoming money-mule and digital-scam alerts from AML, risk-model and negative-database sources." },
      { property: "og:title", content: "Alert Inbox — EDSquare" },
      { property: "og:description", content: "Run pre-EDD triage on incoming suspicious-account alerts." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const { alerts, role, dismissAlert } = useEDD();
  const navigate = useNavigate();
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("New");
  const [selected, setSelected] = useState<string[]>([]);
  const [triageId, setTriageId] = useState<string | null>(null);

  const rows = alerts.filter(
    (a) => (source === "all" || a.source === source) && (status === "all" || a.status === status),
  );

  return (
    <div>
      <PageHeader
        title="Alert Inbox"
        description="Signals from AML engines, risk models, complaints and the negative database await pre-EDD triage."
        actions={
          <>
            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
              Decision Manager: rules v4.2 + mule model v2.1
            </Badge>
            <Button
              disabled={selected.length === 0 || !can(role, "runTriage")}
              onClick={() => setTriageId(selected[0] ?? null)}
            >
              Run triage ({selected.length})
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {["Negative Database", "Fraud / AML Engine", "Risk Model", "CRM Complaint", "External Intelligence"].map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="New">New</SelectItem>
            <SelectItem value="Triaged">Triaged</SelectItem>
            <SelectItem value="Dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Alert</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Account / UPI</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Signal</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(a.id)}
                      onCheckedChange={(v) =>
                        setSelected((prev) => (v ? [...prev, a.id] : prev.filter((id) => id !== a.id)))
                      }
                      disabled={a.status !== "New"}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{a.id}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{a.source}</TableCell>
                  <TableCell className="text-sm">
                    <div>{a.account}</div>
                    <div className="text-muted-foreground">{a.upi}</div>
                  </TableCell>
                  <TableCell>{a.customer}</TableCell>
                  <TableCell className="max-w-[260px] text-sm text-muted-foreground">{a.trigger}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{timeAgo(a.receivedAt)}</TableCell>
                  <TableCell><RiskChip grade={a.preliminarySignal} /></TableCell>
                  <TableCell className="text-right">
                    {a.status === "New" ? (
                      <div className="flex justify-end gap-2">
                        <Button size="sm" disabled={!can(role, "runTriage")} onClick={() => setTriageId(a.id)}>
                          Run triage
                        </Button>
                        <Button size="sm" variant="ghost" disabled={!can(role, "runTriage")} onClick={() => dismissAlert(a.id)}>
                          Dismiss
                        </Button>
                      </div>
                    ) : a.caseId ? (
                      <Button size="sm" variant="outline" onClick={() => navigate({ to: "/cases/$caseId", params: { caseId: a.caseId! } })}>
                        Open case
                      </Button>
                    ) : (
                      <Badge variant="outline">{a.status}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TriageDrawer alertId={triageId} onClose={() => { setTriageId(null); setSelected([]); }} />
    </div>
  );
}
