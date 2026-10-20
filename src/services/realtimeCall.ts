import { ChatMessage, CollabCallParticipant, IncomingCall, CallType } from '../types';

interface RealtimeCallbacks {
  onIncomingCall?: (call: IncomingCall) => void;
  onCallAccepted?: (data: { callId: string; peerId: string; peerName: string; peerEmail: string }) => void;
  onCallDeclined?: (data: { callId: string; peerId: string; peerName: string; peerEmail: string }) => void;
  onCallCancelled?: (data: { callId: string }) => void;
  onCallEnded?: (data: { callId: string }) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onChatMessage?: (msg: ChatMessage) => void;
  onTaskDelegated?: (data: { task: any; recipientEmail?: string; boardId?: string; boardName?: string; senderName?: string; senderEmail?: string }) => void;
  onConnectionStatus?: (status: 'connected' | 'connecting' | 'disconnected') => void;
}

export class RealtimeCollabManager {
  private ws: WebSocket | null = null;
  private reconnectTimer: any = null;
  private currentBoardId: string = '';
  private currentUserEmail: string = '';
  private currentUserId: string = '';
  private currentUserName: string = '';
  private callbacks: RealtimeCallbacks = {};
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private screenStream: MediaStream | null = null;
  private activeCallId: string | null = null;
  private isCaller: boolean = false;
  private targetPeerEmail: string = '';
  private pendingCandidates: RTCIceCandidateInit[] = [];

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

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
      const socketUrl = `${protocol}//${window.location.host}/api/collab-socket`;
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

          // If we are the caller, start WebRTC Offer
          if (this.isCaller) {
            await this.initiateWebRTCOffer();
          }
        }
        break;

      case 'call_rejected':
        if (data.rejecterId !== this.currentUserId) {
          this.callbacks.onCallDeclined?.({
            callId: data.callId,
            peerId: data.rejecterId,
            peerName: data.rejecterName,
            peerEmail: data.rejecterEmail
          });
          this.cleanupCall();
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
          await this.handleWebRTCOffer(data.offer, data.senderEmail);
        }
        break;

      case 'webrtc_answer':
        if (data.answer && data.senderId !== this.currentUserId) {
          await this.handleWebRTCAnswer(data.answer);
        }
        break;

      case 'webrtc_ice':
        if (data.candidate && data.senderId !== this.currentUserId) {
          await this.handleWebRTCIce(data.candidate);
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
  startRingingCall(params: {
    callType: CallType;
    boardId: string;
    boardName: string;
    targetEmails: string[];
    targetMemberIds: string[];
    callerColor?: string;
    callerAvatar?: string;
  }): string {
    const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    this.activeCallId = callId;
    this.isCaller = true;
    this.targetPeerEmail = (params.targetEmails[0] || '').toLowerCase();

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
        callerEmail: this.currentUserEmail
      });
    }
    this.cleanupCall();
  }

  acceptIncomingCall(callId: string, boardId: string, callerEmail: string) {
    this.activeCallId = callId;
    this.isCaller = false;
    this.targetPeerEmail = (callerEmail || '').toLowerCase();

    this.send({
      type: 'call_accept',
      callId,
      accepterId: this.currentUserId,
      accepterEmail: this.currentUserEmail,
      accepterName: this.currentUserName,
      boardId
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
        targetEmail: this.targetPeerEmail
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

  /* ── WebRTC Peer Connection & Media Streams ───────────────── */
  private getOrCreatePeerConnection(): RTCPeerConnection {
    if (this.peerConnection && this.peerConnection.signalingState !== 'closed') {
      return this.peerConnection;
    }

    const pc = new RTCPeerConnection(this.rtcConfig);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({
          type: 'webrtc_ice',
          callId: this.activeCallId,
          candidate: event.candidate.toJSON(),
          senderId: this.currentUserId,
          senderEmail: this.currentUserEmail,
          targetEmail: this.targetPeerEmail
        });
      }
    };

    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        const stream = event.streams[0];
        stream.onaddtrack = () => this.callbacks.onRemoteStream?.(new MediaStream(stream.getTracks()));
        stream.onremovetrack = () => this.callbacks.onRemoteStream?.(new MediaStream(stream.getTracks()));
        this.callbacks.onRemoteStream?.(stream);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        console.warn('[RealtimeCollab] WebRTC connection state:', pc.connectionState);
      }
    };

    this.peerConnection = pc;
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

        const pc = this.getOrCreatePeerConnection();
        stream.getTracks().forEach(track => {
          pc.addTrack(track, stream);
        });

        return stream;
      }
    } catch (err) {
      console.warn('[RealtimeCollab] getUserMedia failed, continuing with audio/muted fallback:', err);
    }
    return null;
  }

  private async initiateWebRTCOffer() {
    try {
      const pc = this.getOrCreatePeerConnection();
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      this.send({
        type: 'webrtc_offer',
        callId: this.activeCallId,
        offer: pc.localDescription,
        senderId: this.currentUserId,
        senderEmail: this.currentUserEmail,
        targetEmail: this.targetPeerEmail
      });
    } catch (err) {
      console.warn('[RealtimeCollab] Error creating WebRTC offer:', err);
    }
  }

  private async handleWebRTCOffer(offer: RTCSessionDescriptionInit, senderEmail: string) {
    try {
      this.targetPeerEmail = senderEmail.toLowerCase();
      const pc = this.getOrCreatePeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush pending ICE candidates if any
      while (this.pendingCandidates.length > 0) {
        const cand = this.pendingCandidates.shift();
        if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
      }

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      this.send({
        type: 'webrtc_answer',
        callId: this.activeCallId,
        answer: pc.localDescription,
        senderId: this.currentUserId,
        senderEmail: this.currentUserEmail,
        targetEmail: senderEmail
      });
    } catch (err) {
      console.warn('[RealtimeCollab] Error handling WebRTC offer:', err);
    }
  }

  private async handleWebRTCAnswer(answer: RTCSessionDescriptionInit) {
    try {
      if (this.peerConnection) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));

        // Flush pending ICE candidates
        while (this.pendingCandidates.length > 0) {
          const cand = this.pendingCandidates.shift();
          if (cand) await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        }
      }
    } catch (err) {
      console.warn('[RealtimeCollab] Error handling WebRTC answer:', err);
    }
  }

  private async handleWebRTCIce(candidate: RTCIceCandidateInit) {
    try {
      if (this.peerConnection && this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } else {
        this.pendingCandidates.push(candidate);
      }
    } catch (err) {
      console.warn('[RealtimeCollab] Error adding ICE candidate:', err);
    }
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
        if (this.peerConnection) {
          const videoTrack = stream.getVideoTracks()[0];
          const senders = this.peerConnection.getSenders();
          const videoSender = senders.find(s => s.track && s.track.kind === 'video');
          if (videoSender) {
            videoSender.replaceTrack(videoTrack);
          } else {
            this.peerConnection.addTrack(videoTrack, stream);
          }
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
    if (this.peerConnection && this.localStream) {
      const cameraTrack = this.localStream.getVideoTracks()[0];
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find(s => s.track && s.track.kind === 'video');
      if (videoSender && cameraTrack) {
        videoSender.replaceTrack(cameraTrack);
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

  setVideoEnabled(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(t => {
        t.enabled = enabled;
      });
    }
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
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.activeCallId = null;
    this.isCaller = false;
    this.targetPeerEmail = '';
    this.pendingCandidates = [];
  }
}

export const RealtimeCollab = new RealtimeCollabManager();
