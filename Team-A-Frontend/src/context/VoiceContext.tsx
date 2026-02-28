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
  // Currently playing audio element for TTS
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  // Resolve/reject of current speak() promise
  const speakResolveRef = useRef<(() => void) | null>(null);
  // Abort controller for in-flight TTS fetch
  const ttsAbortRef = useRef<AbortController | null>(null);

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

  // ── TTS via backend espeak-ng ───────────────────────────────────────────

  const TTS_API_URL =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    'http://localhost:3000/api';

  const stopSpeaking = useCallback(() => {
    // Abort any in-flight TTS fetch
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    // Stop any playing audio
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current.src = '';
      ttsAudioRef.current = null;
    }
    setIsSpeaking(false);
    if (speakResolveRef.current) {
      speakResolveRef.current();
      speakResolveRef.current = null;
    }
  }, []);

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}): Promise<void> => {
      console.log('[TTS/espeak] Speaking:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
      return new Promise(async (resolve) => {
        const { rate = 0.95, interrupt = true } = options;

        if (interrupt) {
          // Stop any currently playing TTS
          if (ttsAbortRef.current) {
            ttsAbortRef.current.abort();
            ttsAbortRef.current = null;
          }
          if (ttsAudioRef.current) {
            ttsAudioRef.current.pause();
            ttsAudioRef.current.src = '';
            ttsAudioRef.current = null;
          }
          if (speakResolveRef.current) {
            speakResolveRef.current();
            speakResolveRef.current = null;
          }
        }

        // Map speech rate (0.5-2.0) to espeak-ng words-per-minute (80-300)
        const speed = Math.round(80 + (rate - 0.5) * (300 - 80) / (2.0 - 0.5));

        const abortController = new AbortController();
        ttsAbortRef.current = abortController;
        speakResolveRef.current = resolve;

        try {
          setIsSpeaking(true);
          console.log('[TTS/espeak] Fetching audio from backend, speed:', speed);

          const response = await fetch(`${TTS_API_URL}/ai/tts-speak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, speed }),
            signal: abortController.signal,
          });

          if (!response.ok) {
            throw new Error(`TTS API returned ${response.status}`);
          }

          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          ttsAudioRef.current = audio;

          audio.onended = () => {
            console.log('[TTS/espeak] Audio playback ended');
            URL.revokeObjectURL(audioUrl);
            ttsAudioRef.current = null;
            ttsAbortRef.current = null;
            setIsSpeaking(false);
            speakResolveRef.current = null;
            resolve();
          };

          audio.onerror = () => {
            console.error('[TTS/espeak] Audio playback error');
            URL.revokeObjectURL(audioUrl);
            ttsAudioRef.current = null;
            ttsAbortRef.current = null;
            setIsSpeaking(false);
            speakResolveRef.current = null;
            resolve();
          };

          await audio.play();
          console.log('[TTS/espeak] Audio playback started');
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            console.log('[TTS/espeak] Fetch aborted (interrupted)');
          } else {
            console.error('[TTS/espeak] Error:', err);
          }
          ttsAbortRef.current = null;
          setIsSpeaking(false);
          speakResolveRef.current = null;
          resolve();
        }
      });
    },
    [],
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
