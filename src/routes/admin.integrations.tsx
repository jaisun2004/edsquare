import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { integrations } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";

const descriptions: Record<string, string> = {
  "INT-1": "Pushes block and unblock instructions to the core banking platform.",
  "INT-2": "Queries the internal Negative Database for identifier matches.",
  "INT-3": "Retrieves SIM vintage, connection type and circle for a mobile number.",
  "INT-4": "Places outbound verification calls and returns transcripts and outcomes.",
  "INT-5": "Sends templated customer outreach messages over WhatsApp.",
  "INT-6": "Streams adverse media and OSINT signals into enrichment.",
};

export const Route = createFileRoute("/admin/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — Sentinel EDD" },
      { name: "description", content: "Enable or disable core banking, Negative Database, telco, OSINT and engagement integrations." },
      { property: "og:title", content: "Integrations — Sentinel EDD" },
      { property: "og:description", content: "Connected services powering enrichment, engagement and enforcement." },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const { role } = useEDD();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {integrations.map((i) => (
        <Card key={i.id}>
          <CardContent className="flex items-start justify-between gap-4 pt-6">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">{i.name}</p>
                <Badge variant="outline">{i.status ? "Connected" : "Disabled"}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{descriptions[i.id] ?? "Platform integration."}</p>
            </div>
            <Switch defaultChecked={i.status} disabled={role !== "admin"} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
