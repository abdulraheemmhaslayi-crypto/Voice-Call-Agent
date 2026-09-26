"use client";

import { Bot, MessageSquare, Pause, Play, RefreshCw, RotateCcw, Sparkles, Square, User, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { client } from "@/client/client.gen";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ConversationTimeline } from "@/components/workflow/conversation";

import { ChatComposer } from "./ChatComposer";
import { DisabledNotice, TypingIndicator } from "./shared";
import type { WorkflowRuntimeNodeTransition } from "./types";
import { useTextChatSession } from "./useTextChatSession";

interface AiSimulatorPanelProps {
    workflowId: number;
    ready: boolean;
    initialContextVariables?: Record<string, string>;
    disabled: boolean;
    disabledReason: string | null;
    onActiveChange?: (active: boolean) => void;
    onNodeTransition?: (transition: WorkflowRuntimeNodeTransition) => void;
}

const PERSONA_PRESETS = [
    {
        title: "3D Power Buyer",
        badge: "🏢 Architectural Client",
        prompt: "Act like an interested property developer looking for 3D elevation and walkthrough rendering. Inquire about rates, ask for samples on WhatsApp, and confirm your project timeline.",
    },
    {
        title: "Skeptical Prospect",
        badge: "🤨 Price Sensitive",
        prompt: "Act like a skeptical customer. Push hard on pricing, question quality, and ask if there are discounts or competitor matches.",
    },
    {
        title: "Ready-to-Buy Lead",
        badge: "🤝 High Intent",
        prompt: "Act like an urgent customer ready to place an order today. Ask how fast you can start and request bank details or an invoice link.",
    },
    {
        title: "Confused Inquirer",
        badge: "❓ First Timer",
        prompt: "Act like someone who does not know much about 3D rendering. Ask simple questions and ask the assistant to guide you step by step.",
    },
];

