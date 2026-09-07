import { createFileRoute } from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { users } from "@/data/edd";
import { roleLabels } from "@/lib/roles";

const capabilities: { role: keyof typeof roleLabels; summary: string }[] = [
  { role: "analyst", summary: "Run triage, accept recommendations, engage customers, draft rationale." },
  { role: "investigator", summary: "All analyst rights plus decide cases and assign work." },
  { role: "supervisor", summary: "Approve Very High decisions, override recommendations, view audit trail." },
  { role: "admin", summary: "Configure rules, integrations and users; view audit trail." },
  { role: "auditor", summary: "Read-only access across every surface." },
];

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Users & Roles — EDSquare" },
      { name: "description", content: "Platform users, their assigned EDD roles and what each role is permitted to do." },
      { property: "og:title", content: "Users & Roles — EDSquare" },
      { property: "og:description", content: "Role assignments and the permission model behind EDD decisions." },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  return (
    <div className="space-y-4">
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

      <Card>
        <CardHeader><CardTitle className="text-sm">Role capabilities</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border py-0 text-sm">
          {capabilities.map((c) => (
            <div key={c.role} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
              <span className="font-medium text-foreground">{roleLabels[c.role]}</span>
              <span className="text-muted-foreground">{c.summary}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
