/**
 * VoiceContext — Global voice state machine for VoiceSecure hands-free portal.
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
    if (selectedVoiceRef.current) return selectedVoiceRef.current;
    const voices = window.speechSynthesis.getVoices();
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
      if (v) { selectedVoiceRef.current = v; return v; }
    }
    // Fallback: any English voice
    const enVoice = voices.find(v => v.lang.startsWith('en'));
    if (enVoice) { selectedVoiceRef.current = enVoice; return enVoice; }
    return voices[0] || null;
  }, []);

  // Pre-load voices (some browsers load them asynchronously)
  useEffect(() => {
    const load = () => {
      if (window.speechSynthesis.getVoices().length > 0) getBestVoice();
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [getBestVoice]);

  // ── TTS via browser Web Speech API ──────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    // Advance generation — any in-progress _doSpeak will self-cancel
    speakGenRef.current += 1;
    // Cancel any ongoing browser speech
    window.speechSynthesis.cancel();
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
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.lang = 'en-US';

          const voice = getBestVoice();
          if (voice) {
            utterance.voice = voice;
            console.log('[TTS] Using voice:', voice.name);
          }

          utterance.onend = () => {
            if (speakGenRef.current === gen) setIsSpeaking(false);
            resolve();
          };

          utterance.onerror = (event) => {
            if (event.error !== 'canceled') console.error('[TTS] Error:', event.error);
            if (speakGenRef.current === gen) setIsSpeaking(false);
            resolve();
          };

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          console.error('[TTS] Error:', err);
          if (speakGenRef.current === gen) setIsSpeaking(false);
          resolve();
        }
      });
    },
    [getBestVoice],
  );

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}): Promise<void> => {
      const { rate = 0.95, pitch = 1, interrupt = true } = options;

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
      setPrevState(prev);
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
