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
  }
};
