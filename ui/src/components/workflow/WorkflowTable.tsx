'use client';

import {
    Activity,
    Archive,
    Bot,
    Check,
    ChevronRight,
    Folder as FolderIcon,
    FolderInput,
    Inbox,
    MoreVertical,
    Pencil,
    RotateCcw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
    moveWorkflowToFolderApiV1WorkflowWorkflowIdFolderPut,
    updateWorkflowStatusApiV1WorkflowWorkflowIdStatusPut,
} from '@/client/sdk.gen';
import type { FolderResponse } from '@/client/types.gen';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Workflow {
    id: number;
    name: string;
    status: string;
    created_at: string;
    total_runs?: number | null;
    folder_id?: number | null;
}

interface WorkflowTableProps {
    workflows: Workflow[];
    showArchived: boolean;
    folders?: FolderResponse[];
    currentFolderId?: number | null;
}

export function WorkflowTable({
    workflows,
    showArchived,
    folders,
    currentFolderId = null,
}: WorkflowTableProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [loadingWorkflowId, setLoadingWorkflowId] = useState<number | null>(null);
    const [movingWorkflowId, setMovingWorkflowId] = useState<number | null>(null);

    const handleEdit = (id: number) => {
        router.push(`/workflow/${id}`);
    };

    const handleArchiveToggle = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'archived' : 'active';
        const action = currentStatus === 'active' ? 'Archive' : 'Restore';

        setLoadingWorkflowId(id);

        try {
            const response = await updateWorkflowStatusApiV1WorkflowWorkflowIdStatusPut({
                path: {
                    workflow_id: id,
                },
                body: {
                    status: newStatus,
                },
            });

            if (response.data) {
                toast.success(`Workflow ${action.toLowerCase()}d successfully`);
                startTransition(() => {
                    router.refresh();
                });
            }
        } catch (error) {
            console.error(`Error ${action.toLowerCase()}ing workflow:`, error);
            toast.error(`Failed to ${action.toLowerCase()} workflow`);
        } finally {
            setLoadingWorkflowId(null);
        }
    };

    const handleMove = async (id: number, folderId: number | null) => {
        setMovingWorkflowId(id);
        try {
            const response = await moveWorkflowToFolderApiV1WorkflowWorkflowIdFolderPut({
                path: { workflow_id: id },
                body: { folder_id: folderId },
            });
            if (response.error) {
                throw new Error('Failed to move agent');
            }
            toast.success(
                folderId === null ? 'Moved to Uncategorized' : 'Agent moved',
            );
            startTransition(() => {
                router.refresh();
            });
        } catch (error) {
            console.error('Error moving workflow:', error);
            toast.error('Failed to move agent');
        } finally {
            setMovingWorkflowId(null);
        }
    };

    return (
        <div className="bg-card border border-border/80 rounded-xl overflow-hidden shadow-xs">
            <Table>
                <TableHeader className="bg-muted/40 border-b border-border/60">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 pl-5">
                            Agent
                        </TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                            Status
                        </TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5">
                            Activity
                        </TableHead>
                        <TableHead className="font-semibold text-xs text-muted-foreground uppercase tracking-wider py-3.5 text-right pr-5">
                            Actions
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {workflows.map((workflow) => {
                        const isArchived = workflow.status === 'archived';
                        return (
                            <TableRow
                                key={workflow.id}
                                onClick={() => handleEdit(workflow.id)}
                                className={`group cursor-pointer hover:bg-muted/40 transition-colors border-b border-border/40 last:border-0 ${
                                    isArchived ? 'opacity-60' : ''
                                }`}
                            >
                                {/* Agent Info */}
                                <TableCell className="py-3.5 pl-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                            <Bot className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                                {workflow.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                ID: #{workflow.id} · Created {new Date(workflow.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </TableCell>

                                {/* Status */}
                                <TableCell className="py-3.5">
                                    {workflow.status === 'active' ? (
                                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center text-xs font-medium text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full">
                                            Archived
                                        </span>
                                    )}
                                </TableCell>

                                {/* Activity / Runs */}
                                <TableCell className="py-3.5">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground bg-muted/70 px-2.5 py-1 rounded-md border border-border/50">
                                        <Activity className="w-3.5 h-3.5 text-primary" />
                                        <span>{workflow.total_runs || 0} runs</span>
                                    </span>
                                </TableCell>

                                {/* Actions */}
                                <TableCell className="py-3.5 text-right pr-5" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(workflow.id)}
                                            className="h-8 px-3 text-xs font-medium gap-1.5 hover:bg-primary hover:text-primary-foreground transition-colors"
                                        >
                                            <Pencil size={13} />
                                            Edit
                                        </Button>

                                        {/* Dropdown for Move and Archive */}
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                >
                                                    <MoreVertical size={15} />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-48">
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(String(workflow.id));
                                                        toast.success(`Agent ID #${workflow.id} copied`);
                                                    }}
                                                    className="cursor-pointer"
                                                >
                                                    Copy Agent ID
                                                </DropdownMenuItem>
                                                {folders && (
                                                    <>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
                                                            Move to folder
                                                        </DropdownMenuLabel>
                                                        <DropdownMenuItem
                                                            disabled={currentFolderId === null}
                                                            onClick={() => handleMove(workflow.id, null)}
                                                        >
                                                            <Inbox size={14} className="mr-2" />
                                                            Uncategorized
                                                            {currentFolderId === null && (
                                                                <Check size={14} className="ml-auto" />
                                                            )}
                                                        </DropdownMenuItem>
                                                        {folders.map((folder) => (
                                                            <DropdownMenuItem
                                                                key={folder.id}
                                                                disabled={folder.id === currentFolderId}
                                                                onClick={() => handleMove(workflow.id, folder.id)}
                                                            >
                                                                <FolderIcon size={14} className="mr-2" />
                                                                <span className="truncate">{folder.name}</span>
                                                                {folder.id === currentFolderId && (
                                                                    <Check size={14} className="ml-auto shrink-0" />
                                                                )}
                                                            </DropdownMenuItem>
                                                        ))}
                                                        <DropdownMenuSeparator />
                                                    </>
                                                )}

                                                <DropdownMenuItem
                                                    onClick={() => handleArchiveToggle(workflow.id, workflow.status)}
                                                    disabled={loadingWorkflowId === workflow.id || isPending}
                                                    className={showArchived ? "" : "text-destructive focus:text-destructive"}
                                                >
                                                    {showArchived ? (
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
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
