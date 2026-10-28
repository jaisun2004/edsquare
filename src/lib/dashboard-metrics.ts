import type { Alert, EDDCase } from "@/data/edd";

export type Horizon = "today" | "24h" | "7d" | "mtd" | "all";
export type SlaFilter = "all" | "breached" | "imminent" | "within";

/** Start time (ms) for a time horizon relative to `now`. */
export function horizonStart(h: Horizon, now = Date.now()): number {
  const d = new Date(now);
  if (h === "today") return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  if (h === "24h") return now - 24 * 3600e3;
  if (h === "7d") return now - 7 * 24 * 3600e3;
  if (h === "mtd") return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
  return 0;
}

/** SLA bucket of a due time: breached, imminent (< 30 min) or within. */
export function slaBucket(dueAt: string, now = Date.now()): Exclude<SlaFilter, "all"> {
  const left = new Date(dueAt).getTime() - now;
  if (left < 0) return "breached";
  if (left < 30 * 60e3) return "imminent";
  return "within";
}

/** Amount at risk: reads "Rs 12,345" / "₹12345" from the alert trigger, else estimates from the risk score. */
export function amountAtRisk(alert: Pick<Alert, "trigger"> | undefined, c?: Pick<EDDCase, "riskScore">): number {
  const m = alert?.trigger.match(/(?:rs\.?|₹|inr)\s*([\d,]+)/i);
  if (m) return Number(m[1]!.replace(/,/g, ""));
  return Math.round(((c?.riskScore ?? 40) * 1500) / 100) * 100;
}

/** Ageing bucket of a case's remaining SLA. */
export function ageBucket(dueAt: string, now = Date.now()): "Breached" | "< 30 min" | "< 4 h" | "< 24 h" | "> 24 h" {
  const left = new Date(dueAt).getTime() - now;
  if (left < 0) return "Breached";
  if (left < 30 * 60e3) return "< 30 min";
  if (left < 4 * 3600e3) return "< 4 h";
  if (left < 24 * 3600e3) return "< 24 h";
  return "> 24 h";
}
