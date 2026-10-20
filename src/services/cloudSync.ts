import { StorageService } from './storage';
import { CloudSyncStatus } from '../types';

const SYNC_KEY_STORAGE = 'studypulse_sync_key';
const LAST_SYNCED_STORAGE = 'studypulse_last_synced_at';

// Debounce timer handle
let pushTimer: any = null;

export const CloudSyncService = {
  /**
   * Generates a random friendly 6-character code (e.g., SYNC-9X2K)
   */
  generateRandomSyncKey(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `PULSE-${code}`;
  },

  /**
   * Gets current active sync key
   */
  getSyncKey(): string {
    const profile = StorageService.getProfile();
    if (profile.email) {
      const key = `user_${profile.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      this.setSyncKey(key);
      return key;
    }
    if (profile.id) {
      const key = `user_${profile.id.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      this.setSyncKey(key);
      return key;
    }
    let key = localStorage.getItem(SYNC_KEY_STORAGE);
    if (!key) {
      key = 'user_default_workspace';
      this.setSyncKey(key);
    }
    return key;
  },

  /**
   * Sets or joins a new sync key
   */
  setSyncKey(key: string) {
    const cleaned = key.trim();
    localStorage.setItem(SYNC_KEY_STORAGE, cleaned);
  },

  getLastSyncedAt(): string | null {
    return localStorage.getItem(LAST_SYNCED_STORAGE);
  },

  setLastSyncedAt(timestamp: string) {
    localStorage.setItem(LAST_SYNCED_STORAGE, timestamp);
  },

  /**
   * Pulls data from cloud backend using the current sync key
   */
  async pullFromCloud(): Promise<{ success: boolean; found: boolean; data?: any; updatedAt?: string; error?: string }> {
    const key = this.getSyncKey();
    if (!key) return { success: false, found: false, error: 'No sync key set' };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`/api/sync?key=${encodeURIComponent(key)}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        return { success: false, found: false, error: `HTTP ${res.status}` };
      }

      const json = await res.json();
      if (json.found && json.data) {
        StorageService.importData(json.data);
        if (json.updatedAt) {
          this.setLastSyncedAt(json.updatedAt);
        }
        return { success: true, found: true, data: json.data, updatedAt: json.updatedAt };
      }

      return { success: true, found: false };
    } catch (err: any) {
      // Offline or local dev fallback without serverless endpoint
      return { success: false, found: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Pushes latest state snapshot to the cloud
   */
  async pushToCloudImmediate(): Promise<{ success: boolean; updatedAt?: string; error?: string }> {
    const key = this.getSyncKey();
    if (!key) return { success: false, error: 'No sync key' };

    try {
      const allData = StorageService.exportAllData();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, data: allData }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        return { success: false, error: `HTTP ${res.status}` };
      }

      const json = await res.json();
      const now = json.updatedAt || new Date().toISOString();
      this.setLastSyncedAt(now);
      return { success: true, updatedAt: now };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  },

  /**
   * Debounced push to cloud to prevent excessive network spam on every keystroke
   */
  scheduleDebouncedPush(delayMs = 2000) {
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      this.pushToCloudImmediate();
    }, delayMs);
  },

  /**
   * Generates a downloadable JSON file for offline export
   */
  exportToFile() {
    const data = StorageService.exportAllData();
    const str = JSON.stringify(data, null, 2);
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studypulse_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Checks live MongoDB connection status
   */
  async checkMongoDBStatus(): Promise<{ connected: boolean; cluster?: string; database?: string; totalUsers?: number; error?: string }> {
    try {
      const res = await fetch('/api/sync?status=1');
      if (!res.ok) return { connected: false, error: `HTTP ${res.status}` };
      return await res.json();
    } catch (e: any) {
      return { connected: false, error: e?.message || 'Network unreachable' };
    }
  },

  /**
   * Imports data from a JSON file
   */
  async importFromFile(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      StorageService.importData(parsed);
      this.pushToCloudImmediate();
      return true;
    } catch (e) {
      console.error('Failed to parse import file:', e);
      return false;
    }
  },

  /**
   * Dispatches a collaboration notification to a recipient via MongoDB Atlas
   */
  async sendRemoteNotification(notif: any): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_notification', notification: notif })
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to send remote notification:', e);
      return false;
    }
  },

  /**
   * Fetches latest notifications for this user from MongoDB Atlas
   */
  async fetchRemoteNotifications(email: string): Promise<any[]> {
    if (!email) return [];
    try {
      const res = await fetch(`/api/sync?notifications=1&email=${encodeURIComponent(email.toLowerCase())}`);
      if (res.ok) {
        const json = await res.json();
        return Array.isArray(json.notifications) ? json.notifications : [];
      }
    } catch (e) {
      console.warn('Failed to fetch remote notifications:', e);
    }
    return [];
  },

  /**
   * Updates notification state in MongoDB Atlas
   */
  async updateRemoteNotification(notifId: string, status?: 'accepted' | 'declined', read?: boolean): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_notification', notifId, status, read })
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  /**
   * Joins a board in MongoDB Atlas and registers the member
   */
  async joinBoardRemote(boardCode: string, user: { id: string; name: string; email: string; avatar?: string; color?: string }): Promise<{ success: boolean; board?: any; message?: string }> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join_board', boardCode, user })
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return { success: false, message: e.message || 'Network error' };
    }
  },

  /**
   * Fetches chat messages for a specific board from MongoDB Atlas
   */
  async fetchRemoteChat(boardId: string): Promise<any[]> {
    if (!boardId) return [];
    try {
      const res = await fetch(`/api/sync?chat=1&boardId=${encodeURIComponent(boardId)}`);
      if (res.ok) {
        const json = await res.json();
        return Array.isArray(json.messages) ? json.messages : [];
      }
    } catch (e) {
      console.warn('Failed to fetch remote chat:', e);
    }
    return [];
  },

  /**
   * Sends a chat message to MongoDB Atlas
   */
  async sendRemoteChat(message: any): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_chat', message })
      });
      return res.ok;
    } catch (e) {
      console.warn('Failed to send remote chat:', e);
      return false;
    }
  }
};
