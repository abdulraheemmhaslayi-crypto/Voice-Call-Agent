import { Suspense } from 'react';

import { getWorkflowsApiV1WorkflowFetchGet, listFoldersApiV1FolderGet } from '@/client/sdk.gen';
import type { FolderResponse, WorkflowListResponse } from '@/client/types.gen';
import { WorkflowExplorer } from '@/components/workflow/WorkflowExplorer';
import { getServerAccessToken, getServerAuthProvider } from '@/lib/auth/server';
import logger from '@/lib/logger';

import WorkflowLayout from "./WorkflowLayout";

export const dynamic = 'force-dynamic';

// Server component for workflow list
async function WorkflowList() {
    const authProvider = await getServerAuthProvider();
    const accessToken = await getServerAccessToken();

    if (!accessToken) {
        const { redirect } = await import('next/navigation');
        if (authProvider === 'stack') {
            redirect('/');
        } else {
            return (
                <div className="text-destructive p-4 border border-destructive/30 rounded-lg bg-destructive/10 text-sm">
                    Authentication required. Please refresh the page.
                </div>
            );
        }
    }

    try {
        const response = await getWorkflowsApiV1WorkflowFetchGet({
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            query: {
                status: 'active,archived',
            },
        });

        const allWorkflowData = response.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [];

        // Separate active and archived workflows
        const activeWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'active')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const archivedWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'archived')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        let folders: FolderResponse[] = [];
        try {
            const foldersResponse = await listFoldersApiV1FolderGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            folders = foldersResponse.data ?? [];
        } catch (folderErr) {
            logger.error(`Error fetching folders: ${folderErr}`);
        }

        return (
            <WorkflowExplorer
                initialWorkflows={activeWorkflows}
                initialArchivedWorkflows={archivedWorkflows}
                folders={folders}
            />
        );
    } catch (err) {
        logger.error(`Error fetching workflows: ${err}`);
        return (
            <div className="text-destructive p-4 border border-destructive/30 rounded-lg bg-destructive/10 text-sm">
                Failed to load Workflows. Please try again later.
            </div>
        );
    }
}

function WorkflowsLoading() {
    return (
        <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="mb-8 flex justify-between items-center">
                <div className="h-8 w-48 bg-muted animate-pulse rounded-md" />
                <div className="h-10 w-36 bg-muted animate-pulse rounded-md" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-xl h-24" />
                ))}
            </div>
            <div className="h-14 bg-muted animate-pulse rounded-xl mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-2xl h-48" />
                ))}
            </div>
        </div>
    );
}

export default function WorkflowPage() {
    return (
        <WorkflowLayout showFeaturesNav={true}>
            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
                <Suspense fallback={<WorkflowsLoading />}>
                    <WorkflowList />
                </Suspense>
            </div>
        </WorkflowLayout>
    );
}
