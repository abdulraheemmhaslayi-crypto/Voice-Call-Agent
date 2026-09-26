'use client';

import { CheckCircle2, MessageSquare, Mic, Sparkles, UserCheck, Volume2, Zap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost } from '@/client/sdk.gen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

const TEMPLATE_PRESETS = [
    {
        title: "3D Power Lead Qualifier",
        callType: "inbound" as const,
        useCase: "3D Power Real Estate & Architectural Rendering Lead Qualification",
        persona: "Priya from 3D Power",
        language: "Hinglish (Hindi + English)",
        tone: "Warm, Professional & Confident",
        desc: "Greet the client warmly. Ask for project type (Elevation 3D, Interior, Bungalow, Township, or Commercial). Inquire about carpet area/floors, timeline, and whether they have CAD drawings ready. Collect WhatsApp number and email to share portfolio samples.",
    },
    {
        title: "Customer Support & FAQs",
        callType: "inbound" as const,
        useCase: "Inbound Customer Support & Query Resolution",
        persona: "Aman Support Executive",
        language: "Hinglish (Hindi + English)",
        tone: "Empathetic, Patient & Helpful",
        desc: "Handle incoming customer inquiries. Understand their issue with empathy. Provide concise troubleshooting steps, and if unresolved, offer to escalate to a senior team member with their contact details.",
    },
    {
        title: "Sales Appointment Booking",
        callType: "outbound" as const,
        useCase: "Outbound Discovery Call & Demo Booking",
        persona: "Rohit Sales Executive",
        language: "English (Indian Accent)",
        tone: "Energetic & Persuasive",
        desc: "Call prospective clients who inquired recently. Confirm their interest, introduce our core service value in 2 punchy lines, and check their availability for a 15-minute Google Meet/Zoom demo this week.",
    },
    {
        title: "Payment / EMI Reminder",
        callType: "outbound" as const,
        useCase: "Gentle Payment & Due Date Reminder",
        persona: "Kavita Accounts Executive",
        language: "Hinglish (Hindi + English)",
        tone: "Polite, Courteous & Respectful",
        desc: "Politely inform the customer regarding their upcoming invoice/payment due date. Verify if they received the invoice link on SMS/WhatsApp, address any payment mode queries, and offer to send a fresh payment link.",
    },
];

