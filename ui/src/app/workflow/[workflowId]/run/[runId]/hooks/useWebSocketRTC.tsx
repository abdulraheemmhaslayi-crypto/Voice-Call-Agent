import { useCallback, useEffect, useRef, useState } from "react";

import { client } from "@/client/client.gen";
import { getTurnCredentialsApiV1TurnCredentialsGet, validateUserConfigurationsApiV1UserConfigurationsUserValidateGet, validateWorkflowApiV1WorkflowWorkflowIdValidatePost } from "@/client/sdk.gen";
import { TurnCredentialsResponse } from "@/client/types.gen";
import { WorkflowValidationError } from "@/components/flow/types";
import type { ConversationNodeTransitionItem, RealtimeFeedbackMessage as FeedbackMessage } from "@/components/workflow/conversation";
import { useAppConfig } from "@/context/AppConfigContext";
import logger from '@/lib/logger';

import { sdpFilterCodec } from "../utils";
import { useDeviceInputs } from "./useDeviceInputs";

interface UseWebSocketRTCProps {
    workflowId: number;
    workflowRunId: number;
    accessToken: string | null;
    initialContextVariables?: Record<string, string> | null;
    onNodeTransition?: (transition: ConversationNodeTransitionItem) => void;
}

export const useWebSocketRTC = ({ workflowId, workflowRunId, accessToken, initialContextVariables, onNodeTransition }: UseWebSocketRTCProps) => {
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connecting' | 'connected' | 'failed'>('idle');
    const [connectionActive, setConnectionActive] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false);
    const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
    const [apiKeyError, setApiKeyError] = useState<string | null>(null);
    const [apiKeyErrorCode, setApiKeyErrorCode] = useState<string | null>(null);
    const [workflowConfigModalOpen, setWorkflowConfigModalOpen] = useState(false);
    const [workflowConfigError, setWorkflowConfigError] = useState<string | null>(null);
    const [connectionErrorMessage, setConnectionErrorMessage] = useState<string | null>(null);
    const [isStarting, setIsStarting] = useState(false);
    const [feedbackMessages, setFeedbackMessages] = useState<FeedbackMessage[]>([]);
    const initialContext = initialContextVariables || {};
    const { config: appConfig, loading: appConfigLoading, refresh: refreshAppConfig } = useAppConfig();

    const {
        audioInputs,
        selectedAudioInput,
        setSelectedAudioInput,
        permissionError,
        setPermissionError,
        getAudioInputDevices
    } = useDeviceInputs();

    const useStun = true;
    const useAudio = true;
    const audioCodec = 'default';

    // TURN server credentials fetched at runtime from backend API
    // Uses time-limited credentials (TURN REST API) for security
    const turnCredentialsRef = useRef<TurnCredentialsResponse | null>(null);

    const audioRef = useRef<HTMLAudioElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const timeStartRef = useRef<number | null>(null);
    const onNodeTransitionRef = useRef(onNodeTransition);

    useEffect(() => {
        onNodeTransitionRef.current = onNodeTransition;
    }, [onNodeTransition]);

    // Generate a cryptographically secure unique ID
    const generateSecureId = () => {
        // Use Web Crypto API to generate random bytes
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        // Convert to hex string
        return 'PC-' + Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    };

    const pc_id = useRef(generateSecureId());

    // Mute/speaking state tracking refs (ephemeral signals, not rendered directly)
    const userMutedRef = useRef(false);
    const firstBotSpeechCompletedRef = useRef(false);
    const currentAllowInterruptRef = useRef<boolean | undefined>(undefined);
    const interruptWarningShownRef = useRef(false);

    // Get WebSocket URL from client configuration
    const getWebSocketUrl = useCallback(() => {
        const isLocalHostUrl = (url: string) => {
            try {
                const parsed = new URL(url);
                return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
            } catch {
                return false;
            }
        };

        const runtimeBackendUrl = appConfig?.backendUrl && appConfig.backendUrl !== 'unknown'
            ? appConfig.backendUrl
            : undefined;

        const envBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || undefined;
        const sdkBaseUrl = client.getConfig().baseUrl;

        let baseUrl: string | undefined = runtimeBackendUrl || envBackendUrl || sdkBaseUrl || 'http://127.0.0.1:8000';

        if (typeof window !== 'undefined') {
            const loc = window.location;
            const isRemoteBrowser = loc.hostname !== 'localhost' && loc.hostname !== '127.0.0.1';
            const runtimeBackendIsLocal = runtimeBackendUrl ? isLocalHostUrl(runtimeBackendUrl) : false;
            const envBackendIsLocal = envBackendUrl ? isLocalHostUrl(envBackendUrl) : false;
            const sdkBaseIsLocal = sdkBaseUrl ? isLocalHostUrl(sdkBaseUrl) : false;

            if (isRemoteBrowser && runtimeBackendIsLocal) {
                logger.warn('Ignoring runtime backend URL because it is local and browser is remote:', runtimeBackendUrl);
                baseUrl = undefined;
            }

            if (isRemoteBrowser) {
                if (!baseUrl || isLocalHostUrl(baseUrl)) {
                    if (envBackendUrl && !envBackendIsLocal) {
                        baseUrl = envBackendUrl;
                    } else if (!sdkBaseIsLocal) {
                        baseUrl = sdkBaseUrl;
                    } else {
                        logger.warn('Remote browser detected with no public backend URL configured or local SDK base URL. Falling back to frontend origin.', {
                            sdkBaseUrl,
                            runtimeBackendUrl,
                            envBackendUrl,
                            locationOrigin: loc.origin,
                        });
                        baseUrl = loc.origin;
                    }
                }
            } else if (!baseUrl) {
                baseUrl = `${loc.protocol}//${loc.hostname}:8000`;
            }
        }

        if (!baseUrl) {
            baseUrl = 'http://127.0.0.1:8000';
        }

        // Convert HTTP to WS protocol
        const wsUrl = baseUrl.replace(/^http/, 'ws');
        return `${wsUrl}/api/v1/ws/signaling/${workflowId}/${workflowRunId}?token=${accessToken}`;
    }, [workflowId, workflowRunId, accessToken, appConfig]);

    const createPeerConnection = () => {
        // Build ICE servers list
        const iceServers: RTCIceServer[] = [];

        if (useStun) {
            iceServers.push({ urls: ['stun:stun.l.google.com:19302'] });
        }

        // Add TURN server if credentials are available (time-limited credentials from backend)
        const turnCredentials = turnCredentialsRef.current;
        if (turnCredentials?.uris && turnCredentials.uris.length > 0) {
            iceServers.push({
                urls: turnCredentials.uris,
                username: turnCredentials.username,
                credential: turnCredentials.password
            });

            logger.info(`TURN server configured with ${turnCredentials.uris.length} URIs, TTL: ${turnCredentials.ttl}s`);
        }

        const config: RTCConfiguration = {
            iceServers
        };

        // Diagnostic: when the backend is started with FORCE_TURN_RELAY=true,
        // restrict the browser to relay-only candidates so media must traverse
        // TURN. Lets you verify TURN connectivity end-to-end — a TURN
        // misconfiguration surfaces as an ICE failure instead of silently
        // falling back to host/srflx.
        if (appConfig?.forceTurnRelay) {
            config.iceTransportPolicy = 'relay';
            logger.info('FORCE_TURN_RELAY is on — restricting browser ICE to relay candidates only');
        }

        const pc = new RTCPeerConnection(config);

        // Set up ICE candidate trickling
        pc.addEventListener('icecandidate', (event) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const message = {
                    type: 'ice-candidate',
                    payload: {
                        candidate: event.candidate ? {
                            candidate: event.candidate.candidate,
                            sdpMid: event.candidate.sdpMid,
                            sdpMLineIndex: event.candidate.sdpMLineIndex
                        } : null,
                        pc_id: pc_id.current
                    }
                };
                wsRef.current.send(JSON.stringify(message));

                if (event.candidate) {
                    logger.debug(`Sending ICE candidate: ${event.candidate.candidate}`);
                } else {
                    logger.debug('Sending end-of-candidates signal');
                }
            }
        });

        pc.addEventListener('iceconnectionstatechange', () => {
            logger.info(`ICE connection state changed: ${pc.iceConnectionState}`);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setConnectionStatus('connected');
            } else if (pc.iceConnectionState === 'failed') {
                setConnectionStatus('failed');
            } else if (pc.iceConnectionState === 'disconnected') {
                // Server-initiated disconnect - clean up gracefully
                logger.info('Server initiated disconnect - cleaning up connection');

                // Close WebSocket if still open
                if (wsRef.current) {
                    wsRef.current.close();
                    wsRef.current = null;
                }

                // Mark as completed to trigger recording check
                setConnectionActive(false);
                setIsCompleted(true);
                setConnectionStatus('idle');

                // Clean up peer connection
                if (pc.getTransceivers) {
                    pc.getTransceivers().forEach((transceiver) => {
                        if (transceiver.stop) {
                            transceiver.stop();
                        }
                    });
                }

                pc.getSenders().forEach((sender) => {
                    if (sender.track) {
                        sender.track.stop();
                    }
                });
            }
        });

        pc.addEventListener('track', (evt) => {
            if (evt.track.kind === 'audio' && audioRef.current) {
                audioRef.current.srcObject = evt.streams[0];
            }
        });

        pcRef.current = pc;
        return pc;
    };

    const connectWebSocket = useCallback(() => {
        return new Promise<void>((resolve, reject) => {
            const wsUrl = getWebSocketUrl();
            logger.info(`Connecting to WebSocket: ${wsUrl}`);
            logger.debug('Browser location:', {
                origin: window.location.origin,
                hostname: window.location.hostname,
                port: window.location.port,
                protocol: window.location.protocol,
            });

            const isLocalHostUrl = (url: string | undefined) => {
                if (!url) return false;
                try {
                    const parsed = new URL(url);
                    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
                } catch {
                    return false;
                }
            };

            const runtimeBackendUrl = appConfig?.backendUrl && appConfig.backendUrl !== 'unknown'
                ? appConfig.backendUrl
                : undefined;
            const envBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || undefined;
            const publicBackendConfigured = Boolean(
                (runtimeBackendUrl && !isLocalHostUrl(runtimeBackendUrl)) ||
                (envBackendUrl && !isLocalHostUrl(envBackendUrl))
            );
            const isRemoteBrowser = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

            if (isRemoteBrowser && !publicBackendConfigured) {
                const warningMsg = `Remote browser detected but no public backend tunnel is configured. Set NEXT_PUBLIC_BACKEND_URL to your backend ngrok URL (for example https://9bc0-...).`; 
                logger.warn(warningMsg, { runtimeBackendUrl, envBackendUrl, sdkBaseUrl: client.getConfig().baseUrl, wsUrl });
                setConnectionErrorMessage(`${warningMsg} Current wsUrl: ${wsUrl}`);
                reject(new Error(warningMsg));
                return;
            }

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                logger.info('WebSocket connected');
                setConnectionErrorMessage(null);
                wsRef.current = ws;
                resolve();
            };

            ws.onerror = (event) => {
                const eventDetails = event instanceof Event ? {
                    type: event.type,
                    url: event.target && 'url' in event.target ? (event.target as WebSocket).url : undefined,
                } : event;
                const errorMessage = event instanceof Event
                    ? `WebSocket error event ${event.type}`
                    : String(event);

                logger.error('WebSocket error:', eventDetails);
                console.error(errorMessage, {
                    wsUrl,
                    eventDetails,
                    browserLocation: {
                        origin: window.location.origin,
                        hostname: window.location.hostname,
                        port: window.location.port,
                        protocol: window.location.protocol,
                    },
                    runtimeBackendUrl: appConfig?.backendUrl,
                    sdkBaseUrl: client.getConfig().baseUrl,
                });
                const failureMessage = `WebSocket failed to connect to ${wsUrl}: ${errorMessage}`;
                setConnectionErrorMessage(failureMessage);
                reject(new Error(failureMessage));
            };

            ws.onclose = (event) => {
                const closeMessage = `WebSocket closed: code=${event.code}, reason=${event.reason || 'none'}, clean=${event.wasClean}`;
                logger.info('WebSocket closed', {
                    code: event.code,
                    reason: event.reason,
                    wasClean: event.wasClean,
                });
                console.error(closeMessage, {
                    wsUrl,
                    closeEvent: event,
                });
                wsRef.current = null;
                // Don't set failed status if already completed (graceful disconnect)
                if (connectionActive && !isCompleted) {
                    setConnectionStatus('failed');
                    setConnectionErrorMessage(closeMessage);
                }
            };

            ws.onmessage = async (event) => {
                try {
                    const message = JSON.parse(event.data);

                    switch (message.type) {
                        case 'answer':
                            // Set remote description immediately (may have no candidates)
                            const answer = message.payload;
                            logger.debug('Received answer from server');

                            if (pcRef.current) {
                                await pcRef.current.setRemoteDescription({
                                    type: 'answer',
                                    sdp: answer.sdp
                                });
                                setConnectionActive(true);
                                logger.info('Remote description set');
                            }
                            break;

                        case 'ice-candidate':
                            // Add ICE candidate from server
                            const candidate = message.payload.candidate;

                            if (candidate && pcRef.current) {
                                try {
                                    await pcRef.current.addIceCandidate({
                                        candidate: candidate.candidate,
                                        sdpMid: candidate.sdpMid,
                                        sdpMLineIndex: candidate.sdpMLineIndex
                                    });
                                    logger.debug(`Added remote ICE candidate: ${candidate.candidate}`);
                                } catch (e) {
                                    logger.error('Failed to add ICE candidate:', e);
                                }
                            } else if (!candidate) {
                                logger.debug('Received end-of-candidates signal from server');
                            }
                            break;

                        case 'error':
                            // Check if this is a quota/service key error
                            if (message.payload?.error_type === 'quota_exceeded' ||
                                message.payload?.error_type === 'invalid_service_key' ||
                                message.payload?.error_type === 'quota_check_failed') {
                                // Log as info since it's a handled business logic case
                                logger.info('Quota/service key error, showing user dialog:', message.payload.message);

                                // Set error state for display
                                setApiKeyErrorCode(message.payload.error_type);
                                setApiKeyError(message.payload.message || 'Service quota exceeded');
                                setApiKeyModalOpen(true);

                                // Stop the connection gracefully
                                setConnectionStatus('failed');
                                setConnectionActive(false);

                                // Close WebSocket and peer connection
                                if (wsRef.current) {
                                    wsRef.current.close();
                                    wsRef.current = null;
                                }
                                if (pcRef.current) {
                                    pcRef.current.close();
                                    pcRef.current = null;
                                }
                            } else {
                                // Log other errors as actual errors
                                logger.error('Server error:', message.payload);
                            }
                            break;

                        case 'rtf-user-transcription': {
                            const transcription = message.payload;

                            // Show one-time warning if user speaks while muted on a no-interrupt node
                            // Skip during initial bot greeting (muted by MuteUntilFirstBotComplete strategy)
                            if (
                                !interruptWarningShownRef.current &&
                                firstBotSpeechCompletedRef.current &&
                                userMutedRef.current &&
                                currentAllowInterruptRef.current === false
                            ) {
                                interruptWarningShownRef.current = true;
                                setFeedbackMessages(prev => [...prev, {
                                    id: `interrupt-warning-${Date.now()}`,
                                    type: 'interrupt-warning',
                                    text: 'Interruption is disabled for this step. The bot will finish speaking before processing your input. You can enable interruption in the workflow editor.',
                                    timestamp: new Date().toISOString(),
                                }]);
                            }

                            setFeedbackMessages(prev => {
                                // Step 1: Finalize the last bot message (user started speaking)
                                const messagesWithBotFinalized = prev.map((msg, idx) => {
                                    const isLastMessage = idx === prev.length - 1;
                                    const isUnfinalizedBotMessage = msg.type === 'bot-text' && !msg.final;
                                    return isLastMessage && isUnfinalizedBotMessage
                                        ? { ...msg, final: true }
                                        : msg;
                                });

                                // Step 2: Remove any previous interim transcription
                                const messagesWithoutInterim = messagesWithBotFinalized.filter(
                                    msg => !(msg.type === 'user-transcription' && !msg.final)
                                );

                                // Step 3: Add new transcription (interim or final)
                                return [...messagesWithoutInterim, {
                                    id: `user-${Date.now()}`,
                                    type: 'user-transcription',
                                    text: transcription.text,
                                    final: transcription.final,
                                    timestamp: new Date().toISOString(),
                                }];
                            });
                            break;
                        }

                        case 'rtf-bot-text': {
                            // TTS text comes as sentences/phrases, concatenate with space
                            setFeedbackMessages(prev => {
                                const last = prev[prev.length - 1];
                                if (last && last.type === 'bot-text' && !last.final) {
                                    // Append to existing bot message
                                    return [
                                        ...prev.slice(0, -1),
                                        { ...last, text: last.text + ' ' + message.payload.text }
                                    ];
                                }
                                // Start new bot message
                                return [...prev, {
                                    id: `bot-${Date.now()}`,
                                    type: 'bot-text',
                                    text: message.payload.text,
                                    final: false,
                                    timestamp: new Date().toISOString(),
                                }];
                            });
                            break;
                        }

                        case 'rtf-function-call-start': {
                            const { function_name, tool_call_id, arguments: toolArguments } = message.payload;
                            setFeedbackMessages(prev => {
                                // Check if we already have this function call
                                const existingId = tool_call_id
                                    ? `func-${tool_call_id}`
                                    : `func-${Date.now()}`;
                                if (prev.some(msg => msg.id === existingId)) {
                                    return prev;
                                }
                                return [...prev, {
                                    id: existingId,
                                    type: 'function-call',
                                    text: function_name ?? 'tool',
                                    functionName: function_name ?? 'tool',
                                    toolCallId: tool_call_id,
                                    arguments: toolArguments,
                                    status: 'running',
                                    timestamp: new Date().toISOString(),
                                }];
                            });
                            break;
                        }

                        case 'rtf-function-call-end': {
                            const { tool_call_id, result } = message.payload;
                            setFeedbackMessages(prev => prev.map(msg =>
                                msg.id === `func-${tool_call_id}`
                                    ? { ...msg, status: 'completed' as const, text: result || msg.text, result }
                                    : msg
                            ));
                            break;
                        }

                        case 'rtf-node-transition': {
                            const {
                                node_id,
                                node_name,
                                previous_node_id,
                                previous_node_name,
                                allow_interrupt,
                            } = message.payload;
                            currentAllowInterruptRef.current = allow_interrupt;
                            const transitionTimestamp = new Date().toISOString();
                            const transition: ConversationNodeTransitionItem = {
                                kind: 'node-transition',
                                id: `node-${Date.now()}`,
                                timestamp: transitionTimestamp,
                                nodeId: node_id,
                                nodeName: node_name ?? 'Node',
                                previousNodeId: previous_node_id,
                                previousNodeName: previous_node_name,
                                allowInterrupt: allow_interrupt,
                            };
                            setFeedbackMessages(prev => [...prev, {
                                id: transition.id,
                                type: 'node-transition',
                                text: transition.nodeName,
                                nodeId: transition.nodeId,
                                nodeName: transition.nodeName,
                                previousNodeId: transition.previousNodeId,
                                previousNode: previous_node_name,
                                allowInterrupt: allow_interrupt,
                                timestamp: transitionTimestamp,
                            }]);
                            onNodeTransitionRef.current?.(transition);
                            break;
                        }

                        case 'rtf-ttfb-metric': {
                            const { ttfb_seconds, processor, model } = message.payload;
                            setFeedbackMessages(prev => [...prev, {
                                id: `ttfb-${Date.now()}`,
                                type: 'ttfb-metric',
                                text: `${(ttfb_seconds * 1000).toFixed(0)}ms`,
                                ttfbSeconds: ttfb_seconds,
                                processor,
                                model,
                                timestamp: new Date().toISOString(),
                            }]);
                            break;
                        }

                        case 'rtf-pipeline-error': {
                            const { error, fatal, processor: errorProcessor } = message.payload;
                            setFeedbackMessages(prev => [...prev, {
                                id: `error-${Date.now()}`,
                                type: 'pipeline-error',
                                text: error,
                                fatal,
                                processor: errorProcessor,
                                timestamp: new Date().toISOString(),
                            }]);
                            break;
                        }

                        // Ephemeral state signals — update refs only, no UI messages
                        case 'rtf-bot-started-speaking':
                            break;

                        case 'rtf-bot-stopped-speaking':
                            if (!firstBotSpeechCompletedRef.current) {
                                firstBotSpeechCompletedRef.current = true;
                            }
                            // Finalize the last bot message so "speaking..." indicator is removed
                            setFeedbackMessages(prev => {
                                const lastIdx = prev.length - 1;
                                const last = prev[lastIdx];
                                if (last && last.type === 'bot-text' && !last.final) {
                                    const updated = [...prev];
                                    updated[lastIdx] = { ...last, final: true };
                                    return updated;
                                }
                                return prev;
                            });
                            break;

                        case 'rtf-user-mute-started':
                            userMutedRef.current = true;
                            break;

                        case 'rtf-user-mute-stopped':
                            userMutedRef.current = false;
                            break;

                        default:
                            logger.warn('Unknown message type:', message.type);
                    }
                } catch (e) {
                    logger.error('Failed to handle WebSocket message:', e);
                }
            };
        });
    }, [getWebSocketUrl, connectionActive, isCompleted]);

    const negotiate = async () => {
        const pc = pcRef.current;
        const ws = wsRef.current;

        if (!pc || !ws || ws.readyState !== WebSocket.OPEN) {
            logger.error('Cannot negotiate: PC or WebSocket not ready');
            return;
        }

        try {
            // Create offer
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const localDescription = pc.localDescription;
            if (!localDescription) return;

            let sdp = localDescription.sdp;

            if (audioCodec !== 'default') {
                sdp = sdpFilterCodec('audio', audioCodec, sdp);
            }

            // Send offer immediately via WebSocket (without waiting for ICE gathering)
            const message = {
                type: 'offer',
                payload: {
                    sdp: sdp,
                    type: 'offer',
                    pc_id: pc_id.current,
                    workflow_id: workflowId,
                    workflow_run_id: workflowRunId,
                    call_context_vars: initialContext
                }
            };

            ws.send(JSON.stringify(message));
            logger.info('Sent offer via WebSocket (ICE trickling enabled)');

        } catch (e) {
            logger.error(`Negotiation failed: ${e}`);
            setConnectionStatus('failed');
        }
    };

    const start = async () => {
        if (isStarting || !accessToken) return;
        setConnectionErrorMessage(null);
        setIsStarting(true);
        setConnectionStatus('connecting');

        let mediaStream: MediaStream | null = null;
        let gotUserMedia = false;
        const constraints: MediaStreamConstraints = {
            audio: false,
        };

        if (useAudio) {
            const audioConstraints: MediaTrackConstraints = {};
            if (selectedAudioInput) {
                audioConstraints.deviceId = { exact: selectedAudioInput };
            }
            constraints.audio = Object.keys(audioConstraints).length ? audioConstraints : true;
        }

        if (constraints.audio) {
            try {
                mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
                gotUserMedia = true;
            } catch (err: any) {
                logger.error(`Could not acquire media before signaling: ${err}`);

                const isNoMic = err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError';
                const isPermissionDenied = err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError';

                if (isNoMic) {
                    setPermissionError(
                        'No microphone found. Continuing without microphone input (pre-recorded/audio-only mode). You can enable mic later.'
                    );
                } else if (isPermissionDenied) {
                    setPermissionError(
                        'Microphone permission denied. Continuing without microphone input. Please allow microphone access to use live voice input.'
                    );
                } else {
                    let friendlyError = 'Could not acquire media';
                    if (err?.message) friendlyError = `Microphone access failed: ${err.message}`;
                    setPermissionError(friendlyError);
                    setConnectionStatus('failed');
                    setIsStarting(false);
                    return;
                }
            }
        }

        try {
            // Fetch time-limited TURN credentials from backend API only if the
            // server reports a TURN server is configured. Skipping the request
            // avoids a 503 on OSS local deployments that don't run coturn.
            if (appConfig?.turnEnabled === false) {
                logger.info('TURN server disabled in app config, using STUN only');
            } else {
                try {
                    const turnResponse = await getTurnCredentialsApiV1TurnCredentialsGet({
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                        },
                    });
                    if (turnResponse.data) {
                        turnCredentialsRef.current = turnResponse.data;
                        logger.info(`TURN credentials obtained, TTL: ${turnResponse.data.ttl}s`);
                    } else if (turnResponse.response.status === 503) {
                        // TURN not configured on server - this is OK, we'll use STUN only
                        logger.info('TURN server not configured, using STUN only');
                    } else {
                        logger.warn(`Failed to fetch TURN credentials: ${turnResponse.response.status}`);
                    }
                } catch (e) {
                    logger.warn('Failed to fetch TURN credentials, continuing without TURN:', e);
                }
            }

            // Validate API keys
            const response = await validateUserConfigurationsApiV1UserConfigurationsUserValidateGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
                query: {
                    validity_ttl_seconds: 86400
                },
            });

            if (response.error) {
                setApiKeyModalOpen(true);
                setApiKeyErrorCode('invalid_api_key');
                let msg = 'API Key Error';
                const detail = (response.error as unknown as { detail?: { errors: { model: string; message: string }[] } }).detail;
                if (Array.isArray(detail)) {
                    msg = detail
                        .map((e: { model: string; message: string }) => `${e.model}: ${e.message}`)
                        .join('\n');
                }
                setApiKeyError(msg);
                setConnectionStatus('failed');
                return;
            }

            // Validate workflow
            const workflowResponse = await validateWorkflowApiV1WorkflowWorkflowIdValidatePost({
                path: {
                    workflow_id: workflowId,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (workflowResponse.error) {
                setWorkflowConfigModalOpen(true);
                let msg = 'Workflow validation failed';
                const errorDetail = workflowResponse.error as { detail?: { errors: WorkflowValidationError[] } };
                if (errorDetail?.detail?.errors) {
                    msg = errorDetail.detail.errors
                        .map(err => `${err.kind}: ${err.message}`)
                        .join('\n');
                }
                setWorkflowConfigError(msg);
                setConnectionStatus('failed');
                return;
            }

            // Create peer connection
            timeStartRef.current = null;
            const pc = createPeerConnection();

            // Connect WebSocket after requesting microphone permissions so mobile gets the prompt early.
            await connectWebSocket();

            if (gotUserMedia && mediaStream) {
                mediaStream.getTracks().forEach((track) => {
                    pc.addTrack(track, mediaStream as MediaStream);
                });
            }

            await negotiate();

        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.error('Failed to start connection:', error);
            setConnectionErrorMessage(`Failed to start connection: ${message}`);
            setConnectionStatus('failed');
        } finally {
            setIsStarting(false);
        }
    };

    const stop = () => {
        setConnectionActive(false);
        setIsCompleted(true);
        setConnectionStatus('idle');

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Close peer connection
        const pc = pcRef.current;
        if (!pc) return;

        if (pc.getTransceivers) {
            pc.getTransceivers().forEach((transceiver) => {
                if (transceiver.stop) {
                    transceiver.stop();
                }
            });
        }

        pc.getSenders().forEach((sender) => {
            if (sender.track) {
                sender.track.stop();
            }
        });

        setTimeout(() => {
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
        }, 500);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (pcRef.current) {
                pcRef.current.close();
            }
        };
    }, []);

    return {
        audioRef,
        audioInputs,
        selectedAudioInput,
        setSelectedAudioInput,
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
        initialContext,
        getAudioInputDevices,
        feedbackMessages,
    };
};
