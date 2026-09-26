"use client";

import { AlertCircle, Bot, Headphones, MessageSquareText, Radio, Sparkles, Volume2, Zap } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DisabledNotice({ reason }: { reason: string }) {
    return (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-sm text-amber-900 shadow-xs backdrop-blur-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <AlertCircle className="h-4 w-4" />
                </div>
                <div className="space-y-0.5 pt-0.5">
                    <p className="font-semibold text-xs uppercase tracking-wider text-amber-800 dark:text-amber-300">Testing Paused</p>
                    <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-200/90">{reason}</p>
                </div>
            </div>
        </div>
    );
}

export interface EmptyStateBadge {
    icon?: ReactNode;
    label: string;
}

export function EmptyState({
    icon,
    title,
    description,
    action,
    badges,
    tip,
    visualVariant = "audio",
}: {
    icon: ReactNode;
    title: string;
    description: string;
    action?: ReactNode;
    badges?: EmptyStateBadge[];
    tip?: string;
    visualVariant?: "audio" | "chat";
}) {
    return (
        <div className="flex flex-1 flex-col justify-between rounded-xl border border-border/70 bg-card p-5 shadow-xs">
            <div className="space-y-5">
                {/* Clean Solid Icon Header */}
                <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
                        {icon}
                    </div>

                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-muted/60 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {visualVariant === "audio" ? "Voice Testing" : "Interactive Session"}
                        </div>
                        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
                    </div>
                </div>

                <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>

                {/* Feature Chips / Badges - Clean Solid Styling */}
                {badges && badges.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 pt-0.5">
                        {badges.map((b, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted/60"
                            >
                                <span className="text-muted-foreground shrink-0">{b.icon ?? <Sparkles className="h-3.5 w-3.5" />}</span>
                                <span className="text-xs">{b.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bottom Actions & Tip */}
            <div className="mt-5 space-y-2.5 pt-1">
                {action ? <div className="w-full">{action}</div> : null}

                {tip ? (
                    <p className="text-center text-[11px] text-muted-foreground">
                        {tip}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

export function ChatModeToggle({
    value,
    onChange,
}: {
    value: "manual" | "simulated";
    onChange: (next: "manual" | "simulated") => void;
}) {
    const options: Array<{ id: "manual" | "simulated"; label: string; icon: ReactNode }> = [
        { id: "manual", label: "Manual Chat", icon: <MessageSquareText className="h-3.5 w-3.5" /> },
        { id: "simulated", label: "AI Simulator", icon: <Bot className="h-3.5 w-3.5" /> },
    ];

    return (
        <div className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-muted/40 p-1">
            {options.map((option) => {
                const active = option.id === value;
                return (
                    <button
                        key={option.id}
                        type="button"
                        onClick={() => onChange(option.id)}
                        className={cn(
                            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                            active
                                ? "bg-background text-foreground shadow-xs font-semibold border border-border/60"
                                : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {option.icon}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

export function TypingIndicator() {
    return (
        <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-border/40 bg-muted/60 px-4 py-3">
                <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
                </div>
            </div>
        </div>
    );
}

export function ManualChatEmptyState({
    disabled,
    ready,
    onStart,
}: {
    disabled: boolean;
    ready: boolean;
    onStart: () => void;
}) {
    return (
        <EmptyState
            visualVariant="chat"
            icon={<MessageSquareText className="h-6 w-6" />}
            title="Chat with Agent"
            description="Test your conversational flow with interactive text turns. Inspect real-time tool executions, node branch transitions, and variable updates."
            badges={[
                { icon: <Zap className="h-3.5 w-3.5" />, label: "Instant text turns & response streaming" },
                { icon: <Sparkles className="h-3.5 w-3.5" />, label: "Rewind, fork & modify agent responses" },
                { icon: <Bot className="h-3.5 w-3.5" />, label: "Inspect active prompt & tool executions" },
            ]}
            action={
                <Button
                    onClick={onStart}
                    disabled={disabled || !ready}
                    className="w-full h-10 rounded-lg font-medium"
                >
                    <MessageSquareText className="h-4 w-4 mr-2" />
                    Start Chat Session
                </Button>
            }
            tip="No microphone required. Ideal for quick prompt & logic debugging."
        />
    );
}


