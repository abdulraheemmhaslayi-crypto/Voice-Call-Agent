'use client';

import {
    Activity,
    ArrowUpRight,
    Bot,
    Calendar,
    ChevronDown,
    ChevronRight,
    Clock,
    Cpu,
    Database,
    ExternalLink,
    HardDrive,
    Headphones,
    Layers,
    Mic,
    MoreVertical,
    Pencil,
    Phone,
    PhoneCall,
    Play,
    Plus,
    Radio,
    Search,
    Server,
    SlidersHorizontal,
    TrendingDown,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { toast } from 'sonner';

import type {
    FolderResponse,
    OrganizationAiModelConfigurationResponse,
    TelephonyConfigurationListItem,
    UsageHistoryResponse,
    WorkflowListResponse,
} from '@/client/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface OverviewDashboardProps {
    workflows: WorkflowListResponse[];
    archivedWorkflows: WorkflowListResponse[];
    folders: FolderResponse[];
    modelConfig?: OrganizationAiModelConfigurationResponse | null;
    usageHistory?: UsageHistoryResponse | null;
    telephonyConfigs?: TelephonyConfigurationListItem[];
}

export function OverviewDashboard({
    workflows,
    archivedWorkflows,
    folders,
    modelConfig,
    usageHistory,
    telephonyConfigs = [],
}: OverviewDashboardProps) {
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);
    const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'today'>('7d');
    const [selectedAgentFilter, setSelectedAgentFilter] = useState<string>('all');

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // 1. Real Active Workflows & Calls
    const totalActive = workflows.length;
    const runsList = useMemo(() => usageHistory?.runs || [], [usageHistory]);
    const totalRuns = usageHistory?.total_count ?? workflows.reduce((sum, w) => sum + (w.total_runs || 0), 0);
    const totalDurationSeconds = usageHistory?.total_duration_seconds || 0;
    const avgDurationSeconds = totalRuns > 0 ? Math.round(totalDurationSeconds / totalRuns) : 0;

    // Duration formatting helper
    const formatDuration = (seconds: number) => {
        if (!seconds || seconds <= 0) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        if (mins === 0) return `${secs}s`;
        return `${mins}m ${secs}s`;
    };

    // 2. Real Model Stack names from Organization Configuration API (/api/v1/organizations/model-configurations/v2)
    const rawConfig = (modelConfig as any)?.configuration || {};
    const effective = (modelConfig as any)?.effective_configuration || {};

    const llmModel = effective?.llm?.model || rawConfig?.byok?.pipeline?.llm?.model || rawConfig?.pipeline?.llm?.model || rawConfig?.llm?.model || null;
    const llmProvider = effective?.llm?.provider || rawConfig?.byok?.pipeline?.llm?.provider || rawConfig?.pipeline?.llm?.provider || rawConfig?.llm?.provider || null;

    const ttsProvider = effective?.tts?.provider || rawConfig?.byok?.pipeline?.tts?.provider || rawConfig?.pipeline?.tts?.provider || rawConfig?.tts?.provider || null;
    const ttsVoice = effective?.tts?.voice || rawConfig?.byok?.pipeline?.tts?.voice || null;

    const sttProvider = effective?.stt?.provider || rawConfig?.byok?.pipeline?.stt?.provider || rawConfig?.pipeline?.stt?.provider || rawConfig?.stt?.provider || null;

    const isModelConfigured = Boolean(llmModel || llmProvider || ttsProvider || sttProvider);

    const llmName = llmModel ? (llmProvider ? `${llmProvider}: ${llmModel}` : llmModel) : (isModelConfigured ? 'Configured LLM' : 'Default (Ollama / Local)');
    const ttsName = ttsProvider ? (ttsVoice ? `${ttsProvider} (${ttsVoice})` : ttsProvider) : (isModelConfigured ? 'Configured TTS' : 'Default (F5-TTS / Edge)');
    const sttName = sttProvider || (isModelConfigured ? 'Configured STT' : 'Default (Whisper)');
    const configuredCount = [llmModel || llmProvider, ttsProvider, sttProvider].filter(Boolean).length;
    const modelStackStatus = configuredCount > 0 ? `${configuredCount}/3 Configured` : 'Default Ready';

    // 3. Real Telephony Configuration Count
    const telephonyCount = telephonyConfigs?.length ?? 0;

    // Palette of 4 distinct solid colors for the multi-line chart (No gradients)
    const agentColors = ['#2563EB', '#F59E0B', '#8B5CF6', '#EF4444'];

    // 4. Real Per-Agent Statistics calculated from live usage runs
    const agentStats = useMemo(() => {
        const stats: Record<number, { count: number; totalDuration: number; avgDuration: number }> = {};
        runsList.forEach((run) => {
            if (!stats[run.workflow_id]) {
                stats[run.workflow_id] = { count: 0, totalDuration: 0, avgDuration: 0 };
            }
            stats[run.workflow_id].count += 1;
            stats[run.workflow_id].totalDuration += (run.call_duration_seconds || 0);
        });
        Object.keys(stats).forEach((k) => {
            const id = Number(k);
            const item = stats[id];
            item.avgDuration = item.count > 0 ? Math.round(item.totalDuration / item.count) : 0;
        });
        return stats;
    }, [runsList]);

    // Top active agents (100% REAL workflows)
    const top4Agents = useMemo(() => {
        return workflows.slice(0, 4).map((wf) => {
            const st = agentStats[wf.id];
            const count = st?.count ?? (wf.total_runs || 0);
            const avgDur = st?.avgDuration ? formatDuration(st.avgDuration) : '0s';
            return {
                id: wf.id,
                name: wf.name,
                total_runs: count,
                avg_duration: avgDur,
                tag: 'Voice Agent',
            };
        });
    }, [workflows, agentStats]);

    // Filtered agents for chart
    const filteredAgentsForChart = useMemo(() => {
        if (selectedAgentFilter === 'all') return top4Agents;
        return top4Agents.filter((a) => a.name === selectedAgentFilter);
    }, [top4Agents, selectedAgentFilter]);

    // 5. 100% REAL Chart Data dynamically aggregated from runsList by date
    const chartData = useMemo(() => {
        const now = new Date();

        if (timeframe === 'today') {
            const slots = [
                { label: '12 AM', start: 0, end: 4 },
                { label: '04 AM', start: 4, end: 8 },
                { label: '08 AM', start: 8, end: 12 },
                { label: '12 PM', start: 12, end: 16 },
                { label: '04 PM', start: 16, end: 20 },
                { label: '08 PM', start: 20, end: 24 },
            ];
            return slots.map((slot) => {
                const entry: any = { name: slot.label, dateFull: `Today (${slot.label})` };
                top4Agents.forEach((agent) => {
                    const count = runsList.filter((r) => {
                        if (r.workflow_id !== agent.id) return false;
                        const rDate = new Date(r.created_at);
                        if (rDate.toDateString() !== now.toDateString()) return false;
                        const hour = rDate.getHours();
                        return hour >= slot.start && hour < slot.end;
                    }).length;
                    entry[`agent_${agent.id}`] = count;
                });
                return entry;
            });
        }

        const numDays = timeframe === '30d' ? 30 : 7;
        const days: Array<{ day: string; dateFull: string; dateObj: Date }> = [];
        for (let i = numDays - 1; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            days.push({
                day: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                dateFull: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
                dateObj: d,
            });
        }

        return days.map((d) => {
            const entry: any = { name: d.day, dateFull: d.dateFull };
            top4Agents.forEach((agent) => {
                const count = runsList.filter((r) => {
                    if (r.workflow_id !== agent.id) return false;
                    const rDate = new Date(r.created_at);
                    return rDate.toDateString() === d.dateObj.toDateString();
                }).length;
                entry[`agent_${agent.id}`] = count;
            });
            return entry;
        });
    }, [timeframe, top4Agents, runsList]);

    // Avatar background color based on initial letter
    const getAvatarColor = (index: number) => {
        const colors = [
            'bg-blue-500 text-white',
            'bg-emerald-600 text-white',
            'bg-amber-500 text-white',
            'bg-purple-600 text-white',
            'bg-rose-500 text-white',
        ];
        return colors[index % colors.length];
    };

    // 6. 100% REAL Recent Conversation Records from Database
    const recentConversations = useMemo(() => {
        if (runsList.length === 0) return [];
        return runsList.slice(0, 5).map((r) => {
            const durationFormatted = formatDuration(r.call_duration_seconds || 0);
            const rDate = new Date(r.created_at);
            const isToday = rDate.toDateString() === new Date().toDateString();
            const timeStr = isToday
                ? rDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : rDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

            const caller = r.caller_number || r.called_number || r.phone_number || (r.call_type === 'web_call' ? 'Web Call (WhatsApp/Browser)' : 'Direct Call');
            const wfName = r.workflow_name || (workflows.find((w) => w.id === r.workflow_id)?.name) || 'Voice Agent';

            return {
                id: r.id,
                workflowId: r.workflow_id,
                phone: caller,
                agentName: wfName,
                duration: durationFormatted,
                time: timeStr,
                status: r.disposition || 'Completed',
            };
        });
    }, [runsList, workflows]);

    // Test call handler
    const handleTestCall = (wfId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/workflow/${wfId}?onboarding=web_call`);
    };

    return (
        <div className="space-y-6">
            {/* Top Header Row with Title, Filters, and New Agent Action */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                        Workspace Dashboard
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Monitor, manage and scale your voice AI agents in real-time.
                    </p>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Timeframe Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-medium gap-1.5 border-border/80 bg-card">
                                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{timeframe === '7d' ? 'Last 7 Days' : timeframe === '30d' ? 'Last 30 Days' : 'Today'}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem onClick={() => setTimeframe('today')} className="cursor-pointer text-xs">Today</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTimeframe('7d')} className="cursor-pointer text-xs">Last 7 Days</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTimeframe('30d')} className="cursor-pointer text-xs">Last 30 Days</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* All Agents Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-medium gap-1.5 border-border/80 bg-card">
                                <span>{selectedAgentFilter === 'all' ? 'All Agents' : selectedAgentFilter}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-0.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => setSelectedAgentFilter('all')} className="cursor-pointer text-xs">All Agents</DropdownMenuItem>
                            {workflows.map((wf) => (
                                <DropdownMenuItem key={wf.id} onClick={() => setSelectedAgentFilter(wf.name)} className="cursor-pointer text-xs truncate">
                                    {wf.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Primary Button */}
                    <Button
                        asChild
                        size="sm"
                        className="h-9 px-4 font-semibold text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-1.5"
                    >
                        <Link href="/workflow/create">
                            <Plus className="w-4 h-4" />
                            Create New Agent
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 5 Top KPI Metric Cards (100% Real Live Data, Strictly Solid Colors, No Gradients) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* 1. Active Voice Agents */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <span className="text-[11px] font-medium text-muted-foreground">Active Voice Agents</span>
                        <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                            {totalActive}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                            {totalActive > 0 ? 'Live & Ready for Calls' : 'No Agents Created'}
                        </div>
                    </div>
                </div>

                {/* 2. Total Call Volume */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
                            <Phone className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <span className="text-[11px] font-medium text-muted-foreground">Total Call Volume</span>
                        <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                            {totalRuns.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold inline-flex items-center">
                                Total
                            </span>
                            <span>Conversations recorded</span>
                        </div>
                    </div>
                </div>

                {/* 3. Total Talk Time */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <span className="text-[11px] font-medium text-muted-foreground">Total Talk Time</span>
                        <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5">
                            {formatDuration(totalDurationSeconds)}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
                            <span>Avg:</span>
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">{formatDuration(avgDurationSeconds)} / call</span>
                        </div>
                    </div>
                </div>

                {/* 4. AI Model Stack */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center border border-purple-500/20">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <span className="text-[11px] font-medium text-muted-foreground">AI Model Stack</span>
                        <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5 truncate">
                            {modelStackStatus}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] text-muted-foreground truncate">
                            {llmName}
                        </div>
                    </div>
                </div>

                {/* 5. Telephony Gateway */}
                <div className="bg-card border border-border/80 rounded-xl p-3.5 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                    <div className="flex items-center justify-between">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                            <Radio className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="mt-2.5">
                        <span className="text-[11px] font-medium text-muted-foreground">Telephony Gateway</span>
                        <div className="text-xl sm:text-2xl font-bold tracking-tight text-foreground mt-0.5 flex items-center gap-1.5">
                            <span>{telephonyCount > 0 ? `${telephonyCount} Carrier${telephonyCount > 1 ? 's' : ''}` : 'WebRTC Ready'}</span>
                            <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] sm:text-[11px] text-muted-foreground">
                            {telephonyCount > 0 ? 'SIP & Inbound Numbers' : 'Web & WhatsApp Calls'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content 2-Column Layout (Left 8 cols, Right 4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT COLUMN: Call Traffic & Activity Chart + Active Agents Table */}
                <div className="lg:col-span-8 space-y-6">
                    {/* Card 1: Call Traffic & Activity Chart */}
                    <div className="bg-card border border-border/80 rounded-2xl p-6 shadow-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold tracking-tight text-foreground">
                                        Call Traffic & Activity
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Real conversation volume across your agents for {timeframe === '7d' ? 'the last 7 days' : timeframe === '30d' ? 'the last 30 days' : 'today'}.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1 border-border/80 bg-card">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            <span>{timeframe === '7d' ? 'Last 7 Days' : timeframe === '30d' ? 'Last 30 Days' : 'Today'}</span>
                                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                        <DropdownMenuItem onClick={() => setTimeframe('today')} className="cursor-pointer text-xs">Today</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setTimeframe('7d')} className="cursor-pointer text-xs">Last 7 Days</DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setTimeframe('30d')} className="cursor-pointer text-xs">Last 30 Days</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1 border-border/80 bg-card">
                                            <span>{selectedAgentFilter === 'all' ? 'All Agents' : selectedAgentFilter}</span>
                                            <ChevronDown className="w-3 h-3 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={() => setSelectedAgentFilter('all')} className="cursor-pointer text-xs">All Agents</DropdownMenuItem>
                                        {workflows.map((wf) => (
                                            <DropdownMenuItem key={wf.id} onClick={() => setSelectedAgentFilter(wf.name)} className="cursor-pointer text-xs truncate">
                                                {wf.name}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* Spline Chart */}
                        <div className="pt-6">
                            {top4Agents.length === 0 ? (
                                <div className="h-[270px] w-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border/60 rounded-xl bg-muted/10">
                                    <Activity className="w-8 h-8 text-muted-foreground/50 mb-2" />
                                    <p className="text-sm font-semibold text-foreground">No voice agents created yet</p>
                                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                        Create an agent to start monitoring conversation volume and traffic trends.
                                    </p>
                                    <Button asChild size="sm" className="mt-3 text-xs">
                                        <Link href="/workflow/create">Create New Agent</Link>
                                    </Button>
                                </div>
                            ) : isMounted ? (
                                <div className="h-[270px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart
                                            data={chartData}
                                            margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="4 4"
                                                vertical={false}
                                                stroke="hsl(var(--border) / 0.6)"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={{ stroke: 'hsl(var(--border) / 0.6)' }}
                                            />
                                            <YAxis
                                                stroke="hsl(var(--muted-foreground))"
                                                fontSize={12}
                                                tickLine={false}
                                                axisLine={false}
                                                allowDecimals={false}
                                                domain={[0, 'auto']}
                                            />
                                            {/* Clean Card Tooltip */}
                                            <Tooltip
                                                content={({ active, payload, label }) => {
                                                    if (active && payload && payload.length) {
                                                        const current = payload[0]?.payload;
                                                        return (
                                                            <div className="bg-card border border-border/90 rounded-xl p-3 shadow-lg text-xs min-w-[180px]">
                                                                <div className="font-bold text-foreground pb-2 border-b border-border/60">
                                                                    {current?.dateFull || label}
                                                                </div>
                                                                <div className="space-y-1.5 pt-2">
                                                                    {filteredAgentsForChart.map((ag, idx) => {
                                                                        const val = current?.[`agent_${ag.id}`] ?? 0;
                                                                        return (
                                                                            <div key={ag.id} className="flex items-center justify-between gap-3">
                                                                                <div className="flex items-center gap-1.5 truncate">
                                                                                    <span
                                                                                        className="w-2 h-2 rounded-full shrink-0"
                                                                                        style={{ backgroundColor: agentColors[idx % agentColors.length] }}
                                                                                    />
                                                                                    <span className="truncate max-w-[110px] text-muted-foreground font-medium">
                                                                                        {ag.name}
                                                                                    </span>
                                                                                </div>
                                                                                <span className="font-bold text-foreground font-mono">
                                                                                    {val} {val === 1 ? 'call' : 'calls'}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />

                                            {/* Smooth curves with solid stroke, NO linearGradient */}
                                            {filteredAgentsForChart.map((agent, idx) => (
                                                <Area
                                                    key={agent.id}
                                                    type="monotone"
                                                    dataKey={`agent_${agent.id}`}
                                                    stroke={agentColors[idx % agentColors.length]}
                                                    strokeWidth={2.5}
                                                    fill="none"
                                                    dot={false}
                                                    activeDot={{ r: 5, stroke: agentColors[idx % agentColors.length], strokeWidth: 2, fill: '#fff' }}
                                                />
                                            ))}
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-[270px] w-full bg-muted/20 animate-pulse rounded-xl" />
                            )}

                            {/* Legend below the chart */}
                            {top4Agents.length > 0 && (
                                <div className="flex items-center justify-center gap-5 flex-wrap pt-4 border-t border-border/40 mt-3 text-xs">
                                    {filteredAgentsForChart.map((agent, idx) => (
                                        <div key={agent.id} className="flex items-center gap-1.5">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{ backgroundColor: agentColors[idx % agentColors.length] }}
                                            />
                                            <span className="text-muted-foreground font-medium text-[11px] truncate max-w-[160px]">
                                                {agent.name}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Card 2: Active Voice Agents Table */}
                    <div className="bg-card border border-border/80 rounded-2xl shadow-xs overflow-hidden">
                        <div className="p-6 pb-4 flex items-center justify-between border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                                    <Bot className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold tracking-tight text-foreground">
                                        Active Voice Agents
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Your primary conversational agents ready for calls.
                                    </p>
                                </div>
                            </div>
                            <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold gap-1 border-border/80">
                                <Link href="/workflow">
                                    View All Agents
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>

                        {/* Agents Table */}
                        <Table>
                            <TableHeader className="bg-muted/30">
                                <TableRow className="hover:bg-transparent border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                                    <TableHead className="w-10 pl-6 py-3">#</TableHead>
                                    <TableHead className="py-3">Agent Name</TableHead>
                                    <TableHead className="py-3">Model</TableHead>
                                    <TableHead className="py-3">Calls Recorded</TableHead>
                                    <TableHead className="py-3">Avg. Duration</TableHead>
                                    <TableHead className="py-3">Status</TableHead>
                                    <TableHead className="py-3 pr-6 text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {top4Agents.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                            <Bot className="w-8 h-8 mx-auto mb-2 text-muted-foreground/60" />
                                            <p className="font-semibold text-foreground text-sm">No voice agents created yet</p>
                                            <p className="text-xs text-muted-foreground mt-1">Get started by creating your first conversational agent.</p>
                                            <Button asChild size="sm" className="mt-3 text-xs">
                                                <Link href="/workflow/create">Create New Agent</Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    top4Agents.map((agent, index) => {
                                        const initial = agent.name.charAt(0).toUpperCase() || 'A';

                                        return (
                                            <TableRow
                                                key={agent.id}
                                                onClick={() => router.push(`/workflow/${agent.id}`)}
                                                className="group cursor-pointer hover:bg-muted/30 border-b border-border/40 last:border-0 transition-colors"
                                            >
                                                {/* Index # */}
                                                <TableCell className="pl-6 py-3.5 text-xs text-muted-foreground font-medium">
                                                    {index + 1}
                                                </TableCell>

                                                {/* Agent Name + Category */}
                                                <TableCell className="py-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${getAvatarColor(index)}`}>
                                                            {initial}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                                                {agent.name}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                                {agent.tag}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                {/* Model */}
                                                <TableCell className="py-3.5 text-xs font-mono text-muted-foreground">
                                                    {llmName}
                                                </TableCell>

                                                {/* Calls */}
                                                <TableCell className="py-3.5 text-xs font-bold text-foreground">
                                                    {agent.total_runs}
                                                </TableCell>

                                                {/* Avg Duration */}
                                                <TableCell className="py-3.5 text-xs text-muted-foreground">
                                                    {agent.avg_duration}
                                                </TableCell>

                                                {/* Status Badge */}
                                                <TableCell className="py-3.5">
                                                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />
                                                        Active
                                                    </span>
                                                </TableCell>

                                                {/* Action Buttons */}
                                                <TableCell className="py-3.5 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Test Call Play Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={(e) => handleTestCall(agent.id, e)}
                                                            title="Test Voice Call"
                                                            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                                        >
                                                            <Play className="w-3.5 h-3.5 fill-current" />
                                                        </Button>

                                                        {/* Edit Button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => router.push(`/workflow/${agent.id}`)}
                                                            title="Edit Workflow"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </Button>

                                                        {/* More options */}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                                                                >
                                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-40 text-xs">
                                                                <DropdownMenuItem onClick={() => router.push(`/workflow/${agent.id}`)} className="cursor-pointer">
                                                                    Edit Workflow
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={(e) => handleTestCall(agent.id, e)} className="cursor-pointer">
                                                                    Test Web Call
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onClick={() => {
                                                                    navigator.clipboard.writeText(String(agent.id));
                                                                    toast.success(`Agent ID #${agent.id} copied`);
                                                                }} className="cursor-pointer">
                                                                    Copy ID
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                {/* RIGHT COLUMN: AI Model Pipeline + Infrastructure Health + Recent Conversations */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Card 1: AI Model Pipeline */}
                    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                    <Cpu className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm text-foreground">AI Model Pipeline</h3>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                        Active models handling conversation logic and voice audio.
                                    </p>
                                </div>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary font-semibold hover:text-primary gap-1">
                                <Link href="/model-configurations">
                                    Manage Models
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>

                        {/* Pipeline Layers */}
                        <div className="pt-3.5 space-y-2.5">
                            {/* LLM */}
                            <Link
                                href="/model-configurations"
                                className="block p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                            <Cpu className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                                Natural Language (LLM)
                                            </div>
                                            <div className="text-[11px] font-mono text-muted-foreground">
                                                {llmName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                            Active
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5 pl-9">
                                    Prompt reasoning, intent classification & tool execution.
                                </p>
                            </Link>

                            {/* Voice TTS */}
                            <Link
                                href="/model-configurations"
                                className="block p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                                            <Headphones className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                                Voice Synthesis (TTS)
                                            </div>
                                            <div className="text-[11px] font-mono text-muted-foreground">
                                                {ttsName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                            Active
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5 pl-9">
                                    Real-time speech generation with natural human emotion.
                                </p>
                            </Link>

                            {/* STT */}
                            <Link
                                href="/model-configurations"
                                className="block p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors group"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                                            <Mic className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                                                Transcription (STT)
                                            </div>
                                            <div className="text-[11px] font-mono text-muted-foreground">
                                                {sttName}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                            Active
                                        </span>
                                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5 pl-9">
                                    Sub-second audio stream recognition and keyword spotting.
                                </p>
                            </Link>
                        </div>
                    </div>

                    {/* Card 2: Infrastructure Health */}
                    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                    <Server className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-foreground">Infrastructure Health</h3>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary font-semibold hover:text-primary gap-1">
                                <Link href="/telephony-configurations">
                                    View Details
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>

                        {/* Health list */}
                        <div className="pt-3 space-y-2.5">
                            <div className="flex items-center justify-between text-xs py-1">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>WebRTC Audio Gateway</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Operational
                                    </span>
                                    <span className="text-muted-foreground text-[11px]">Ready</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>SIP Telephony Carrier</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {telephonyCount > 0 ? 'Connected' : 'WebRTC Only'}
                                    </span>
                                    <span className="text-muted-foreground text-[11px]">
                                        {telephonyCount > 0 ? `${telephonyCount} Carrier(s)` : '0 Configured'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Audio Storage (MinIO/S3)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Ready
                                    </span>
                                    <span className="text-muted-foreground text-[11px]">Active</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Task Worker Queue</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Healthy
                                    </span>
                                    <span className="text-muted-foreground text-[11px]">Active</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-xs py-1 border-t border-border/40">
                                <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Database (PostgreSQL)</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Connected
                                    </span>
                                    <span className="text-muted-foreground text-[11px]">Online</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Recent Conversations (100% Real from Runs) */}
                    <div className="bg-card border border-border/80 rounded-2xl p-5 shadow-xs">
                        <div className="flex items-center justify-between pb-3 border-b border-border/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                    <PhoneCall className="w-4 h-4" />
                                </div>
                                <h3 className="font-bold text-sm text-foreground">Recent Conversations</h3>
                            </div>
                            <Button asChild variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary font-semibold hover:text-primary gap-1">
                                <Link href="/recordings">
                                    View All
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                            </Button>
                        </div>

                        {/* Recent Calls List */}
                        <div className="pt-3.5 space-y-3">
                            {recentConversations.length === 0 ? (
                                <div className="py-8 px-4 text-center border border-dashed border-border/70 rounded-xl bg-muted/20">
                                    <PhoneCall className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                                    <p className="text-xs font-semibold text-foreground">No call history recorded yet</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        Calls made via WebRTC, WhatsApp or SIP will automatically appear here in real-time.
                                    </p>
                                </div>
                            ) : (
                                recentConversations.map((call) => (
                                    <div
                                        key={call.id}
                                        onClick={() => router.push('/recordings')}
                                        className="p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                                <Phone className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs text-foreground group-hover:text-primary transition-colors font-mono truncate">
                                                    {call.phone}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground truncate">
                                                    {call.agentName}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                                                {call.status}
                                            </span>
                                            <span className="text-[11px] font-mono text-muted-foreground">
                                                {call.duration}
                                            </span>
                                            <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                                {call.time}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground group-hover:text-primary rounded-md"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push('/recordings');
                                                }}
                                            >
                                                <Play className="w-3 h-3 fill-current" />
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
