import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { CategoryBadge, formatDateTime } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useEDD } from "@/lib/edd-store";
import { Link } from "@tanstack/react-router";
import { findLinked, identifiersOfNegbase } from "@/lib/entity-links";

export const Route = createFileRoute("/negative-database")({
  head: () => ({
    meta: [
      { title: "Negative Database — EDSquare" },
      { name: "description", content: "Search known scam UPI handles, mobiles, accounts and domains with source evidence and linked identifiers." },
      { property: "og:title", content: "Negative Database — EDSquare" },
      { property: "og:description", content: "Look up scam identifiers and attach evidence to an open EDD case." },
    ],
  }),
  component: NegativeDatabasePage,
});

function NegativeDatabasePage() {
  const { negbase, cases, alerts, enforcement, attachEvidence, role } = useEDD();
  const linkedCount = (r: (typeof negbase)[number]) => findLinked(identifiersOfNegbase(r), { cases, alerts, negbase: [], enforcement }).cases.filter((m) => m.strength === "strong").length;
  const [query, setQuery] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [attachTo, setAttachTo] = useState<string>("");

  const rows = negbase.filter((r) =>
    [r.identifier, r.category, r.source, ...r.associated].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  const detail = negbase.find((r) => r.id === detailId);
  const openCases = cases.filter((c) => c.stage !== "Closed");

  const counts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Negative Database"
        description="Consolidated intelligence on identifiers linked to betting, gambling and digital-scam collection."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          className="max-w-md"
          placeholder="Search UPI handle, mobile, account, name or domain…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(counts).map(([category, count]) => (
          <Card key={category}>
            <CardContent className="py-4">
              <p className="text-2xl font-semibold">{count}</p>
              <p className="text-xs text-muted-foreground">{category}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Results ({rows.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identifier</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>First seen</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead>Associated</TableHead>
                <TableHead>Linked cases</TableHead>
                <TableHead className="text-right">Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.identifier}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.kind}</TableCell>
                  <TableCell><CategoryBadge category={r.category} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.source}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(r.firstSeen)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDateTime(r.lastSeen)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.associated.join(", ")}</TableCell>
                  <TableCell className="text-sm"><Link to="/lookup" search={{ q: r.identifier }} className="text-primary hover:underline">{linkedCount(r)} · Network</Link></TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => setDetailId(r.id)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetailId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{detail?.identifier}</DialogTitle>
            <DialogDescription>{detail?.category} · {detail?.source}</DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{detail.evidence}</p>
              {detail.website && <p><span className="text-muted-foreground">Website: </span>{detail.website}</p>}
              {detail.gateway && <p><span className="text-muted-foreground">Payment gateway: </span>{detail.gateway}</p>}
              <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                Screenshot evidence (captured {formatDateTime(detail.lastSeen)})
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={attachTo} onValueChange={setAttachTo}>
                  <SelectTrigger className="w-56"><SelectValue placeholder="Attach to open case" /></SelectTrigger>
                  <SelectContent>
                    {openCases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.id} · {c.customer}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  disabled={!attachTo || role === "auditor"}
                  onClick={() => { attachEvidence(attachTo, detail.identifier); setDetailId(null); }}
                >
                  Attach evidence
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
