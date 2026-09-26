'use client';

import { Check, ChevronDown, ChevronUp, DollarSign, MessageCircle, Mic, ShieldAlert, Sparkles, Volume2, Zap } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface HumanVoiceToolbarProps {
    values: Record<string, unknown>;
    onChange: (next: Record<string, unknown>) => void;
}

const HUMAN_SPEECH_RULES = [
    {
        id: "short_turns",
        label: "1-2 Sentences Max",
        icon: MessageCircle,
        snippet: "\n## Speech Pacing:\n- Keep responses strictly 1 to 2 short sentences per turn. Never monologue, lecture, or dump information.",
    },
    {
        id: "fillers",
        label: "Hinglish Verbal Fillers ('Haanji', 'Accha')",
        icon: Volume2,
        snippet: "\n## Conversational Fillers:\n- Naturally weave in verbal cues like \"Haanji\", \"Accha\", \"Got it\", \"Bilkul\", \"Right\", \"Sure thing\" so the caller feels heard and acknowledged.",
    },
    {
        id: "no_markdown",
        label: "No Markdown / Bullets",
        icon: ShieldAlert,
        snippet: "\n## Audio Formatting:\n- Never output asterisks (*), bullet points, dashes, or numbered lists (1., 2.). The output is read aloud by Text-to-Speech.",
    },
    {
        id: "numbers_in_words",
        label: "Pronounce Numbers in Words",
        icon: DollarSign,
        snippet: "\n## Numbers & Currency:\n- Spell out amounts and numbers naturally in spoken words (e.g., \"fifteen hundred\" or \"pandrah sau\", never \"1,500\").",
    },
    {
        id: "smooth_interruption",
        label: "Smooth Barge-in Handling",
        icon: Zap,
        action: "barge_in",
        snippet: "\n## Interruption Handling:\n- If the caller interrupts or speaks mid-turn, stop immediately and smoothly acknowledge their question.",
    },
    {
        id: "inactivity_nudge",
        label: "Silence / Inactivity Nudge",
        icon: Mic,
        snippet: "\n## Silence Handling:\n- If the caller pauses or stays silent, gently check in: \"Ji sir, kya aap sun pa rahe hain?\" or \"Take your time, I am listening.\"",
    },
];

const EMOTIONAL_TONES = [
    { label: "Warm & Friendly", prompt: "Warm, courteous, and polite tone with welcoming enthusiasm." },
    { label: "Empathetic Support", prompt: "Deeply empathetic, patient, and understanding tone, validating the customer's concerns." },
    { label: "Confident Sales", prompt: "Crisp, confident, energetic, and persuasive pitch style." },
    { label: "Polite Corporate", prompt: "Respectful, composed, and professional executive demeanor." },
];

