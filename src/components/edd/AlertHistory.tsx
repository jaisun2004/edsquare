import { useMemo } from "react";

import { HistoryStrip } from "@/components/edd/LinkedHistory";
import type { Alert } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";
import { alertHistory, findLinked, normalizeIdentifier, priorHistoryPoints, summarise, type Ident } from "@/lib/entity-links";

/** "Seen before" strip for the alert drawer. */
export function AlertHistoryStrip({ alert }: { alert: Alert }) {
  const { cases, alerts, negbase, enforcement } = useEDD();
  const { summary } = useMemo(() => alertHistory(alert, { cases, alerts, negbase, enforcement }), [alert, cases, alerts, negbase, enforcement]);
  return <HistoryStrip summary={summary} query={alert.account} />;
}

/** Case history shown in the simulator results once a run finishes; the run's own case is excluded. */
export function PriorHistory({ account, excludeCaseId }: { account: string; excludeCaseId?: string | undefined }) {
  const { cases, alerts, enforcement } = useEDD();
  const summary = useMemo(() => {
    const q: Ident[] = [{ kind: "account", value: normalizeIdentifier("account", account) }];
    return summarise(findLinked(q.filter((i) => i.value), { cases, alerts, negbase: [], enforcement }, { excludeCaseId }), enforcement);
  }, [account, excludeCaseId, cases, alerts, enforcement]);
  if (!summary.priorCases && !summary.possible) return <p className="text-muted-foreground">No earlier cases for this account.</p>;
  const pts = priorHistoryPoints(summary);
  return (
    <div className="space-y-1">
      <HistoryStrip summary={summary} query={account} />
      {pts > 0 && <p className="px-1 text-destructive">{summary.blocked} earlier block{summary.blocked > 1 ? "s" : ""} on this account (+{pts} risk points for the reviewer).</p>}
    </div>
  );
}
