import { ChatMessage, CollabCallParticipant, IncomingCall, CallType } from '../types';

interface RealtimeCallbacks {
  onIncomingCall?: (call: IncomingCall) => void;
  onCallAccepted?: (data: { callId: string; peerId: string; peerName: string; peerEmail: string }) => void;
  onParticipantJoined?: (data: { callId: string; peerId: string; peerName: string; peerEmail: string }) => void;
  onCallDeclined?: (data: { callId: string; peerId: string; peerName: string; peerEmail: string }) => void;
  onCallCancelled?: (data: { callId: string }) => void;
  onCallEnded?: (data: { callId: string }) => void;
  onRemoteStream?: (stream: MediaStream, peerEmail?: string) => void;
  onChatMessage?: (msg: ChatMessage) => void;
  onTaskDelegated?: (data: { task: any; recipientEmail?: string; boardId?: string; boardName?: string; senderName?: string; senderEmail?: string }) => void;
  onConnectionStatus?: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

export class RealtimeCollabManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private currentBoardId: string = '';
  private currentUserEmail: string = '';
  private currentUserId: string = '';
  private currentUserName: string = '';
  private callbacks: RealtimeCallbacks = {};
  private signalingConfigurationError: string | null = null;
  private peerConnections = new Map<string, RTCPeerConnection>();
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private activeCallId: string | null = null;
  private isCaller: boolean = false;
  private targetPeerEmail: string = '';
  private activeTargetEmails: string[] = [];
  private pendingCandidates = new Map<string, RTCIceCandidateInit[]>();

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      ...this.getConfiguredTurnServers()
    ]
  };

  private getConfiguredTurnServers(): RTCIceServer[] {
    const env = (import.meta as any).env || {};
    const urls = String(env.VITE_TURN_URLS || '').split(',').map((url: string) => url.trim()).filter(Boolean);
    if (!urls.length || !env.VITE_TURN_USERNAME || !env.VITE_TURN_CREDENTIAL) return [];
    return [{ urls, username: env.VITE_TURN_USERNAME, credential: env.VITE_TURN_CREDENTIAL }];
  }

  constructor() {
    // Singleton
  }

  setCallbacks(cbs: RealtimeCallbacks) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  connect(userEmail: string, boardId: string, userId: string, userName: string) {
    this.currentUserEmail = (userEmail || '').trim().toLowerCase();
    this.currentBoardId = boardId;
    this.currentUserId = userId;
    this.currentUserName = userName;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      // Re-register if info changed
      if (this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'register',
          email: this.currentUserEmail,
          boardId: this.currentBoardId,
          userId: this.currentUserId,
          name: this.currentUserName
        });
      }
      return;
    }

    this.callbacks.onConnectionStatus?.('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const configuredSocketUrl = (import.meta as any).env?.VITE_COLLAB_WS_URL as string | undefined;
      const isLocalDevelopment = Boolean((import.meta as any).env?.DEV);
      if (!configuredSocketUrl?.trim() && !isLocalDevelopment) {
        this.signalingConfigurationError = 'Calling is not configured for this deployment. Deploy the Deepwork signaling server, set VITE_COLLAB_WS_URL in Vercel to its wss://.../api/collab-socket address, then redeploy the web app.';
        this.callbacks.onConnectionStatus?.('disconnected');
        console.error(`[RealtimeCollab] ${this.signalingConfigurationError}`);
        return;
      }
      this.signalingConfigurationError = null;
      const socketUrl = configuredSocketUrl?.trim() || `${protocol}//${window.location.host}/api/collab-socket`;
      this.ws = new WebSocket(socketUrl);

      this.ws.onopen = () => {
        this.callbacks.onConnectionStatus?.('connected');
        this.send({
          type: 'register',
          email: this.currentUserEmail,
          boardId: this.currentBoardId,
          userId: this.currentUserId,
          name: this.currentUserName
        });
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = setInterval(() => this.send({ type: 'heartbeat' }), 15000);
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleIncomingSocketMessage(payload);
        } catch (e) {
          console.warn('[RealtimeCollab] Failed to parse socket message:', e);
        }
      };

      this.ws.onclose = () => {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
        this.callbacks.onConnectionStatus?.('disconnected');
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('[RealtimeCollab] Socket error:', err);
      };
    } catch (e) {
      console.warn('[RealtimeCollab] Failed to initialize WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentUserEmail) {
        this.connect(this.currentUserEmail, this.currentBoardId, this.currentUserId, this.currentUserName);
      }
    }, 3000);
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private async waitForConnection(timeoutMs = 75000): Promise<void> {
    if (this.signalingConfigurationError) throw new Error(this.signalingConfigurationError);
    const startedAt = Date.now();
    while ((!this.ws || this.ws.readyState !== WebSocket.OPEN) && Date.now() - startedAt < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Could not reach the WebRTC signaling server after 75 seconds. Check your connection and server URL, then try again.');
    }
  }

  updateBoard(boardId: string) {
    this.currentBoardId = boardId;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'update_board',
        email: this.currentUserEmail,
        boardId: this.currentBoardId
      });
    }
  }

  /* ── WebSocket Incoming Event Handlers ─────────────────────── */
  private async handleIncomingSocketMessage(data: any) {
    switch (data.type) {
      case 'chat_message':
        if (data.message && data.message.senderId !== this.currentUserId) {
          this.callbacks.onChatMessage?.(data.message);
        }
        break;

      case 'incoming_call':
        // Only fire if the incoming call is not from ourselves in the same tab/session
        if (data.callerId !== this.currentUserId) {
          const incoming: IncomingCall = {
            id: data.callId,
            boardId: data.boardId,
            boardName: data.boardName || 'Deepwork Workspace',
            callerId: data.callerId,
            callerName: data.callerName,
            callerEmail: data.callerEmail,
            callerAvatar: data.callerAvatar,
            callerColor: data.callerColor || '#0C66E4',
            type: data.callType || 'video',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            participants: [
              {
                id: data.callerId,
                email: data.callerEmail,
                name: data.callerName,
                color: data.callerColor || '#0C66E4',
                avatar: data.callerAvatar,
                isMuted: false,
                isVideoOn: data.callType === 'video',
                isSpeaking: true
              }
            ]
          };
          this.activeCallId = data.callId;
          this.targetPeerEmail = (data.callerEmail || '').toLowerCase();
          this.callbacks.onIncomingCall?.(incoming);
        }
        break;

      case 'call_accepted':
        if (data.accepterId !== this.currentUserId) {
          this.activeCallId = data.callId;
          this.targetPeerEmail = (data.accepterEmail || '').toLowerCase();
          this.callbacks.onCallAccepted?.({
            callId: data.callId,
            peerId: data.accepterId,
            peerName: data.accepterName,
            peerEmail: data.accepterEmail
          });

          // Peer negotiation starts from call_participant_joined to create a full mesh.
        }
        break;

      case 'call_participant_joined': {
        const peer = data.participant || {};
        const peerEmail = String(peer.email || '').toLowerCase();
        const peerId = String(peer.id || '');
        if (data.callId === this.activeCallId && peerId && peerId !== this.currentUserId && peerEmail) {
          this.callbacks.onParticipantJoined?.({ callId: data.callId, peerId, peerName: peer.name || 'Teammate', peerEmail });
          if (this.currentUserId.localeCompare(peerId) < 0) await this.initiateWebRTCOffer(peerEmail);
        }
        break;
      }

      case 'call_rejected':
        if (data.rejecterId !== this.currentUserId) {
          this.callbacks.onCallDeclined?.({
            callId: data.callId,
            peerId: data.rejecterId,
            peerName: data.rejecterName,
            peerEmail: data.rejecterEmail
          });
          // Keep a group call alive for the participants who accepted.
        }
        break;

      case 'call_cancelled':
        if (data.callerId !== this.currentUserId) {
          this.callbacks.onCallCancelled?.({ callId: data.callId });
          this.cleanupCall();
        }
        break;

      case 'call_ended':
        if (data.senderId !== this.currentUserId) {
          this.callbacks.onCallEnded?.({ callId: data.callId });
          this.cleanupCall();
        }
        break;

      case 'webrtc_offer':
        if (data.offer && data.senderId !== this.currentUserId) {
          const myEmail = this.currentUserEmail;
          const targetEmail = (data.targetEmail || '').toLowerCase().trim();
          if (!targetEmail || !myEmail || targetEmail === myEmail) await this.handleWebRTCOffer(data.offer, data.senderEmail, data.callId);
        }
        break;

      case 'webrtc_answer':
        if (data.answer && data.senderId !== this.currentUserId) {
          const myEmail = this.currentUserEmail;
          const targetEmail = (data.targetEmail || '').toLowerCase().trim();
          if (!targetEmail || !myEmail || targetEmail === myEmail) {
            await this.handleWebRTCAnswer(data.answer, data.senderEmail);
          }
        }
        break;

      case 'webrtc_ice':
        if (data.candidate && data.senderId !== this.currentUserId) {
          const myEmail = this.currentUserEmail;
          const targetEmail = (data.targetEmail || '').toLowerCase().trim();
          if (!targetEmail || !myEmail || targetEmail === myEmail) {
            await this.handleWebRTCIce(data.candidate, data.senderEmail);
          }
        }
        break;

      case 'task_delegated':
        if (data.senderId !== this.currentUserId) {
          this.callbacks.onTaskDelegated?.(data);
        }
        break;

      default:
        break;
    }
  }

  /* ── Call Initiation & Ringing ────────────────────────────── */
  async startRingingCall(params: {
    callType: CallType;
    boardId: string;
    boardName: string;
    targetEmails: string[];
    targetMemberIds: string[];
    callerColor?: string;
    callerAvatar?: string;
  }): Promise<string> {
    await this.waitForConnection();
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.activeCallId = callId;
    this.isCaller = true;
    this.activeTargetEmails = params.targetEmails.map(email => email.toLowerCase());
    this.targetPeerEmail = this.activeTargetEmails[0] || '';

    this.send({
      type: 'call_ring',
      callId,
      callerId: this.currentUserId,
      callerName: this.currentUserName,
      callerEmail: this.currentUserEmail,
      callerColor: params.callerColor || '#0C66E4',
      callerAvatar: params.callerAvatar || '',
      boardId: params.boardId,
      boardName: params.boardName,
      callType: params.callType,
      targetEmails: params.targetEmails.map(e => (e || '').toLowerCase()),
      targetMemberIds: params.targetMemberIds
    });

    return callId;
  }

  cancelRingingCall(callId?: string) {
    const id = callId || this.activeCallId;
    if (id) {
      this.send({
        type: 'call_cancel',
        callId: id,
        callerId: this.currentUserId,
        callerEmail: this.currentUserEmail,
        targetEmail: this.targetPeerEmail,
        targetEmails: this.activeTargetEmails
      });
    }
    this.cleanupCall();
  }

  async acceptIncomingCall(callId: string, boardId: string, callerEmail: string) {
    await this.waitForConnection();
    this.activeCallId = callId;
    this.isCaller = false;
    this.targetPeerEmail = (callerEmail || '').toLowerCase();
    this.activeTargetEmails = [this.targetPeerEmail];

    this.send({
      type: 'call_accept',
      callId,
      accepterId: this.currentUserId,
      accepterEmail: this.currentUserEmail,
      accepterName: this.currentUserName,
      boardId,
      targetEmail: callerEmail
    });
  }

  rejectIncomingCall(callId: string, callerEmail: string) {
    this.send({
      type: 'call_reject',
      callId,
      rejecterId: this.currentUserId,
      rejecterEmail: this.currentUserEmail,
      rejecterName: this.currentUserName,
      targetEmail: callerEmail
    });
    this.cleanupCall();
  }

  endActiveCall(callId?: string) {
    const id = callId || this.activeCallId;
    if (id) {
      this.send({
        type: 'call_end',
        callId: id,
        senderId: this.currentUserId,
        senderEmail: this.currentUserEmail,
        targetEmail: this.targetPeerEmail,
        targetEmails: this.activeTargetEmails
      });
    }
    this.cleanupCall();
  }

  broadcastChatMessage(msg: ChatMessage) {
    this.send({
      type: 'chat_message',
      boardId: msg.boardId || this.currentBoardId,
      message: msg
    });
  }

  sendTaskDelegation(taskOrParams: any, recipientEmail?: string) {
    if (taskOrParams && taskOrParams.task) {
      this.send({
        type: 'task_delegated',
        ...taskOrParams,
        senderId: this.currentUserId
      });
    } else {
      this.send({
        type: 'task_delegated',
        task: taskOrParams,
        recipientEmail,
        senderId: this.currentUserId
      });
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  getScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  /* ── WebRTC Peer Connection & Media Streams ───────────────── */
  private getOrCreatePeerConnection(peerEmail: string): RTCPeerConnection {
    const peerKey = peerEmail.trim().toLowerCase();
    const existing = this.peerConnections.get(peerKey);
    if (existing && existing.signalingState !== 'closed') return existing;

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.localStream?.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    pc.onicecandidate = event => {
      if (event.candidate) this.send({
        type: 'webrtc_ice', callId: this.activeCallId, candidate: event.candidate.toJSON(),
        senderId: this.currentUserId, senderEmail: this.currentUserEmail, targetEmail: peerKey
      });
    };
    pc.ontrack = event => {
      if (event.streams?.[0]) {
        const stream = event.streams[0];
        stream.onaddtrack = () => this.callbacks.onRemoteStream?.(new MediaStream(stream.getTracks()), peerKey);
        stream.onremovetrack = () => this.callbacks.onRemoteStream?.(new MediaStream(stream.getTracks()), peerKey);
        this.callbacks.onRemoteStream?.(stream, peerKey);
      }
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') console.warn('[RealtimeCollab] Peer connection state:', peerKey, pc.connectionState);
    };
    this.peerConnections.set(peerKey, pc);
    return pc;
  }

  async setupLocalMedia(type: CallType): Promise<MediaStream | null> {
    try {
      if (this.localStream) {
        return this.localStream;
      }

      if (navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: type === 'video' ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false
        });
        this.localStream = stream;

        return stream;
      }
    } catch (err) {
      console.warn('[RealtimeCollab] getUserMedia failed, continuing with audio/muted fallback:', err);
    }
    return null;
  }

  private async initiateWebRTCOffer(peerEmail: string) {
    try {
      const peerKey = peerEmail.trim().toLowerCase();
      const pc = this.getOrCreatePeerConnection(peerKey);
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      this.send({ type: 'webrtc_offer', callId: this.activeCallId, offer: pc.localDescription, senderId: this.currentUserId, senderEmail: this.currentUserEmail, targetEmail: peerKey });
    } catch (err) { console.warn('[RealtimeCollab] Error creating WebRTC offer:', err); }
  }

  private async handleWebRTCOffer(offer: RTCSessionDescriptionInit, senderEmail: string, callId: string) {
    try {
      const peerKey = senderEmail.toLowerCase();
      this.activeCallId = callId;
      const pc = this.getOrCreatePeerConnection(peerKey);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const pending = this.pendingCandidates.get(peerKey) || [];
      for (const candidate of pending) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      this.pendingCandidates.delete(peerKey);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.send({ type: 'webrtc_answer', callId, answer: pc.localDescription, senderId: this.currentUserId, senderEmail: this.currentUserEmail, targetEmail: peerKey });
    } catch (err) { console.warn('[RealtimeCollab] Error handling WebRTC offer:', err); }
  }

  private async handleWebRTCAnswer(answer: RTCSessionDescriptionInit, senderEmail: string) {
    try {
      const peerKey = senderEmail.toLowerCase();
      const pc = this.peerConnections.get(peerKey);
      if (!pc) return;
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      const pending = this.pendingCandidates.get(peerKey) || [];
      for (const candidate of pending) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      this.pendingCandidates.delete(peerKey);
    } catch (err) { console.warn('[RealtimeCollab] Error handling WebRTC answer:', err); }
  }

  private async handleWebRTCIce(candidate: RTCIceCandidateInit, senderEmail: string) {
    try {
      const peerKey = senderEmail.toLowerCase();
      const pc = this.peerConnections.get(peerKey);
      if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(candidate));
      else this.pendingCandidates.set(peerKey, [...(this.pendingCandidates.get(peerKey) || []), candidate]);
    } catch (err) { console.warn('[RealtimeCollab] Error adding ICE candidate:', err); }
  }

  /* ── Screen Sharing & Track Controls ──────────────────────── */
  async startScreenShare(): Promise<MediaStream | null> {
    try {
      if (navigator.mediaDevices?.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: 'monitor' } as any,
          audio: false
        });
        this.screenStream = stream;

        // If peer connection exists, replace the video sender track with screen share track
        const videoTrack = stream.getVideoTracks()[0];
        for (const [email, pc] of this.peerConnections) {
          const videoSender = pc.getSenders().find(sender => sender.track?.kind === 'video');
          if (videoSender) await videoSender.replaceTrack(videoTrack); else pc.addTrack(videoTrack, stream);
        }

        return stream;
      }
    } catch (err) {
      console.warn('[RealtimeCollab] Screen share cancelled or failed:', err);
    }
    return null;
  }

  stopScreenShare() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    // Restore webcam track if available
    if (this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      if (cameraTrack) for (const pc of this.peerConnections.values()) {
        const videoSender = pc.getSenders().find(sender => sender.track?.kind === 'video');
        if (videoSender) void videoSender.replaceTrack(cameraTrack);
      }
    }
  }

  setMuted(muted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => {
        t.enabled = !muted;
      });
    }
  }

  async setVideoEnabled(enabled: boolean): Promise<boolean> {
    if (!this.localStream) return false;

    const existingTracks = this.localStream.getVideoTracks();
    if (existingTracks.length > 0) {
      existingTracks.forEach(t => { t.enabled = enabled; });
      return true;
    }

    if (enabled && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        const newTrack = stream.getVideoTracks()[0];
        if (newTrack) {
          this.localStream.addTrack(newTrack);
          for (const pc of this.peerConnections.values()) {
            const videoSender = pc.getSenders().find(sender => sender.track?.kind === 'video');
            if (videoSender) await videoSender.replaceTrack(newTrack); else pc.addTrack(newTrack, this.localStream);
          }
          return true;
        }
      } catch (e) {
        console.warn('[RealtimeCollab] Failed to dynamically enable video:', e);
      }
    }
    return false;
  }

  private cleanupCall() {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = null;
    }
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    for (const pc of this.peerConnections.values()) pc.close();
    this.peerConnections.clear();
    this.activeCallId = null;
    this.isCaller = false;
    this.targetPeerEmail = '';
    this.activeTargetEmails = [];
    this.pendingCandidates.clear();
  }
}

export const RealtimeCollab = new RealtimeCollabManager();
