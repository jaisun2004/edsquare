import { Link, createFileRoute } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEDD } from "@/lib/edd-store";
import { ago, fmt } from "@/routes/admin.sources.index";

export const Route = createFileRoute("/admin/sources/$sourceId")({
  head: ({ params }) => ({
    meta: [
      { title: `Data source ${params.sourceId} — EDSquare` },
      { name: "description", content: "Connection, field mapping, sample payload, sync history and dependent rules." },
      { property: "og:title", content: `Data source ${params.sourceId} — EDSquare` },
      { property: "og:description", content: "Data-source detail for the EDSquare Decision Manager." },
    ],
  }),
  component: SourceDetail,
});

function SourceDetail() {
  const { sourceId } = Route.useParams();
  const { sources, attributes, rules, role, toggleSource, syncSource } = useEDD();
  const s = sources.find((x) => x.id === sourceId);
  if (!s) return <p className="text-sm text-muted-foreground">Source not found. <Link to="/admin/sources" className="text-primary">Back</Link></p>;
  const fields = attributes.filter((a) => a.sourceId === s.id);
  const dependent = rules.filter((r) => r.status !== "Retired" && r.conditions.conditions.some((c) => fields.some((f) => f.key === c.attr)));

  return (
    <div className="space-y-4">
      <Link to="/admin/sources" className="text-sm text-muted-foreground hover:text-foreground">← All data sources</Link>
      <Card>
        <CardContent className="flex flex-wrap items-start justify-between gap-4 pt-6">
          <div>
            <p className="text-lg font-semibold">{s.name}</p>
            <p className="text-sm text-muted-foreground">{s.description}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Badge variant="outline">{s.category}</Badge><Badge variant="outline">{s.connector}</Badge><Badge variant="outline">{s.auth}</Badge><Badge variant="outline">{s.schedule}</Badge>
              <Badge variant="outline">{s.status ? s.health : "Off"}</Badge>
            </div>
            <p className="mt-2 font-mono text-xs text-muted-foreground">{s.endpoint}</p>
          </div>
          {s.connector !== "Computed" && (
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled={role !== "admin" || !s.status} onClick={() => syncSource(s.id)}><RefreshCw className="size-4" /> Sync now</Button>
              <Switch checked={s.status} disabled={role !== "admin"} onCheckedChange={() => toggleSource(s.id)} aria-label="Source enabled" />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Field mapping</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Source field</TableHead><TableHead>Attribute</TableHead><TableHead>Type</TableHead></TableRow></TableHeader>
              <TableBody>
                {s.fields.map((f) => {
                  const a = attributes.find((x) => x.key === f.attribute);
                  return (
                    <TableRow key={f.attribute}>
                      <TableCell className="font-mono text-xs">{f.sourceField}</TableCell>
                      <TableCell><p className="text-sm">{a?.label}</p><p className="font-mono text-xs text-muted-foreground">{f.attribute}</p></TableCell>
                      <TableCell className="text-sm">{a?.type}{a?.pii ? " · PII" : ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Sample payload</CardTitle></CardHeader>
          <CardContent><pre className="overflow-x-auto rounded-md bg-secondary p-3 text-xs">{JSON.stringify(s.samplePayload, null, 2)}</pre></CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Rules using this source ({dependent.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {dependent.length === 0 && <p className="text-muted-foreground">No rules use this source yet.</p>}
            {dependent.map((r) => (
              <p key={r.id}><Link to="/admin/rules/$ruleId" params={{ ruleId: r.id }} className="text-primary hover:underline">{r.id}</Link> · {r.name}</p>
            ))}
            {!s.status && dependent.length > 0 && <p className="pt-2 text-xs text-destructive">Source is off — these rules cannot fire.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Sync history · {fmt(s.records)} records</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>When</TableHead><TableHead>Records</TableHead><TableHead>Status</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
              <TableBody>
                {s.syncHistory.slice(0, 8).map((h, i) => (
                  <TableRow key={i}><TableCell className="text-sm">{ago(h.at)}</TableCell><TableCell>{h.records}</TableCell><TableCell><Badge variant="outline">{h.status}</Badge></TableCell><TableCell>{h.durationSec}s</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
