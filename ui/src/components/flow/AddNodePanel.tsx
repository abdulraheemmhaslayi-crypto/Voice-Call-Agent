import * as LucideIcons from 'lucide-react';
import { Circle, Clock, MessageSquare, PhoneForwarded, Radio, Sparkles, X, type LucideIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';

import type { NodeSpec } from '@/client/types.gen';
import { useNodeSpecs } from '@/components/flow/renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { NodeType } from './types';

type AddNodePanelProps = {
    isOpen: boolean;
    onClose: () => void;
    onNodeSelect: (nodeType: NodeType) => void;
};

// Section ordering and labels. Drives both the category → section title
// mapping and the rendering order.
const SECTION_ORDER: Array<{ category: NodeSpec['category']; title: string }> = [
    { category: 'trigger', title: 'Triggers' },
    { category: 'call_node', title: 'Agent Nodes' },
    { category: 'global_node', title: 'Global Nodes' },
    { category: 'integration', title: 'Integrations' },
];

const HUMAN_ACTION_TEMPLATES = [
    {
        title: "Live Human Handoff",
        desc: "Warmly transfer call to a real human manager or support line.",
        icon: PhoneForwarded,
        nodeType: NodeType.AGENT_NODE,
    },
    {
        title: "Hold & Patience Step",
        desc: "Politely asks caller to hold ('Sir 1 min check kar raha hoon') while background actions run.",
        icon: Clock,
        nodeType: NodeType.AGENT_NODE,
    },
    {
        title: "WhatsApp / SMS Action",
        desc: "Instant delivery of brochure/payment link on WhatsApp during call.",
        icon: MessageSquare,
        nodeType: NodeType.AGENT_NODE,
    },
    {
        title: "Silence Re-Engagement",
        desc: "Gently checks in if caller pauses ('Ji sir, aap sun pa rahe hain?').",
        icon: Radio,
        nodeType: NodeType.AGENT_NODE,
    },
];

function resolveIcon(name: string): LucideIcon {
    const icons = LucideIcons as unknown as Record<string, LucideIcon>;
    return icons[name] ?? Circle;
}

function NodeSection({
    title,
    specs,
    onNodeSelect,
}: {
    title: string;
    specs: NodeSpec[];
    onNodeSelect: (nodeType: NodeType) => void;
}) {
    if (specs.length === 0) return null;
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {title}
            </h3>
            <div className="space-y-2">
                {specs.map((spec) => {
                    const Icon = resolveIcon(spec.icon);
                    return (
                        <Button
                            key={spec.name}
                            variant="outline"
                            className="w-full justify-start p-4 h-auto hover:bg-accent/50 transition-colors"
                            onClick={() => onNodeSelect(spec.name as NodeType)}
                        >
                            <div className="flex items-center">
                                <div className="bg-muted p-2 rounded-lg mr-3 border border-border">
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col items-start text-left min-w-0">
                                    <span className="font-medium text-sm">
                                        {spec.display_name}
                                    </span>
                                    <span className="text-xs text-muted-foreground whitespace-normal">
                                        {spec.description}
                                    </span>
                                </div>
                            </div>
                        </Button>
                    );
                })}
            </div>
        </div>
    );
}

export default function AddNodePanel({ isOpen, onNodeSelect, onClose }: AddNodePanelProps) {
    const { specs } = useNodeSpecs();

    const sections = useMemo(() => {
        return SECTION_ORDER.map(({ category, title }) => ({
            title,
            specs: specs.filter((s) => s.category === category),
        }));
    }, [specs]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    return (
        <div
            className={`fixed z-51 right-0 top-0 h-full w-80 bg-background shadow-lg transform transition-transform duration-300 ease-in-out ${
                isOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
            <div className="p-4 h-full overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                            <h2 className="text-lg font-semibold">Add New Node</h2>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary">
                                AI Call
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Select node type to place on canvas</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose}>
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="space-y-6">
                    {/* Real-Human Actions Section */}
                    <div className="space-y-3 p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-primary">
                                Real-Human Call Actions
                            </h3>
                        </div>
                        <div className="space-y-2">
                            {HUMAN_ACTION_TEMPLATES.map((tmpl) => {
                                const Icon = tmpl.icon;
                                return (
                                    <Button
                                        key={tmpl.title}
                                        variant="outline"
                                        className="w-full justify-start p-2.5 h-auto hover:bg-primary/10 transition-colors bg-background/80 border-border"
                                        onClick={() => onNodeSelect(tmpl.nodeType)}
                                    >
                                        <div className="flex items-center">
                                            <div className="bg-primary/10 text-primary p-1.5 rounded-md mr-2.5">
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div className="flex flex-col items-start text-left min-w-0">
                                                <span className="font-medium text-xs">
                                                    {tmpl.title}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground whitespace-normal leading-tight">
                                                    {tmpl.desc}
                                                </span>
                                            </div>
                                        </div>
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {sections.map(({ title, specs }) => (
                        <NodeSection
                            key={title}
                            title={title}
                            specs={specs}
                            onNodeSelect={onNodeSelect}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
