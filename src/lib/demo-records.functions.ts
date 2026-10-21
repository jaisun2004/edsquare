import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";

export type DemoKind = "run" | "case" | "alert" | "enforcement";
export interface DemoRecord { id: string; kind: DemoKind; data: unknown }

const KINDS: DemoKind[] = ["run", "case", "alert", "enforcement"];

/** Loads every saved demo run, case, alert and enforcement entry (shared demo workspace). */
export const listDemoRecords = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("demo_records").select("id, kind, data").order("updated_at", { ascending: true }).limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, kind: r.kind as DemoKind, data: r.data as unknown })) as { id: string; kind: DemoKind; data: Json }[];
});

export const saveDemoRecords = createServerFn({ method: "POST" })
  .inputValidator((input: { items: DemoRecord[] }) => {
    if (!Array.isArray(input.items) || input.items.length > 200) throw new Error("Invalid items.");
    for (const i of input.items) {
      if (typeof i.id !== "string" || i.id.length > 80 || !KINDS.includes(i.kind)) throw new Error("Invalid item.");
    }
    if (JSON.stringify(input).length > 2_000_000) throw new Error("Too large.");
    return input;
  })
  .handler(async ({ data }) => {
    if (!data.items.length) return { ok: true };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.items.map((i) => ({ id: `${i.kind}:${i.id}`, kind: i.kind, data: i.data as Json, updated_at: new Date().toISOString() }));
    const { error } = await supabaseAdmin.from("demo_records").upsert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearDemoRecords = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("demo_records").delete().neq("id", "");
  if (error) throw new Error(error.message);
  return { ok: true };
});
