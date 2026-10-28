import { useMemo } from "react";
import type { EDDCase } from "@/data/edd";
import { ChevronRight } from "lucide-react";
import { STEP_LABELS, feedOf, type FeedFlow, type FeedId, type FlowStep, type StepKind } from "@/data/ops-config";
import { useJourneys } from "@/components/edd/Journey";
import { useEDD } from "@/lib/edd-store";

export interface CaseFeedRow { c: EDDCase; feed: FeedId; riskScore: number; slaDueAt: string; openedAt: string }

/** Open cases tagged with the feed of the alert that created them (fallback: same account, then case category). */
export function useCaseFeeds(includeClosed = false): CaseFeedRow[] {
  const { cases } = useEDD();
  const js = useJourneys();
  return useMemo(() => {
    const map = new Map<string, FeedId>();
    const byAccount = new Map<string, FeedId>();
    for (const { alert, j } of js) {
      const id = alert.caseId ?? j.caseItem?.id;
      if (id) map.set(id, feedOf(alert));
      byAccount.set(alert.account, feedOf(alert));
    }
    const byCategory = (c: EDDCase): FeedId =>
      c.category === "Betting" || c.category === "Gambling" ? "NEGBASE" : c.category === "Mule" ? "NPCI" : c.category === "Carding" ? "MODEL" : "I4C";
    return cases
      .filter((c) => includeClosed || c.stage !== "Closed")
      .map((c) => ({ c, feed: map.get(c.id) ?? byAccount.get(c.account) ?? byCategory(c), riskScore: c.riskScore, slaDueAt: c.slaDueAt, openedAt: c.openedAt }));
  }, [cases, js, includeClosed]);
}

const channelKinds: StepKind[] = ["voice", "whatsapp", "email_app"];

export function FlowPreview({ flow }: { flow: FeedFlow }) {
  const steps = flow.steps.filter((s) => s.enabled);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((s, i) => (
        <span key={s.id} className="flex items-center gap-1.5">
          <span className={`rounded-md border px-2 py-1 text-xs ${channelKinds.includes(s.kind) ? "border-primary/40 bg-primary/10 text-foreground" : "border-border bg-muted/50"}`}>
            <span className="mr-1 text-muted-foreground">{i + 1}.</span>{STEP_LABELS[s.kind]}
            {s.trigger !== "always" && <span className="ml-1 text-muted-foreground">· {triggerShort(s)}</span>}
          </span>
          {i < steps.length - 1 && <ChevronRight className="size-3 text-muted-foreground" />}
        </span>
      ))}
    </div>
  );
}

function triggerShort(s: FlowStep) {
  if (s.trigger === "prev_no_response") return "if no response";
  if (s.trigger === "prev_red") return "if not clean";
  if (s.trigger === "amount_gte") return `if ≥ Rs ${(s.amount ?? 0).toLocaleString("en-IN")}`;
  if (s.trigger === "amount_lt") return `if < Rs ${(s.amount ?? 0).toLocaleString("en-IN")}`;
  return "";
}

