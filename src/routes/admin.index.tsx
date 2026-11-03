import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FEEDS, PRESETS, STEP_LABELS } from "@/data/ops-config";
import { activeSets, bandText, healthWarnings, ruleSources } from "@/lib/decision-graph";
import { useEDD } from "@/lib/edd-store";
import { useOpsConfig } from "@/lib/ops-config-store";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Decision Manager overview — EDSquare" },
      { name: "description", content: "See how data sources, rules, policy, workflows and queues connect for each alert source." },
      { property: "og:title", content: "Decision Manager overview — EDSquare" },
      { property: "og:description", content: "One map from data source to queue for every alert source." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Overview,
});

function Box({ to, title, children }: { to: "/admin/sources" | "/admin/policy" | "/admin/workflows" | "/admin/queue" | "/admin/rules"; title: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="block min-w-40 flex-1 rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary hover:bg-accent/40">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="space-y-1 text-xs">{children}</div>
    </Link>
  );
}
const Arrow = () => <ChevronRight className="hidden size-4 shrink-0 self-center text-muted-foreground md:block" />;

function Overview() {
  const { flows, queue } = useOpsConfig();
  const { rules, ruleSets, ruleGroups, attributes, sources } = useEDD();
  const warnings = healthWarnings(flows, rules, ruleGroups, ruleSets, attributes, sources);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-5 text-sm text-muted-foreground">
          Every alert follows one chain: <b className="text-foreground">data source → workflow blocks → policy rules → score bands → outcome → queue</b>.
          Click any box to change that part. Changes show up in the Demo Simulator on the next run.
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Things to check ({warnings.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {warnings.map((w, i) => (
              <Link key={i} to={w.to} className="flex items-center gap-2 text-sm hover:underline">
                {w.level === "warn" ? <AlertTriangle className="size-4 text-destructive" /> : <Info className="size-4 text-muted-foreground" />}
                {w.text}
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {FEEDS.map((feed) => {
        const f = flows.find((x) => x.feed === feed.id)!;
        const setIds = activeSets(f);
        const sets = ruleSets.filter((s) => setIds.includes(s.id)).sort((a, b) => a.order - b.order);
        const groupIds = ruleGroups.filter((g) => setIds.includes(g.setId)).map((g) => g.id);
        const fr = rules.filter((r) => r.active && groupIds.includes(r.groupId));
        const srcIds = new Set(fr.flatMap((r) => ruleSources(r, attributes)));
        const srcs = sources.filter((s) => srcIds.has(s.id));
        const q = queue.perFeed[feed.id];
        return (
          <Card key={feed.id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">{feed.name}<Badge variant="outline">{f.desk}</Badge><Badge variant="secondary">SLA {f.slaMin} min</Badge></CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 md:flex-row">
              <Box to="/admin/sources" title={`Data sources (${srcs.length})`}>
                {srcs.slice(0, 4).map((s) => <p key={s.id} className="truncate">{s.name}</p>)}
                {srcs.length > 4 && <p className="text-muted-foreground">+{srcs.length - 4} more</p>}
                {!srcs.length && <p className="text-muted-foreground">None used</p>}
              </Box>
              <Arrow />
              <Box to="/admin/workflows" title="Workflow">
                {f.blocks.filter((b) => b.enabled).map((b, i) => (
                  <p key={b.id} className="truncate"><span className="text-muted-foreground">{i + 1}.</span> {b.name} <span className="text-muted-foreground">({b.steps.filter((s) => s.enabled).map((s) => STEP_LABELS[s.kind]).join(", ")})</span></p>
                ))}
              </Box>
              <Arrow />
              <Box to="/admin/policy" title={`Policy · ${fr.length} rules`}>
                {sets.map((s) => <p key={s.id}>{s.name}</p>)}
                {!sets.length && <p className="text-destructive">No rule set linked</p>}
              </Box>
              <Arrow />
              <Box to="/admin/workflows" title="Score bands">
                <p>{bandText(f)}</p>
                <p className="text-muted-foreground">+{f.decision.thresholds.unansweredPoints} per unanswered</p>
              </Box>
              <Arrow />
              <Box to="/admin/queue" title="Queue">
                <p>{f.desk}</p>
                <p className="text-muted-foreground">{q.preset === "custom" ? "Custom ordering" : PRESETS[q.preset].label}</p>
                <p className="text-muted-foreground">{q.distribution.members.length} people · {q.escalation.length} escalation step(s)</p>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
