// Web Audio API zero-dependency audio synthesizer for alerts and water-themed ambient sounds
class SoundService {
  private audioCtx: AudioContext | null = null;
  private ambientSource: AudioNode | null = null;
  private ambientGain: GainNode | null = null;
  private lfoOsc: OscillatorNode | null = null;
  private isAmbientPlaying: boolean = false;

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Melodic water droplet chime when Pomodoro finishes
  playCompletionChime() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;

      // Primary crystal droplet tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12); // D6
      gain1.gain.setValueAtTime(0.35, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.2);

      // Secondary harmonic water shimmer
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.00, now + 0.08); // A5
      osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.22); // A6
      gain2.gain.setValueAtTime(0.25, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.08);
      osc2.stop(now + 1.5);

      // Deep resonance pool
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(440.00, now + 0.15); // A4
      gain3.gain.setValueAtTime(0.3, now + 0.15);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.15);
      osc3.stop(now + 1.8);
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }

  playTickSound() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  playNotificationPop() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1000, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  // Warning tone for distraction detection in strict mode
  playWarningAlert() {
    try {
      const ctx = this.getAudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.25);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch {}
  }

  playAmbient(type: 'ocean' | 'stream' | 'rain' | 'whitenoise' | 'none') {
    if (type === 'none') {
      this.stopAmbientSound();
    } else {
      this.startAmbientSound(type);
    }
  }

  // Water & Nature Ambient Sound Generator
  startAmbientSound(type: 'ocean' | 'stream' | 'rain' | 'whitenoise', volume = 0.2) {
    this.stopAmbientSound();
    try {
      const ctx = this.getAudioContext();
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        if (type === 'ocean' || type === 'stream') {
          // Brown noise base for rushing water
          lastOut = (lastOut + 0.015 * white) / 1.015;
          output[i] = lastOut * 4.2;
        } else if (type === 'rain') {
          // Pink noise for rain
          lastOut = (lastOut + 0.02 * white) / 1.02;
          output[i] = lastOut * 3.5;
        } else {
          output[i] = white * 0.4;
        }
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const filter = ctx.createBiquadFilter();
      if (type === 'ocean') {
        filter.type = 'lowpass';
        filter.frequency.value = 750;
      } else if (type === 'stream') {
        filter.type = 'bandpass';
        filter.frequency.value = 1200;
        filter.Q.value = 0.8;
      } else if (type === 'rain') {
        filter.type = 'bandpass';
        filter.frequency.value = 1000;
        filter.Q.value = 0.5;
      } else {
        filter.type = 'lowpass';
        filter.frequency.value = 2500;
      }

      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(volume, ctx.currentTime);

      if (type === 'ocean') {
        // Natural swell: LFO modulating volume like ocean tides rolling in & out
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = 0.12; // 8 second wave cycle
        lfoGain.gain.value = volume * 0.7; // Depth of swell
        lfo.connect(mainGain.gain);
        lfo.start();
        this.lfoOsc = lfo;
      }

      noiseSource.connect(filter);
      filter.connect(mainGain);
      mainGain.connect(ctx.destination);

      noiseSource.start();
      this.ambientSource = noiseSource;
      this.ambientGain = mainGain;
      this.isAmbientPlaying = true;
    } catch (e) {
      console.warn('Could not start ambient water sound:', e);
    }
  }

  stopAmbientSound() {
    if (this.lfoOsc) {
      try {
        this.lfoOsc.stop();
        this.lfoOsc.disconnect();
      } catch {}
      this.lfoOsc = null;
    }
    if (this.ambientSource) {
      try {
        (this.ambientSource as AudioBufferSourceNode).stop();
        this.ambientSource.disconnect();
      } catch {}
      this.ambientSource = null;
    }
    this.isAmbientPlaying = false;
  }

  isAmbientActive() {
    return this.isAmbientPlaying;
  }
}

export const sound = new SoundService();