export function AiSimulatorPanel({
    workflowId,
    ready,
    initialContextVariables,
    disabled,
    disabledReason,
    onActiveChange,
    onNodeTransition,
}: AiSimulatorPanelProps) {
    const [personaPrompt, setPersonaPrompt] = useState(
        "Act like a skeptical prospect looking for 3D rendering services. Push on pricing, ask about portfolio samples on WhatsApp, and check project delivery timeline.",
    );
    const [maxTurns, setMaxTurns] = useState<number>(5);
    const [isSimulating, setIsSimulating] = useState(false);
    const [isGeneratingUserTurn, setIsGeneratingUserTurn] = useState(false);

    // Track processed assistant turns to avoid duplicate replies
    const lastSimulatedAssistantTurnIdRef = useRef<string | null>(null);
    const simulationActiveRef = useRef(false);
    simulationActiveRef.current = isSimulating;

    const {
        session,
        started,
        draft,
        turns,
        creatingSession,
        sendingMessage,
        composerId,
        inputDisabled,
        conversationItems,
        setDraft,
        startSession,
        submitComposer,
    } = useTextChatSession({
        workflowId,
        ready,
        initialContextVariables,
        disabled,
        onActiveChange,
        onNodeTransition,
    });

    const handleStartSimulation = async () => {
        if (!personaPrompt.trim()) {
            toast.error("Please provide a persona prompt");
            return;
        }
        setIsSimulating(true);
        lastSimulatedAssistantTurnIdRef.current = null;
        if (!started && !session) {
            startSession();
        }
    };

    const handleStopSimulation = () => {
        setIsSimulating(false);
        setIsGeneratingUserTurn(false);
        toast.info("Simulation paused");
    };

    // Automated Agent-vs-Agent turn loop
    useEffect(() => {
        if (!isSimulating || !session || sendingMessage || creatingSession || isGeneratingUserTurn) {
            return;
        }

        // Check if session reached max turns or is completed
        const completedTurns = turns.filter((t) => t.status === "completed");
        if (completedTurns.length >= maxTurns) {
            setIsSimulating(false);
            toast.success(`Simulation completed ${maxTurns} conversational turns!`);
            return;
        }

        if (session.is_completed) {
            setIsSimulating(false);
            toast.info("Call ended by workflow agent");
            return;
        }

        // Get latest turn
        const latestTurn = turns[turns.length - 1];
        if (!latestTurn || latestTurn.status !== "completed" || !latestTurn.assistant_message) {
            return;
        }

        // Check if we already simulated for this assistant message
        if (lastSimulatedAssistantTurnIdRef.current === latestTurn.id) {
            return;
        }

        lastSimulatedAssistantTurnIdRef.current = latestTurn.id;
        const assistantText = latestTurn.assistant_message.text;

        // Run simulation step after natural delay (800ms)
        const timer = setTimeout(async () => {
            if (!simulationActiveRef.current) return;
            setIsGeneratingUserTurn(true);

            try {
                // Call backend simulate-user-turn endpoint
                const simRes = await client.post<{ simulated_message: string }>({
                    url: '/api/v1/workflow/{workflow_id}/text-chat/sessions/{run_id}/simulate-user-turn',
                    path: { workflow_id: workflowId, run_id: session.workflow_run_id },
                    body: {
                        persona_prompt: personaPrompt,
                        last_assistant_message: assistantText,
                    },
                });

                const simulatedMessage = simRes.data?.simulated_message || "Can you share more details about your pricing?";
                if (simulationActiveRef.current) {
                    await submitComposer(simulatedMessage);
                }
            } catch (err) {
                // Fallback simulation text based on persona
                const fallbackMessage = personaPrompt.toLowerCase().includes("pricing")
                    ? "Could you tell me a bit more about your pricing and options?"
                    : "Yes, I would like to know how we can proceed with this.";
                if (simulationActiveRef.current) {
                    await submitComposer(fallbackMessage);
                }
            } finally {
                setIsGeneratingUserTurn(false);
            }
        }, 900);

        return () => clearTimeout(timer);
    }, [
        isSimulating,
        session,
        turns,
        maxTurns,
        sendingMessage,
        creatingSession,
        isGeneratingUserTurn,
        personaPrompt,
        workflowId,
        submitComposer,
    ]);

    // Initial state: Persona setup
    if (!started && !session) {
        return (
            <div className="flex h-full min-h-0 flex-col gap-3 p-1">
                {disabledReason ? <DisabledNotice reason={disabledReason} /> : null}

                <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">AI Persona Simulator</h3>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                            Agent-vs-Agent
                        </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Simulate real customer calls automatically. An AI agent plays the caller persona to test your workflow.
                    </p>
                </div>

                {/* Preset Chips */}
                <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                        Select Persona Preset:
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                        {PERSONA_PRESETS.map((preset) => (
                            <button
                                key={preset.title}
                                type="button"
                                onClick={() => setPersonaPrompt(preset.prompt)}
                                className="text-left p-2 rounded-lg border border-border bg-card hover:bg-accent/60 transition-all text-xs flex flex-col justify-between"
                            >
                                <span className="font-medium text-foreground text-xs">{preset.title}</span>
                                <span className="text-[10px] text-muted-foreground mt-0.5">{preset.badge}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Persona Textarea */}
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                        <label className="font-medium text-foreground">Simulated Customer Persona Prompt:</label>
                        <span className="text-muted-foreground text-[11px]">Instructions for AI caller</span>
                    </div>
                    <Textarea
                        value={personaPrompt}
                        onChange={(e) => setPersonaPrompt(e.target.value)}
                        placeholder="Describe the simulated caller persona..."
                        className="min-h-24 resize-none text-xs leading-relaxed"
                    />
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Max Turns:</span>
                        <div className="flex gap-1">
                            {[3, 5, 8, 10].map((count) => (
                                <button
                                    key={count}
                                    type="button"
                                    onClick={() => setMaxTurns(count)}
                                    className={`px-2 py-0.5 text-xs rounded-md border transition-colors ${
                                        maxTurns === count
                                            ? "bg-primary text-primary-foreground border-primary font-medium"
                                            : "bg-muted text-muted-foreground hover:text-foreground border-border"
                                    }`}
                                >
                                    {count}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button
                        size="sm"
                        onClick={handleStartSimulation}
                        disabled={disabled || !ready || !personaPrompt.trim()}
                        className="gap-1.5 shadow-sm font-semibold"
                    >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        Start Simulation
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {disabledReason ? (
                <div className="pb-3">
                    <DisabledNotice reason={disabledReason} />
                </div>
            ) : null}

            {/* Simulation Status Header Bar */}
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg border border-border bg-accent/30 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1.5 rounded-md ${isSimulating ? "bg-emerald-500/10 text-emerald-600 animate-pulse" : "bg-muted text-muted-foreground"}`}>
                        <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{isSimulating ? "Simulating Live Call" : "Simulation Paused"}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                                Turn {turns.length} / {maxTurns}
                            </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">
                            {personaPrompt}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isSimulating ? (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleStopSimulation}
                            className="h-7 text-xs px-2 gap-1"
                        >
                            <Pause className="w-3 h-3" />
                            Pause
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="default"
                            onClick={handleStartSimulation}
                            className="h-7 text-xs px-2 gap-1 font-medium"
                        >
                            <Play className="w-3 h-3 fill-current" />
                            Resume
                        </Button>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div className="flex min-h-0 flex-1 flex-col">
                {creatingSession && !session ? (
                    <div className="space-y-3 py-1">
                        <Skeleton className="ml-auto h-9 w-2/3 rounded-2xl" />
                        <Skeleton className="h-12 w-3/4 rounded-2xl" />
                    </div>
                ) : (
                    <ConversationTimeline
                        items={conversationItems}
                        autoScroll={true}
                        scrollBehavior="smooth"
                        emptyState={{
                            title: "Simulation Started",
                            subtitle: "Waiting for agent and persona response...",
                        }}
                        pendingIndicator={
                            sendingMessage || isGeneratingUserTurn ? (
                                <div className="flex items-center gap-2 p-2 rounded-lg bg-accent/40 text-xs text-muted-foreground">
                                    <TypingIndicator />
                                    <span>{isGeneratingUserTurn ? "AI Persona formulating response..." : "Voice Agent thinking..."}</span>
                                </div>
                            ) : null
                        }
                        className="py-1"
                    />
                )}
            </div>

            {/* Manual Takeover / Composer */}
            <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pb-1">
                    <span>Manual Intervene (Take over anytime):</span>
                    {isSimulating && <span className="text-emerald-600 font-medium animate-pulse">● Live Loop Active</span>}
                </div>
                <ChatComposer
                    composerId={composerId}
                    draft={draft}
                    ready={ready}
                    editing={false}
                    sendingMessage={sendingMessage || isGeneratingUserTurn}
                    inputDisabled={inputDisabled}
                    onDraftChange={setDraft}
                    onSubmit={submitComposer}
                />
            </div>
        </div>
    );
}
