// High-Fidelity Human Neural Speech Service for dstudy
// Emulates ChatGPT-style warm, natural conversational vocal delivery

export interface VoicePreset {
  id: string;
  name: string;
  description: string;
  gender: 'female' | 'male';
  preferredVoices: string[];
}

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'warm_female',
    name: 'Sky (Warm & Empathetic)',
    description: 'Conversational, natural and motivating — like ChatGPT Sky',
    gender: 'female',
    preferredVoices: [
      'Samantha (Enhanced)',
      'Google UK English Female',
      'Microsoft Jenny Online (Natural)',
      'Microsoft Aria Online (Natural)',
      'Samantha',
      'Karen (Premium)',
      'Karen',
      'Flo',
      'Victoria',
      'Google US English'
    ]
  },
  {
    id: 'calm_male',
    name: 'Cove (Calm & Reflective)',
    description: 'Deep, measured, and soothing British cadence — like ChatGPT Cove',
    gender: 'male',
    preferredVoices: [
      'Daniel (Enhanced)',
      'Microsoft Ryan Online (Natural)',
      'Microsoft Guy Online (Natural)',
      'Daniel',
      'Oliver',
      'Google UK English Male',
      'Reed',
      'Eddy'
    ]
  },
  {
    id: 'crisp_female',
    name: 'Breeze (Crisp & Articulate)',
    description: 'Clear, modern academic clarity for fast conceptual breakdowns',
    gender: 'female',
    preferredVoices: [
      'Flo (English (US))',
      'Flo',
      'Microsoft Jenny Online (Natural)',
      'Karen',
      'Serena',
      'Ava',
      'Moira'
    ]
  },
  {
    id: 'focused_male',
    name: 'Ember (Focused & Direct)',
    description: 'Confident, articulate pace for intense study sessions',
    gender: 'male',
    preferredVoices: [
      'Reed (English (US))',
      'Eddy (English (US))',
      'Rocko',
      'Microsoft Christopher Online (Natural)',
      'Google US English'
    ]
  }
];

const PRESET_STORAGE_KEY = 'dstudy_voice_preset';

class HumanSpeechService {
  private voices: SpeechSynthesisVoice[] = [];
  private isLoaded = false;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const load = () => {
      this.voices = window.speechSynthesis.getVoices();
      if (this.voices.length > 0) {
        this.isLoaded = true;
      }
    };

    load();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = load;
    }
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isLoaded && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voices = window.speechSynthesis.getVoices();
    }
    return this.voices;
  }

  public getSavedPresetId(): string {
    if (typeof window === 'undefined') return 'warm_female';
    return localStorage.getItem(PRESET_STORAGE_KEY) || 'warm_female';
  }

  public setSavedPresetId(id: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PRESET_STORAGE_KEY, id);
  }

  /**
   * Finds the best human neural voice matching the selected preset
   */
  public getBestVoiceForPreset(presetId: string): SpeechSynthesisVoice | null {
    const allVoices = this.getAvailableVoices();
    if (!allVoices.length) return null;

    const preset = VOICE_PRESETS.find(p => p.id === presetId) || VOICE_PRESETS[0];

    // 1. Try exact or partial matches in the preset's preferred voice names
    for (const prefName of preset.preferredVoices) {
      const match = allVoices.find(v => 
        v.name.toLowerCase() === prefName.toLowerCase() ||
        v.name.toLowerCase().includes(prefName.toLowerCase())
      );
      if (match) return match;
    }

    // 2. Look for any high-quality natural/enhanced English voice
    const naturalEnglish = allVoices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Premium') || v.name.includes('Google') || v.name.includes('Online')) &&
      !this.isRoboticNoveltyVoice(v.name)
    );
    if (naturalEnglish) return naturalEnglish;

    // 3. Fallback to any non-novelty English voice
    const normalEnglish = allVoices.find(v => 
      v.lang.startsWith('en') && !this.isRoboticNoveltyVoice(v.name)
    );
    if (normalEnglish) return normalEnglish;

    return allVoices[0] || null;
  }

  /**
   * Filter out novelty/robotic voices that ruin the user experience
   */
  private isRoboticNoveltyVoice(name: string): boolean {
    const roboticNames = [
      'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 
      'deranged', 'good news', 'hysterical', 'pipe organ', 'trinoids', 
      'whisper', 'zarvox', 'albert', 'fred', 'ralph', 'junior', 'kathy'
    ];
    const lower = name.toLowerCase();
    return roboticNames.some(r => lower.includes(r));
  }

  /**
   * Cleans text to sound like human conversational speech
   */
  public sanitizeForSpeech(rawText: string): string {
    let clean = rawText;

    // Remove action comments
    clean = clean.replace(/<!--ACTION:[\s\S]*?-->/g, '');

    // Remove markdown links: [label](url) -> label
    clean = clean.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

    // Remove markdown code blocks and inline code
    clean = clean.replace(/```[\s\S]*?```/g, 'Code block omitted.');
    clean = clean.replace(/`([^`]+)`/g, '$1');

    // Remove KaTeX / Math symbols
    clean = clean.replace(/\\mathcal\{([^}]+)\}/g, '$1');
    clean = clean.replace(/\\log/g, 'log');
    clean = clean.replace(/\\mathcal/g, '');
    clean = clean.replace(/\$([^$]+)\$/g, '$1');

    // Expand common abbreviations for natural cadence
    clean = clean.replace(/\be\.g\./gi, 'for example');
    clean = clean.replace(/\bi\.e\./gi, 'that is');
    clean = clean.replace(/\bapprox\./gi, 'approximately');
    clean = clean.replace(/(\d+)\s*h\b/gi, '$1 hours');
    clean = clean.replace(/(\d+)\s*hrs\b/gi, '$1 hours');
    clean = clean.replace(/(\d+)\s*mins?\b/gi, '$1 minutes');
    clean = clean.replace(/(\d+)\s*d\b/gi, '$1 days');

    // Remove bullet characters, bold/italic markers, header hashes
    clean = clean.replace(/[*_#~>|]/g, ' ');

    // Remove emojis that cause robotic synth pronunciation
    clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');

    // Clean multiple spaces and normalize pauses
    clean = clean.replace(/\s+/g, ' ').trim();

    // Limit length to first 3 sentences / ~300 chars for punchy conversational answers
    if (clean.length > 320) {
      const sentenceEnd = clean.indexOf('.', 200);
      if (sentenceEnd !== -1 && sentenceEnd < 360) {
        clean = clean.substring(0, sentenceEnd + 1);
      } else {
        clean = clean.substring(0, 300) + '...';
      }
    }

    return clean;
  }

  /**
   * Speaks the text using the selected human neural voice preset
   */
  public speak(text: string, presetId?: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      this.stop();

      const cleanText = this.sanitizeForSpeech(text);
      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const chosenPreset = presetId || this.getSavedPresetId();
      const voice = this.getBestVoiceForPreset(chosenPreset);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang || 'en-US';
      }

      // ChatGPT voice cadence: smooth, relaxed tempo with natural inflection
      utterance.rate = 1.0;
      utterance.pitch = chosenPreset.includes('female') ? 1.02 : 0.98;

      if (onEnd) {
        utterance.onend = onEnd;
        utterance.onerror = onEnd;
      }

      this.currentUtterance = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
      if (onEnd) onEnd();
    }
  }

  public stop() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    } catch {
      // Ignore
    }
  }

  public isSpeaking(): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
    return window.speechSynthesis.speaking;
  }
}

export const HumanSpeech = new HumanSpeechService();
