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

/** Prior case history check shown in the simulator before a run (snapshot taken when account/phone change). */
export function PriorHistory({ account, phone }: { account: string; phone?: string | undefined }) {
  const { cases, alerts, negbase, enforcement } = useEDD();
  const summary = useMemo(() => {
    const q: Ident[] = [{ kind: "account", value: normalizeIdentifier("account", account) }];
    const p = phone ? normalizeIdentifier("phone", phone) : "";
    if (p.length === 10) q.push({ kind: "phone", value: p });
    return summarise(findLinked(q.filter((i) => i.value), { cases, alerts, negbase: [], enforcement }), enforcement);
    // Snapshot: a case created by this run must not count as its own history.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, phone, cases.length === 0]);
  const pts = priorHistoryPoints(summary);
  return (
    <div className="space-y-1">
      <HistoryStrip summary={summary} query={account} compact />
      {pts > 0 && <p className="px-1 text-xs text-destructive">Prior case history: {summary.blocked} earlier block{summary.blocked > 1 ? "s" : ""} on this account/phone (+{pts} risk points for the reviewer).</p>}
    </div>
  );
}
