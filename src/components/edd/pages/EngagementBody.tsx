import { Link } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/AppShell";
import { formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { engagementTemplates } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";
import { liveActivity, runStats } from "@/lib/demo-runs";


export function EngagementBody() {
  const { cases } = useEDD();
  const live = liveActivity(cases);
  const calls = cases.flatMap((c) => c.calls ?? []);
  const forms = cases.flatMap((c) => c.questionnaires ?? []);
  const st = runStats([], calls, forms);
  const attempts = [
    ...live,
    ...cases.flatMap((c) => c.engagement.map((e) => ({ id: e.id, caseId: c.id, customer: c.customer, channel: e.channel as string, status: e.status as string, at: e.at, outcome: e.outcome, live: false, recordingUrl: undefined as string | undefined }))),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const isResp = (s: string) => s === "Responded" || s === "Answered" || s === "Submitted";
  const responded = attempts.filter((a) => isResp(a.status)).length;

  const kpis = [
    { label: "Total attempts", value: attempts.length },
    { label: "Responses", value: responded },
    { label: "Response rate", value: attempts.length ? `${Math.round((responded / attempts.length) * 100)}%` : "0%" },
    { label: "No response", value: attempts.filter((a) => a.status === "No Response" || a.status === "No answer").length },
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

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-sm">Live demo channel results</CardTitle></CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-4">
          <div><p className="text-xl font-semibold">{st.callsAnswered}/{st.calls}</p><p className="text-xs text-muted-foreground">Voice calls answered</p></div>
          <div><p className="text-xl font-semibold">{st.answerRate}%</p><p className="text-xs text-muted-foreground">Voice answer rate</p></div>
          <div><p className="text-xl font-semibold">{st.formsSubmitted}/{st.formsSent}</p><p className="text-xs text-muted-foreground">WhatsApp forms submitted</p></div>
          <div><p className="text-xl font-semibold">{st.completionRate}%</p><p className="text-xs text-muted-foreground">Form completion rate</p></div>
        </CardContent>
      </Card>

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
                    <TableCell className="text-sm text-muted-foreground">{a.channel}{a.live && <Badge className="ml-2" variant="secondary">Live demo</Badge>}</TableCell>
                    <TableCell><Badge variant="outline">{a.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDateTime(a.at)}</TableCell>
                    <TableCell className="max-w-[280px] text-sm text-muted-foreground">{a.outcome}{a.recordingUrl && <audio controls src={a.recordingUrl} className="mt-1 h-8 w-full" />}</TableCell>
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
