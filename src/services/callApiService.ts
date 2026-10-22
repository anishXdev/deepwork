import { CallType } from '../types';
import { StorageService } from './storage';

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
    const token =
      localStorage.getItem('dstudy_jwt_token') ||
      localStorage.getItem('studypulse_jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // 2. Fetch authenticated user profile from StorageService & localStorage
    try {
      const profile = StorageService.getProfile();
      if (profile && (profile.email || profile.name || profile.id)) {
        headers['x-authenticated-user'] = JSON.stringify({
          id: profile.id || 'user_current',
          email: (profile.email || '').toLowerCase().trim(),
          name: profile.name || 'Deepwork Member',
          avatar: profile.avatarUrl || profile.avatar || '',
          color: (profile as any).color || '#0C66E4'
        });
      } else {
        const raw =
          localStorage.getItem('studypulse_profile') ||
          localStorage.getItem('dstudy_user_profile');
        if (raw) {
          headers['x-authenticated-user'] = raw;
        }
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
    try {
      const res = await fetch('/api/calls/initiate', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(params)
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}: Failed to initiate call`,
          status: data.status
        };
      }
      return data;
    } catch (err: any) {
      console.warn('[CallApiService] Network error on initiateCall:', err);
      return {
        success: false,
        error: err.message || 'Network connection failed'
      };
    }
  }

  /**
   * 2. POST /api/calls/:callId/accept
   */
  public static async acceptCall(callId: string): Promise<CallResponse> {
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/accept`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${res.status}: Failed to accept call`,
          status: data.status
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Network connection failed'
      };
    }
  }

  /**
   * 3. POST /api/calls/:callId/reject
   */
  public static async rejectCall(callId: string, reason: string = 'declined'): Promise<CallResponse> {
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/reject`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ reason })
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 4. POST /api/calls/:callId/cancel
   */
  public static async cancelCall(callId: string): Promise<CallResponse> {
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/cancel`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * 5. POST /api/calls/:callId/end
   */
  public static async endCall(callId: string): Promise<CallResponse> {
    try {
      const res = await fetch(`/api/calls/${encodeURIComponent(callId)}/end`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
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
