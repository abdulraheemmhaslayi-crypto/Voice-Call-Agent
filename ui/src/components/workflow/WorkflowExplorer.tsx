'use client';

import {
    Activity,
    Archive,
    ArrowUpRight,
    BarChart2,
    Bot,
    Calendar,
    Check,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Clock,
    Copy,
    Cpu,
    Filter,
    Folder as FolderIcon,
    HardDrive,
    Headphones,
    Inbox,
    Layers,
    LayoutGrid,
    List,
    Mic,
    MoreVertical,
    Percent,
    Pencil,
    Phone,
    PhoneCall,
    Play,
    Plus,
    Radio,
    RotateCcw,
    Search,
    Settings,
    SlidersHorizontal,
    TrendingUp,
    Users,
    Workflow,
    X,
    Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
    moveWorkflowToFolderApiV1WorkflowWorkflowIdFolderPut,
    updateWorkflowStatusApiV1WorkflowWorkflowIdStatusPut,
} from '@/client/sdk.gen';
import type { FolderResponse, WorkflowListResponse } from '@/client/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth';
import { WhatsAppCallDialog } from '@/app/workflow/[workflowId]/components/WhatsAppCallDialog';

import { AgentCard } from './AgentCard';
import { CreateWorkflowButton } from './CreateWorkflowButton';
import { CreateFolderButton } from './folders/CreateFolderButton';
import { UploadWorkflowButton } from './UploadWorkflowButton';

interface WorkflowExplorerProps {
    initialWorkflows: WorkflowListResponse[];
    initialArchivedWorkflows: WorkflowListResponse[];
    folders: FolderResponse[];
}

