import {
  Room,
  RoomEvent,
  VideoPresets,
  Track,
  ConnectionState,
  RemoteParticipant,
  Participant,
  RemoteTrackPublication,
  LocalTrackPublication,
  ConnectionQuality
} from 'livekit-client';

export interface ParticipantTrackInfo {
  participantId: string;
  identity: string;
  name: string;
  isLocal: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
  screenTrack?: MediaStreamTrack;
  connectionQuality?: ConnectionQuality;
}

export type LivekitConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export interface LivekitCallbacks {
  onConnectionStatusChange?: (status: LivekitConnectionStatus) => void;
  onParticipantsChange?: (participants: ParticipantTrackInfo[]) => void;
  onActiveSpeakersChange?: (speakerIds: string[]) => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (err: Error) => void;
}

export class LivekitCallClient {
  private room: Room | null = null;
  private callbacks: LivekitCallbacks = {};
  private activeRoomName: string = '';
  private currentLivekitUrl: string = '';
  private isAudioEnabled: boolean = true;
  private isVideoEnabled: boolean = true;
  private isScreenSharing: boolean = false;

  constructor() {}

  public setCallbacks(cbs: LivekitCallbacks) {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  /**
   * Connect to a LiveKit room using server-issued access token
   */
  public async connect(
    livekitUrl: string,
    token: string,
    initialMediaType: 'audio' | 'video' = 'video'
  ): Promise<boolean> {
    try {
      // If already in a room, disconnect first
      if (this.room) {
        await this.disconnect();
      }

      this.currentLivekitUrl = livekitUrl;
      this.callbacks.onConnectionStatusChange?.('connecting');

      // Initialize LiveKit Room with adaptive streaming, dynacast & audio enhancements
      this.room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h540.resolution,
          facingMode: 'user'
        },
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      this.setupRoomEventListeners(this.room);

      // Connect to LiveKit Room
      await this.room.connect(livekitUrl, token, {
        autoSubscribe: true
      });

      this.activeRoomName = this.room.name;
      this.callbacks.onConnectionStatusChange?.('connected');

      // Publish local audio and video tracks
      this.isAudioEnabled = true;
      this.isVideoEnabled = initialMediaType === 'video';

      try {
        await this.room.localParticipant.setMicrophoneEnabled(true);
      } catch (micErr: any) {
        console.warn('[LivekitClient] Microphone permission or device issue:', micErr);
        this.isAudioEnabled = false;
      }

      if (this.isVideoEnabled) {
        try {
          await this.room.localParticipant.setCameraEnabled(true);
        } catch (camErr: any) {
          console.warn('[LivekitClient] Camera permission or device issue:', camErr);
          this.isVideoEnabled = false;
        }
      }

      this.notifyParticipantsUpdated();
      return true;
    } catch (err: any) {
      console.error('[LivekitClient] Room connection error:', err);
      this.callbacks.onConnectionStatusChange?.('disconnected');
      this.callbacks.onError?.(err);
      return false;
    }
  }

