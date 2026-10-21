import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/AppShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkbookFlow } from "@/components/edd/WorkbookFlow";
import { ClassicSimulator } from "@/components/edd/ClassicSimulator";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Demo Simulator — EDSquare" },
      { name: "description", content: "Run I4C complaints and model alerts through EDSquare's data checks, voice bot, WhatsApp questionnaire and human review." },
      { property: "og:title", content: "Demo Simulator — EDSquare" },
      { property: "og:description", content: "Run sample I4C and model alerts end-to-end through EDSquare." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { alert?: string } => (typeof s.alert === "string" ? { alert: s.alert } : {}),
  component: Simulator,
});

function Simulator() {
  const { alert } = Route.useSearch();
  return (
    <div className="space-y-6">
      <PageHeader title="Demo Simulator" description="Run sample alerts through EDSquare step by step." />
      <Tabs defaultValue="workbook">
        <TabsList>
          <TabsTrigger value="workbook">I4C & Model alert flow</TabsTrigger>
          <TabsTrigger value="classic">Transaction pipeline</TabsTrigger>
        </TabsList>
        <TabsContent value="workbook" className="mt-4"><WorkbookFlow key={alert ?? "default"} initialAlert={alert} /></TabsContent>
        <TabsContent value="classic" className="mt-4"><ClassicSimulator /></TabsContent>
      </Tabs>
    </div>
  );
}
