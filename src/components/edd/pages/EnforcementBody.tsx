import { Link } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { useEDD } from "@/lib/edd-store";
import { BlockReason, ResultBadge, useJourneys } from "@/components/edd/Journey";


export function EnforcementBody() {
  const { enforcement } = useEDD();
  const [action, setAction] = useState("all");
  const systemBlocked = useJourneys().filter((x) => x.j.result === "System blocked");
  const rows = enforcement.filter((e) => action === "all" || e.action === action);

  return (
    <div>
      <PageHeader
        title="Enforcement Log"
        description="Downstream actions pushed to core banking, with full accountability."
        actions={
          <>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Action" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="Block">Block</SelectItem>
                <SelectItem value="Unblock">Unblock</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => toast.success("Export queued — CSV will be emailed to you")}>
              Export
            </Button>
          </>
        }
      />

      <Card className="mb-6 border-destructive/40">
        <CardContent className="space-y-2 py-4">
          <p className="text-sm font-semibold">System blocked transactions ({systemBlocked.length})</p>
          {systemBlocked.length === 0 && <p className="text-sm text-muted-foreground">None right now.</p>}
          {systemBlocked.map(({ alert: a, j }) => (
            <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border p-3 text-sm">
              <div className="min-w-0"><p className="font-medium">{a.customer} · {a.account} <span className="text-xs text-muted-foreground">· {a.id}</span></p><BlockReason j={j} /></div>
              <div className="flex items-center gap-2"><ResultBadge r={j.result} />{j.caseItem && <Link to="/cases/$caseId" params={{ caseId: j.caseItem.id }} className="text-xs text-primary hover:underline">{j.caseItem.id}</Link>}<span className="text-xs text-muted-foreground">By System</span></div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Record</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Customer / account</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Decided by</TableHead>
                <TableHead>Approved by</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Account status</TableHead>
                <TableHead>Downstream</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.id}</TableCell>
                  <TableCell>
                    <Link to="/cases/$caseId" params={{ caseId: e.caseId }} className="hover:underline">{e.caseId}</Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{e.customer}</div>
                    <div className="text-muted-foreground">{e.account}</div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={e.action === "Block" ? "border-destructive/30 bg-destructive/10 text-destructive" : "border-success/30 bg-success/10 text-success"}
                    >
                      {e.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.decidedBy}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.approvedBy ?? "—"}</TableCell>
                  <TableCell className="max-w-[240px] text-sm text-muted-foreground">{e.reason}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.accountStatus}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{e.downstreamStatus}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(e.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
