'use client';

import { addDays, format, subDays } from 'date-fns';
import { BarChart3, Calendar, ChevronLeft, ChevronRight, Download, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  getDailyReportApiV1OrganizationsReportsDailyGet,
  getDailyRunsDetailApiV1OrganizationsReportsDailyRunsGet,
  getPreferencesApiV1OrganizationsPreferencesGet,
  getWorkflowOptionsApiV1OrganizationsReportsWorkflowsGet
} from '@/client/sdk.gen';
import type { WorkflowRunDetail } from '@/client/types.gen';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarPicker } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth';

import { DispositionChart } from './components/DispositionChart';
import { DurationChart } from './components/DurationChart';
import { MetricsCards } from './components/MetricsCards';

interface WorkflowOption {
  id: number;
  name: string;
}

interface DailyReport {
  date: string;
  timezone: string;
  workflow_id: number | null;
  metrics: {
    total_runs: number;
    xfer_count: number;
  };
  disposition_distribution: Array<{
    disposition: string;
    count: number;
    percentage: number;
  }>;
  call_duration_distribution: Array<{
    bucket: string;
    range_start: number;
    range_end: number | null;
    count: number;
    percentage: number;
  }>;
}

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timezone, setTimezone] = useState('America/New_York');
  const auth = useAuth();

  // Fetch workflows on mount
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!auth.isAuthenticated) return;

      try {
        const response = await getWorkflowOptionsApiV1OrganizationsReportsWorkflowsGet({
        });
        if (response.data) {
          setWorkflows(response.data);
        }
      } catch (err) {
        console.error('Failed to fetch workflows:', err);
      }
    };
    fetchWorkflows();
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!auth.isAuthenticated) return;

      try {
        const response = await getPreferencesApiV1OrganizationsPreferencesGet();
        if (response.data?.timezone) {
          setTimezone(response.data.timezone);
        }
      } catch (err) {
        console.error('Failed to fetch organization preferences:', err);
      }
    };
    fetchPreferences();
  }, [auth.isAuthenticated]);

  // Fetch report data when date or workflow changes
  useEffect(() => {
    const fetchReport = async () => {
      if (!auth.isAuthenticated) return;

      setLoading(true);
      setError(null);

      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const workflowId = selectedWorkflow === 'all' ? undefined : parseInt(selectedWorkflow);

        const response = await getDailyReportApiV1OrganizationsReportsDailyGet({
          query: {
            date: dateStr,
            timezone,
            ...(workflowId && { workflow_id: workflowId })
          },
        });

        if (response.data) {
          setReport(response.data as DailyReport);
        }
      } catch (err) {
        console.error('Failed to fetch report:', err);
        setError('Failed to load report data');
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [selectedDate, selectedWorkflow, timezone, auth.isAuthenticated]);

  const handlePreviousDay = () => {
    setSelectedDate(subDays(selectedDate, 1));
  };

  const handleNextDay = () => {
    setSelectedDate(addDays(selectedDate, 1));
  };

  const handleDownloadCSV = async () => {
    if (!auth.isAuthenticated) return;

    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const workflowId = selectedWorkflow === 'all' ? undefined : parseInt(selectedWorkflow);

      // Fetch detailed runs data
      const response = await getDailyRunsDetailApiV1OrganizationsReportsDailyRunsGet({
        query: {
          date: dateStr,
          timezone,
          ...(workflowId && { workflow_id: workflowId })
        },
      });

      if (response.data && response.data.length > 0) {
        // Prepare CSV content
        const headers = ['Phone Number', 'Disposition', 'Duration (seconds)', 'Workflow Run URL'];
        const rows = response.data.map((run: WorkflowRunDetail) => {
          const url = `${window.location.origin}/workflow/${run.workflow_id}/run/${run.run_id}`;
          return [
            run.phone_number || '',
            run.disposition || '',
            run.duration_seconds.toString(),
            url
          ];
        });

        // Create CSV content
        const csvContent = [
          headers.join(','),
          ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const workflowName = selectedWorkflow === 'all'
          ? 'all_workflows'
          : workflows.find(w => w.id.toString() === selectedWorkflow)?.name?.replace(/\s+/g, '_') || 'workflow';

        link.setAttribute('href', url);
        link.setAttribute('download', `workflow_runs_${dateStr}_${workflowName}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert('No data available for download');
      }
    } catch (err) {
      console.error('Failed to download CSV:', err);
      alert('Failed to download CSV data');
    }
  };

  const isToday = format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Top Header & Filters Bar */}
      <div className="flex flex-col gap-4 pb-4 border-b border-border/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Brand Header */}
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">Daily Reports & Analytics</h1>
                <span className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Overview of call outcomes, disposition breakdown, and duration metrics.
              </p>
            </div>
          </div>

          {/* Download CSV Button */}
          {!loading && report && report.metrics.total_runs > 0 && (
            <Button
              onClick={handleDownloadCSV}
              className="h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs transition-colors px-4 self-start sm:self-auto"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          {/* Left: Workflow Selector */}
          <div className="flex items-center gap-2.5">
            <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
              <SelectTrigger className="w-[220px] h-10 rounded-xl text-xs font-medium border-border/70 bg-card shadow-xs">
                <SelectValue placeholder="Select workflow" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="text-xs font-medium">
                  All Voice Agents & Workflows
                </SelectItem>
                {workflows.map((workflow) => (
                  <SelectItem key={workflow.id} value={workflow.id.toString()} className="text-xs">
                    {workflow.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-xs text-muted-foreground hidden md:inline">
              Timezone: <span className="font-medium text-foreground">{timezone}</span>
            </span>
          </div>

          {/* Right: Date Navigation */}
          <div className="flex items-center gap-1.5 rounded-xl border border-border/70 bg-card p-1 shadow-xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePreviousDay}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
              aria-label="Previous Day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="h-8 px-3 text-xs font-semibold text-foreground">
                  <Calendar className="mr-2 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  {format(selectedDate, 'MMM dd, yyyy')}
                  {isToday && (
                    <span className="ml-1.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Today
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-lg border-border/70">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  className="rounded-2xl"
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextDay}
              disabled={isToday}
              className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40"
              aria-label="Next Day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-[120px] rounded-2xl" />
            <Skeleton className="h-[120px] rounded-2xl" />
            <Skeleton className="h-[120px] rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-[340px] rounded-2xl" />
            <Skeleton className="h-[340px] rounded-2xl" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center text-xs text-destructive">
          {error}
        </div>
      )}

      {/* Report Content */}
      {report && !loading && !error && (
        <div className="space-y-6">
          {/* Metrics Cards */}
          <MetricsCards metrics={report.metrics} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DispositionChart data={report.disposition_distribution} />
            <DurationChart data={report.call_duration_distribution} />
          </div>

          {/* No Data Message */}
          {report.metrics.total_runs === 0 && (
            <div className="rounded-2xl border border-border/70 bg-card p-10 text-center shadow-xs">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No call sessions recorded</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                No workflow runs found for {format(selectedDate, 'MMMM dd, yyyy')}
                {selectedWorkflow !== 'all' && ` on "${workflows.find(w => w.id.toString() === selectedWorkflow)?.name}"`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
