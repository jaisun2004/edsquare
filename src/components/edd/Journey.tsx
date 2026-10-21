import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { alertJourney, countResults, type AlertResult, type Journey, type StepState } from "@/lib/alert-journey";
import { useEDD } from "@/lib/edd-store";

const dot: Record<StepState, string> = {
  red: "bg-destructive",
  amber: "bg-warning",
  green: "bg-success",
  skip: "bg-muted",
  pending: "border border-dashed border-muted-foreground bg-background",
};

export const resultCls: Record<AlertResult, string> = {
  New: "border-primary/40 text-primary",
  "Case open": "border-warning text-warning",
  Blocked: "border-destructive bg-destructive/10 text-destructive",
  Unblocked: "border-success bg-success/10 text-success",
  Verified: "border-success bg-success/10 text-success",
  Dismissed: "border-border text-muted-foreground",
};
export const resultLabel: Record<AlertResult, string> = {
  New: "New", "Case open": "Case open", Blocked: "Blocked", Unblocked: "Unblocked", Verified: "Unblocked: verified", Dismissed: "Dismissed",
};

export const ResultBadge = ({ r }: { r: AlertResult }) => <Badge variant="outline" className={resultCls[r]}>{resultLabel[r]}</Badge>;

export function JourneyDots({ j, labels = false }: { j: Journey; labels?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {j.steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1" title={`${s.label}: ${s.detail}`}>
          {i > 0 && <span className="h-px w-3 bg-border" />}
          <span className={cn("h-2.5 w-2.5 rounded-full", dot[s.state])} />
          {labels && <span className="text-xs text-muted-foreground">{s.label}</span>}
        </div>
      ))}
    </div>
  );
}

export function JourneyStrip({ j }: { j: Journey }) {
  return (
    <div className="grid gap-2 sm:grid-cols-5">
      {j.steps.map((s) => (
        <div key={s.key} className="flex items-start gap-2 rounded-md border border-border p-2">
          <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", dot[s.state])} />
          <div className="min-w-0"><p className="text-xs font-medium">{s.label}</p><p className="truncate text-xs text-muted-foreground">{s.detail}</p></div>
        </div>
      ))}
    </div>
  );
}

export function useJourneys() {
  const { alerts, cases, enforcement, demoRuns } = useEDD();
  return alerts.map((a) => ({ alert: a, j: alertJourney(a, cases, enforcement, demoRuns) }));
}

/** Alert-to-outcome funnel shared by Dashboard, Alerts and Outcomes. */
export function AlertFunnel({ onPick, active }: { onPick?: (r: AlertResult | "all") => void; active?: AlertResult | "all" }) {
  const js = useJourneys();
  const n = countResults(js.map((x) => x.j));
  const steps: { key: AlertResult | "all"; label: string; value: number }[] = [
    { key: "all", label: "Alerts received", value: js.length },
    { key: "New", label: "Awaiting triage", value: n.New },
    { key: "Verified", label: "Cleared by customer", value: n.Verified },
    { key: "Case open", label: "Case open", value: n["Case open"] },
    { key: "Blocked", label: "Blocked", value: n.Blocked },
    { key: "Unblocked", label: "Unblocked", value: n.Unblocked },
    { key: "Dismissed", label: "Dismissed", value: n.Dismissed },
  ];
  return (
    <Card>
      <CardHeader className="pb-2"><CardTitle className="text-sm">Alert to outcome</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {steps.map((s) => (
          <button
            key={s.key}
            type="button"
            disabled={!onPick}
            onClick={() => onPick?.(s.key)}
            className={cn("rounded-md border border-border p-3 text-left transition-colors", onPick && "hover:bg-muted", active === s.key && "border-primary bg-primary/5")}
          >
            <p className="text-xl font-semibold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
