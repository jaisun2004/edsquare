import { createFileRoute, Link } from "@tanstack/react-router";
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

export const Route = createFileRoute("/enforcement")({
  head: () => ({
    meta: [
      { title: "Enforcement Log — EDSquare" },
      { name: "description", content: "Immutable record of account block and unblock actions with decision maker, approver and downstream status." },
      { property: "og:title", content: "Enforcement Log — EDSquare" },
      { property: "og:description", content: "Every block and unblock action with approval trail and core-banking status." },
    ],
  }),
  component: EnforcementPage,
});

function EnforcementPage() {
  const { enforcement } = useEDD();
  const [action, setAction] = useState("all");
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
