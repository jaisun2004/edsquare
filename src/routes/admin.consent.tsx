import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { formatDateTime } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { consentTemplates } from "@/data/edd";

const bodies: Record<string, string> = {
  "CT-1":
    "We may collect and process additional information about you — including telecom, device and publicly available data — to verify the legitimacy of transactions on your account, in line with the Digital Personal Data Protection Act, 2023. Processing is limited to fraud prevention and regulatory obligations.",
  "CT-2":
    "This call may be recorded for verification, quality and regulatory record-keeping. Recordings are retained for the period required by applicable regulation and accessed only by authorised investigation personnel.",
  "CT-3":
    "Investigation records, enrichment data and decision rationale are retained for the statutory retention period applicable to financial crime records, after which they are securely deleted or anonymised.",
};

export const Route = createFileRoute("/admin/consent")({
  head: () => ({
    meta: [
      { title: "Consent Templates — Sentinel EDD" },
      { name: "description", content: "DPDP notices and consent templates used during enrichment and customer engagement." },
      { property: "og:title", content: "Consent Templates — Sentinel EDD" },
      { property: "og:description", content: "Versioned DPDP notices, call recording consent and retention disclosures." },
    ],
  }),
  component: ConsentPage,
});

function ConsentPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const active = consentTemplates.find((c) => c.id === openId) ?? null;

  return (
    <>
      <Card>
        <CardContent className="divide-y divide-border py-2 text-sm">
          {consentTemplates.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="font-medium text-foreground">{c.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{c.version} · updated {formatDateTime(c.updated)}</span>
                <Button variant="outline" size="sm" onClick={() => setOpenId(c.id)}>Preview</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.name}</DialogTitle>
            <DialogDescription>
              {active?.version} · updated {active ? formatDateTime(active.updated) : ""} · read-only
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm leading-relaxed text-muted-foreground">{active ? bodies[active.id] : ""}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
