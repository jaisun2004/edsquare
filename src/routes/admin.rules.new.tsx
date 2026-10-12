import { Link, createFileRoute } from "@tanstack/react-router";

import { RuleEditor } from "@/components/edd/RuleEditor";

export const Route = createFileRoute("/admin/rules/new")({
  head: () => ({
    meta: [
      { title: "New Rule — EDSquare" },
      { name: "description", content: "Describe a rule in plain English or build it visually from connected data attributes." },
      { property: "og:title", content: "New Rule — EDSquare" },
      { property: "og:description", content: "AI-assisted rule builder for the EDSquare Decision Manager." },
    ],
  }),
  component: () => (
    <div className="space-y-3">
      <Link to="/admin/rules" className="text-sm text-muted-foreground hover:text-foreground">← All rules</Link>
      <RuleEditor />
    </div>
  ),
});
