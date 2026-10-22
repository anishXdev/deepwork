import { CallType } from '../types';

export interface InitiateCallParams {
  recipientId?: string;
  recipientEmail: string;
  recipientName: string;
  recipientAvatar?: string;
  recipientColor?: string;
  boardId: string;
  boardName: string;
  callType: CallType;
}

export interface CallResponse {
  success: boolean;
  callId?: string;
  roomName?: string;
  token?: string;
  livekitUrl?: string;
  status?: string;
  error?: string;
  durationSeconds?: number;
  call?: any;
}

export class CallApiService {
  private static getAuthHeaders(): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // 1. Check for stored JWT token
    const token = localStorage.getItem('dstudy_jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Also pass current user identity header for seamless session continuity
    try {
      const storedProfile = localStorage.getItem('dstudy_user_profile');
      if (storedProfile) {
        headers['x-authenticated-user'] = storedProfile;
      }
    } catch {
      // ignore
    }

    return headers;
  }

  /**
   * 1. POST /api/calls/initiate
   */
  public static async initiateCall(params: InitiateCallParams): Promise<CallResponse> {
    const res = await fetch('/api/calls/initiate', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params)
    });
    return await res.json();
  }

  /**
   * 2. POST /api/calls/:callId/accept
   */
  public static async acceptCall(callId: string): Promise<CallResponse> {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/accept`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return await res.json();
  }

  /**
   * 3. POST /api/calls/:callId/reject
   */
  public static async rejectCall(callId: string, reason: string = 'declined'): Promise<CallResponse> {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/reject`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    return await res.json();
  }

  /**
   * 4. POST /api/calls/:callId/cancel
   */
  public static async cancelCall(callId: string): Promise<CallResponse> {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/cancel`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return await res.json();
  }

  /**
   * 5. POST /api/calls/:callId/end
   */
  public static async endCall(callId: string): Promise<CallResponse> {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/end`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });
    return await res.json();
  }

  /**
   * 6. GET /api/calls/:callId
   */
  public static async getCall(callId: string): Promise<CallResponse> {
    const res = await fetch(`/api/calls/${encodeURIComponent(callId)}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });
    return await res.json();
  }

  /**
   * 7. POST /api/calls/token
   */
  public static async getCallToken(callId: string): Promise<CallResponse> {
    const res = await fetch('/api/calls/token', {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ callId })
    });
    return await res.json();
  }

  /**
   * 8. GET /api/calls/active/me
   */
  public static async getMyActiveCall(): Promise<{ success: boolean; activeCall?: any }> {
    try {
      const res = await fetch('/api/calls/active/me', {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch {
      return { success: false };
    }
  }

  /**
   * Public LiveKit configuration query
   */
  public static async getLivekitConfig(): Promise<{ success: boolean; livekitUrl?: string; configured?: boolean }> {
    try {
      const res = await fetch('/api/calls/config');
      return await res.json();
    } catch {
      return { success: false };
    }
  }
}
