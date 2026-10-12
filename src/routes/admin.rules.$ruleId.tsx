import { Link, createFileRoute } from "@tanstack/react-router";

import { RuleEditor } from "@/components/edd/RuleEditor";
import { useEDD } from "@/lib/edd-store";

export const Route = createFileRoute("/admin/rules/$ruleId")({
  head: ({ params }) => ({
    meta: [
      { title: `Rule ${params.ruleId} — EDSquare` },
      { name: "description", content: `Edit, test and version Decision Manager rule ${params.ruleId}.` },
      { property: "og:title", content: `Rule ${params.ruleId} — EDSquare` },
      { property: "og:description", content: "Rule conditions, sample-alert testing, smart checks and version history." },
    ],
  }),
  component: RuleDetail,
});

function RuleDetail() {
  const { ruleId } = Route.useParams();
  const { rules } = useEDD();
  const rule = rules.find((r) => r.id === ruleId);
  return (
    <div className="space-y-3">
      <Link to="/admin/rules" className="text-sm text-muted-foreground hover:text-foreground">← All rules</Link>
      {rule ? <RuleEditor key={`${rule.id}-${rule.version}`} initial={rule} /> : <p className="text-sm text-muted-foreground">Rule {ruleId} not found.</p>}
    </div>
  );
}
