import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { CategoryBadge, RecommendationBadge, RiskChip, SlaBadge, StageBadge, formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useEDD } from "@/lib/edd-store";
import { CaseCalls, CaseTimeline } from "@/components/edd/CaseRecords";
import { can } from "@/lib/roles";
import { JourneyStrip } from "@/components/edd/Journey";
import { alertJourney } from "@/lib/alert-journey";
import { DemoRunSummary } from "@/components/edd/DemoRuns";
import type { Channel, Recommendation } from "@/data/edd";

export const Route = createFileRoute("/cases/$caseId")({
  head: () => ({
    meta: [
      { title: "Case Detail — EDSquare" },
      { name: "description", content: "Full enhanced due diligence workspace: intelligence, engagement, investigation rationale and enforcement decision." },
      { property: "og:title", content: "Case Detail — EDSquare" },
      { property: "og:description", content: "Investigate a suspected mule account and record the enforcement decision." },
    ],
  }),
  component: CaseDetailPage,
});

function CaseDetailPage() {
  const { caseId } = Route.useParams();
  const { cases, demoRuns, alerts, enforcement, role, requestEnrichment, startEngagement, saveRationale, decide, addNote } = useEDD();
  const item = cases.find((c) => c.id === caseId);
  const run = demoRuns.find((r) => r.caseId === caseId);

  const [rationaleText, setRationaleText] = useState(item?.rationale?.text ?? "");
  const [evidence, setEvidence] = useState(item?.rationale?.evidence ?? false);
  const [policy, setPolicy] = useState(item?.rationale?.policy ?? false);
  const [confidence, setConfidence] = useState<"Low" | "Medium" | "High">(item?.rationale?.confidence ?? "Medium");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  if (!item) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <p className="text-sm text-muted-foreground">Case {caseId} was not found.</p>
        <Link to="/cases" className="mt-3 inline-block text-sm text-primary hover:underline">Back to case queue</Link>
      </div>
    );
  }

  const srcAlert = alerts.find((a) => a.caseId === item.id) ?? alerts.find((a) => a.id === run?.alertId);
  const journey = srcAlert ? alertJourney(srcAlert, cases, enforcement, demoRuns) : undefined;
  const decisionBlocked = !item.rationale || !can(role, "decide") || (item.grade === "VH" && !can(role, "approveVeryHigh"));

  const act = (outcome: Recommendation) => {
    decide(item.id, outcome, reason || "Decision recorded from case workspace");
    setReason("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{item.id}</h1>
            <RiskChip grade={item.grade} score={item.riskScore} />
            <CategoryBadge category={item.category} />
            <StageBadge stage={item.stage} />
            <SlaBadge dueAt={item.slaDueAt} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {item.customer} · {item.account} · {item.upi} · assigned to {item.assignee}
          </p>
        </div>
        {item.recommendation && (
          <div className="text-right text-sm">
            <p className="text-muted-foreground">Model recommendation</p>
            <RecommendationBadge value={item.recommendation} />
          </div>
        )}
      </div>

      {journey && <JourneyStrip j={journey} />}

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Input
            placeholder="Decision reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="max-w-sm bg-background"
          />
          <Button variant="destructive" disabled={decisionBlocked} onClick={() => act("Block")}>Block account</Button>
          <Button variant="outline" disabled={decisionBlocked} onClick={() => act("Unblock")}>Unblock / clear</Button>
          <Button disabled={!can(role, "decide")} onClick={() => act("Further Investigation")}>Further investigation</Button>
          <span className="text-xs text-muted-foreground">
            {!item.rationale
              ? "Investigation rationale required before a decision."
              : item.grade === "VH" && !can(role, "approveVeryHigh")
                ? "Very-high risk decisions need Supervisor approval."
                : "AI/ML prioritises. Bank experts decide."}
          </span>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intel">Intelligence &amp; Enrichment</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="investigation">Investigation</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="docs">Documents &amp; Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
          {run && <DemoRunSummary run={run} />}
          <Card>
            <CardHeader><CardTitle className="text-sm">Risk score</CardTitle></CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{item.riskScore}</p>
              <Progress value={item.riskScore} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">Rules triggered: {item.rulesTriggered.join(", ")}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Contributing signals</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {item.signals.map((s) => (
                <div key={s.label} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{s.label}</span>
                    <Badge variant="outline">weight {s.weight}</Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">{s.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intel" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Negative database match</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">Match criteria: </span>{item.enrichment.matchCriteria}</p>
              <ul className="list-inside list-disc text-muted-foreground">
                {item.enrichment.negbaseAttributes.map((a) => <li key={a}>{a}</li>)}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Identity &amp; telco enrichment</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p><span className="text-muted-foreground">UPI handles: </span>{item.enrichment.upiHandleCount}</p>
              <p><span className="text-muted-foreground">Mobile vintage: </span>{item.enrichment.mobileVintage} ({item.enrichment.mobileType})</p>
              <p><span className="text-muted-foreground">Telco: </span>{item.enrichment.telco}</p>
              <p><span className="text-muted-foreground">Social presence: </span>{item.enrichment.socialPresence.join(", ") || "None found"}</p>
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-sm">OSINT</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <ul className="list-inside list-disc text-muted-foreground">
                {item.enrichment.osint.length ? item.enrichment.osint.map((o) => <li key={o}>{o}</li>) : <li>No OSINT findings yet</li>}
              </ul>
              <Button variant="outline" size="sm" disabled={role === "auditor"} onClick={() => requestEnrichment(item.id)}>
                Request additional enrichment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Initiate engagement</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(["AI Call", "WhatsApp", "Email", "SMS", "Net Banking"] as Channel[]).map((ch) => (
                <Button
                  key={ch}
                  size="sm"
                  variant={ch === "AI Call" ? "default" : "outline"}
                  disabled={!can(role, "engage")}
                  onClick={() => startEngagement(item.id, ch)}
                >
                  {ch}
                </Button>
              ))}
            </CardContent>
          </Card>
          <CaseCalls calls={item.calls ?? []} questionnaires={item.questionnaires ?? []} />
          {item.engagement.map((e) => (
            <Card key={e.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                  {e.channel}
                  <Badge variant="outline">{e.status}</Badge>
                  <span className="text-xs font-normal text-muted-foreground">{formatDateTime(e.at)}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{e.outcome}</p>
                {e.transcript && (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    {e.transcript.map((line, i) => (
                      <p key={i} className="text-sm">
                        <span className="font-medium">{line.speaker}: </span>
                        <span className="text-muted-foreground">{line.text}</span>
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="investigation" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Investigation rationale</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                rows={6}
                placeholder="Document your assessment, evidence considered and reasoning…"
                value={rationaleText}
                onChange={(e) => setRationaleText(e.target.value)}
                disabled={!can(role, "editRationale")}
              />
              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={evidence} onCheckedChange={(v) => setEvidence(!!v)} /> Evidence reviewed
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={policy} onCheckedChange={(v) => setPolicy(!!v)} /> Policy checked
                </label>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Confidence</Label>
                  <Select value={confidence} onValueChange={(v) => setConfidence(v as typeof confidence)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                disabled={!can(role, "editRationale") || !rationaleText.trim() || !evidence || !policy}
                onClick={() => saveRationale(item.id, { text: rationaleText, evidence, policy, confidence, savedBy: role })}
              >
                Save rationale
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <CaseTimeline entries={item.timeline} />
        </TabsContent>

        <TabsContent value="docs" className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-sm">Documents</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {item.documents.length ? (
                item.documents.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-md border border-border p-3">
                    <span>{d.name}</span>
                    <span className="text-xs text-muted-foreground">{d.kind} · {formatDateTime(d.at)}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No documents attached.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {item.notes.map((n) => (
                <div key={n.id} className="rounded-md border border-border p-3">
                  <p>{n.text}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{n.author} · {formatDateTime(n.at)}</p>
                </div>
              ))}
              <Separator />
              <Textarea placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                disabled={!note.trim() || role === "auditor"}
                onClick={() => { addNote(item.id, note); setNote(""); }}
              >
                Add note
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
