/**
 * Ringtone & Audio Tone Synthesizer using Web Audio API
 * Generates zero-dependency telephone rings and call connection tones.
 */

class RingtoneAudioService {
  private ctx: AudioContext | null = null;
  private outgoingTimer: any = null;
  private incomingTimer: any = null;
  private activeNodes: { osc1: OscillatorNode; osc2: OscillatorNode; gain: GainNode } | null = null;
  private isIncomingActive = false;
  private isOutgoingActive = false;

  private getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Outgoing Ring: Dual 440Hz + 480Hz tone pulsed in 2s ON / 3s OFF cycles
   */
  playOutgoingRing() {
    this.stopOutgoingRing();
    this.isOutgoingActive = true;

    const playPulse = () => {
      if (!this.isOutgoingActive) return;
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
        gain.gain.setValueAtTime(0.08, now + 1.8);
        gain.gain.linearRampToValueAtTime(0, now + 2.0);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 2.0);
        osc2.stop(now + 2.0);

        this.outgoingTimer = setTimeout(() => {
          if (this.isOutgoingActive) {
            playPulse();
          }
        }, 4500);
      } catch (e) {
        console.warn('Could not play outgoing ring tone:', e);
      }
    };

    playPulse();
  }

  stopOutgoingRing() {
    this.isOutgoingActive = false;
    if (this.outgoingTimer) {
      clearTimeout(this.outgoingTimer);
      this.outgoingTimer = null;
    }
  }

  /**
   * Incoming Ring: Dual 853Hz + 960Hz warble chime in double pulse cycles
   */
  playIncomingRing() {
    this.stopIncomingRing();
    this.isIncomingActive = true;

    const playBurst = () => {
      if (!this.isIncomingActive) return;
      try {
        const ctx = this.getAudioContext();
        const now = ctx.currentTime;

        // First chirp (0.4s)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(750, now);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(950, now);

        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.12, now + 0.03);
        gain1.gain.setValueAtTime(0.12, now + 0.35);
        gain1.gain.linearRampToValueAtTime(0, now + 0.4);

        osc1.connect(gain1);
        osc2.connect(gain1);
        gain1.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.4);
        osc2.stop(now + 0.4);

        // Second chirp after 0.15s pause (0.55s - 0.95s)
        const osc3 = ctx.createOscillator();
        const osc4 = ctx.createOscillator();
        const gain2 = ctx.createGain();

        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(750, now + 0.55);
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(950, now + 0.55);

        gain2.gain.setValueAtTime(0, now + 0.55);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.58);
        gain2.gain.setValueAtTime(0.12, now + 0.9);
        gain2.gain.linearRampToValueAtTime(0, now + 0.95);

        osc3.connect(gain2);
        osc4.connect(gain2);
        gain2.connect(ctx.destination);

        osc3.start(now + 0.55);
        osc4.start(now + 0.55);
        osc3.stop(now + 0.95);
        osc4.stop(now + 0.95);

        this.incomingTimer = setTimeout(() => {
          if (this.isIncomingActive) {
            playBurst();
          }
        }, 3000);
      } catch (e) {
        console.warn('Could not play incoming ring tone:', e);
      }
    };

    playBurst();
  }

  stopIncomingRing() {
    this.isIncomingActive = false;
    if (this.incomingTimer) {
      clearTimeout(this.incomingTimer);
      this.incomingTimer = null;
    }
  }

  /**
   * Positive Connected Chime
   */
  playCallConnectedTone() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15); // E5

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch {}
  }

  /**
   * Call Ended Tone
   */
  playCallEndedTone() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.linearRampToValueAtTime(330, now + 0.2);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  stopAll() {
    this.stopOutgoingRing();
    this.stopIncomingRing();
  }
}

export const RingtoneService = new RingtoneAudioService();
