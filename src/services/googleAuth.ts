import { UserProfile } from '../types';
import { StorageService } from './storage';

// Google OAuth client ID can be provided via .env or user settings
const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

export const GoogleAuthService = {
  getClientId(): string {
    return localStorage.getItem('studypulse_google_client_id') || GOOGLE_CLIENT_ID || '';
  },

  setClientId(clientId: string) {
    localStorage.setItem('studypulse_google_client_id', clientId);
  },

  /**
   * Ensures the Google Identity Services script is loaded in the DOM.
   */
  async loadGoogleScript(): Promise<void> {
    if (typeof (window as any).google?.accounts?.oauth2 !== 'undefined') {
      return;
    }

    return new Promise((resolve, reject) => {
      // Check if tag already exists
      const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
      if (existing) {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          if (typeof (window as any).google?.accounts?.oauth2 !== 'undefined') {
            clearInterval(interval);
            resolve();
          } else if (attempts > 30) {
            clearInterval(interval);
            reject(new Error('Google Identity Services script timed out.'));
          }
        }, 100);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        let attempts = 0;
        const checkReady = setInterval(() => {
          attempts++;
          if (typeof (window as any).google?.accounts?.oauth2 !== 'undefined') {
            clearInterval(checkReady);
            resolve();
          } else if (attempts > 20) {
            clearInterval(checkReady);
            resolve(); // Try resolving anyway
          }
        }, 100);
      };
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script. Check your internet connection.'));
      document.head.appendChild(script);
    });
  },

  /**
   * Initializes Google Identity Services token client
   */
  async initGoogleTokenClient(onSuccess: (token: string, profile: Partial<UserProfile>) => void, onError: (err: any) => void) {
    const clientId = this.getClientId();
    if (!clientId) {
      onError(new Error('Please enter your Google Cloud OAuth Client ID in the field below first, or click "Connect with Demo Account" to test all features immediately.'));
      return;
    }

    try {
      await this.loadGoogleScript();
    } catch (e: any) {
      onError(new Error(e.message || 'Google Identity Services script could not be loaded.'));
      return;
    }

    if (typeof (window as any).google?.accounts?.oauth2 === 'undefined') {
      onError(new Error('Google Identity Services is not available. Please verify network access to accounts.google.com.'));
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            onError(tokenResponse);
            return;
          }
          const accessToken = tokenResponse.access_token;
          // Fetch user profile info
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            const userInfo = await userInfoRes.json();
            onSuccess(accessToken, {
              name: userInfo.name || 'Google User',
              email: userInfo.email || '',
              avatarUrl: userInfo.picture || '',
              googleConnected: true,
              googleAccessToken: accessToken
            });
          } catch {
            onSuccess(accessToken, {
              name: 'Google User',
              googleConnected: true,
              googleAccessToken: accessToken
            });
          }
        }
      });
      client.requestAccessToken();
    } catch (e) {
      onError(e);
    }
  },

  /**
   * Quick Demo sign-in for testing/offline sync showcase
   */
  signInWithDemoUser(): UserProfile {
    const profile: UserProfile = {
      id: 'demo_user_1',
      name: 'Alex Rivera',
      email: 'alex.rivera@gmail.com',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      googleConnected: true,
      googleCalendarSyncEnabled: true,
      googleAccessToken: 'mock_demo_token_12345'
    };
    StorageService.saveProfile(profile);
    return profile;
  },

  signOut(): UserProfile {
    const defaultProfile: UserProfile = {
      id: 'user_default',
      name: 'Focus Scholar',
      email: 'scholar@local',
      googleConnected: false,
      googleCalendarSyncEnabled: false
    };
    StorageService.saveProfile(defaultProfile);
    return defaultProfile;
  }
};
