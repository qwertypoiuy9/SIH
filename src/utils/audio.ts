// KisanQ Audio Engine
// 1. Web Speech API with proper BCP-47 language enforcement (Telugu, Hindi, Kannada, Tamil, Bengali, English)
// 2. Web Audio API DTMF dual-tone frequency generator
// 3. Speech-to-Text (STT) for all 6 languages

const LANG_BCP47: Record<string, string> = {
  te: 'te-IN',
  hi: 'hi-IN',
  en: 'en-IN',
  kn: 'kn-IN',
  ta: 'ta-IN',
  bn: 'bn-IN',
  'te-IN': 'te-IN',
  'hi-IN': 'hi-IN',
  'en-IN': 'en-IN',
  'kn-IN': 'kn-IN',
  'ta-IN': 'ta-IN',
  'bn-IN': 'bn-IN',
};

export interface SpeechRecognitionHandlers {
  onStart?: () => void;
  onInterim?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

class SoundController {
  private ctx: AudioContext | null = null;
  private activeRecognizer: unknown = null;
  private voices: SpeechSynthesisVoice[] = [];
  private voicesReady = false;
  private voiceLoadPromise: Promise<SpeechSynthesisVoice[]> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.voiceLoadPromise = this.waitForVoices();
    }
  }

  /** Wait for speechSynthesis voices to populate - some browsers delay this */
  private waitForVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
      const tryLoad = () => {
        const v = window.speechSynthesis.getVoices();
        if (v && v.length > 0) {
          this.voices = v;
          this.voicesReady = true;
          resolve(v);
          return true;
        }
        return false;
      };

      if (tryLoad()) return;

      window.speechSynthesis.onvoiceschanged = () => {
        if (!this.voicesReady) tryLoad();
      };

      // Poll every 150ms for up to 4 seconds (Firefox, Safari)
      let attempts = 0;
      const poll = setInterval(() => {
        attempts++;
        if (tryLoad() || attempts > 26) {
          clearInterval(poll);
          if (!this.voicesReady) {
            this.voicesReady = true;
            resolve(this.voices);
          }
        }
      }, 150);
    });
  }

  public loadVoices(): SpeechSynthesisVoice[] {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    this.voices = window.speechSynthesis.getVoices();
    return this.voices;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play standard telephone DTMF frequencies
  playDTMF(key: string, durationMs: number = 180) {
    const ctx = this.getContext();
    if (!ctx) return;

    const dtmfFreqs: Record<string, [number, number]> = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '*': [941, 1209],
      '0': [941, 1336],
      '#': [941, 1477],
    };

    const freqs = dtmfFreqs[key];
    if (!freqs) return;

    try {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + durationMs / 1000);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + durationMs / 1000);
      osc2.stop(now + durationMs / 1000);
    } catch {
      // Audio might be blocked until user gesture
    }
  }

  // Play phone ringback sound
  playRingTone(cycles = 2) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      let startTime = ctx.currentTime + 0.1;
      for (let i = 0; i < cycles; i++) {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
        gain.gain.setValueAtTime(0.08, startTime + 1.2);
        gain.gain.linearRampToValueAtTime(0.0001, startTime + 1.25);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + 1.3);
        osc2.stop(startTime + 1.3);

        startTime += 2.2;
      }
    } catch {
      // Ignore
    }
  }

  // Play notification chime
  playTurnChime() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = now + idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.12, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.4);
      });
    } catch {
      // Ignore
    }
  }

  playSuccessChime() {
    this.playTurnChime();
  }

  /**
   * High-fidelity Speech Synthesis:
   * Uses online Google Speech API for guaranteed authentic pronunciation in Telugu, Hindi, Kannada, Tamil, Bengali, and English.
   * Gracefully falls back to browser's native SpeechSynthesisUtterance if offline.
   */
  /**
   * Speak text in the given language using Web Speech API.
   * Properly sets BCP-47 language so the browser picks the right voice.
   */
  speak(text: string, langCode: string = 'te-IN', onEnd?: () => void) {
    this.stopSpeech();

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onEnd) onEnd();
      return;
    }

    const cleanText = text.replace(/[*#_`>]/g, '').trim();
    if (!cleanText) {
      if (onEnd) onEnd();
      return;
    }

    const bcp47 = this.normalizeLangCode(langCode);

    const doSpeak = () => {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = bcp47;
      utterance.rate = 0.88;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Pick best voice for the language
      const allVoices = window.speechSynthesis.getVoices();
      const best = this.pickVoice(allVoices, bcp47);
      if (best) utterance.voice = best;

      utterance.onend = () => {
        if (onEnd) onEnd();
      };

      utterance.onerror = () => {
        if (onEnd) onEnd();
      };

      window.speechSynthesis.speak(utterance);

      // Chrome bug: speech pauses after ~15s - keep it resumed
      const resumeTimer = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(resumeTimer);
        } else if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      }, 5000);
    };

    if (this.voicesReady) {
      doSpeak();
    } else {
      (this.voiceLoadPromise || this.waitForVoices()).then(() => doSpeak());
    }
  }

  /** Alias so both stopSpeech() and stopSpeaking() work */
  stopSpeaking = () => this.stopSpeech();

  /** Pick the best available voice for a BCP-47 code */
  private pickVoice(
    voices: SpeechSynthesisVoice[],
    bcp47: string
  ): SpeechSynthesisVoice | undefined {
    if (!voices || voices.length === 0) return undefined;

    const lc = bcp47.toLowerCase();
    const prefix = lc.split('-')[0];

    // 1. Exact BCP-47 match
    let found = voices.find((v) => v.lang.toLowerCase() === lc);
    if (found) return found;

    // 2. Prefix match, prefer Indian variant
    const prefixVoices = voices.filter((v) => v.lang.toLowerCase().startsWith(prefix + '-'));
    found = prefixVoices.find((v) => v.lang.toLowerCase().includes('-in'));
    if (found) return found;
    if (prefixVoices.length > 0) return prefixVoices[0];

    // 3. Name-based keyword search
    const keywords: Record<string, string[]> = {
      te: ['telugu', 'mohan', 'chitra'],
      hi: ['hindi', 'swara', 'madhur', 'kalpana', 'hemant', 'lekha'],
      kn: ['kannada', 'gagan', 'sapna'],
      ta: ['tamil', 'valluvar', 'pallavi'],
      bn: ['bengali', 'bangla'],
      en: ['india', 'neerja', 'heera', 'ravi'],
    };

    const kws = keywords[prefix] || [];
    return voices.find((v) => kws.some((k) => v.name.toLowerCase().includes(k)));
  }

  public normalizeLangCode(code: string): string {
    return LANG_BCP47[code] || LANG_BCP47[code?.split('-')[0]] || 'te-IN';
  }

  stopSpeech() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  // ==========================================
  // SPEECH RECOGNITION (STT - Speech to Text)
  // Supports Telugu, Hindi, Kannada, Tamil, Bengali, English
  // ==========================================
  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false;
    return !!(
      (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    );
  }

  public startListening(langCode: string, handlers: SpeechRecognitionHandlers): () => void {
    if (!this.isSpeechRecognitionSupported()) {
      if (handlers.onError) {
        handlers.onError('Speech Recognition is not supported by your browser. Please use Google Chrome or Microsoft Edge.');
      }
      return () => {};
    }

    this.stopListening();

    const normalizedLang = this.normalizeLangCode(langCode);

    try {
      const SpeechRecognitionConstructor =
        (window as unknown as { SpeechRecognition: new () => any }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition: new () => any }).webkitSpeechRecognition;

      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = normalizedLang;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let finalTranscript = '';

      recognition.onstart = () => {
        if (handlers.onStart) handlers.onStart();
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interim += transcript;
          }
        }
        if (interim && handlers.onInterim) {
          handlers.onInterim(interim);
        }
        if (finalTranscript) {
          handlers.onFinal(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[KisanQ STT]', event.error);
        // 'no-speech' is non-fatal - don't show error to user
        if (event.error !== 'no-speech' && handlers.onError) {
          handlers.onError(event.error);
        }
        if (event.error === 'no-speech' && handlers.onEnd) {
          handlers.onEnd();
        }
      };

      recognition.onend = () => {
        this.activeRecognizer = null;
        if (handlers.onEnd) handlers.onEnd();
      };

      recognition.start();
      this.activeRecognizer = recognition;

      return () => {
        try {
          recognition.stop();
        } catch {
          // Ignore
        }
        this.activeRecognizer = null;
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Recognition error';
      if (handlers.onError) handlers.onError(msg);
      return () => {};
    }
  }

  public stopListening() {
    if (this.activeRecognizer) {
      try {
        (this.activeRecognizer as { stop: () => void }).stop();
      } catch {
        // Ignore
      }
      this.activeRecognizer = null;
    }
  }
}

export const soundController = new SoundController();
