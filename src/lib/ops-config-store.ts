// Browser-persisted ops config (flows + queue weights), shared across pages.
import { useEffect, useSyncExternalStore } from "react";
import { defaultFlows, defaultQueue, type FeedFlow, type QueueConfig } from "@/data/ops-config";

interface OpsConfig { flows: FeedFlow[]; queue: QueueConfig }
const KEY = "edsquare-ops-config";
const DEFAULT: OpsConfig = { flows: defaultFlows, queue: defaultQueue };
let state: OpsConfig = DEFAULT;
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT, ...(JSON.parse(raw) as Partial<OpsConfig>) };
  } catch { /* ignore */ }
  subs.forEach((f) => f());
}

export function setOpsConfig(update: Partial<OpsConfig>) {
  state = { ...state, ...update };
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
export const resetOpsConfig = (part: "flows" | "queue") => setOpsConfig(part === "flows" ? { flows: defaultFlows } : { queue: defaultQueue });

export function useOpsConfig(): OpsConfig {
  useEffect(load, []);
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state, () => DEFAULT);
}
