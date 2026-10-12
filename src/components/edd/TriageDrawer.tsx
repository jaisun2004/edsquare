import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RecommendationBadge, RiskChip } from "@/components/edd/chips";
import { useEDD, type TriageResult } from "@/lib/edd-store";
import { can } from "@/lib/roles";
import type { Recommendation } from "@/data/edd";

export function TriageDrawer({ alertId, onClose }: { alertId: string | null; onClose: () => void }) {
  const { alerts, rules, role, triageAlert, applyTriage, attributes, sources } = useEDD();
  const sourceName = (attr: string) => sources.find((s) => s.id === attributes.find((a) => a.key === attr)?.sourceId)?.name ?? "";
  const navigate = useNavigate();
  const [result, setResult] = useState<TriageResult | null>(null);
  const [running, setRunning] = useState(false);
  const [reason, setReason] = useState("");

  const alert = alerts.find((a) => a.id === alertId);

  useEffect(() => {
    if (!alertId) {
      setResult(null);
      setReason("");
      return;
    }
    setRunning(true);
    const timer = setTimeout(() => {
      setResult(triageAlert(alertId));
      setRunning(false);
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  const act = (outcome: Recommendation) => {
    if (!result) return;
    const caseId = applyTriage(result, outcome, reason || undefined);
    onClose();
    if (outcome === "Further Investigation") navigate({ to: "/cases/$caseId", params: { caseId } });
  };

  const needsSupervisor = result?.grade === "VH" && !can(role, "approveVeryHigh");

  return (
    <Sheet open={!!alertId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Pre-EDD triage {alert ? `— ${alert.id}` : ""}</SheetTitle>
          <SheetDescription>
            Decision Manager combines the rule catalogue with the mule-propensity model. AI/ML prioritises; you decide.
          </SheetDescription>
        </SheetHeader>

        {running && (
          <div className="flex items-center gap-3 px-4 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Running rules, model scoring and negative-database lookups…
          </div>
        )}

        {alert && result && !running && (
          <div className="space-y-6 px-4 pb-8">
            <section className="rounded-lg border border-border p-4 text-sm">
              <p className="font-medium text-foreground">Input summary</p>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-muted-foreground">
                <div><dt className="text-xs uppercase">Customer</dt><dd className="text-foreground">{alert.customer}</dd></div>
                <div><dt className="text-xs uppercase">Account</dt><dd className="text-foreground">{alert.account}</dd></div>
                <div><dt className="text-xs uppercase">UPI</dt><dd className="text-foreground">{alert.upi}</dd></div>
                <div><dt className="text-xs uppercase">Source</dt><dd className="text-foreground">{alert.source}</dd></div>
              </dl>
            </section>

            <section className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Risk score</p>
                <RiskChip grade={result.grade} score={result.score} />
              </div>
              <Progress value={result.score} className="mt-3" />
              <p className="mt-2 text-xs text-muted-foreground">Segment: {result.segment}</p>
            </section>

            <section>
              <p className="text-sm font-medium">Contributing signals</p>
              <ul className="mt-2 space-y-2">
                {result.signals.map((s) => (
                  <li key={s.label} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{s.label}</span>
                      <Badge variant="outline">weight {Math.round(s.weight)}</Badge>
                    </div>
                    <p className="mt-1 text-muted-foreground">{s.detail}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <p className="text-sm font-medium">Decision path</p>
              <ol className="mt-2 space-y-2">
                {result.policy.stages.map((st, i) => (
                  <li key={st.set.id} className="rounded-md border border-border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{i + 1}. {st.set.name}</span>
                      <span className="text-xs text-muted-foreground">{st.note}</span>
                    </div>
                    {st.applied.map((r) => (
                      <div key={r.rule.id} className="mt-2">
                        <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
                          {r.rule.id} · {rules.find((x) => x.id === r.rule.id)?.name ?? r.rule.name}
                          {r.rule.action.outcome ? ` → ${r.rule.action.outcome}` : ` +${r.rule.action.weight}`}
                        </Badge>
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {r.matches.filter((m) => m.pass).map((m, j) => (
                            <li key={j}>{attributes.find((a) => a.key === m.cond.attr)?.label ?? m.cond.attr}: <span className="text-foreground">{String(m.actual)}</span> · {sourceName(m.cond.attr)}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </li>
                ))}
              </ol>
            </section>

            <Separator />

            <section className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Recommendation</span>
                <RecommendationBadge value={result.recommendation} />
              </div>
              <Textarea
                placeholder="Reason / override justification (mandatory for supervisor override)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  disabled={!can(role, "decide") || (needsSupervisor && true)}
                  onClick={() => act("Block")}
                >
                  Accept &amp; Block
                </Button>
                <Button variant="outline" disabled={!can(role, "acceptRecommendation")} onClick={() => act("Unblock")}>
                  Accept &amp; Unblock
                </Button>
                <Button disabled={!can(role, "acceptRecommendation")} onClick={() => act("Further Investigation")}>
                  Send for Further Investigation
                </Button>
                {can(role, "override") && (
                  <Button variant="secondary" disabled={reason.trim().length === 0} onClick={() => act("Unblock")}>
                    Supervisor override
                  </Button>
                )}
              </div>
              {needsSupervisor && (
                <p className="text-xs text-destructive">
                  Very-high risk blocks require Supervisor approval — switch role to Supervisor to approve.
                </p>
              )}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
