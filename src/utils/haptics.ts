/**
 * Simple tactile haptics utility using standard Web Vibration API.
 * Safely handles unsupported devices/browsers.
 */
export const Haptics = {
  /**
   * Quick light tap feedback (10ms)
   */
  tap() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Success / completion pulse (30ms)
   */
  success() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 40, 20]);
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Warning / alert double pulse
   */
  warning() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([40, 30, 40]);
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Notification alert pattern
   */
  notification() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([20, 50, 20]);
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Selection tick (8ms)
   */
  selection() {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(8);
      }
    } catch {
      // Ignore
    }
  }
};
