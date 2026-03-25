/**
 * VoiceContext — Global voice state machine for Vox hands-free portal.
 *
 * States:
 *  IDLE → FACE_AUTH → EXAM_BRIEFING → COMMAND_MODE ⟷ DICTATION_MODE
 *  COMMAND_MODE → PAUSE_MODE → COMMAND_MODE
 *  COMMAND_MODE → SUBMISSION_GATE → FINALIZE
 *  COMMAND_MODE → ANSWER_REVIEW → COMMAND_MODE / DICTATION_MODE
 *  FACE_AUTH → LOCKED
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from 'react';

// ─── State Machine ──────────────────────────────────────────────────────────

export type VoiceSystemState =
  | 'IDLE'
  | 'FACE_AUTH'
  | 'EXAM_BRIEFING'
  | 'COMMAND_MODE'
  | 'DICTATION_MODE'
  | 'ANSWER_REVIEW'
  | 'PAUSE_MODE'
  | 'SUBMISSION_GATE'
  | 'FINALIZE'
  | 'LOCKED';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VoiceContextType {
  // State machine
  voiceState: VoiceSystemState;
  prevState: VoiceSystemState | null;
  transition: (to: VoiceSystemState) => void;

  // TTS
  speak: (text: string, options?: SpeakOptions) => Promise<void>;
  stopSpeaking: () => void;
  isSpeaking: boolean;

  // Dictation accumulator
  rawTranscript: string;
  setRawTranscript: (text: string | ((prev: string) => string)) => void;

  // Formatted answer (after Llama)
  formattedAnswer: string;
  setFormattedAnswer: (text: string) => void;

  // Audio feedback tones
  playBeep: (type: BeepType) => void;

  // Current question being answered (for AI context)
  currentQuestionText: string;
  setCurrentQuestionText: (text: string) => void;

  // Face auth attempt tracking
  faceAttempts: number;
  setFaceAttempts: (n: number | ((prev: number) => number)) => void;
}

export interface SpeakOptions {
  rate?: number;       // 0.5 – 2.0
  pitch?: number;      // 0 – 2
  lang?: string;       // 'en-US', 'hi-IN', etc.
  interrupt?: boolean; // stop current speech before speaking
}

export type BeepType = 'command' | 'dictation' | 'error' | 'success' | 'warning';

// ─── Beep frequencies ────────────────────────────────────────────────────────

const BEEP_CONFIG: Record<BeepType, { freq: number; duration: number; gain: number }> = {
  command:   { freq: 880,  duration: 0.12, gain: 0.3 },
  dictation: { freq: 660,  duration: 0.18, gain: 0.35 },
  success:   { freq: 1046, duration: 0.25, gain: 0.3 },
  error:     { freq: 330,  duration: 0.3,  gain: 0.4 },
  warning:   { freq: 550,  duration: 0.2,  gain: 0.35 },
};

// ─── Context ─────────────────────────────────────────────────────────────────

const VoiceContext = createContext<VoiceContextType | null>(null);

export function useVoiceContext(): VoiceContextType {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoiceContext must be used inside <VoiceProvider>');
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function VoiceProvider({ children }: { children: ReactNode }) {
  const [voiceState, setVoiceState] = useState<VoiceSystemState>('IDLE');
  const [prevState, setPrevState] = useState<VoiceSystemState | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [rawTranscript, setRawTranscript] = useState('');
  const [formattedAnswer, setFormattedAnswer] = useState('');
  const [currentQuestionText, setCurrentQuestionText] = useState('');
  const [faceAttempts, setFaceAttempts] = useState(0);

  // AudioContext ref for beeps (lazy-init to satisfy browser autoplay policy)
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Resolve of current speak() promise (legacy — kept for stopSpeaking compat)
  const speakResolveRef = useRef<(() => void) | null>(null);
  // Serial queue — non-interrupt calls wait for the previous one to finish
  const speakQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Monotonically increasing generation — _doSpeak aborts if superseded
  const speakGenRef = useRef(0);
  // Cached best voice for SpeechSynthesis
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Lazy-init AudioContext on first user gesture
  const getAudioCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // ── Beep ──────────────────────────────────────────────────────────────────

  const playBeep = useCallback(
    (type: BeepType) => {
      try {
        const ctx = getAudioCtx();
        const { freq, duration, gain } = BEEP_CONFIG[type];
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gainNode.gain.setValueAtTime(gain, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration + 0.05);
      } catch {
        // Audio not available — silently ignore
      }
    },
    [getAudioCtx],
  );

  // ── Voice Selection (Web Speech API) ────────────────────────────────────

  const getBestVoice = useCallback((): SpeechSynthesisVoice | null => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Check if cached voice is still available
    if (selectedVoiceRef.current) {
      const stillAvailable = voices.some(
        v => v.name === selectedVoiceRef.current!.name && v.lang === selectedVoiceRef.current!.lang
      );
      if (stillAvailable) return selectedVoiceRef.current;
      // Cache is stale, clear it
      selectedVoiceRef.current = null;
    }

    // Prefer natural-sounding Microsoft / Google voices
    const preferred = [
      'Microsoft Zira',
      'Microsoft David',
      'Google US English',
      'Google UK English Female',
      'Samantha',        // macOS
      'Karen',           // macOS
    ];
    for (const name of preferred) {
      const v = voices.find(voice => voice.name.includes(name));
      if (v) {
        selectedVoiceRef.current = v;
        console.log('[TTS] Selected voice:', v.name, `(${v.lang})`);
        return v;
      }
    }

    // Fallback: any English voice
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    if (enVoice) {
      selectedVoiceRef.current = enVoice;
      console.log('[TTS] Selected fallback voice:', enVoice.name, `(${enVoice.lang})`);
      return enVoice;
    }

    // Last resort: first voice
    if (voices.length > 0) {
      selectedVoiceRef.current = voices[0];
      console.log('[TTS] Selected first available voice:', voices[0].name);
      return voices[0];
    }

    return null;
  }, []);

  // Pre-load voices (some browsers load them asynchronously)
  useEffect(() => {
    const load = () => {
      const voiceCount = window.speechSynthesis.getVoices().length;
      if (voiceCount > 0) {
        console.log(`[TTS] Voices loaded: ${voiceCount}`);
        getBestVoice();
      }
    };
    load();
    window.speechSynthesis.onvoiceschanged = () => {
      console.log('[TTS] Voice list changed, clearing cache');
      selectedVoiceRef.current = null;
      load();
    };
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [getBestVoice]);

  // ── TTS via browser Web Speech API ──────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    // Advance generation — any in-progress _doSpeak will self-cancel
    speakGenRef.current += 1;
    // Cancel any ongoing browser speech
    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('[TTS] Error canceling speech:', err);
    }
    // Reset queue so next speak() starts immediately
    speakQueueRef.current = Promise.resolve();
    setIsSpeaking(false);
    if (speakResolveRef.current) {
      speakResolveRef.current();
      speakResolveRef.current = null;
    }
  }, []);

  // Internal: speak one utterance using native SpeechSynthesis.
  const _doSpeak = useCallback(
    async (text: string, rate: number, pitch: number, gen: number): Promise<void> => {
      if (speakGenRef.current !== gen) return;

      return new Promise<void>((resolve) => {
        try {
          setIsSpeaking(true);
          console.log('[TTS] Speaking:', text.substring(0, 60));

          const utterance = new SpeechSynthesisUtterance(text);
          
          // Normalize rate and pitch to valid ranges
          utterance.rate = Math.max(0.1, Math.min(10, rate));    // 0.1 - 10
          utterance.pitch = Math.max(0, Math.min(2, pitch));     // 0 - 2
          utterance.lang = 'en-US';
          utterance.volume = 1;

          // Try to assign voice, but don't fail if it's not available
          try {
            const voice = getBestVoice();
            if (voice) {
              utterance.voice = voice;
              console.log('[TTS] Using voice:', voice.name, `(${voice.lang})`);
            } else {
              console.warn('[TTS] No voice available, using system default');
            }
          } catch (voiceErr) {
            console.warn('[TTS] Voice assignment error, using system default:', voiceErr);
          }

          utterance.onend = () => {
            if (speakGenRef.current === gen) setIsSpeaking(false);
            resolve();
          };

          utterance.onerror = (event: any) => {
            if (event.error !== 'canceled' && event.error !== 'interrupted') {
              console.error('[TTS] Speaking error:', event.error);
              // Don't retry on voice errors — just finish
            }
            if (speakGenRef.current === gen) setIsSpeaking(false);
            resolve();
          };

          utterance.onpause = () => {
            console.log('[TTS] Speaking paused');
          };

          utterance.onresume = () => {
            console.log('[TTS] Speaking resumed');
          };

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('[TTS] Unexpected error:', err);
          if (speakGenRef.current === gen) setIsSpeaking(false);
          resolve();
        }
      });
    },
    [getBestVoice],
  );

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}): Promise<void> => {
      const { rate = 1.0, pitch = 1, interrupt = true } = options;

      if (!text || !text.trim()) {
        console.warn('[TTS] Refusing to speak empty text');
        return Promise.resolve();
      }

      if (interrupt) {
        // Advance generation and clear any in-flight speech, reset queue
        stopSpeaking();
      }

      // Capture generation AFTER the potential stopSpeaking() increment
      const myGen = ++speakGenRef.current;

      // Chain onto the serial queue — guarantees only one utterance plays at a time
      const queued = speakQueueRef.current.then(() => _doSpeak(text, rate, pitch, myGen));
      speakQueueRef.current = queued.catch(() => {});
      return queued;
    },
    [_doSpeak, stopSpeaking],
  );

  // ── State Transition ──────────────────────────────────────────────────────

  const transition = useCallback((to: VoiceSystemState) => {
    setVoiceState(prev => {
      // Schedule prevState update outside this updater to avoid
      // "Cannot update a component while rendering another" warning
      queueMicrotask(() => setPrevState(prev));
      return to;
    });
  }, []);

  // ─── Context Value ────────────────────────────────────────────────────────

  const value: VoiceContextType = {
    voiceState,
    prevState,
    transition,
    speak,
    stopSpeaking,
    isSpeaking,
    rawTranscript,
    setRawTranscript,
    formattedAnswer,
    setFormattedAnswer,
    playBeep,
    currentQuestionText,
    setCurrentQuestionText,
    faceAttempts,
    setFaceAttempts,
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}
