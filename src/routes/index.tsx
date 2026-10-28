import { createFileRoute, Link } from "@tanstack/react-router";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/layout/AppShell";
import { CategoryBadge, RiskChip, SlaBadge, StageBadge } from "@/components/edd/chips";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { inflowSeries, teamWorkload } from "@/data/edd";
import { AlertFunnel, useJourneys } from "@/components/edd/Journey";
import { LatestCases } from "@/components/edd/DemoRuns";
import { useEDD } from "@/lib/edd-store";
import { useState } from "react";
import { FEEDS, feedOf, type FeedId } from "@/data/ops-config";
import { useOpsConfig } from "@/lib/ops-config-store";
import { rankQueue } from "@/lib/queue-priority";
import { useCaseFeeds } from "@/components/edd/SourceViews";
import { FlowPreview } from "@/routes/admin.workflows";
import { roleLabels } from "@/lib/roles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EDD Command Dashboard — EDSquare" },
      { name: "description", content: "Role-aware dashboard for digital enhanced due diligence: open cases, SLA breaches, risk mix and the priority worklist." },
      { property: "og:title", content: "EDD Command Dashboard — EDSquare" },
      { property: "og:description", content: "Monitor mule and digital-scam case flow from alert to enforcement." },
    ],
  }),
  component: DashboardPage,
});

const RISK_COLORS: Record<string, string> = {
  VH: "var(--color-destructive)",
  H: "var(--color-warning)",
  M: "var(--color-info)",
  L: "var(--color-success)",
};