export function WorkflowExplorer({
    initialWorkflows,
    initialArchivedWorkflows,
    folders,
}: WorkflowExplorerProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [isPending, startTransition] = useTransition();

    // Filters and view mode state
    const [searchQuery, setSearchQuery] = useState('');
    const [statusTab, setStatusTab] = useState<'all' | 'active' | 'archived'>('active');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'activity' | 'name' | 'calls' | 'created'>('activity');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // Selected agent for the Right Inspector Panel (defaults to first active agent if available)
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(
        initialWorkflows[0]?.id ?? null
    );

    // Inspector active tab
    const [inspectorTab, setInspectorTab] = useState<'overview' | 'config' | 'runs' | 'files'>('overview');

    // Selected rows checkboxes
    const [selectedRowIds, setSelectedRowIds] = useState<Set<number>>(new Set());

    // WhatsApp Call Dialog state
    const [isWhatsAppCallDialogOpen, setIsWhatsAppCallDialogOpen] = useState(false);
    const [whatsAppCallAgent, setWhatsAppCallAgent] = useState<{ id: number; name: string } | null>(null);

    // Combine all workflows
    const allWorkflows = useMemo(() => {
        return [...initialWorkflows, ...initialArchivedWorkflows];
    }, [initialWorkflows, initialArchivedWorkflows]);

    const totalActive = initialWorkflows.length;
    const totalArchived = initialArchivedWorkflows.length;
    const totalRuns = initialWorkflows.reduce((sum, w) => sum + (w.total_runs || 0), 0);
    const totalFolders = folders.length;

    // Map folder id to folder name
    const folderMap = useMemo(() => {
        const map = new Map<number, string>();
        folders.forEach((f) => map.set(f.id, f.name));
        return map;
    }, [folders]);

    // Avatar background color based on initial index
    const getAvatarColor = (index: number) => {
        const colors = [
            'bg-blue-600 text-white',
            'bg-purple-600 text-white',
            'bg-blue-500 text-white',
            'bg-emerald-600 text-white',
            'bg-amber-600 text-white',
            'bg-rose-500 text-white',
        ];
        return colors[index % colors.length];
    };

    // Filter and sort workflows
    const filteredWorkflows = useMemo(() => {
        let list = allWorkflows.filter((wf) => {
            // Tab check
            if (statusTab === 'active' && wf.status !== 'active') return false;
            if (statusTab === 'archived' && wf.status !== 'archived') return false;

            // Status filter dropdown check
            if (statusFilter !== 'all' && wf.status !== statusFilter) return false;

            // Type / Folder filter
            if (typeFilter !== 'all') {
                if (typeFilter === 'uncategorized') {
                    if (wf.folder_id !== null && wf.folder_id !== undefined) return false;
                } else if (String(wf.folder_id) !== typeFilter) {
                    return false;
                }
            }

            // Search query
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const nameMatch = wf.name?.toLowerCase().includes(query);
                const idMatch = String(wf.id).includes(query);
                const folderName = wf.folder_id ? folderMap.get(wf.folder_id)?.toLowerCase() : '';
                const folderMatch = folderName ? folderName.includes(query) : false;
                if (!nameMatch && !idMatch && !folderMatch) return false;
            }

            return true;
        });

        // Sorting
        return list.sort((a, b) => {
            if (sortBy === 'calls') {
                return (b.total_runs || 0) - (a.total_runs || 0);
            }
            if (sortBy === 'name') {
                return a.name.localeCompare(b.name);
            }
            if (sortBy === 'created') {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            // default 'activity' (latest created/run)
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [allWorkflows, statusTab, statusFilter, typeFilter, searchQuery, sortBy, folderMap]);

    // Active selected agent object
    const selectedAgent = useMemo(() => {
        return allWorkflows.find((w) => w.id === selectedAgentId) || null;
    }, [allWorkflows, selectedAgentId]);

    // Archive / Restore action handler
    const handleArchiveToggle = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        const action = currentStatus === 'active' ? 'Archive' : 'Restore';

        try {
            const response = await updateWorkflowStatusApiV1WorkflowWorkflowIdStatusPut({
                path: { workflow_id: id },
                body: { status: newStatus },
            });

            if (response.data) {
                toast.success(`Agent ${action.toLowerCase()}d successfully`);
                startTransition(() => {
                    router.refresh();
                });
            }
        } catch (error) {
            console.error(`Error ${action.toLowerCase()}ing agent:`, error);
            toast.error(`Failed to ${action.toLowerCase()} agent`);
        }
    };

    // Move to folder handler
    const handleMove = async (id: number, folderId: number | null) => {
        try {
            const response = await moveWorkflowToFolderApiV1WorkflowWorkflowIdFolderPut({
                path: { workflow_id: id },
                body: { folder_id: folderId },
            });
            if (response.error) {
                throw new Error('Failed to move agent');
            }
            toast.success(folderId === null ? 'Moved to Uncategorized' : 'Agent moved to folder');
            startTransition(() => {
                router.refresh();
            });
        } catch (error) {
            console.error('Error moving workflow:', error);
            toast.error('Failed to move agent');
        }
    };

    // Handle test web call
    const handleTestCall = (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        router.push(`/workflow/${id}?onboarding=web_call`);
    };

    // Select all checkboxes toggle
    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedRowIds(new Set(filteredWorkflows.map((w) => w.id)));
        } else {
            setSelectedRowIds(new Set());
        }
    };

    const handleRowCheckbox = (id: number, checked: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        const next = new Set(selectedRowIds);
        if (checked) {
            next.add(id);
        } else {
            next.delete(id);
        }
        setSelectedRowIds(next);
    };

    return (
        <div className="space-y-6">
            {/* Breadcrumb & Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
                <div>
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mb-1.5">
                        <span>Voice Agents</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50" />
                        <span className="text-foreground font-medium">Active Agents</span>
                    </div>

                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                            Active Agents
                        </h1>
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                        </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Build, deploy, and manage conversational AI voice agents for live calls.
                    </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    <UploadWorkflowButton />
                    <CreateFolderButton />
                    <CreateWorkflowButton />
                </div>
            </div>

            {/* 4 Top KPI Metric Cards (Slim & Compact, Strictly Solid Colors, No Gradients) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Active Agents */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-muted-foreground block">Active Agents</span>
                            <div className="text-2xl font-semibold tracking-tight text-foreground">
                                {totalActive}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Ready for calls
                            </div>
                        </div>
                    </div>
                </div>

                {/* 2. Total Calls / Runs */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0">
                            <Phone className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-muted-foreground block">Total Calls / Runs</span>
                            <div className="text-2xl font-semibold tracking-tight text-foreground">
                                {totalRuns.toLocaleString()}
                            </div>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                                Conversations handled
                            </span>
                        </div>
                    </div>
                    {/* Small vertical bar chart indicator */}
                    <div className="flex items-end gap-1 h-7 pr-2">
                        <span className="w-1 bg-blue-600/40 rounded-full h-3" />
                        <span className="w-1 bg-blue-600/60 rounded-full h-5" />
                        <span className="w-1 bg-blue-600 rounded-full h-7" />
                        <span className="w-1 bg-blue-600/70 rounded-full h-4" />
                    </div>
                </div>

                {/* 3. Organized Folders */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0">
                            <FolderIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-muted-foreground block">Organized Folders</span>
                            <div className="text-2xl font-semibold tracking-tight text-foreground">
                                {totalFolders}
                            </div>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                                Categorized groups
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Voice Engine */}
                <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs flex items-center justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center border border-blue-500/20 shrink-0">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <span className="text-[11px] font-medium text-muted-foreground block">Voice Engine</span>
                            <div className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-1.5 mt-0.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Operational
                            </div>
                            <span className="text-[11px] text-muted-foreground block mt-0.5">
                                WebRTC & SIP Telephony
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Status Tabs & View Mode Row */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
                {/* Tabs */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setStatusTab('all')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusTab === 'all'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <span>All Agents</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded-full font-mono">
                            {allWorkflows.length}
                        </span>
                    </button>

                    <button
                        onClick={() => setStatusTab('active')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusTab === 'active'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <span>Active</span>
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.2 rounded-full font-mono">
                            {totalActive}
                        </span>
                    </button>

                    <button
                        onClick={() => setStatusTab('archived')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            statusTab === 'archived'
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <span>Archived</span>
                        <span className="text-[10px] bg-muted px-1.5 py-0.2 rounded-full font-mono">
                            {totalArchived}
                        </span>
                    </button>
                </div>

                {/* View Mode Buttons */}
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-medium gap-1.5 border-border/80 bg-card">
                                <List className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{viewMode === 'list' ? 'List View' : 'Grid View'}</span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 text-xs">
                            <DropdownMenuItem onClick={() => setViewMode('list')} className="cursor-pointer">
                                <List className="w-3.5 h-3.5 mr-2" />
                                List View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setViewMode('grid')} className="cursor-pointer">
                                <LayoutGrid className="w-3.5 h-3.5 mr-2" />
                                Grid View
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="icon"
                        onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                        title="Toggle View Mode"
                        className="h-8 w-8 rounded-lg"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Filter & Search Controls Bar */}
            <div className="bg-card border border-border/80 rounded-2xl p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                {/* Search Input */}
                <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Search agents by name or #ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 pr-8 h-9 text-xs bg-muted/30 border-border/60 focus-visible:ring-1"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Dropdowns */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-medium gap-1.5 border-border/70 bg-card">
                                <span>{statusFilter === 'all' ? 'All Status' : statusFilter === 'active' ? 'Active' : 'Archived'}</span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32 text-xs">
                            <DropdownMenuItem onClick={() => setStatusFilter('all')} className="cursor-pointer">All Status</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('active')} className="cursor-pointer">Active</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusFilter('archived')} className="cursor-pointer">Archived</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Type / Folder Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-medium gap-1.5 border-border/70 bg-card">
                                <span>
                                    {typeFilter === 'all'
                                        ? 'All Types'
                                        : typeFilter === 'uncategorized'
                                          ? 'Uncategorized'
                                          : folderMap.get(Number(typeFilter)) || 'Folder'}
                                </span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 text-xs">
                            <DropdownMenuItem onClick={() => setTypeFilter('all')} className="cursor-pointer">All Types</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setTypeFilter('uncategorized')} className="cursor-pointer">Uncategorized</DropdownMenuItem>
                            {folders.map((f) => (
                                <DropdownMenuItem key={f.id} onClick={() => setTypeFilter(String(f.id))} className="cursor-pointer truncate">
                                    {f.name}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Sort by Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-9 text-xs font-medium gap-1.5 border-border/70 bg-card">
                                <span>
                                    {sortBy === 'activity'
                                        ? 'Sort by Last Activity'
                                        : sortBy === 'name'
                                          ? 'Sort by Name'
                                          : sortBy === 'calls'
                                            ? 'Sort by Total Calls'
                                            : 'Sort by Created Date'}
                                </span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem onClick={() => setSortBy('activity')} className="cursor-pointer">Last Activity</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('name')} className="cursor-pointer">Name (A-Z)</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('calls')} className="cursor-pointer">Total Calls</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSortBy('created')} className="cursor-pointer">Created Date</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Funnel Icon */}
                    <Button variant="outline" size="icon" className="h-9 w-9 border-border/70 bg-card" title="Filters">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {/* Main Content Area: Master-Detail Split Layout */}
            {viewMode === 'grid' ? (
                /* Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredWorkflows.map((wf) => (
                        <AgentCard
                            key={wf.id}
                            workflow={wf}
                            folders={folders}
                            onArchiveToggle={handleArchiveToggle}
                            onMove={handleMove}
                            folderName={wf.folder_id ? folderMap.get(wf.folder_id) : null}
                        />
                    ))}
                </div>
            ) : (
                /* List Master-Detail Split View (Matching Reference Image!) */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left Table Panel: Takes 8 cols if an agent is selected, or 12 cols if none */}
                    <div className={`${selectedAgent ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
                        <div className="bg-card border border-border/80 rounded-2xl overflow-hidden shadow-xs">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="hover:bg-transparent border-b border-border/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                                        <TableHead className="w-10 pl-4 py-3">
                                            <Checkbox
                                                checked={selectedRowIds.size > 0 && selectedRowIds.size === filteredWorkflows.length}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="w-10 py-3">#</TableHead>
                                        <TableHead className="py-3">Agent</TableHead>
                                        <TableHead className="py-3">Status</TableHead>
                                        <TableHead className="py-3">Total Calls</TableHead>
                                        <TableHead className="py-3">Created</TableHead>
                                        <TableHead className="py-3">Type / Channel</TableHead>
                                        <TableHead className="py-3">Last Activity</TableHead>
                                        <TableHead className="py-3 pr-5 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredWorkflows.length > 0 ? (
                                        filteredWorkflows.map((workflow, index) => {
                                            const isSelected = selectedAgentId === workflow.id;
                                            const isChecked = selectedRowIds.has(workflow.id);
                                            const initial = workflow.name.charAt(0).toUpperCase() || 'W';
                                            const isArchived = workflow.status === 'archived';

                                            const formattedDate = new Date(workflow.created_at).toLocaleDateString('en-US', {
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric',
                                            });

                                            return (
                                                <TableRow
                                                    key={workflow.id}
                                                    onClick={() => setSelectedAgentId(workflow.id)}
                                                    className={`group cursor-pointer border-b border-border/40 last:border-0 transition-all ${
                                                        isSelected
                                                            ? 'bg-primary/5 hover:bg-primary/10'
                                                            : 'hover:bg-muted/30'
                                                    }`}
                                                >
                                                    {/* Checkbox */}
                                                    <TableCell className="pl-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox
                                                            checked={isChecked}
                                                            onCheckedChange={(checked) => handleRowCheckbox(workflow.id, Boolean(checked), e)}
                                                        />
                                                    </TableCell>

                                                    {/* ID # */}
                                                    <TableCell className="py-3.5 text-xs text-muted-foreground font-mono">
                                                        {workflow.id}
                                                    </TableCell>

                                                    {/* Agent Name with Avatar */}
                                                    <TableCell className="py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs shrink-0 shadow-2xs ${getAvatarColor(index)}`}>
                                                                {initial}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[180px]">
                                                                    {workflow.name}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </TableCell>

                                                    {/* Status Badge */}
                                                    <TableCell className="py-3.5">
                                                        {!isArchived ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                Active
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                                                                Archived
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    {/* Total Calls */}
                                                    <TableCell className="py-3.5 text-xs font-medium text-foreground font-mono">
                                                        {workflow.total_runs || 0}
                                                    </TableCell>

                                                    {/* Created Date */}
                                                    <TableCell className="py-3.5 text-xs text-muted-foreground">
                                                        {formattedDate}
                                                    </TableCell>

                                                    {/* Type / Channel */}
                                                    <TableCell className="py-3.5">
                                                        <div className="inline-flex items-center gap-1.5 text-xs text-foreground font-medium">
                                                            <Workflow className="w-3.5 h-3.5 text-blue-600" />
                                                            <span>Workflow</span>
                                                        </div>
                                                    </TableCell>

                                                    {/* Last Activity */}
                                                    <TableCell className="py-3.5">
                                                        <div className="text-xs">
                                                            <div className="flex items-center gap-1 text-foreground font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                                                <span>Today, 10:21 AM</span>
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground pl-2.5">Recent call</span>
                                                        </div>
                                                    </TableCell>

                                                    {/* Action Buttons */}
                                                    <TableCell className="py-3.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-end gap-1">
                                                            {/* Play / Test Button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={(e) => handleTestCall(workflow.id, e)}
                                                                title="Test Call"
                                                                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-500/10 rounded-lg"
                                                            >
                                                                <Play className="w-3.5 h-3.5 fill-current" />
                                                            </Button>

                                                            {/* Edit Button */}
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => router.push(`/workflow/${workflow.id}`)}
                                                                title="Edit Agent"
                                                                className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                            </Button>

                                                            {/* Dropdown Menu */}
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
                                                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                                                    <DropdownMenuItem onClick={() => router.push(`/workflow/${workflow.id}`)} className="cursor-pointer">
                                                                        <Pencil className="w-3.5 h-3.5 mr-2" />
                                                                        Edit Workflow
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={(e) => handleTestCall(workflow.id, e)} className="cursor-pointer">
                                                                        <Play className="w-3.5 h-3.5 mr-2" />
                                                                        Test Web Call
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem onClick={() => {
                                                                        navigator.clipboard.writeText(String(workflow.id));
                                                                        toast.success(`Agent ID #${workflow.id} copied`);
                                                                    }} className="cursor-pointer">
                                                                        <Copy className="w-3.5 h-3.5 mr-2" />
                                                                        Copy Agent ID
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        onClick={() => handleArchiveToggle(workflow.id, workflow.status)}
                                                                        className="cursor-pointer text-destructive focus:text-destructive"
                                                                    >
                                                                        {isArchived ? (
                                                                            <>
                                                                                <RotateCcw className="w-3.5 h-3.5 mr-2" />
                                                                                Restore Agent
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <Archive className="w-3.5 h-3.5 mr-2" />
                                                                                Archive Agent
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
                                                No voice agents found matching your filter criteria.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            {/* Table Footer */}
                            <div className="p-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                                <div>
                                    Showing 1–{filteredWorkflows.length} of {allWorkflows.length} agents
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-md" disabled>
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </Button>
                                    <span className="h-7 px-2.5 flex items-center justify-center font-medium text-foreground bg-primary/10 rounded-md text-xs">
                                        1
                                    </span>
                                    <Button variant="outline" size="icon" className="h-7 w-7 rounded-md" disabled>
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Inspector Panel: Shows when an agent is selected */}
                    {selectedAgent && (
                        <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-5 shadow-xs space-y-5 animate-in fade-in-50 duration-200">
                            {/* Drawer Header */}
                            <div className="flex items-start justify-between pb-3 border-b border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-medium text-sm shadow-2xs">
                                        {selectedAgent.name.charAt(0).toUpperCase() || 'W'}
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-base text-foreground truncate max-w-[180px]">
                                            {selectedAgent.name}
                                        </h3>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            #{selectedAgent.id}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        Active
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setSelectedAgentId(null)}
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                                    >
                                        <X className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Inspector Navigation Tabs */}
                            <div className="flex items-center gap-4 text-xs font-medium border-b border-border/60 pb-2">
                                <button
                                    onClick={() => setInspectorTab('overview')}
                                    className={`transition-colors pb-1 relative ${
                                        inspectorTab === 'overview'
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Overview
                                    {inspectorTab === 'overview' && (
                                        <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setInspectorTab('config')}
                                    className={`transition-colors pb-1 relative ${
                                        inspectorTab === 'config'
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Configuration
                                    {inspectorTab === 'config' && (
                                        <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setInspectorTab('runs')}
                                    className={`transition-colors pb-1 relative ${
                                        inspectorTab === 'runs'
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Runs
                                    {inspectorTab === 'runs' && (
                                        <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setInspectorTab('files')}
                                    className={`transition-colors pb-1 relative ${
                                        inspectorTab === 'files'
                                            ? 'text-primary'
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    Files
                                    {inspectorTab === 'files' && (
                                        <span className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-primary" />
                                    )}
                                </button>
                            </div>

                            {/* 4 Quick Stat Tiles (2x2 Grid) */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Total Calls */}
                                <div className="bg-muted/40 rounded-xl p-3 border border-border/60">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
                                        <Phone className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Total Calls</span>
                                    </div>
                                    <div className="text-base font-semibold text-foreground mt-1">
                                        {selectedAgent.total_runs || 0}
                                    </div>
                                </div>

                                {/* Created */}
                                <div className="bg-muted/40 rounded-xl p-3 border border-border/60">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
                                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span>Created</span>
                                    </div>
                                    <div className="text-xs font-medium text-foreground mt-1.5 truncate">
                                        {new Date(selectedAgent.created_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })}
                                    </div>
                                </div>

                                {/* Avg Call Duration */}
                                <div className="bg-muted/40 rounded-xl p-3 border border-border/60">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
                                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Avg. Call Duration</span>
                                    </div>
                                    <div className="text-base font-semibold text-foreground mt-1">
                                        3m 24s
                                    </div>
                                </div>

                                {/* Success Rate */}
                                <div className="bg-muted/40 rounded-xl p-3 border border-border/60">
                                    <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
                                        <Percent className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Success Rate</span>
                                    </div>
                                    <div className="text-base font-semibold text-foreground mt-1">
                                        92%
                                    </div>
                                </div>
                            </div>

                            {/* Agent Metadata List */}
                            <div className="space-y-3 pt-2 text-xs">
                                <div className="flex items-center justify-between py-1">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Workflow className="w-3.5 h-3.5 text-muted-foreground" />
                                        Type
                                    </span>
                                    <span className="font-medium text-foreground">Workflow</span>
                                </div>

                                <div className="flex items-center justify-between py-1 border-t border-border/40">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Mic className="w-3.5 h-3.5 text-muted-foreground" />
                                        Channel
                                    </span>
                                    <span className="font-medium text-foreground">Voice (WebRTC)</span>
                                </div>

                                <div className="flex items-center justify-between py-1 border-t border-border/40">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
                                        Model
                                    </span>
                                    <span className="font-mono font-medium text-foreground">Qwen3:8b</span>
                                </div>

                                <div className="flex items-center justify-between py-1 border-t border-border/40">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        Last Activity
                                    </span>
                                    <span className="font-medium text-foreground flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                        Today, 10:21 AM
                                    </span>
                                </div>

                                <div className="flex items-center justify-between py-1 border-t border-border/40">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                        Created By
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {user?.display_name || user?.email?.split('@')[0] || 'Rahman'}
                                    </span>
                                </div>
                            </div>

                            {/* Inspector Action Buttons */}
                            <div className="pt-3 space-y-2">
                                {/* Primary Run Agent Button */}
                                <Button
                                    onClick={(e) => handleTestCall(selectedAgent.id, e)}
                                    className="w-full h-10 font-medium text-xs bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-2"
                                >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Run Agent
                                </Button>

                                {/* WhatsApp Call Link Button */}
                                <Button
                                    type="button"
                                    onClick={() => {
                                        setWhatsAppCallAgent({ id: selectedAgent.id, name: selectedAgent.name });
                                        setIsWhatsAppCallDialogOpen(true);
                                    }}
                                    className="w-full h-9 font-medium text-xs bg-[#25D366] text-white hover:bg-[#20bd5a] shadow-xs gap-2"
                                >
                                    <PhoneCall className="w-3.5 h-3.5" />
                                    WhatsApp Call Link
                                </Button>

                                {/* Edit Agent Outline Button */}
                                <Button
                                    variant="outline"
                                    onClick={() => router.push(`/workflow/${selectedAgent.id}`)}
                                    className="w-full h-9 font-medium text-xs border-border/80 gap-2 hover:bg-muted"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                    Edit Agent
                                </Button>

                                {/* View Runs + Options row */}
                                <div className="flex items-center gap-2 pt-1">
                                    <Button
                                        variant="outline"
                                        onClick={() => router.push(`/workflow/${selectedAgent.id}`)}
                                        className="flex-1 h-9 font-medium text-xs border-border/80 gap-2 hover:bg-muted"
                                    >
                                        <BarChart2 className="w-3.5 h-3.5" />
                                        View Runs
                                    </Button>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="h-9 w-9 border-border/80 rounded-lg">
                                                <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48 text-xs">
                                            <DropdownMenuItem
                                                onClick={() => {
                                                    setWhatsAppCallAgent({ id: selectedAgent.id, name: selectedAgent.name });
                                                    setIsWhatsAppCallDialogOpen(true);
                                                }}
                                                className="cursor-pointer text-[#25D366] font-medium"
                                            >
                                                <PhoneCall className="w-3.5 h-3.5 mr-2 text-[#25D366]" />
                                                WhatsApp Call Link
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => {
                                                navigator.clipboard.writeText(String(selectedAgent.id));
                                                toast.success(`Agent ID #${selectedAgent.id} copied`);
                                            }} className="cursor-pointer">
                                                <Copy className="w-3.5 h-3.5 mr-2" />
                                                Copy ID
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => router.push(`/workflow/${selectedAgent.id}`)} className="cursor-pointer">
                                                <Pencil className="w-3.5 h-3.5 mr-2" />
                                                Edit Workflow
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleArchiveToggle(selectedAgent.id, selectedAgent.status)}
                                                className="cursor-pointer text-destructive focus:text-destructive"
                                            >
                                                <Archive className="w-3.5 h-3.5 mr-2" />
                                                Archive Agent
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {whatsAppCallAgent && (
                <WhatsAppCallDialog
                    open={isWhatsAppCallDialogOpen}
                    onOpenChange={setIsWhatsAppCallDialogOpen}
                    workflowId={whatsAppCallAgent.id}
                    workflowName={whatsAppCallAgent.name}
                />
            )}
        </div>
    );
}
