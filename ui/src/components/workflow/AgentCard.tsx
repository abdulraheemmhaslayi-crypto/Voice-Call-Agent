'use client';

import {
    Activity,
    Archive,
    Bot,
    Calendar,
    Check,
    Copy,
    Folder as FolderIcon,
    Inbox,
    MoreVertical,
    Pencil,
    RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import type { FolderResponse } from '@/client/types.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface WorkflowItem {
    id: number;
    name: string;
    status: string;
    created_at: string;
    total_runs?: number | null;
    folder_id?: number | null;
    workflow_uuid?: string | null;
}

interface AgentCardProps {
    workflow: WorkflowItem;
    folders?: FolderResponse[];
    onArchiveToggle?: (id: number, currentStatus: string) => Promise<void>;
    onMove?: (id: number, folderId: number | null) => Promise<void>;
    folderName?: string | null;
}

export function AgentCard({
    workflow,
    folders = [],
    onArchiveToggle,
    onMove,
    folderName,
}: AgentCardProps) {
    const router = useRouter();
    const [isActionLoading, setIsActionLoading] = useState(false);

    const isArchived = workflow.status === 'archived';
    const runs = workflow.total_runs || 0;

    const handleEdit = () => {
        router.push(`/workflow/${workflow.id}`);
    };

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(String(workflow.id));
        toast.success(`Agent ID #${workflow.id} copied to clipboard`);
    };

    const handleArchive = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onArchiveToggle) return;
        setIsActionLoading(true);
        try {
            await onArchiveToggle(workflow.id, workflow.status);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleMoveFolder = async (folderId: number | null) => {
        if (!onMove) return;
        setIsActionLoading(true);
        try {
            await onMove(workflow.id, folderId);
        } finally {
            setIsActionLoading(false);
        }
    };

    const formattedDate = new Date(workflow.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div
            onClick={handleEdit}
            className={`group relative bg-card hover:bg-card/95 border border-border/80 hover:border-primary/50 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isArchived ? 'opacity-65' : ''
            }`}
        >
            {/* Top row: Avatar, Info & Status */}
            <div>
                <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 group-hover:scale-105 group-hover:bg-primary/15 transition-all">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-base text-foreground group-hover:text-primary transition-colors truncate">
                                    {workflow.name}
                                </h3>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                <span className="font-mono text-muted-foreground/80">#{workflow.id}</span>
                                {folderName && (
                                    <>
                                        <span>•</span>
                                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                                            <FolderIcon className="w-3 h-3" />
                                            <span className="truncate max-w-[100px]">{folderName}</span>
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className="shrink-0 flex items-center gap-1.5">
                        {!isArchived ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full">
                                Archived
                            </span>
                        )}
                    </div>
                </div>

                {/* Metrics / Info Badges */}
                <div className="grid grid-cols-2 gap-2 pt-3 pb-4 border-t border-border/50">
                    <div className="bg-muted/40 rounded-lg p-2.5 border border-border/40">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
                            <Activity className="w-3.5 h-3.5 text-primary" />
                            <span>Total Calls</span>
                        </div>
                        <div className="text-base font-semibold text-foreground mt-1 tracking-tight">
                            {runs.toLocaleString()}
                        </div>
                    </div>

                    <div className="bg-muted/40 rounded-lg p-2.5 border border-border/40">
                        <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-medium">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Created</span>
                        </div>
                        <div className="text-xs font-medium text-foreground mt-1 truncate">
                            {formattedDate}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Action Footer */}
            <div
                className="flex items-center justify-between pt-3 border-t border-border/60 mt-1"
                onClick={(e) => e.stopPropagation()}
            >
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEdit}
                    className="h-8.5 px-3.5 text-xs font-medium gap-1.5 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors rounded-lg flex-1 justify-center mr-2 shadow-2xs"
                >
                    <Pencil size={13} />
                    Edit Agent Workflow
                </Button>

                {/* Dropdown Options */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={isActionLoading}
                            className="h-8.5 w-8.5 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                            <MoreVertical size={16} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={handleCopyId} className="cursor-pointer">
                            <Copy size={14} className="mr-2" />
                            Copy Agent ID
                        </DropdownMenuItem>

                        {folders && folders.length > 0 && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                                    Move to folder
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                    disabled={workflow.folder_id === null || workflow.folder_id === undefined}
                                    onClick={() => handleMoveFolder(null)}
                                    className="cursor-pointer"
                                >
                                    <Inbox size={14} className="mr-2" />
                                    Uncategorized
                                    {(workflow.folder_id === null || workflow.folder_id === undefined) && (
                                        <Check size={14} className="ml-auto" />
                                    )}
                                </DropdownMenuItem>
                                {folders.map((folder) => (
                                    <DropdownMenuItem
                                        key={folder.id}
                                        disabled={folder.id === workflow.folder_id}
                                        onClick={() => handleMoveFolder(folder.id)}
                                        className="cursor-pointer"
                                    >
                                        <FolderIcon size={14} className="mr-2 text-amber-500" />
                                        <span className="truncate">{folder.name}</span>
                                        {folder.id === workflow.folder_id && (
                                            <Check size={14} className="ml-auto shrink-0" />
                                        )}
                                    </DropdownMenuItem>
                                ))}
                            </>
                        )}

                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleArchive}
                            className={`cursor-pointer ${isArchived ? 'text-foreground' : 'text-destructive focus:text-destructive'}`}
                        >
                            {isArchived ? (
                                <>
                                    <RotateCcw size={14} className="mr-2" />
                                    Restore Agent
                                </>
                            ) : (
                                <>
                                    <Archive size={14} className="mr-2" />
                                    Archive Agent
                                </>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
