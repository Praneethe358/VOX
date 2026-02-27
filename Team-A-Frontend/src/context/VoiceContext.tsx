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
  // Current utterance ref so we can cancel
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  // Resolve/reject of current speak() promise
  const speakResolveRef = useRef<(() => void) | null>(null);

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

  // ── TTS ───────────────────────────────────────────────────────────────────

  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    if (speakResolveRef.current) {
      speakResolveRef.current();
      speakResolveRef.current = null;
    }
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}): Promise<void> => {
      return new Promise(resolve => {
        if (!('speechSynthesis' in window)) {
          resolve();
          return;
        }

        const { rate = 0.95, pitch = 1, lang = 'en-US', interrupt = true } = options;

        if (interrupt) {
          window.speechSynthesis.cancel();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.lang = lang;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          speakResolveRef.current = null;
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          speakResolveRef.current = null;
          resolve();
        };

        speakResolveRef.current = resolve;
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    [],
  );

  // Chrome bug: long TTS gets cut off. Keep it alive.
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.speechSynthesis && window.speechSynthesis.speaking) {
        window.speechSynthesis.resume();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
