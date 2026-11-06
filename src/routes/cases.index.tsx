import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { CategoryBadge, RiskChip, SlaBadge, StageBadge, timeAgo } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STAGES } from "@/data/edd";
import { Badge } from "@/components/ui/badge";
import { MyWorkBody } from "@/components/edd/pages/MyWorkBody";
import { useEDD } from "@/lib/edd-store";
import { can } from "@/lib/roles";

export const Route = createFileRoute("/cases/")({
  head: () => ({
    meta: [
      { title: "Cases — EDSquare" },
      { name: "description", content: "Track enhanced due diligence cases across triage, enrichment, engagement, review and decision stages." },
      { property: "og:title", content: "Cases — EDSquare" },
      { property: "og:description", content: "Kanban and table views of every open EDD case with SLA and risk visibility." },
    ],
  }),
  component: CaseQueuePage,
});

function CaseQueuePage() {
  const { cases, demoRuns, alerts, negbase, enforcement, role, moveStage, assignCase } = useEDD();
  const repeat = (c: (typeof cases)[number]) => caseHistory(c, { cases, alerts, negbase, enforcement }).summary;
  const [grade, setGrade] = useState("all");

  const howGot = (id: string) => {
    const r = demoRuns.find((x) => x.caseId === id);
    if (r) return `${r.alertType} · call ${r.callAnswered ? "answered" : r.callAttempts ? "not answered" : "not placed"} · WhatsApp ${r.whatsappSent ? (r.formSubmitted ? "answered" : "no reply") : "not sent"} · ${r.colour}`;
    const a = alerts.find((x) => x.caseId === id);
    return a ? `${a.source}: ${a.trigger}` : "";
  };
  const rows = cases.filter((c) => grade === "all" || c.grade === grade).sort((a, b) => b.openedAt.localeCompare(a.openedAt));

  return (
    <div>
      <PageHeader
        title="Cases"
        description="Your work, the stage board and the full list of cases in one place."
        actions={
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Risk grade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All risk grades</SelectItem>
              <SelectItem value="VH">Very High</SelectItem>
              <SelectItem value="H">High</SelectItem>
              <SelectItem value="M">Medium</SelectItem>
              <SelectItem value="L">Low</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">All cases ({rows.length})</TabsTrigger>
          <TabsTrigger value="board">Board</TabsTrigger>
          <TabsTrigger value="mine">My work</TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4"><MyWorkBody /></TabsContent>

        <TabsContent value="board" className="mt-4">
          <div className="grid gap-4 xl:grid-cols-3 2xl:grid-cols-6">
            {STAGES.map((stage) => (
              <Card key={stage} className="min-w-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    {stage}{" "}
                    <span className="text-muted-foreground">({rows.filter((c) => c.stage === stage).length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rows
                    .filter((c) => c.stage === stage)
                    .map((c) => (
                      <div key={c.id} className="rounded-md border border-border p-3">
                        <Link to="/cases/$caseId" params={{ caseId: c.id }} className="text-sm font-medium hover:underline">
                          {c.id}
                        </Link>
                        
                        
                        <p className="text-sm text-muted-foreground">{c.customer}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{howGot(c.id)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <RiskChip grade={c.grade} score={c.riskScore} />
                          <CategoryBadge category={c.category} />
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <SlaBadge dueAt={c.slaDueAt} />
                          <Select
                            value={c.stage}
                            onValueChange={(v) => moveStage(c.id, v as typeof c.stage)}
                            disabled={!can(role, "assign")}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map((s) => (
                                <SelectItem key={s} value={s}>{s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Opened</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        <Link to="/cases/$caseId" params={{ caseId: c.id }} className="hover:underline">{c.id}</Link>
                        {(() => { const s = repeat(c); return s.priorCases > 0 ? <Badge variant="outline" className={`ml-2 ${s.blocked ? "border-destructive/40 text-destructive" : ""}`} title={`${s.priorCases} linked case(s), ${s.blocked} blocked`}>Repeat · {s.priorCases}</Badge> : null; })()}
                        
                        
                        <p className="max-w-[260px] text-xs font-normal text-muted-foreground">{howGot(c.id)}</p>
                      </TableCell>
                      <TableCell>{c.customer}</TableCell>
                      <TableCell><CategoryBadge category={c.category} /></TableCell>
                      <TableCell><StageBadge stage={c.stage} /></TableCell>
                      <TableCell><RiskChip grade={c.grade} score={c.riskScore} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">{c.assignee}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{timeAgo(c.openedAt)}</TableCell>
                      <TableCell><SlaBadge dueAt={c.slaDueAt} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!can(role, "assign")}
                          onClick={() => assignCase(c.id, "Priya Nair")}
                        >
                          Assign to me
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
