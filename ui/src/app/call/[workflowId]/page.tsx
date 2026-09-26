import type { Metadata } from "next";
import { CallClientWrapper } from "./CallClientWrapper";

interface PageProps {
  params: Promise<{ workflowId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const agentName = (resolvedSearch?.name as string) || "Jamure Voice AI";

  return {
    title: `📞 Talk to ${agentName}`,
    description: `Tap to start a free live audio call with ${agentName}. No recharge or app required.`,
    openGraph: {
      title: `📞 Talk to ${agentName}`,
      description: "Direct Live AI Voice Call • 100% Free • End-to-End Encrypted",
      siteName: "WhatsApp Voice Call",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `📞 Talk to ${agentName}`,
      description: "Tap to start a free live audio call with our AI Assistant.",
    },
  };
}

export default async function WhatsAppCallPage({ params }: PageProps) {
  const resolvedParams = await params;
  const workflowId = parseInt(resolvedParams.workflowId, 10);

  return <CallClientWrapper workflowId={workflowId} />;
}
