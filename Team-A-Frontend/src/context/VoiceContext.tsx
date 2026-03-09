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

  // AudioContext ref for beeps AND TTS (lazy-init to satisfy browser autoplay policy)
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Currently playing AudioBufferSourceNode for TTS
  const ttsSourceRef = useRef<AudioBufferSourceNode | null>(null);
  // Resolve of current speak() promise (legacy — kept for stopSpeaking compat)
  const speakResolveRef = useRef<(() => void) | null>(null);
  // Abort controller for in-flight TTS fetch
  const ttsAbortRef = useRef<AbortController | null>(null);
  // Serial queue — non-interrupt calls wait for the previous one to finish
  const speakQueueRef = useRef<Promise<void>>(Promise.resolve());
  // Monotonically increasing generation — _doSpeak aborts if superseded
  const speakGenRef = useRef(0);

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
    // Advance generation — any in-progress _doSpeak will self-cancel at next await
    speakGenRef.current += 1;
    // Abort any in-flight TTS fetch
    if (ttsAbortRef.current) {
      ttsAbortRef.current.abort();
      ttsAbortRef.current = null;
    }
    // Stop any playing AudioBufferSourceNode
    if (ttsSourceRef.current) {
      try { ttsSourceRef.current.stop(); } catch { /* already stopped */ }
      ttsSourceRef.current = null;
    }
    // Reset queue so next speak() starts immediately
    speakQueueRef.current = Promise.resolve();
    setIsSpeaking(false);
    if (speakResolveRef.current) {
      speakResolveRef.current();
      speakResolveRef.current = null;
    }
  }, []);

  // Internal: synthesize + play one utterance.
  // Checks generation at every async boundary to bail if superseded by a newer call.
  const _doSpeak = useCallback(
    async (text: string, speed: number, gen: number): Promise<void> => {
      // Already superseded before we even started
      if (speakGenRef.current !== gen) return;

      const abortController = new AbortController();
      ttsAbortRef.current = abortController;

      try {
        setIsSpeaking(true);
        console.log('[TTS] Fetching:', text.substring(0, 60));

        const response = await fetch(`${TTS_API_URL}/ai/tts-speak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, speed }),
          signal: abortController.signal,
        });

        if (speakGenRef.current !== gen) return; // superseded during fetch
        if (!response.ok) throw new Error(`TTS API returned ${response.status}`);

        const arrayBuffer = await response.arrayBuffer();
        if (speakGenRef.current !== gen) return; // superseded during read

        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        if (speakGenRef.current !== gen) return; // superseded during resume

        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (speakGenRef.current !== gen) return; // superseded during decode

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(ctx.destination);
        ttsSourceRef.current = source;

        await new Promise<void>((resolvePlayback) => {
          source.onended = () => {
            ttsSourceRef.current = null;
            resolvePlayback();
          };
          source.start(0);
          console.log('[TTS] Playback started');
        });

        console.log('[TTS] Playback ended');
      } catch (err: any) {
        if (err?.name !== 'AbortError') console.error('[TTS] Error:', err);
      } finally {
        // Only clear isSpeaking if we are still the active generation
        if (speakGenRef.current === gen) {
          setIsSpeaking(false);
        }
        ttsAbortRef.current = null;
        ttsSourceRef.current = null;
        speakResolveRef.current = null;
      }
    },
    [getAudioCtx],
  );

  const speak = useCallback(
    (text: string, options: SpeakOptions = {}): Promise<void> => {
      const { rate = 0.95, interrupt = true } = options;
      const speed = Math.round(80 + (rate - 0.5) * (300 - 80) / (2.0 - 0.5));

      if (interrupt) {
        // Advance generation and clear any in-flight audio, reset queue
        stopSpeaking();
      }

      // Capture generation AFTER the potential stopSpeaking() increment
      const myGen = ++speakGenRef.current;

      // Chain onto the serial queue — guarantees only one utterance plays at a time
      const queued = speakQueueRef.current.then(() => _doSpeak(text, speed, myGen));
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
