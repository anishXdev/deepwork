/**
 * Notifications and In-App Toast Service for dstudy
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  durationMs?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class NotificationServiceManager {
  private listeners: Set<ToastListener> = new Set();
  private activeToasts: ToastItem[] = [];

  /**
   * Request native browser notification permissions
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return 'denied';
    }
  }

  /**
   * Check current browser notification permission
   */
  getPermission(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * Send a system notification (if allowed) with in-app toast fallback
   */
  sendNotification(title: string, options?: NotificationOptions) {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          icon: '/icon.svg',
          badge: '/icon.svg',
          silent: false,
          ...options
        });

        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (e) {
        console.warn('Failed to dispatch native notification:', e);
      }
    }

    // Always mirror with an in-app toast
    if (options?.body) {
      this.showToast(`${title}: ${options.body}`, 'info');
    }
  }

  /**
   * Notify on focus session completion
   */
  notifyFocusComplete(topicName?: string, durationMinutes?: number) {
    const minsText = durationMinutes ? `${durationMinutes}m ` : '';
    const nameText = topicName ? `on "${topicName}"` : '';
    this.sendNotification('🍅 Focus Session Complete! — dstudy', {
      body: `Awesome work! Completed ${minsText}focus ${nameText}. Time for a short break.`,
      tag: 'dstudy-focus-complete'
    });
  }

  /**
   * Notify on break conclusion
   */
  notifyBreakComplete() {
    this.sendNotification('⚡ Break Finished! — dstudy', {
      body: 'Your mind is rested and primed. Ready for your next deep focus session?',
      tag: 'dstudy-break-complete'
    });
  }

  /**
   * Notify on streak milestone
   */
  notifyStreakMilestone(currentStreak: number) {
    this.sendNotification('🔥 Daily Goal Achieved! — dstudy', {
      body: `You are on a ${currentStreak}-day study streak! Keep up the incredible momentum.`,
      tag: 'dstudy-streak'
    });
  }

  /**
   * In-App Toast Management
   */
  showToast(message: string, type: ToastType = 'info', durationMs = 3500) {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const item: ToastItem = { id, message, type, durationMs };
    this.activeToasts = [...this.activeToasts, item];
    this.emit();

    setTimeout(() => {
      this.dismissToast(id);
    }, durationMs);
  }

  toast(type: ToastType, message: string, durationMs = 3500) {
    this.showToast(message, type, durationMs);
  }

  dismissToast(id: string) {
    this.activeToasts = this.activeToasts.filter(t => t.id !== id);
    this.emit();
  }

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.activeToasts);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach(cb => cb(this.activeToasts));
  }
}

export const Notifications = new NotificationServiceManager();
