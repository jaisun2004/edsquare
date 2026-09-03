import { createFileRoute } from "@tanstack/react-router";

import { PageHeader } from "@/components/layout/AppShell";
import { formatDateTime } from "@/components/edd/chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RISK_BANDS, consentTemplates, integrations, users } from "@/data/edd";
import { useEDD } from "@/lib/edd-store";
import { roleLabels } from "@/lib/roles";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Administration — Sentinel EDD" },
      { name: "description", content: "Configure rules and thresholds, integrations, users and roles, and DPDP consent templates." },
      { property: "og:title", content: "Administration — Sentinel EDD" },
      { property: "og:description", content: "Rule catalogue, risk bands, integrations and consent configuration." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { rules, toggleRule, role } = useEDD();

  return (
    <div>
      <PageHeader title="Administration" description="Decision Manager configuration and platform governance." />

      <Tabs defaultValue="rules">
        <TabsList className="flex-wrap">
          <TabsTrigger value="rules">Rules &amp; thresholds</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="users">Users &amp; roles</TabsTrigger>
          <TabsTrigger value="consent">Consent templates</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Risk bands</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              {RISK_BANDS.map((b) => (
                <Badge key={b.grade} variant="outline">{b.grade} · {b.label} · {b.range}</Badge>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rule</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead>Threshold</TableHead>
                    <TableHead>Weight</TableHead>
                    <TableHead className="text-right">Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.id}</TableCell>
                      <TableCell>{r.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.family}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.threshold}</TableCell>
                      <TableCell>{r.weight}</TableCell>
                      <TableCell className="text-right">
                        <Switch checked={r.active} disabled={role !== "admin"} onCheckedChange={() => toggleRule(r.id)} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="mt-4">
          <Card>
            <CardContent className="divide-y divide-border py-2">
              {integrations.map((i) => (
                <div key={i.id} className="flex items-center justify-between py-3 text-sm">
                  <span>{i.name}</span>
                  <Switch defaultChecked={i.status} disabled={role !== "admin"} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{roleLabels[u.role]}</TableCell>
                      <TableCell><Badge variant="outline">{u.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="consent" className="mt-4">
          <Card>
            <CardContent className="divide-y divide-border py-2 text-sm">
              {consentTemplates.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.version} · updated {formatDateTime(c.updated)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
