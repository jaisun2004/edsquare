import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";

export type DemoKind = "run" | "case" | "alert" | "enforcement";
export interface DemoRecord { id: string; kind: DemoKind; data: unknown }

const KINDS: DemoKind[] = ["run", "case", "alert", "enforcement"];

/** Loads every saved demo run, case, alert and enforcement entry (shared demo workspace). */
export const listDemoRecords = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("demo_records").select("id, kind, data").order("updated_at", { ascending: false }).limit(1000);
  if (error) throw new Error(error.message);
  return (data ?? []).reverse().map((r) => ({ id: r.id, kind: r.kind as DemoKind, data: r.data as unknown })) as { id: string; kind: DemoKind; data: Json }[];
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
    if (!data.items.length) return { ok: true, clashes: [] as string[] };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // A new case must not replace a different case that already holds the same number.
    const caseItems = data.items.filter((i) => i.kind === "case");
    const clashes: string[] = [];
    if (caseItems.length) {
      const { data: existing } = await supabaseAdmin.from("demo_records").select("id, data").in("id", caseItems.map((i) => `case:${i.id}`));
      for (const row of existing ?? []) {
        const mine = caseItems.find((i) => `case:${i.id}` === row.id);
        const theirs = (row.data as { openedAt?: string } | null)?.openedAt;
        if (mine && theirs && theirs !== (mine.data as { openedAt?: string }).openedAt) clashes.push(mine.id);
      }
    }
    data.items = data.items.filter((i) => !(i.kind === "case" && clashes.includes(i.id)));
    if (!data.items.length) return { ok: true, clashes };
    const rows = data.items.map((i) => ({ id: `${i.kind}:${i.id}`, kind: i.kind, data: i.data as Json, updated_at: new Date().toISOString() }));
    const { error } = await supabaseAdmin.from("demo_records").upsert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, clashes };
  });

/** Hands out the next shared case number exactly once (atomic counter in the database). */
export const reserveCaseId = createServerFn({ method: "POST" })
  .inputValidator((input: { floor: number }) => ({ floor: Math.max(0, Math.min(10_000_000, Math.floor(Number(input.floor) || 0))) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: n, error } = await supabaseAdmin.rpc("next_demo_case_id", { floor_n: data.floor });
    if (error) throw new Error(error.message);
    return { id: `CASE-${n as number}` };
  });

export const clearDemoRecords = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("demo_records").delete().neq("id", "");
  if (error) throw new Error(error.message);
  await supabaseAdmin.rpc("reset_demo_case_counter");
  return { ok: true };
});