  /**
   * Set up all LiveKit room lifecycle and track subscription event listeners
   */
  private setupRoomEventListeners(room: Room) {
    room.on(RoomEvent.Connected, () => {
      this.callbacks.onConnectionStatusChange?.('connected');
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.Reconnecting, () => {
      this.callbacks.onConnectionStatusChange?.('reconnecting');
    });

    room.on(RoomEvent.Reconnected, () => {
      this.callbacks.onConnectionStatusChange?.('connected');
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.Disconnected, () => {
      this.callbacks.onConnectionStatusChange?.('disconnected');
      this.callbacks.onDisconnected?.('Disconnected from room');
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.TrackSubscribed, () => {
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.TrackUnsubscribed, () => {
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.TrackMuted, () => {
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.TrackUnmuted, () => {
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakerIds = speakers.map(s => s.identity);
      this.callbacks.onActiveSpeakersChange?.(speakerIds);
      this.notifyParticipantsUpdated();
    });

    room.on(RoomEvent.ConnectionQualityChanged, () => {
      this.notifyParticipantsUpdated();
    });
  }

  /**
   * Aggregate local and remote participants with their published tracks
   */
  public getParticipants(): ParticipantTrackInfo[] {
    if (!this.room) return [];

    const list: ParticipantTrackInfo[] = [];

    // 1. Local Participant
    const local = this.room.localParticipant;
    if (local) {
      let localAudio: MediaStreamTrack | undefined;
      let localVideo: MediaStreamTrack | undefined;
      let localScreen: MediaStreamTrack | undefined;

      local.trackPublications.forEach(pub => {
        if (pub.track?.mediaStreamTrack) {
          if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
            localScreen = pub.track.mediaStreamTrack;
          } else if (pub.kind === Track.Kind.Video) {
            localVideo = pub.track.mediaStreamTrack;
          } else if (pub.kind === Track.Kind.Audio) {
            localAudio = pub.track.mediaStreamTrack;
          }
        }
      });

      list.push({
        participantId: local.sid,
        identity: local.identity,
        name: local.name || 'You',
        isLocal: true,
        isSpeaking: local.isSpeaking,
        isMuted: !local.isMicrophoneEnabled,
        isVideoOn: local.isCameraEnabled,
        isScreenSharing: local.isScreenShareEnabled,
        audioTrack: localAudio,
        videoTrack: localVideo,
        screenTrack: localScreen,
        connectionQuality: local.connectionQuality
      });
    }

    // 2. Remote Participants
    this.room.remoteParticipants.forEach(remote => {
      let remoteAudio: MediaStreamTrack | undefined;
      let remoteVideo: MediaStreamTrack | undefined;
      let remoteScreen: MediaStreamTrack | undefined;

      remote.trackPublications.forEach(pub => {
        if (pub.track?.mediaStreamTrack) {
          if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
            remoteScreen = pub.track.mediaStreamTrack;
          } else if (pub.kind === Track.Kind.Video) {
            remoteVideo = pub.track.mediaStreamTrack;
          } else if (pub.kind === Track.Kind.Audio) {
            remoteAudio = pub.track.mediaStreamTrack;
          }
        }
      });

      list.push({
        participantId: remote.sid,
        identity: remote.identity,
        name: remote.name || 'Teammate',
        isLocal: false,
        isSpeaking: remote.isSpeaking,
        isMuted: !remote.isMicrophoneEnabled,
        isVideoOn: remote.isCameraEnabled,
        isScreenSharing: remote.isScreenShareEnabled,
        audioTrack: remoteAudio,
        videoTrack: remoteVideo,
        screenTrack: remoteScreen,
        connectionQuality: remote.connectionQuality
      });
    });

    return list;
  }

  private notifyParticipantsUpdated() {
    const participants = this.getParticipants();
    this.callbacks.onParticipantsChange?.(participants);
  }

  /**
   * Toggle local microphone
   */
  public async setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room) return false;
    try {
      await this.room.localParticipant.setMicrophoneEnabled(enabled);
      this.isAudioEnabled = enabled;
      this.notifyParticipantsUpdated();
      return true;
    } catch (err: any) {
      console.warn('[LivekitClient] Failed to toggle mic:', err);
      return false;
    }
  }

  /**
   * Toggle local camera
   */
  public async setCameraEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room) return false;
    try {
      await this.room.localParticipant.setCameraEnabled(enabled);
      this.isVideoEnabled = enabled;
      this.notifyParticipantsUpdated();
      return true;
    } catch (err: any) {
      console.warn('[LivekitClient] Failed to toggle camera:', err);
      return false;
    }
  }

  /**
   * Toggle local screen share
   */
  public async setScreenShareEnabled(enabled: boolean): Promise<boolean> {
    if (!this.room) return false;
    try {
      await this.room.localParticipant.setScreenShareEnabled(enabled);
      this.isScreenSharing = enabled;
      this.notifyParticipantsUpdated();
      return true;
    } catch (err: any) {
      console.warn('[LivekitClient] Failed to toggle screen share:', err);
      return false;
    }
  }

  public isMuted(): boolean {
    return !this.isAudioEnabled;
  }

  public isCameraOn(): boolean {
    return this.isVideoEnabled;
  }

  public isSharingScreen(): boolean {
    return this.isScreenSharing;
  }

  public getRoomName(): string {
    return this.activeRoomName;
  }

  /**
   * Cleanly disconnect and stop all media tracks, guaranteeing camera and mic hardware turn off
   */
  public async disconnect(): Promise<void> {
    if (!this.room) return;

    try {
      const local = this.room.localParticipant;
      if (local) {
        // Stop every published track
        local.trackPublications.forEach(pub => {
          try {
            if (pub.track) {
              pub.track.stop();
            }
            if (pub.track?.mediaStreamTrack) {
              pub.track.mediaStreamTrack.stop();
            }
          } catch {
            // Ignore track stop error
          }
        });
      }

      await this.room.disconnect();
    } catch (err) {
      console.warn('[LivekitClient] Disconnect cleanup notice:', err);
    } finally {
      this.room = null;
      this.activeRoomName = '';
      this.isScreenSharing = false;
      this.callbacks.onConnectionStatusChange?.('disconnected');
      this.callbacks.onParticipantsChange?.([]);
    }
  }
}

export const livekitClient = new LivekitCallClient();
