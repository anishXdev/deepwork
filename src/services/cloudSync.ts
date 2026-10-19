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
    let key = localStorage.getItem(SYNC_KEY_STORAGE);
    if (!key) {
      // Check user profile
      const profile = StorageService.getProfile();
      if (profile.googleConnected && profile.email) {
        key = `user_${profile.email.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      } else {
        key = this.generateRandomSyncKey();
      }
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
      const timeoutId = setTimeout(() => controller.abort(), 1200);
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
      const timeoutId = setTimeout(() => controller.abort(), 2000);
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
  }
};
