import { createFileRoute, Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/AppShell";
import { formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { engagementTemplates } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";

export const Route = createFileRoute("/engagement")({
  head: () => ({
    meta: [
      { title: "Engagement Center — EDSquare" },
      { name: "description", content: "Cross-case AI calling and messaging activity, channel performance and outreach template library." },
      { property: "og:title", content: "Engagement Center — EDSquare" },
      { property: "og:description", content: "Monitor customer outreach across AI call, WhatsApp, email and SMS channels." },
    ],
  }),
  component: EngagementPage,
});

function EngagementPage() {
  const { cases } = useEDD();
  const attempts = cases.flatMap((c) => c.engagement.map((e) => ({ ...e, caseId: c.id, customer: c.customer })));
  const responded = attempts.filter((a) => a.status === "Responded").length;

  const kpis = [
    { label: "Total attempts", value: attempts.length },
    { label: "Responses", value: responded },
    { label: "Response rate", value: attempts.length ? `${Math.round((responded / attempts.length) * 100)}%` : "0%" },
    { label: "No response", value: attempts.filter((a) => a.status === "No Response").length },
  ];

  return (
    <div>
      <PageHeader title="Engagement Center" description="Customer outreach across AI calling and messaging channels." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="py-5">
              <p className="text-2xl font-semibold">{k.value}</p>
              <p className="text-xs text-muted-foreground">{k.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Recent activity</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attempts.map((a) => (
                  <TableRow key={`${a.caseId}-${a.id}`}>
                    <TableCell className="font-medium">
                      <Link to="/cases/$caseId" params={{ caseId: a.caseId }} className="hover:underline">{a.caseId}</Link>
                    </TableCell>
                    <TableCell>{a.customer}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.channel}</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(a.at)}</TableCell>
                    <TableCell className="max-w-[280px] text-sm text-muted-foreground">{a.outcome}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Template library</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {engagementTemplates.map((t) => (
              <div key={t.id} className="rounded-md border border-border p-3">
                <p className="font-medium">{t.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t.channel} · {t.usage} sends · {t.responseRate} response
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
