import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Category, Recommendation, RiskGrade, Stage } from "@/data/edd";

const gradeStyles: Record<RiskGrade, string> = {
  VH: "bg-destructive/10 text-destructive border-destructive/30",
  H: "bg-warning/10 text-warning border-warning/30",
  M: "bg-info/10 text-info border-info/30",
  L: "bg-success/10 text-success border-success/30",
};

const gradeLabels: Record<RiskGrade, string> = { VH: "Very High", H: "High", M: "Medium", L: "Low" };

export function RiskChip({ grade, score, className }: { grade: RiskGrade; score?: number; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", gradeStyles[grade], className)}>
      {grade} · {gradeLabels[grade]}
      {typeof score === "number" ? ` · ${score}` : ""}
    </Badge>
  );
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <Badge variant="outline" className="border-border bg-muted text-muted-foreground">
      {stage}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: Category }) {
  return (
    <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
      {category}
    </Badge>
  );
}

export function RecommendationBadge({ value }: { value: Recommendation }) {
  const styles: Record<Recommendation, string> = {
    Block: "bg-destructive/10 text-destructive border-destructive/30",
    Unblock: "bg-success/10 text-success border-success/30",
    "Further Investigation": "bg-warning/10 text-warning border-warning/30",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", styles[value])}>
      {value}
    </Badge>
  );
}

export function SlaBadge({ dueAt }: { dueAt: string }) {
  const diffMs = new Date(dueAt).getTime() - Date.now();
  const breached = diffMs <= 0;
  const hours = Math.round(Math.abs(diffMs) / 3600_000);
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        breached ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-muted text-muted-foreground",
      )}
    >
      {breached ? `SLA breached ${hours}h` : `${hours}h left`}
    </Badge>
  );
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
