import { Suspense } from 'react';

import {
    getModelConfigurationV2ApiV1OrganizationsModelConfigurationsV2Get,
    getUsageHistoryApiV1OrganizationsUsageRunsGet,
    getWorkflowsApiV1WorkflowFetchGet,
    listFoldersApiV1FolderGet,
    listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet,
} from '@/client/sdk.gen';
import type {
    FolderResponse,
    OrganizationAiModelConfigurationResponse,
    TelephonyConfigurationListItem,
    UsageHistoryResponse,
    WorkflowListResponse,
} from '@/client/types.gen';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { getServerAccessToken, getServerAuthProvider } from '@/lib/auth/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function OverviewData() {
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

    let activeWorkflows: WorkflowListResponse[] = [];
    let archivedWorkflows: WorkflowListResponse[] = [];
    let folders: FolderResponse[] = [];
    let modelConfig: OrganizationAiModelConfigurationResponse | null = null;
    let usageHistory: UsageHistoryResponse | null = null;
    let telephonyConfigs: TelephonyConfigurationListItem[] = [];

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

        activeWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'active')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        archivedWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'archived')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } catch (err) {
        logger.error(`Error fetching workflows for overview: ${err}`);
    }

    try {
        const foldersResponse = await listFoldersApiV1FolderGet({
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        folders = foldersResponse.data ?? [];
    } catch (folderErr) {
        logger.error(`Error fetching folders for overview: ${folderErr}`);
    }

    try {
        const modelConfigResponse = await getModelConfigurationV2ApiV1OrganizationsModelConfigurationsV2Get({
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (modelConfigResponse.data) {
            modelConfig = modelConfigResponse.data;
        }
    } catch (modelErr) {
        logger.error(`Error fetching model config for overview: ${modelErr}`);
    }

    try {
        const telephonyResponse = await listTelephonyConfigurationsApiV1OrganizationsTelephonyConfigsGet({
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
        });
        if (telephonyResponse.data) {
            telephonyConfigs = telephonyResponse.data;
        }
    } catch (telErr) {
        logger.error(`Error fetching telephony configs for overview: ${telErr}`);
    }

    try {
        const usageResponse = await getUsageHistoryApiV1OrganizationsUsageRunsGet({
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            query: {
                page: 1,
                limit: 100,
            },
        });
        if (usageResponse.data) {
            usageHistory = usageResponse.data;
        }
    } catch (usageErr) {
        logger.error(`Error fetching usage runs for overview: ${usageErr}`);
    }

    return (
        <OverviewDashboard
            workflows={activeWorkflows}
            archivedWorkflows={archivedWorkflows}
            folders={folders}
            modelConfig={modelConfig}
            usageHistory={usageHistory}
            telephonyConfigs={telephonyConfigs}
        />
    );
}

function OverviewLoading() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center pb-2">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
                    <div className="h-4 w-96 bg-muted animate-pulse rounded-md" />
                </div>
                <div className="flex gap-2">
                    <div className="h-9 w-28 bg-muted animate-pulse rounded-md" />
                    <div className="h-9 w-36 bg-muted animate-pulse rounded-md" />
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="bg-muted animate-pulse rounded-2xl h-32" />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-muted animate-pulse rounded-2xl h-80" />
                    <div className="bg-muted animate-pulse rounded-2xl h-72" />
                </div>
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-muted animate-pulse rounded-2xl h-72" />
                    <div className="bg-muted animate-pulse rounded-2xl h-60" />
                    <div className="bg-muted animate-pulse rounded-2xl h-48" />
                </div>
            </div>
        </div>
    );
}

export default function OverviewPage() {
    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6 max-w-[1600px] mx-auto">
            <Suspense fallback={<OverviewLoading />}>
                <OverviewData />
            </Suspense>
        </div>
    );
}