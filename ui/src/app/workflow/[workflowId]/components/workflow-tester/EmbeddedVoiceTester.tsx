"use client";

import { Loader2, Phone, PhoneOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import { RealtimeFeedback } from "@/components/workflow/conversation";
import { cn } from "@/lib/utils";

import { ApiKeyErrorDialog, ConnectionStatus, WorkflowConfigErrorDialog } from "../../run/[runId]/components";
import { useWebSocketRTC } from "../../run/[runId]/hooks";
import type { WorkflowRuntimeNodeTransition } from "./types";

interface EmbeddedVoiceTesterProps {
    workflowId: number;
    workflowRunId: number;
    initialContextVariables?: Record<string, string>;
    accessToken: string;
    onReset: () => void;
    onNodeTransition?: (transition: WorkflowRuntimeNodeTransition) => void;
}

export function EmbeddedVoiceTester({
    workflowId,
    workflowRunId,
    initialContextVariables,
    accessToken,
    onReset,
    onNodeTransition,
}: EmbeddedVoiceTesterProps) {
    const router = useRouter();
    const {
        audioRef,
        connectionActive,
        permissionError,
        isCompleted,
        apiKeyModalOpen,
        setApiKeyModalOpen,
        apiKeyError,
        apiKeyErrorCode,
        workflowConfigError,
        workflowConfigModalOpen,
        setWorkflowConfigModalOpen,
        connectionStatus,
        connectionErrorMessage,
        start,
        stop,
        isStarting,
        feedbackMessages,
    } = useWebSocketRTC({
        workflowId,
        workflowRunId,
        accessToken,
        initialContextVariables,
        onNodeTransition,
    });
    const autoStartedRef = useRef(false);

    useEffect(() => {
        if (autoStartedRef.current) {
            return;
        }

        const isMobileBrowser = typeof window !== 'undefined'
            ? /Mobi|Android|iPhone|iPad|Tablet/i.test(navigator.userAgent)
            : false;

        if (!isMobileBrowser) {
            autoStartedRef.current = true;
            void start();
        }
    }, [start]);

    const endButtonLabel = connectionActive
        ? "End Call"
        : isCompleted
            ? "Start Another Test"
            : connectionStatus === "failed"
                ? "Retry Call"
                : "Start Call";

    const handleFooterAction = async () => {
        if (connectionActive) {
            stop();
            return;
        }
        if (isCompleted) {
            onReset();
            return;
        }
        await start();
    };

    return (
        <>
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-sm backdrop-blur-md">
                {/* Live Call Banner */}
                <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3.5 py-2">
                    <div className="flex items-center gap-2">
                        {connectionActive ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    Voice Call Active
                                </span>
                                {/* Animated mini audio spectrum */}
                                <div className="ml-1.5 flex items-center gap-0.5">
                                    <span className="h-2 w-0.5 animate-pulse rounded-full bg-emerald-500" />
                                    <span className="h-3.5 w-0.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:0.15s]" />
                                    <span className="h-2.5 w-0.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:0.3s]" />
                                    <span className="h-4 w-0.5 animate-pulse rounded-full bg-emerald-500 [animation-delay:0.45s]" />
                                </div>
                            </>
                        ) : isCompleted ? (
                            <span className="text-xs font-medium text-muted-foreground">
                                Call Completed
                            </span>
                        ) : (
                            <span className="text-xs font-medium text-muted-foreground">
                                WebRTC Stream
                            </span>
                        )}
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Reset
                    </Button>
                </div>

                <div className="min-h-0 flex-1 overflow-hidden bg-background/50">
                    <RealtimeFeedback
                        mode="live"
                        messages={feedbackMessages}
                        isCallActive={connectionActive}
                        isCallCompleted={isCompleted}
                    />
                </div>

                <div className="border-t border-border/60 bg-card/80 p-3.5 backdrop-blur-xs">
                    <div className="flex flex-col gap-3">
                        <ConnectionStatus connectionStatus={connectionStatus} />
                        {permissionError ? (
                            <p className="rounded-lg bg-destructive/10 p-2 text-center text-xs text-destructive">{permissionError}</p>
                        ) : null}
                        {connectionStatus === 'failed' && connectionErrorMessage ? (
                            <p className="rounded-lg bg-destructive/10 p-2 text-center text-xs text-destructive">{connectionErrorMessage}</p>
                        ) : null}
                        <Button
                            onClick={handleFooterAction}
                            disabled={isStarting && connectionStatus !== "failed"}
                            variant={connectionActive ? "destructive" : "default"}
                            className="w-full h-10 rounded-lg font-medium shadow-xs"
                        >
                            {isStarting && connectionStatus !== "failed" ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Starting Call...
                                </>
                            ) : connectionActive ? (
                                <>
                                    <PhoneOff className="mr-2 h-4 w-4" />
                                    {endButtonLabel}
                                </>
                            ) : connectionStatus === "failed" ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {endButtonLabel}
                                </>
                            ) : isCompleted ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {endButtonLabel}
                                </>
                            ) : (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {endButtonLabel}
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <audio ref={audioRef} autoPlay playsInline className="hidden" />
            </div>

            <ApiKeyErrorDialog
                open={apiKeyModalOpen}
                onOpenChange={setApiKeyModalOpen}
                error={apiKeyError}
                errorCode={apiKeyErrorCode}
                onNavigateToCredits={() => router.push("/api-keys")}
                onNavigateToModelConfig={() => router.push("/model-configurations")}
            />

            <WorkflowConfigErrorDialog
                open={workflowConfigModalOpen}
                onOpenChange={setWorkflowConfigModalOpen}
                error={workflowConfigError}
                onNavigateToWorkflow={() => router.push(`/workflow/${workflowId}`)}
            />
        </>
    );
}
