"use client";

import {
  Bot,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface FeedbackMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

interface WhatsAppCallScreenProps {
  workflowId: number;
  initialToken?: string | null;
  agentName?: string;
  onCallEnd?: (durationSeconds: number) => void;
}

export function WhatsAppCallScreen({
  workflowId,
  initialToken,
  agentName = "Jamure Voice AI",
  onCallEnd,
}: WhatsAppCallScreenProps) {
  // Call States: 'idle' | 'calling' | 'ringing' | 'connected' | 'ended' | 'error'
  const [callState, setCallState] = useState<
    "idle" | "calling" | "ringing" | "connected" | "ended" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Controls
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false); // Bot is speaking

  // Call Duration Counter
  const [callDuration, setCallDuration] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number | null>(null);

  // Subtitles & Transcripts
  const [showTranscript, setShowTranscript] = useState(false);
  const [subtitles, setSubtitles] = useState<{ role: "user" | "assistant"; text: string } | null>(null);
  const [transcriptMessages, setTranscriptMessages] = useState<FeedbackMessage[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  // WebRTC & WebSocket Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const pcIdRef = useRef<string>(`PC-${Math.random().toString(36).substring(2, 9)}`);

  // Share Link
  const [copiedLink, setCopiedLink] = useState(false);

  // Format seconds to MM:SS
  const formatDuration = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Auto-scroll transcript drawer
  useEffect(() => {
    if (showTranscript) {
      transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcriptMessages, showTranscript]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopMedia();
    };
  }, []);

  const stopMedia = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  // Terminate Call
  const handleEndCall = useCallback(() => {
    const finalDuration = callStartTimeRef.current
      ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
      : callDuration;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    stopMedia();
    setCallState("ended");
    setIsSpeaking(false);
    if (onCallEnd) onCallEnd(finalDuration);
  }, [callDuration, onCallEnd]);

  // Toggle Mute Microphone
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
      }
    }
  };

  // Toggle Speaker / Mute Output
  const handleToggleSpeaker = () => {
    if (audioRef.current) {
      audioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  // Start Call Function
  const handleStartCall = async () => {
    try {
      setErrorMessage(null);
      setCallState("calling");
      setCallDuration(0);
      setTranscriptMessages([]);
      setSubtitles(null);

      // Determine backend API URL (use origin on production, localhost:8000 on local dev)
      const isLocal =
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
      const apiBaseUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        (isLocal
          ? "http://localhost:8000"
          : typeof window !== "undefined"
          ? window.location.origin
          : "");

      // 1. Get Embed Token
      let token = initialToken;
      if (!token) {
        // Try fetching active token for this workflow from public config or workflow endpoint
        try {
          const resp = await fetch(`${apiBaseUrl}/api/v1/workflow/${workflowId}/embed-token`);
          if (resp.ok) {
            const data = await resp.json();
            token = data.token;
          }
        } catch {
          // Token fetch fallback
        }
      }

      if (!token) {
        throw new Error("Call Token missing. Please open this call via your WhatsApp link.");
      }

      // 2. Request Microphone Permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;

      // 3. Initialize Embed Session
      setCallState("ringing");
      const initResp = await fetch(`${apiBaseUrl}/api/v1/public/embed/init`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      if (!initResp.ok) {
        const errJson = await initResp.json().catch(() => ({}));
        throw new Error(errJson.detail || "Unable to start voice session. Please check your link.");
      }

      const initData = await initResp.json();
      const sessionToken = initData.session_token;
      sessionTokenRef.current = sessionToken;

      // 4. Fetch TURN Credentials (optional STUN fallback)
      let iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];
      try {
        const turnResp = await fetch(
          `${apiBaseUrl}/api/v1/public/embed/turn-credentials/${sessionToken}`
        );
        if (turnResp.ok) {
          const turnData = await turnResp.json();
          if (turnData?.uris?.length > 0) {
            iceServers.push({
              urls: turnData.uris,
              username: turnData.username,
              credential: turnData.password,
            });
          }
        }
      } catch (turnErr) {
        console.warn("Using STUN fallback:", turnErr);
      }

      // 5. Connect WebSocket Signaling
      const wsProto = apiBaseUrl.startsWith("https") ? "wss:" : "ws:";
      const hostPart = apiBaseUrl.replace(/^https?:\/\//, "");
      const wsUrl = `${wsProto}//${hostPart}/api/v1/ws/public/signaling/${sessionToken}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        ws.onopen = () => resolve();
        ws.onerror = (e) => reject(new Error("Signaling connection failed"));
      });

      // 6. Create RTCPeerConnection
      const pc = new RTCPeerConnection({ iceServers });
      pcRef.current = pc;

      // Add user mic track to peer connection
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Handle incoming assistant audio
      pc.ontrack = (event) => {
        if (event.track.kind === "audio" && audioRef.current) {
          audioRef.current.srcObject = event.streams[0];
          audioRef.current.play().catch(() => {});
        }
      };

      // Send local ICE candidates to server
      pc.onicecandidate = (event) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "ice-candidate",
              payload: {
                candidate: event.candidate
                  ? {
                      candidate: event.candidate.candidate,
                      sdpMid: event.candidate.sdpMid,
                      sdpMLineIndex: event.candidate.sdpMLineIndex,
                    }
                  : null,
                pc_id: pcIdRef.current,
              },
            })
          );
        }
      };

      // Monitor connection state
      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === "connected" || pc.iceConnectionState === "completed") {
          setCallState("connected");
          callStartTimeRef.current = Date.now();
          if (!timerRef.current) {
            timerRef.current = setInterval(() => {
              setCallDuration((prev) => prev + 1);
            }, 1000);
          }
        } else if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
          handleEndCall();
        }
      };

      // Handle server WebSocket messages
      ws.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          switch (msg.type) {
            case "answer":
              await pc.setRemoteDescription({
                type: "answer",
                sdp: msg.payload.sdp,
              });
              break;

            case "ice-candidate":
              if (msg.payload?.candidate) {
                await pc.addIceCandidate(msg.payload.candidate).catch(() => {});
              }
              break;

            case "rtf-bot-started-speaking":
              setIsSpeaking(true);
              break;

            case "rtf-bot-stopped-speaking":
              setIsSpeaking(false);
              break;

            case "rtf-bot-text":
              if (msg.payload?.text) {
                const text = msg.payload.text;
                setSubtitles({ role: "assistant", text });
                setTranscriptMessages((prev) => [
                  ...prev,
                  {
                    id: `bot-${Date.now()}`,
                    role: "assistant",
                    text,
                    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  },
                ]);
              }
              break;

            case "rtf-user-transcription":
              if (msg.payload?.text) {
                const text = msg.payload.text;
                setSubtitles({ role: "user", text });
                if (msg.payload.final) {
                  setTranscriptMessages((prev) => [
                    ...prev,
                    {
                      id: `user-${Date.now()}`,
                      role: "user",
                      text,
                      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                    },
                  ]);
                }
              }
              break;

            case "error":
              setErrorMessage(msg.payload?.message || "Call error occurred");
              handleEndCall();
              break;
          }
        } catch (e) {
          console.error("WS message error", e);
        }
      };

      // 7. Create & Send WebRTC Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      ws.send(
        JSON.stringify({
          type: "offer",
          payload: {
            sdp: offer.sdp,
            type: "offer",
            pc_id: pcIdRef.current,
            workflow_id: workflowId,
            workflow_run_id: initData.workflow_run_id,
            call_context_vars: {},
          },
        })
      );
    } catch (err: unknown) {
      console.error("Call initialization failed:", err);
      const msg = err instanceof Error ? err.message : "Failed to start call. Please check microphone access.";
      setErrorMessage(msg);
      setCallState("error");
      stopMedia();
    }
  };

  const copyCallLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      toast.success("WhatsApp Call Link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#0B141B] font-sans text-white select-none overflow-hidden">
      {/* Hidden Audio Output */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Main WhatsApp Mobile-Framed Caller Container */}
      <div className="relative flex h-full w-full max-w-md flex-col justify-between bg-[#0B141B] px-6 py-8 shadow-2xl sm:h-[880px] sm:max-h-[95vh] sm:rounded-[36px] sm:border sm:border-[#202C33]">
        {/* Top Header: Security & Title */}
        <div className="flex flex-col items-center gap-2 pt-2 text-center">
          <div className="flex items-center gap-1.5 rounded-full bg-[#111B21] px-3 py-1 text-[11px] font-medium text-[#8696A0] border border-[#202C33]">
            <Lock className="h-3 w-3 text-[#25D366]" />
            <span>End-to-end encrypted</span>
          </div>

          <div className="mt-1 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#25D366]" />
            <span className="text-xs font-semibold uppercase tracking-wider text-[#25D366]">
              WhatsApp Voice Call
            </span>
          </div>
        </div>

        {/* Center: Contact Profile & Call State */}
        <div className="flex flex-col items-center justify-center my-auto">
          {/* Avatar Container with Real-Time Speaking Pulse Ring */}
          <div className="relative flex items-center justify-center">
            {/* Pulse rings when bot is actively speaking */}
            {isSpeaking && (
              <>
                <div className="absolute h-36 w-36 rounded-full border border-[#25D366] opacity-75 animate-ping" />
                <div className="absolute h-44 w-44 rounded-full border border-[#25D366]/40 animate-pulse" />
              </>
            )}

            {/* Solid Circular WhatsApp Avatar */}
            <div
              className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full bg-[#202C33] border-4 transition-all duration-300 ${
                isSpeaking
                  ? "border-[#25D366] shadow-[0_0_25px_rgba(37,211,102,0.4)]"
                  : callState === "connected"
                  ? "border-[#25D366]/60"
                  : "border-[#2A3942]"
              }`}
            >
              <Bot className="h-14 w-14 text-[#25D366]" />
            </div>
          </div>

          {/* Contact Name */}
          <h1 className="mt-5 text-2xl font-bold tracking-tight text-white">{agentName}</h1>

          {/* Call Status / Timer */}
          <div className="mt-1.5 min-h-[28px] text-center">
            {callState === "idle" && (
              <p className="text-sm font-medium text-[#8696A0]">Direct Voice AI Call</p>
            )}
            {callState === "calling" && (
              <p className="flex items-center gap-2 text-sm font-medium text-[#25D366] animate-pulse">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calling...
              </p>
            )}
            {callState === "ringing" && (
              <p className="text-sm font-medium text-[#25D366] animate-pulse">Ringing...</p>
            )}
            {callState === "connected" && (
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-[#25D366] animate-ping" />
                <p className="text-base font-semibold tracking-wider text-[#8696A0]">
                  {formatDuration(callDuration)}
                </p>
              </div>
            )}
            {callState === "ended" && (
              <p className="text-sm font-medium text-[#8696A0]">
                Call ended • Duration: {formatDuration(callDuration)}
              </p>
            )}
            {callState === "error" && (
              <p className="text-sm font-medium text-red-400">
                {errorMessage || "Call disconnected"}
              </p>
            )}
          </div>

          {/* Real-time Subtitles Bubble (WhatsApp Dark Pill) */}
          {callState === "connected" && subtitles && (
            <div className="mt-6 max-w-xs rounded-2xl bg-[#111B21] border border-[#202C33] px-4 py-2.5 text-center shadow-lg transition-all animate-in fade-in zoom-in-95">
              <span className="text-[11px] font-semibold text-[#8696A0] uppercase tracking-wide">
                {subtitles.role === "assistant" ? "Agent speaking" : "You said"}:
              </span>
              <p className="mt-0.5 text-xs text-white/90 leading-relaxed font-normal">
                "{subtitles.text}"
              </p>
            </div>
          )}
        </div>

        {/* Bottom Section: Controls & Actions */}
        <div className="flex flex-col items-center gap-6 pb-4">
          {/* Pre-call State: Big WhatsApp Green "Answer / Start Call" Button */}
          {callState === "idle" && (
            <div className="flex w-full flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleStartCall}
                className="group flex w-full items-center justify-center gap-3 rounded-full bg-[#25D366] py-4 text-base font-bold text-white shadow-lg transition-all hover:bg-[#20bd5a] active:scale-95"
              >
                <Phone className="h-5 w-5 fill-white transition-transform group-hover:scale-110" />
                <span>Start WhatsApp Call</span>
              </button>

              <button
                type="button"
                onClick={copyCallLink}
                className="flex items-center gap-2 text-xs text-[#8696A0] hover:text-white transition"
              >
                {copiedLink ? <Check className="h-3.5 w-3.5 text-[#25D366]" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLink ? "Link Copied!" : "Copy Call Link to Share"}</span>
              </button>
            </div>
          )}

          {/* Active Call State: WhatsApp Round Floating Action Bar */}
          {(callState === "connected" || callState === "calling" || callState === "ringing") && (
            <div className="flex w-full items-center justify-around rounded-3xl bg-[#111B21] border border-[#202C33] p-4 shadow-xl">
              {/* Speaker Toggle */}
              <button
                type="button"
                onClick={handleToggleSpeaker}
                className={`flex h-13 w-13 items-center justify-center rounded-full transition ${
                  isSpeakerOn
                    ? "bg-[#202C33] text-white hover:bg-[#2A3942]"
                    : "bg-[#202C33]/60 text-[#8696A0] hover:bg-[#202C33]"
                }`}
                title={isSpeakerOn ? "Mute Speaker" : "Unmute Speaker"}
              >
                {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
              </button>

              {/* Mute Mic Toggle */}
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex h-13 w-13 items-center justify-center rounded-full transition ${
                  isMuted
                    ? "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "bg-[#202C33] text-white hover:bg-[#2A3942]"
                }`}
                title={isMuted ? "Unmute Microphone" : "Mute Microphone"}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>

              {/* Subtitles / Chat Drawer Toggle */}
              <button
                type="button"
                onClick={() => setShowTranscript(!showTranscript)}
                className={`flex h-13 w-13 items-center justify-center rounded-full transition ${
                  showTranscript
                    ? "bg-[#25D366] text-white"
                    : "bg-[#202C33] text-white hover:bg-[#2A3942]"
                }`}
                title="Live Transcript"
              >
                <MessageSquare className="h-5 w-5" />
              </button>

              {/* Red WhatsApp Hang Up Button */}
              <button
                type="button"
                onClick={handleEndCall}
                className="flex h-14 w-14 items-center justify-center rounded-full bg-[#EA4335] text-white shadow-lg transition-transform hover:bg-[#D93025] active:scale-90"
                title="End Call"
              >
                <PhoneOff className="h-6 w-6 fill-white" />
              </button>
            </div>
          )}

          {/* Ended / Error State: Call Again or Return */}
          {(callState === "ended" || callState === "error") && (
            <div className="flex w-full flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleStartCall}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#20bd5a] active:scale-95 transition"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Call Again</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    window.history.back();
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#202C33] py-3 text-xs font-medium text-[#8696A0] hover:text-white hover:bg-[#2A3942] transition"
              >
                <span>Back to WhatsApp Chat</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Conversation Transcript Drawer (WhatsApp Chat Style) */}
        {showTranscript && (
          <div className="absolute inset-x-0 bottom-0 top-16 z-20 flex flex-col rounded-t-[32px] bg-[#111B21] border-t border-[#202C33] shadow-2xl animate-in slide-in-from-bottom duration-200">
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-[#202C33] px-5 py-3.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#25D366]" />
                <span className="text-sm font-semibold text-white">Live Call Subtitles</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTranscript(false)}
                className="rounded-lg bg-[#202C33] px-2.5 py-1 text-xs font-medium text-[#8696A0] hover:text-white"
              >
                Close
              </button>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {transcriptMessages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-xs text-[#8696A0]">
                  <MessageSquare className="h-8 w-8 text-[#2A3942] mb-2" />
                  <p>Speak to start seeing live conversation captions.</p>
                </div>
              ) : (
                transcriptMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        msg.role === "user"
                          ? "bg-[#005C4B] text-white rounded-br-xs"
                          : "bg-[#202C33] text-white rounded-bl-xs"
                      }`}
                    >
                      <p>{msg.text}</p>
                      <span className="mt-1 block text-[10px] text-white/50 text-right">
                        {msg.timestamp}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