export function HumanVoiceToolbar({ values, onChange }: HumanVoiceToolbarProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [appliedRules, setAppliedRules] = useState<Record<string, boolean>>({});

    const handleInjectSnippet = (ruleId: string, snippet: string, action?: string) => {
        const currentPrompt = typeof values.prompt === 'string' ? values.prompt : '';
        const trimmedSnippet = snippet.trim();

        // Check if snippet already in prompt
        if (currentPrompt.includes(trimmedSnippet)) {
            toast.info("Rule is already present in prompt");
            return;
        }

        const newPrompt = currentPrompt.trim()
            ? `${currentPrompt.trim()}\n${snippet}`
            : snippet.trim();

        const updates: Record<string, unknown> = { prompt: newPrompt };
        if (action === "barge_in") {
            updates.allow_interrupt = true;
        }

        onChange({ ...values, ...updates });
        setAppliedRules((prev) => ({ ...prev, [ruleId]: true }));
        toast.success("Added human voice guideline to prompt");
    };

    const handleSetTone = (tone: typeof EMOTIONAL_TONES[0]) => {
        const currentPrompt = typeof values.prompt === 'string' ? values.prompt : '';
        const toneInstruction = `\n## Emotional Tone:\n- Speak with a ${tone.prompt}`;

        const newPrompt = currentPrompt.trim()
            ? `${currentPrompt.trim()}\n${toneInstruction}`
            : toneInstruction.trim();

        onChange({ ...values, prompt: newPrompt });
        toast.success(`Applied ${tone.label} tone`);
    };

    const handleAutoOptimizePrompt = () => {
        const currentPrompt = typeof values.prompt === 'string' ? values.prompt : '';
        const masterHumanGuidelines = `
## Critical Real-Human Conversation Rules:
- Keep every response strictly between 1 to 2 short sentences. Never monologue or lecture.
- Naturally use conversational verbal cues like "Haanji", "Accha", "Got it", "Bilkul", "Right" so the caller feels heard.
- Never use markdown syntax (no asterisks, bullet points, or numbered lists). Speak in pure conversational sentences.
- Pronounce numbers and currency naturally as spoken words (e.g., "fifteen hundred" or "pandrah sau", never "1,500").
- If interrupted by the caller, stop speaking immediately and address their query smoothly.
`.trim();

        if (currentPrompt.includes("Critical Real-Human Conversation Rules")) {
            toast.info("Human rules are already applied");
            return;
        }

        const newPrompt = currentPrompt.trim()
            ? `${currentPrompt.trim()}\n\n${masterHumanGuidelines}`
            : masterHumanGuidelines;

        onChange({
            ...values,
            prompt: newPrompt,
            allow_interrupt: true,
        });

        const allApplied: Record<string, boolean> = {};
        HUMAN_SPEECH_RULES.forEach((r) => { allApplied[r.id] = true; });
        setAppliedRules(allApplied);
        toast.success("Applied complete Real-Human voice rules!");
    };

    return (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2 mb-2 transition-all">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-primary/10 text-primary">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                            Real-Human Voice Assistant
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                Live Call Mode
                            </Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                            1-click human guidelines to eliminate robotic monotone responses
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={handleAutoOptimizePrompt}
                        className="h-7 text-xs px-2.5 gap-1.5 shadow-sm font-medium"
                    >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        Auto-Optimize for Real Human
                    </Button>
                    <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                </div>
            </div>

            {/* Quick Action Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
                {HUMAN_SPEECH_RULES.slice(0, isExpanded ? HUMAN_SPEECH_RULES.length : 3).map((rule) => {
                    const Icon = rule.icon;
                    const isApplied = appliedRules[rule.id];
                    return (
                        <button
                            key={rule.id}
                            type="button"
                            onClick={() => handleInjectSnippet(rule.id, rule.snippet, rule.action)}
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md border transition-all ${
                                isApplied
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                    : "bg-background/80 hover:bg-accent border-border text-foreground hover:border-primary/40"
                            }`}
                        >
                            <Icon className="w-3 h-3 text-primary/80" />
                            <span>{rule.label}</span>
                            {isApplied && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                        </button>
                    );
                })}
                {!isExpanded && (
                    <button
                        type="button"
                        onClick={() => setIsExpanded(true)}
                        className="text-[11px] text-primary hover:underline px-1 py-1 font-medium"
                    >
                        +{HUMAN_SPEECH_RULES.length - 3} more rules...
                    </button>
                )}
            </div>

            {/* Expanded Emotion/Tone Bar */}
            {isExpanded && (
                <div className="pt-2 border-t border-border/60 mt-2 space-y-1.5">
                    <div className="text-[11px] font-medium text-muted-foreground">
                        Voice Emotion / Tone for this Node:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {EMOTIONAL_TONES.map((tone) => (
                            <button
                                key={tone.label}
                                type="button"
                                onClick={() => handleSetTone(tone)}
                                className="text-[11px] px-2 py-0.5 rounded-full bg-secondary/80 hover:bg-secondary text-secondary-foreground border border-border transition-colors"
                            >
                                {tone.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
