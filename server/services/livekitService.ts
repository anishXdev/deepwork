import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export interface TokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  canPublish?: boolean;
  canSubscribe?: boolean;
  canPublishData?: boolean;
  ttl?: string; // e.g. '15m' or '30m'
}

export class LivekitService {
  private static livekitUrl: string =
    process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL || 'wss://deepwork-uspoejgf.livekit.cloud';
  private static apiKey: string =
    process.env.LIVEKIT_API_KEY || 'APIcxhmBAV6ifbY';
  private static apiSecret: string =
    process.env.LIVEKIT_API_SECRET || 'T9M0djj0ZF6Yv6lWCBvObBhabGsByZLuKxZvj8FA1QH';

  /**
   * Check if LiveKit Cloud credentials are genuine and configured
   */
  public static isConfigured(): boolean {
    const key = process.env.LIVEKIT_API_KEY || this.apiKey;
    const secret = process.env.LIVEKIT_API_SECRET || this.apiSecret;
    const url = process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL || this.livekitUrl;
    return Boolean(key && secret && url && !key.includes('placeholder') && !secret.includes('placeholder'));
  }

  /**
   * Return the public LiveKit WebSocket/WebRTC URL for authorized client connection.
   * Never exposes API Key or Secret.
   */
  public static getLivekitUrl(): string {
    return process.env.LIVEKIT_URL || process.env.VITE_LIVEKIT_URL || this.livekitUrl;
  }

  /**
   * Generate a secure, short-lived room token strictly on the backend.
   */
  public static async generateToken(options: TokenOptions): Promise<string> {
    const {
      roomName,
      participantIdentity,
      participantName,
      canPublish = true,
      canSubscribe = true,
      canPublishData = true,
      ttl = '30m'
    } = options;

    const apiKey = process.env.LIVEKIT_API_KEY || this.apiKey;
    const apiSecret = process.env.LIVEKIT_API_SECRET || this.apiSecret;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish,
      canSubscribe,
      canPublishData
    });

    return await at.toJwt();
  }

  /**
   * Terminate and clean up a LiveKit room when a call ends.
   */
  public static async closeRoom(roomName: string): Promise<boolean> {
    if (!this.isConfigured()) {
      return true;
    }

    try {
      const httpUrl = this.getLivekitUrl().replace(/^wss:/i, 'https:').replace(/^ws:/i, 'http:');
      const apiKey = process.env.LIVEKIT_API_KEY || this.apiKey;
      const apiSecret = process.env.LIVEKIT_API_SECRET || this.apiSecret;

      const roomClient = new RoomServiceClient(httpUrl, apiKey, apiSecret);
      await roomClient.deleteRoom(roomName);
      return true;
    } catch (err: any) {
      console.warn(`[LivekitService] Note: Room ${roomName} cleanup:`, err.message || err);
      return false;
    }
  }
}
