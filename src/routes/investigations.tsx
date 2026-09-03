import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/AppShell";
import { CategoryBadge, RiskChip, SlaBadge, StageBadge } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEDD } from "@/lib/edd-store";
import { can } from "@/lib/roles";

export const Route = createFileRoute("/investigations")({
  head: () => ({
    meta: [
      { title: "Investigations Workbench — Sentinel EDD" },
      { name: "description", content: "Prioritised investigator worklist sorted by risk and SLA, with next-case claiming." },
      { property: "og:title", content: "Investigations Workbench — Sentinel EDD" },
      { property: "og:description", content: "Work the highest-risk EDD cases assigned to you or your team." },
    ],
  }),
  component: InvestigationsPage,
});

function InvestigationsPage() {
  const { cases, actor, role, claimNext } = useEDD();
  const navigate = useNavigate();

  const mine = cases
    .filter((c) => c.stage !== "Closed" && c.assignee === actor)
    .sort((a, b) => b.riskScore - a.riskScore || new Date(a.slaDueAt).getTime() - new Date(b.slaDueAt).getTime());
  const team = cases
    .filter((c) => c.stage !== "Closed" && c.assignee !== actor)
    .sort((a, b) => b.riskScore - a.riskScore);

  const claim = () => {
    const id = claimNext();
    if (id) navigate({ to: "/cases/$caseId", params: { caseId: id } });
  };

  const renderTable = (rows: typeof cases) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Case</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Risk</TableHead>
          <TableHead>Assignee</TableHead>
          <TableHead>SLA</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="font-medium">
              <Link to="/cases/$caseId" params={{ caseId: c.id }} className="hover:underline">{c.id}</Link>
            </TableCell>
            <TableCell>{c.customer}</TableCell>
            <TableCell><CategoryBadge category={c.category} /></TableCell>
            <TableCell><StageBadge stage={c.stage} /></TableCell>
            <TableCell><RiskChip grade={c.grade} score={c.riskScore} /></TableCell>
            <TableCell className="text-sm text-muted-foreground">{c.assignee}</TableCell>
            <TableCell><SlaBadge dueAt={c.slaDueAt} /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <div>
      <PageHeader
        title="Investigations Workbench"
        description="Highest risk and closest to SLA breach first."
        actions={<Button disabled={!can(role, "assign")} onClick={claim}>Claim next case</Button>}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-sm">Assigned to me ({mine.length})</CardTitle></CardHeader>
          <CardContent className="p-0">{renderTable(mine)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">My team ({team.length})</CardTitle></CardHeader>
          <CardContent className="p-0">{renderTable(team)}</CardContent>
        </Card>
      </div>
    </div>
  );
}
