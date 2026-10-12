import { Link, createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AttrType, Attribute, Connector, DataSource, SourceCategory } from "@/data/sources";
import { useEDD } from "@/lib/edd-store";
import { ago } from "@/lib/format";

export const Route = createFileRoute("/admin/sources/")({
  head: () => ({
    meta: [
      { title: "Data Sources — EDSquare" },
      { name: "description", content: "Plug Govt/LEA, external, bank-system and alternate data sources into the Decision Manager." },
      { property: "og:title", content: "Data Sources — EDSquare" },
      { property: "og:description", content: "Data-source registry, field mapping and the attribute catalogue used by rules." },
    ],
  }),
  component: SourcesPage,
});

const CATEGORIES: SourceCategory[] = ["Govt / LEA", "External", "Bank systems", "Alternate data", "Platform"];
const healthClass = { Healthy: "text-success", Degraded: "text-warning", Down: "text-destructive" } as const;


function SourcesPage() {
  const { sources, attributes, rules, role, toggleSource } = useEDD();
  const [open, setOpen] = useState(false);
  const usedBy = (key: string) => rules.filter((r) => r.status !== "Retired" && r.conditions.conditions.some((c) => c.attr === key));

  return (
    <Tabs defaultValue="sources" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="sources">Sources ({sources.length})</TabsTrigger>
          <TabsTrigger value="catalogue">Field catalogue ({attributes.length})</TabsTrigger>
        </TabsList>
        {role === "admin" && <Button onClick={() => setOpen(true)}><Plus className="size-4" /> Add data source</Button>}
      </div>

      <TabsContent value="sources" className="space-y-6">
        {CATEGORIES.map((cat) => {
          const list = sources.filter((s) => s.category === cat);
          if (!list.length) return null;
          return (
            <section key={cat} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{cat}</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((s) => {
                  const fields = attributes.filter((a) => a.sourceId === s.id);
                  const ruleCount = new Set(fields.flatMap((f) => usedBy(f.key).map((r) => r.id))).size;
                  return (
                    <Card key={s.id} className={s.status ? "" : "opacity-60"}>
                      <CardContent className="space-y-3 pt-6">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <Link to="/admin/sources/$sourceId" params={{ sourceId: s.id }} className="text-sm font-medium text-foreground hover:text-primary">{s.name}</Link>
                            <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                          </div>
                          {s.connector !== "Computed" && <Switch checked={s.status} disabled={role !== "admin"} onCheckedChange={() => toggleSource(s.id)} aria-label={`Toggle ${s.name}`} />}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline">{s.connector}</Badge>
                          <Badge variant="outline">{s.schedule}</Badge>
                          <Badge variant="outline" className={healthClass[s.health]}>{s.status ? s.health : "Off"}</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                          <div><p className="uppercase">Fields</p><p className="text-sm text-foreground">{fields.length}</p></div>
                          <div><p className="uppercase">Rules</p><p className="text-sm text-foreground">{ruleCount}</p></div>
                          <div><p className="uppercase">Last sync</p><p className="text-sm text-foreground">{s.connector === "Computed" ? "live" : ago(s.lastSync)}</p></div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </TabsContent>

      <TabsContent value="catalogue">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Attribute</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>PII</TableHead>
                  <TableHead>Used by</TableHead>
                  <TableHead>Availability</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attributes.map((a) => {
                  const src = sources.find((s) => s.id === a.sourceId);
                  const used = usedBy(a.key);
                  return (
                    <TableRow key={a.key}>
                      <TableCell><p className="font-medium">{a.label}</p><p className="font-mono text-xs text-muted-foreground">{a.key}</p></TableCell>
                      <TableCell className="text-sm">{a.type}{a.options ? ` (${a.options.length} values)` : ""}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{src?.name}</TableCell>
                      <TableCell>{a.pii ? <Badge variant="outline">PII</Badge> : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{used.length ? used.map((r) => r.id).join(", ") : "—"}</TableCell>
                      <TableCell>
                        {src?.status ? <Badge variant="secondary">Available</Badge> : <Badge variant="outline" className="text-destructive">Unavailable{used.length ? ` · ${used.length} rules affected` : ""}</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <AddSourceWizard open={open} onOpenChange={setOpen} />
    </Tabs>
  );
}

const TEMPLATES: { id: string; name: string; category: SourceCategory; connector: Connector; endpoint: string; fields: { sourceField: string; attribute: string; label: string; type: AttrType; pii: boolean }[] }[] = [
  {
    id: "device", name: "Device intelligence SDK", category: "Alternate data", connector: "REST API", endpoint: "https://device-intel.example/v1/fingerprint",
    fields: [
      { sourceField: "emulator_flag", attribute: "device.emulator", label: "Emulator / rooted device", type: "boolean", pii: false },
      { sourceField: "accounts_seen", attribute: "device.accountsSeen", label: "Accounts seen on device", type: "number", pii: false },
    ],
  },
  {
    id: "bureau", name: "Credit bureau", category: "External", connector: "REST API", endpoint: "https://bureau.example/v2/report",
    fields: [
      { sourceField: "enquiries_30d", attribute: "bureau.enquiries30d", label: "Bureau enquiries (30d)", type: "number", pii: false },
      { sourceField: "thin_file", attribute: "bureau.thinFile", label: "Thin credit file", type: "boolean", pii: false },
    ],
  },
  {
    id: "i4c", name: "I4C suspect registry", category: "Govt / LEA", connector: "SFTP batch", endpoint: "sftp://i4c-gw.bank.internal/suspects",
    fields: [{ sourceField: "suspect_flag", attribute: "i4c.suspect", label: "I4C suspect registry hit", type: "boolean", pii: false }],
  },
  { id: "custom", name: "Custom source", category: "Bank systems", connector: "Database view", endpoint: "", fields: [{ sourceField: "", attribute: "", label: "", type: "number", pii: false }] },
];

function AddSourceWizard({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { addSource, sources, attributes } = useEDD();
  const [step, setStep] = useState(1);
  const [tpl, setTpl] = useState(TEMPLATES[0]!);
  const [name, setName] = useState(TEMPLATES[0]!.name);
  const [category, setCategory] = useState<SourceCategory>(TEMPLATES[0]!.category);
  const [connector, setConnector] = useState<Connector>(TEMPLATES[0]!.connector);
  const [endpoint, setEndpoint] = useState(TEMPLATES[0]!.endpoint);
  const [auth, setAuth] = useState("API key");
  const [schedule, setSchedule] = useState("Real-time");
  const [fields, setFields] = useState(TEMPLATES[0]!.fields);
  const [testing, setTesting] = useState(false);
  const [tested, setTested] = useState(false);

  const reset = () => { setStep(1); setTested(false); pick(TEMPLATES[0]!.id); };
  const pick = (id: string) => {
    const t = TEMPLATES.find((x) => x.id === id)!;
    setTpl(t); setName(t.name); setCategory(t.category); setConnector(t.connector); setEndpoint(t.endpoint); setFields(t.fields.map((f) => ({ ...f })));
  };
  const validFields = fields.filter((f) => f.sourceField && /^[a-z][a-zA-Z0-9]*\.[a-zA-Z0-9]+$/.test(f.attribute) && f.label);
  const clash = validFields.filter((f) => attributes.some((a) => a.key === f.attribute));

  const runTest = () => { setTesting(true); setTimeout(() => { setTesting(false); setTested(true); }, 1200); };
  const finish = () => {
    const id = `SRC-${name.replace(/[^A-Za-z]/g, "").slice(0, 5).toUpperCase()}${sources.length + 1}`;
    const src: DataSource = {
      id, name, category, connector, endpoint, auth, schedule, status: true, health: "Healthy", lastSync: new Date().toISOString(), records: 0,
      description: `${tpl.id === "custom" ? "Custom" : tpl.name} connected via ${connector}.`,
      fields: validFields.map((f) => ({ sourceField: f.sourceField, attribute: f.attribute })),
      syncHistory: [{ at: new Date().toISOString(), records: 1, status: "Success", durationSec: 2 }],
      samplePayload: Object.fromEntries(validFields.map((f) => [f.sourceField, f.type === "number" ? 3 : f.type === "boolean" ? true : "sample"])),
    };
    const attrs: Attribute[] = validFields.map((f) => ({ key: f.attribute, label: f.label, type: f.type, sourceId: id, pii: f.pii }));
    addSource(src, attrs);
    toast.success(`${name} connected — ${attrs.length} new attributes available to rules`);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add data source · step {step} of 4</DialogTitle>
          <DialogDescription>{["Choose a template", "Connection details", "Map fields to attributes", "Test and save"][step - 1]}. Connections are simulated in this prototype.</DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {TEMPLATES.map((t) => (
              <button key={t.id} type="button" onClick={() => pick(t.id)} className={`rounded-md border p-3 text-left text-sm transition-colors ${tpl.id === t.id ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
                <p className="font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.category} · {t.connector}</p>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as SourceCategory)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.filter((c) => c !== "Platform").map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Connector</Label>
              <Select value={connector} onValueChange={(v) => setConnector(v as Connector)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(["REST API", "SFTP batch", "Kafka stream", "Database view", "File upload"] as Connector[]).map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Schedule</Label>
              <Select value={schedule} onValueChange={setSchedule}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Real-time", "Streaming", "Every 15 min", "Every 1 hour", "Daily", "On upload"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Endpoint / location</Label><Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://… or sftp://…" /></div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Authentication</Label>
              <Select value={auth} onValueChange={setAuth}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["API key", "OAuth client credentials", "Mutual TLS", "SSH key", "Service account"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr_100px_auto] gap-2 text-xs uppercase text-muted-foreground"><span>Source field</span><span>Attribute key</span><span>Label</span><span>Type</span><span /></div>
            {fields.map((f, i) => {
              const set = (p: Partial<typeof f>) => setFields(fields.map((x, j) => (j === i ? { ...x, ...p } : x)));
              return (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_100px_auto] gap-2">
                  <Input value={f.sourceField} placeholder="msisdn_age_days" onChange={(e) => set({ sourceField: e.target.value })} />
                  <Input value={f.attribute} placeholder="mobile.ageDays" onChange={(e) => set({ attribute: e.target.value })} />
                  <Input value={f.label} placeholder="SIM age (days)" onChange={(e) => set({ label: e.target.value })} />
                  <Select value={f.type} onValueChange={(v) => set({ type: v as AttrType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="number">number</SelectItem><SelectItem value="boolean">yes / no</SelectItem><SelectItem value="string">text</SelectItem></SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => setFields(fields.filter((_, j) => j !== i))} aria-label="Remove field"><Trash2 className="size-4" /></Button>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={() => setFields([...fields, { sourceField: "", attribute: "", label: "", type: "number", pii: false }])}><Plus className="size-4" /> Add field</Button>
            <p className="text-xs text-muted-foreground">Attribute keys look like <span className="font-mono">namespace.field</span>. {validFields.length} valid mapping(s).</p>
            {clash.length > 0 && <p className="text-xs text-warning">Already in catalogue, will be skipped: {clash.map((c) => c.attribute).join(", ")}</p>}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-sm">
            <p><span className="font-medium">{name}</span> · {connector} · {schedule}</p>
            <p className="font-mono text-xs text-muted-foreground">{endpoint || "(no endpoint)"}</p>
            {!tested ? (
              <Button onClick={runTest} disabled={testing}>{testing ? <Loader2 className="size-4 animate-spin" /> : null} Test connection</Button>
            ) : (
              <div className="space-y-2">
                <p className="flex items-center gap-2 text-success"><CheckCircle2 className="size-4" /> Connected. Sample record received.</p>
                <pre className="overflow-x-auto rounded-md bg-secondary p-3 text-xs">{JSON.stringify(Object.fromEntries(validFields.map((f) => [f.sourceField, f.type === "number" ? 3 : f.type === "boolean" ? true : "sample"])), null, 2)}</pre>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
          {step < 4 && <Button onClick={() => setStep(step + 1)} disabled={(step === 2 && !name.trim()) || (step === 3 && validFields.length === 0)}>Next</Button>}
          {step === 4 && <Button onClick={finish} disabled={!tested}>Save source</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
