import { useMemo } from "react";
import type { EDDCase } from "@/data/edd";
import { feedOf, type FeedId } from "@/data/ops-config";
import { useJourneys } from "@/components/edd/Journey";
import { useEDD } from "@/lib/edd-store";

export interface CaseFeedRow { c: EDDCase; feed: FeedId; riskScore: number; slaDueAt: string; openedAt: string }

/** Open cases tagged with the feed of the alert that created them (default: bank model). */
export function useCaseFeeds(includeClosed = false): CaseFeedRow[] {
  const { cases } = useEDD();
  const js = useJourneys();
  return useMemo(() => {
    const map = new Map<string, FeedId>();
    for (const { alert, j } of js) {
      const id = alert.caseId ?? j.caseItem?.id;
      if (id) map.set(id, feedOf(alert));
    }
    return cases
      .filter((c) => includeClosed || c.stage !== "Closed")
      .map((c) => ({ c, feed: map.get(c.id) ?? "MODEL", riskScore: c.riskScore, slaDueAt: c.slaDueAt, openedAt: c.openedAt }));
  }, [cases, js, includeClosed]);
}
