import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { EnforcementBody } from "@/components/edd/pages/EnforcementBody";
import { EngagementBody } from "@/components/edd/pages/EngagementBody";
import { ReportsBody } from "@/components/edd/pages/ReportsBody";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TABS = ["overview", "enforcement", "engagement"] as const;
type Tab = (typeof TABS)[number];

export const Route = createFileRoute("/outcomes")({
  validateSearch: (s: Record<string, unknown>): { tab?: Tab } =>
    TABS.includes(s.tab as Tab) ? { tab: s.tab as Tab } : {},
  head: () => ({
    meta: [
      { title: "Outcomes & Reports — EDSquare" },
      { name: "description", content: "Alert-to-outcome funnel, block and unblock log, customer engagement results and programme reports." },
      { property: "og:title", content: "Outcomes & Reports — EDSquare" },
      { property: "og:description", content: "See which alerts were blocked, cleared or are still under review." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OutcomesPage,
});

function OutcomesPage() {
  const { tab = "overview" } = Route.useSearch();
  const navigate = useNavigate({ from: "/outcomes" });
  return (
    <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as Tab } })}>
      <TabsList className="mb-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="enforcement">Enforcement log</TabsTrigger>
        <TabsTrigger value="engagement">Engagement</TabsTrigger>
      </TabsList>
      <TabsContent value="overview"><ReportsBody /></TabsContent>
      <TabsContent value="enforcement"><EnforcementBody /></TabsContent>
      <TabsContent value="engagement"><EngagementBody /></TabsContent>
    </Tabs>
  );
}
