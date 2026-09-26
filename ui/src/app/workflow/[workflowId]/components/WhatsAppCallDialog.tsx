"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import {
  createOrUpdateEmbedTokenApiV1WorkflowWorkflowIdEmbedTokenPost,
  getEmbedTokenApiV1WorkflowWorkflowIdEmbedTokenGet,
} from "@/client/sdk.gen";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WhatsAppCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: number;
  workflowName: string;
}

export function WhatsAppCallDialog({
  open,
  onOpenChange,
  workflowId,
  workflowName,
}: WhatsAppCallDialogProps) {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Load or generate embed token
  const loadOrCreateToken = useCallback(async () => {
    setLoading(true);
    try {
      const getResp = await getEmbedTokenApiV1WorkflowWorkflowIdEmbedTokenGet({
        path: { workflow_id: workflowId },
      });

      if (getResp.data?.token && getResp.data.is_active) {
        setToken(getResp.data.token);
      } else {
        // Create an embed token with unrestricted domains for WhatsApp calls
        const createResp = await createOrUpdateEmbedTokenApiV1WorkflowWorkflowIdEmbedTokenPost({
          path: { workflow_id: workflowId },
          body: {
            allowed_domains: [],
            settings: {
              buttonText: "Start WhatsApp Voice Call",
              theme: "dark",
            },
          },
        });
        if (createResp.data?.token) {
          setToken(createResp.data.token);
        }
      }
    } catch (err) {
      console.error("Failed to load or create WhatsApp call token:", err);
      toast.error("Unable to generate call token. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (open) {
      void loadOrCreateToken();
    }
  }, [open, loadOrCreateToken]);

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const agentDisplayName = workflowName || "Jamure Voice AI";
  const callUrl = token
    ? `${origin}/call/${workflowId}?token=${token}`
    : `${origin}/call/${workflowId}`;

  const whatsappMessageTemplate = `━━━━━━━━━━━━━━━━━━━━
📞 *${agentDisplayName.toUpperCase()}*
━━━━━━━━━━━━━━━━━━━━
Namaste! 🙏 Hamare AI Voice Assistant se direct aawaz me baat karne ke liye niche tap karein:

🔘 *[ 📞 TALK TO AGENT ]*
👉 ${callUrl}
━━━━━━━━━━━━━━━━━━━━
🔒 _Free Web Call • End-to-End Encrypted_`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(callUrl);
    setCopiedLink(true);
    toast.success("Call link copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(whatsappMessageTemplate);
    setCopiedMessage(true);
    toast.success("WhatsApp message template copied!");
    setTimeout(() => setCopiedMessage(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-xl overflow-hidden rounded-2xl border border-border/80 bg-card p-0 text-card-foreground shadow-2xl">
        {/* Header matching sidebar styling */}
        <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-semibold text-foreground">
                  WhatsApp Voice Call Link
                </DialogTitle>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-500">
                  100% Free
                </span>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                Bina kisi Telephony Provider ke, WhatsApp customer se direct AI voice call connect karein.
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-4 px-6 py-5 max-h-[72vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500 mb-2.5" />
              <p className="text-xs font-medium text-muted-foreground">Generating WhatsApp call link...</p>
            </div>
          ) : (
            <>
              {/* Direct Call Link */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Direct Voice Call Link
                </Label>
                <div className="flex items-center gap-2">
                  <div className="relative min-w-0 flex-1">
                    <Input
                      readOnly
                      value={callUrl}
                      className="h-10 truncate border-border/80 bg-muted/40 pr-3 font-mono text-xs text-foreground focus-visible:ring-emerald-500"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleCopyLink}
                    className="h-10 shrink-0 bg-[#25D366] hover:bg-[#20bd5a] text-white font-medium text-xs px-4 gap-1.5 shadow-xs"
                  >
                    {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedLink ? "Copied" : "Copy Link"}</span>
                  </Button>
                </div>
              </div>

              {/* Ready-to-use WhatsApp Auto-Reply Message */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    WhatsApp Auto-Reply Template
                  </Label>
                  <span className="text-[11px] font-medium text-emerald-500">
                    WhatsApp Business / Chatbot me use karein
                  </span>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5 space-y-3">
                  <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap break-all select-all font-sans">
                    {whatsappMessageTemplate}
                  </p>

                  <Button
                    type="button"
                    onClick={handleCopyMessage}
                    className="w-full h-9 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-medium gap-2 shadow-xs transition"
                  >
                    {copiedMessage ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>Message Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <MessageCircle className="h-4 w-4 fill-white/20" />
                        <span>Copy Complete WhatsApp Message</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Feature Cards matching Sidebar & Dashboard Solid Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Smartphone className="h-4 w-4 text-emerald-500" />
                    <span>WhatsApp Calling Screen</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                    Customer ke mobile me exact WhatsApp Audio call jaisa interface aur ring aayegi.
                  </p>
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span>Zero Cost (100% Free)</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
                    No Twilio, no recharge needed. Direct WebRTC internet audio stream se chalega.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 px-6 py-3.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-9 border-border/80 text-xs font-medium hover:bg-muted"
          >
            Close
          </Button>

          <Button
            type="button"
            onClick={() => window.open(callUrl, "_blank")}
            className="h-9 bg-foreground text-background hover:bg-foreground/90 text-xs font-medium gap-1.5"
          >
            <span>Preview WhatsApp Call</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
