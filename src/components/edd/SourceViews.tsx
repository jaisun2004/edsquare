import { useMemo } from "react";
import type { EDDCase } from "@/data/edd";
import { ChevronRight } from "lucide-react";
import { STEP_LABELS, feedOf, type FeedFlow, type FeedId, type FlowStep, type StepKind } from "@/data/ops-config";
import { useJourneys } from "@/components/edd/Journey";
import { useEDD } from "@/lib/edd-store";
import { amountAtRisk } from "@/lib/dashboard-metrics";
import type { Alert } from "@/data/edd";

export interface CaseFeedRow { c: EDDCase; feed: FeedId; riskScore: number; slaDueAt: string; openedAt: string; amount: number; negHits: number; assignee: string; grade: EDDCase["grade"] }

/** Open cases tagged with the feed of the alert that created them (fallback: same account, then case category). */
export function useCaseFeeds(includeClosed = false): CaseFeedRow[] {
  const { cases } = useEDD();
  const js = useJourneys();
  return useMemo(() => {
    const map = new Map<string, FeedId>();
    const byAccount = new Map<string, FeedId>();
    const alertOf = new Map<string, Alert>();
    for (const { alert, j } of js) {
      const id = alert.caseId ?? j.caseItem?.id;
      if (id) { map.set(id, feedOf(alert)); alertOf.set(id, alert); }
      byAccount.set(alert.account, feedOf(alert));
    }
    const byCategory = (c: EDDCase): FeedId =>
      c.category === "Betting" || c.category === "Gambling" ? "NEGBASE" : c.category === "Mule" ? "NPCI" : c.category === "Carding" ? "MODEL" : "I4C";
    return cases
      .filter((c) => includeClosed || c.stage !== "Closed")
      .map((c) => ({ c, feed: map.get(c.id) ?? byAccount.get(c.account) ?? byCategory(c), riskScore: c.riskScore, slaDueAt: c.slaDueAt, openedAt: c.openedAt,
        amount: amountAtRisk(alertOf.get(c.id), c), negHits: c.enrichment?.negbaseAttributes?.length ?? 0, assignee: c.assignee, grade: c.grade }));
  }, [cases, js, includeClosed]);
}

const channelKinds: StepKind[] = ["voice", "whatsapp", "email_app"];

export function FlowPreview({ flow }: { flow: FeedFlow }) {
  const blocks = flow.blocks.filter((b) => b.enabled && b.steps.some((s) => s.enabled));
  let n = 0;
  return (
    <div className="flex flex-wrap items-stretch gap-1.5">
      {blocks.map((b, i) => (
        <span key={b.id} className="flex items-center gap-1.5">
          <span className="rounded-lg border border-border bg-background p-1.5">
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Block {i + 1} · {b.name}{b.trigger !== "always" && <span className="normal-case"> · {triggerShort(b)}</span>}
            </span>
            <span className="flex flex-wrap gap-1">
              {b.steps.filter((s) => s.enabled).map((s) => (
                <span key={s.id} className={`rounded-md border px-2 py-1 text-xs ${channelKinds.includes(s.kind) ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-muted/50"}`}>
                  <span className="mr-1 text-muted-foreground">{++n}.</span>{STEP_LABELS[s.kind]}
                  {s.trigger !== "always" && <span className="ml-1 text-muted-foreground">· {triggerShort(s)}</span>}
                </span>
              ))}
            </span>
          </span>
          {i < blocks.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

function triggerShort(s: { trigger: FlowStep["trigger"]; amount?: number }) {
  if (s.trigger === "prev_no_response") return "if no response";
  if (s.trigger === "prev_red") return "if not clean";
  if (s.trigger === "prev_failed") return "if previous failed";
  if (s.trigger === "amount_gte") return `if ≥ Rs ${(s.amount ?? 0).toLocaleString("en-IN")}`;
  if (s.trigger === "amount_lt") return `if < Rs ${(s.amount ?? 0).toLocaleString("en-IN")}`;
  return "";
}