export default function CreateWorkflowPage() {
    const router = useRouter();
    const { user, getAccessToken } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [workflowId, setWorkflowId] = useState<string | null>(null);

    // Core settings
    const [callType, setCallType] = useState<'inbound' | 'outbound'>('inbound');
    const [useCase, setUseCase] = useState('');
    const [activityDescription, setActivityDescription] = useState('');

    // Real human conversation parameters
    const [agentPersona, setAgentPersona] = useState('Priya from 3D Power');
    const [language, setLanguage] = useState('Hinglish (Hindi + English - Most Natural Indian Conversation)');
    const [tone, setTone] = useState('Warm, Friendly & Confident');

    // Human Realism toggles
    const [enableFillers, setEnableFillers] = useState(true);
    const [conciseTurns, setConciseTurns] = useState(true);
    const [allowInterruption, setAllowInterruption] = useState(true);
    const [smartTurnDetection, setSmartTurnDetection] = useState(true);

    const handleApplyPreset = (preset: typeof TEMPLATE_PRESETS[0]) => {
        setCallType(preset.callType);
        setUseCase(preset.useCase);
        setAgentPersona(preset.persona);
        setLanguage(preset.language);
        setTone(preset.tone);
        setActivityDescription(preset.desc);
    };

    const handleCreateWorkflow = async () => {
        if (!useCase || !activityDescription) {
            setError('Please fill in use case and activity description');
            return;
        }

        if (!user) {
            setError('You must be logged in to create a workflow');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const accessToken = await getAccessToken();

            // Construct enriched human-conversational instructions
            const enrichedActivityDescription = `
${activityDescription}

# CRITICAL HUMAN-LIKE CONVERSATIONAL INSTRUCTIONS:
- Agent Identity: ${agentPersona || 'Conversational AI Voice Agent'} (${tone} tone).
- Spoken Language & Style: ${language}. Speak naturally like an everyday person on a real phone call, never stiff or textbook formal.
- Turn Length: ${conciseTurns ? 'Strictly 1 to 2 short sentences per turn. Never give monologues, lectures, or multiple questions at once.' : 'Natural conversational turns.'}
- Fillers & Backchanneling: ${enableFillers ? 'Naturally use conversational verbal cues such as "Haanji", "Accha", "Got it", "Bilkul", "Sure thing", "I understand", "Right" so the caller feels heard.' : 'Standard polite speech.'}
- Interruption Tolerance: ${allowInterruption ? 'Allow full barge-in. If interrupted, smoothly acknowledge without repeating verbatim robotically.' : 'Wait for completion.'}
- Turn Detection: ${smartTurnDetection ? 'Smart turn-taking with 1.2s rapid response pacing without awkward long silence.' : 'Standard turn detection.'}
- No Robot Formats: Never output asterisks, bullet points (*, -), numbers (1., 2.), or markdown syntax. Everything must be purely spoken words.
- Numbers & Amounts: Spell out amounts and numbers naturally as spoken words (e.g., "fifteen hundred" or "pandrah sau", never "1,500").
`.trim();

            // Call the API to create workflow from template
            const response = await createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost({
                body: {
                    call_type: callType,
                    use_case: useCase,
                    activity_description: enrichedActivityDescription,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.data?.id) {
                setWorkflowId(String(response.data.id));
                setShowSuccessModal(true);
            }
        } catch (err) {
            setError('Failed to create workflow. Please try again.');
            logger.error(`Error creating workflow: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalContinue = () => {
        if (!workflowId) return;
        router.push(`/workflow/${workflowId}?onboarding=web_call`);
    };

    return (
        <div className="min-h-screen bg-background py-8">
            <div className="container mx-auto px-4 max-w-3xl">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="gap-1 px-2.5 py-1 text-xs font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            AI Agent Builder • Real-Time Human Mode
                        </Badge>
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight">Build Human-Like Voice Agent</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Create an intelligent voice agent that talks, listens, and responds naturally in real time like an actual human on a phone call.
                    </p>
                </div>

                {/* Quick Presets */}
                <div className="mb-6">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Quick Start Presets
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TEMPLATE_PRESETS.map((preset) => (
                            <button
                                key={preset.title}
                                type="button"
                                onClick={() => handleApplyPreset(preset)}
                                className="text-left p-2.5 rounded-lg border border-border bg-card/60 hover:bg-accent/60 transition-all text-xs flex flex-col justify-between group"
                            >
                                <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                    {preset.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground mt-1">
                                    {preset.callType === 'inbound' ? '📞 Inbound' : '📱 Outbound'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Card 1: Core Setup */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Mic className="w-4 h-4 text-primary" />
                                Call & Use Case Configuration
                            </CardTitle>
                            <CardDescription>
                                Set how your agent connects and its core business objective.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="call-type">Call Direction</Label>
                                    <Select value={callType} onValueChange={(value) => setCallType(value as 'inbound' | 'outbound')}>
                                        <SelectTrigger id="call-type">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="inbound">
                                                Inbound (Customer calls AI)
                                            </SelectItem>
                                            <SelectItem value="outbound">
                                                Outbound (AI calls customer)
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="agent-persona">Agent Persona / Name</Label>
                                    <Input
                                        id="agent-persona"
                                        placeholder="e.g. Priya from 3D Power, Rahul, Sarah"
                                        value={agentPersona}
                                        onChange={(e) => setAgentPersona(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="use-case">Primary Use Case</Label>
                                <Input
                                    id="use-case"
                                    placeholder="e.g., 3D Power Real Estate Lead Qualification, Appointment Booking"
                                    value={useCase}
                                    onChange={(e) => setUseCase(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 2: Real Human Voice & Tone */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <UserCheck className="w-4 h-4 text-primary" />
                                Voice, Language & Personality
                            </CardTitle>
                            <CardDescription>
                                Configure language dialect and tone so the agent talks naturally without sounding robotic.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="language-select">Spoken Language & Dialect</Label>
                                    <Select value={language} onValueChange={setLanguage}>
                                        <SelectTrigger id="language-select">
                                            <SelectValue placeholder="Select language" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Hinglish (Hindi + English - Most Natural Indian Conversation)">
                                                Hinglish (Hindi + English mix) 🇮🇳
                                            </SelectItem>
                                            <SelectItem value="Hindi (Conversational Spoken Hindi)">
                                                Hindi (हिंदी) 🇮🇳
                                            </SelectItem>
                                            <SelectItem value="English (Indian Accent - Clear & Natural)">
                                                English (Indian Accent) 🇮🇳
                                            </SelectItem>
                                            <SelectItem value="English (US Conversational)">
                                                English (US Conversational) 🇺🇸
                                            </SelectItem>
                                            <SelectItem value="English (UK Polite)">
                                                English (UK Polite) 🇬🇧
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="tone-select">Conversational Tone</Label>
                                    <Select value={tone} onValueChange={setTone}>
                                        <SelectTrigger id="tone-select">
                                            <SelectValue placeholder="Select tone" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Warm, Friendly & Confident">
                                                Warm, Friendly & Confident (Recommended)
                                            </SelectItem>
                                            <SelectItem value="Energetic & Sales-Driven">
                                                Energetic & Sales-Driven
                                            </SelectItem>
                                            <SelectItem value="Empathetic & Patient Support">
                                                Empathetic & Patient Support
                                            </SelectItem>
                                            <SelectItem value="Polite & Professional Corporate">
                                                Polite & Professional Corporate
                                            </SelectItem>
                                            <SelectItem value="Casual & Conversational">
                                                Casual & Conversational
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Human Realism Toggles */}
                            <div className="pt-2 border-t border-border space-y-3">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Real Human Voice Dynamics
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-accent/20">
                                    <div className="space-y-0.5 pr-4">
                                        <div className="text-sm font-medium flex items-center gap-1.5">
                                            <Volume2 className="w-4 h-4 text-primary" />
                                            Natural Fillers & Backchanneling
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Speaks verbal cues like &quot;Haanji&quot;, &quot;Accha&quot;, &quot;Got it&quot;, &quot;Bilkul&quot;, so caller feels heard.
                                        </p>
                                    </div>
                                    <Switch checked={enableFillers} onCheckedChange={setEnableFillers} />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-accent/20">
                                    <div className="space-y-0.5 pr-4">
                                        <div className="text-sm font-medium flex items-center gap-1.5">
                                            <Zap className="w-4 h-4 text-amber-500" />
                                            Real-Time Barge-In (Smooth Interruption)
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Agent instantly stops talking as soon as user speaks, exactly like a real person.
                                        </p>
                                    </div>
                                    <Switch checked={allowInterruption} onCheckedChange={setAllowInterruption} />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-accent/20">
                                    <div className="space-y-0.5 pr-4">
                                        <div className="text-sm font-medium flex items-center gap-1.5">
                                            <MessageSquare className="w-4 h-4 text-blue-500" />
                                            Strict 1-2 Sentence Turns
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Avoids robotic lectures. Asks only one crisp question at a time to maintain natural flow.
                                        </p>
                                    </div>
                                    <Switch checked={conciseTurns} onCheckedChange={setConciseTurns} />
                                </div>

                                <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-accent/20">
                                    <div className="space-y-0.5 pr-4">
                                        <div className="text-sm font-medium flex items-center gap-1.5">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            Smart Turn Analyzer (1.2s Snappy Pace)
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Uses ML turn detection with 1.2s pause time to eliminate awkward dead air delays.
                                        </p>
                                    </div>
                                    <Switch checked={smartTurnDetection} onCheckedChange={setSmartTurnDetection} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Card 3: Instructions & Flow */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Conversation Objectives & Flow
                            </CardTitle>
                            <CardDescription>
                                Detail what the agent should ask, explain, qualify, or collect during the phone call.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="activity-description">Call Instructions & Script Guidelines</Label>
                                <Textarea
                                    id="activity-description"
                                    placeholder="e.g. Greet the customer warmly. Ask what service they need. For 3D Power, qualify whether it is Elevation, Interior or Walkthrough. Ask carpet area, timeline, and collect phone number for sending quotation on WhatsApp."
                                    value={activityDescription}
                                    onChange={(e) => setActivityDescription(e.target.value)}
                                    className="min-h-[130px] font-sans text-sm leading-relaxed"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Our AI builder will convert this into structured multi-node conversational states, intent extraction, and speech prompts.
                                </p>
                            </div>

                            {error && (
                                <p className="text-sm text-red-500 font-medium">{error}</p>
                            )}

                            <div className="pt-2">
                                <Button
                                    onClick={handleCreateWorkflow}
                                    disabled={isLoading || !useCase || !activityDescription}
                                    className="w-full h-11 text-base font-semibold shadow-md"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 animate-spin" />
                                            Generating Human Voice Agent...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4" />
                                            Create Voice Agent Flow
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <Card className="w-full max-w-md p-8 shadow-2xl border-primary/20">
                        <div className="flex flex-col items-center space-y-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-muted rounded-full"></div>
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
                            </div>

                            <div className="text-center space-y-2">
                                <h3 className="text-lg font-semibold">
                                    Generating Human-Like Voice Agent
                                </h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    Crafting conversation graph, natural fillers, interruption logic, and speech guidelines...
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <CheckCircle2 className="w-6 h-6 text-green-600" />
                            Human Voice Agent Created!
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="mt-4 space-y-3 text-sm text-foreground/80">
                                <p>
                                    Your voice agent workflow is generated with natural human conversational pacing, barge-in interruption enabled, and speech handling.
                                </p>
                                <div className="p-3 bg-accent/40 rounded-lg border border-border text-xs space-y-1">
                                    <div><strong>Persona:</strong> {agentPersona || 'Conversational Executive'}</div>
                                    <div><strong>Language:</strong> {language}</div>
                                    <div><strong>Turn-around:</strong> Snappy 1.2s ML turn detection with live interruptions enabled.</div>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    You can now test the voice bot immediately in your browser or phone simulator.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button
                            onClick={handleModalContinue}
                            className="w-full h-11 text-base font-semibold"
                        >
                            Open and Test Agent Flow
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
