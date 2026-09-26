"use client";

import { useSearchParams } from "next/navigation";
import React, { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { WhatsAppCallScreen } from "@/components/whatsapp-call/WhatsAppCallScreen";

interface CallClientWrapperProps {
  workflowId: number;
}

function CallContent({ workflowId }: CallClientWrapperProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const agentName = searchParams.get("name") || "Jamure Voice AI";

  if (!workflowId || isNaN(workflowId)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0B141B] text-white">
        <div className="text-center p-6 bg-[#111B21] border border-[#202C33] rounded-2xl max-w-sm">
          <p className="text-sm text-red-400 font-semibold mb-2">Invalid Call Link</p>
          <p className="text-xs text-[#8696A0]">Please check the link provided on WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <WhatsAppCallScreen
      workflowId={workflowId}
      initialToken={token}
      agentName={agentName}
    />
  );
}

export function CallClientWrapper({ workflowId }: CallClientWrapperProps) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-[#0B141B] text-[#25D366]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <CallContent workflowId={workflowId} />
    </Suspense>
  );
}
