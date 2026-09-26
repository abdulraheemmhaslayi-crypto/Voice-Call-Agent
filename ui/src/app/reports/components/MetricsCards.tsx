import { ArrowUpRight, CheckCircle2, PhoneCall, PhoneForwarded } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';

interface MetricsCardsProps {
  metrics: {
    total_runs: number;
    xfer_count: number;
  };
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const xferRate = metrics.total_runs > 0
    ? ((metrics.xfer_count / metrics.total_runs) * 100).toFixed(1)
    : "0.0";
  const completedRuns = Math.max(0, metrics.total_runs - metrics.xfer_count);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Total Calls Card */}
      <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-colors hover:border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Workflow Runs
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              <PhoneCall className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {metrics.total_runs.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Total processed sessions today
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transferred Calls Card */}
      <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-colors hover:border-border">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transferred Calls (XFER)
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
              <PhoneForwarded className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {metrics.xfer_count.toLocaleString()}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Handed off to live human agent
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Transfer Rate Card */}
      <Card className="rounded-2xl border border-border/70 bg-card p-5 shadow-xs transition-colors hover:border-border sm:col-span-2 lg:col-span-1">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Transfer Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold tracking-tight text-foreground">
              {xferRate}%
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {completedRuns.toLocaleString()} calls resolved autonomously
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

