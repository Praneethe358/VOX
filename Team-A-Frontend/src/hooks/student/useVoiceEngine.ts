/**
 * useVoiceEngine — Core voice command engine for VoiceSecure.
 *
 * Uses the Web Speech API SpeechRecognition in COMMAND_MODE.
 * Applies exact and fuzzy (Levenshtein ratio ≥ 0.78) matching against the
 * 13-command table.  Emits named actions through an `onCommand` callback.
 *
 * Usage:
 *   const { isListening, start, stop, onCommand } = useVoiceEngine();
 *   onCommand('next_question', () => { ... });
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceContext } from '../../context/VoiceContext';
import apiService from '../../services/student/api.service';

// ─── Command Table ────────────────────────────────────────────────────────────

export type CommandAction =
  | 'start_answering'
  | 'stop_dictating'
  | 'repeat_question'
  | 'next_question'
  | 'previous_question'
  | 'read_my_answer'
  | 'clear_answer'
  | 'confirm_clear'
  | 'pause_exam'
  | 'resume_exam'
  | 'confirm_answer'
  | 'edit_answer'
  | 'continue_dictation'
  | 'submit_exam'
  | 'confirm_submission'
  | 'im_ready'
  | 'start_exam'
  | 'option_1'
  | 'option_2'
  | 'option_3'
  | 'option_4';

interface CommandEntry {
  action: CommandAction;
  phrases: string[]; // all must be lowercase, no punctuation
}

const COMMAND_TABLE: CommandEntry[] = [
  {
    action: 'start_exam',
    phrases: ['start exam', 'begin exam', 'start the exam', 'begin the exam', 'start'],
  },
  {
    action: 'start_answering',
    phrases: ['start answering', 'begin answering', 'answer now', 'start answer', 'begin answer',
      'answer question', 'i want to answer', 'record answer', 'start recording', 'begin recording'],
  },
  {
    action: 'stop_dictating',
    phrases: ['stop dictating', 'done', 'finished speaking', 'stop', 'i am done', 'end dictation',
      'stop speaking', 'finish speaking', 'i have finished', 'done speaking'],
  },
  {
    action: 'repeat_question',
    phrases: ['repeat question', 'say again', 'read question', 'read again', 'repeat', 'hear again'],
  },
  {
    action: 'next_question',
    phrases: ['next question', 'go next', 'move forward', 'next', 'skip question', 'forward',
      'go to next', 'move to next', 'go forward'],
  },
  {
    action: 'previous_question',
    phrases: [
      'previous question',
      'go back',
      'last question',
      'back',
      'previous',
      'go previous',
      'prior question',
      'move back',
    ],
  },
  {
    action: 'read_my_answer',
    phrases: ['read my answer', 'what did i say', 'play answer', 'read answer', 'hear my answer'],
  },
  {
    action: 'clear_answer',
    phrases: ['clear answer', 'delete answer', 'erase answer', 'remove answer', 'clear'],
  },
  {
    action: 'confirm_clear',
    phrases: ['confirm clear', 'yes clear', 'delete it', 'yes delete'],
  },
  {
    action: 'pause_exam',
    phrases: ['pause exam', 'take a break', 'pause', 'stop exam temporarily'],
  },
  {
    action: 'resume_exam',
    phrases: ['resume exam', 'continue exam', "i'm back", 'i am back', 'resume', 'continue'],
  },
  {
    action: 'confirm_answer',
    phrases: ['confirm answer', 'save answer', 'accept answer', 'finalize answer', 'confirm'],
  },
  {
    action: 'edit_answer',
    phrases: ['edit answer', 'redo answer', 'change answer', 'modify answer'],
  },
  {
    action: 'continue_dictation',
    phrases: ['continue dictation', 'add more', 'keep going', 'continue speaking', 'add to answer'],
  },
  {
    action: 'submit_exam',
    phrases: ['submit exam', 'finish exam', 'end exam', 'submit', 'finish'],
  },
  {
    action: 'confirm_submission',
    phrases: ['confirm submission', 'yes submit', 'finalize exam', 'confirm submit'],
  },
  {
    action: 'im_ready',
    phrases: ["i'm ready", 'i am ready', 'ready', 'still here', 'yes i am here'],
  },
  // ─── MCQ option selection commands ──────────────────────────────────
  {
    action: 'option_1',
    phrases: ['option 1', 'option one', 'first option', 'answer 1', 'answer one',
      'choice 1', 'choice one', 'option a', 'answer a', 'select 1', 'select one', 'select a', '1', 'one', 'a'],
  },
  {
    action: 'option_2',
    phrases: ['option 2', 'option two', 'second option', 'answer 2', 'answer two',
      'choice 2', 'choice two', 'option b', 'answer b', 'select 2', 'select two', 'select b', '2', 'two', 'b'],
  },
  {
    action: 'option_3',
    phrases: ['option 3', 'option three', 'third option', 'answer 3', 'answer three',
      'choice 3', 'choice three', 'option c', 'answer c', 'select 3', 'select three', 'select c', '3', 'three', 'c'],
  },
  {
    action: 'option_4',
    phrases: ['option 4', 'option four', 'fourth option', 'answer 4', 'answer four',
      'choice 4', 'choice four', 'option d', 'answer d', 'select 4', 'select four', 'select d', '4', 'four', 'd'],
  },
];

// ─── Fuzzy match (Levenshtein ratio) ─────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyRatio(a: string, b: string): number {
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length, 1);
}

const FUZZY_THRESHOLD = 0.72;

// Known Whisper hallucinations — phantom text generated from silence/ambient noise
const WHISPER_HALLUCINATIONS = new Set([
  'you', 'thank you', 'thanks for watching', 'the', 'bye',
  'hmm', 'um', 'uh', 'ah', 'oh', 'so', 'yeah', 'okay',
  'thank you for watching', 'thanks for listening',
  'subscribe', 'like and subscribe',
  'i', 'a', 'the end', 'silence',
]);

export function matchCommand(raw: string): { action: CommandAction; confidence: number } | null {
  const normalized = raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();

  // 1. Exact match
  for (const entry of COMMAND_TABLE) {
    for (const phrase of entry.phrases) {
      if (normalized === phrase) {
        return { action: entry.action, confidence: 1.0 };
      }
    }
  }

  // 2. Contains match (input contains one of the phrases)
  for (const entry of COMMAND_TABLE) {
    for (const phrase of entry.phrases) {
      if (normalized.includes(phrase)) {
        return { action: entry.action, confidence: 0.95 };
      }
    }
  }

  // 3. Fuzzy match
  let best: { action: CommandAction; confidence: number } | null = null;
  for (const entry of COMMAND_TABLE) {
    for (const phrase of entry.phrases) {
      const ratio = fuzzyRatio(normalized, phrase);
      if (ratio >= FUZZY_THRESHOLD && (!best || ratio > best.confidence)) {
        best = { action: entry.action, confidence: ratio };
      }
    }
  }

  return best;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseVoiceEngineReturn {
  isListening: boolean;
  lastRawText: string;
  interimRawText: string;
  failCount: number;
  lastError: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

type CommandCallback = (action: CommandAction, confidence: number, raw: string) => void;

export function useVoiceEngine(onCommand: CommandCallback): UseVoiceEngineReturn {
  const { voiceState, playBeep, isSpeaking } = useVoiceContext();
  const [isListening, setIsListening] = useState(false);
  const [lastRawText, setLastRawText] = useState('');
  const [interimRawText, setInterimRawText] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const backendLoopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActiveRef = useRef(false);
  const usingBackendSttRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const isSpeakingRef = useRef(false);
  const isSupported = Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition,
  );

  const getSR = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    return SR;
  }, []);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    usingBackendSttRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (backendLoopTimerRef.current) {
      clearTimeout(backendLoopTimerRef.current);
      backendLoopTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    mediaRecorderRef.current = null;
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startBackendSttLoop = useCallback(async () => {
    if (!isActiveRef.current) return;
    usingBackendSttRef.current = true;
    console.log('[VoiceEngine] Starting backend Whisper STT loop');

    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[VoiceEngine] Mic stream acquired for backend STT');
      }
    } catch (err) {
      console.error('[VoiceEngine] Mic permission denied for backend STT:', err);
      setLastError('Microphone permission denied. Allow mic access in browser settings.');
      setIsListening(false);
      usingBackendSttRef.current = false;
      return;
    }

    // Clear the browser-recognition error now that Whisper is starting
    setLastError(null);

    const runOneChunk = async () => {
      if (!isActiveRef.current || !usingBackendSttRef.current || !mediaStreamRef.current) return;

      // Pause while TTS is speaking to avoid echo
      if (isSpeakingRef.current) {
        backendLoopTimerRef.current = setTimeout(runOneChunk, 400);
        return;
      }

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstart = () => {
        console.log('[VoiceEngine] Backend STT: recording chunk...');
        setIsListening(true);
      };

      recorder.onstop = async () => {
        if (!isActiveRef.current || !usingBackendSttRef.current) return;

        try {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          console.log('[VoiceEngine] Backend STT: sending', audioBlob.size, 'bytes to /api/ai/stt-command');
          const result = await apiService.convertCommandToText(audioBlob);
          const raw = (result?.text ?? '').trim();
          console.log('[VoiceEngine] Backend STT result:', raw || '(empty)');

          // Filter out Whisper hallucinations (phantom text from silence/noise)
          const normalized = raw.toLowerCase().replace(/[^\w\s]/g, '').trim();
          if (raw && normalized.length >= 3 && !WHISPER_HALLUCINATIONS.has(normalized)) {
            setLastRawText(raw);
            const matched = matchCommand(raw);
            if (matched) {
              console.log('[VoiceEngine] Backend STT matched command:', matched.action);
              setFailCount(0);
              setLastError(null);
              playBeep('command');
              onCommandRef.current(matched.action, matched.confidence, raw);
            } else {
              console.log('[VoiceEngine] Backend STT no command match for:', raw);
              setFailCount(c => c + 1);
            }
          } else if (raw) {
            console.log('[VoiceEngine] Backend STT: ignoring hallucination/noise:', raw);
          }
        } catch (err) {
          console.error('[VoiceEngine] Backend STT request failed:', err);
          setLastError('Whisper command recognition failed. Check backend and try again.');
        }

        if (isActiveRef.current && usingBackendSttRef.current) {
          backendLoopTimerRef.current = setTimeout(runOneChunk, 250);
        }
      };

      try {
        recorder.start();
        setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop();
        }, 3500);
      } catch {
        setLastError('Unable to start backend speech capture.');
        setIsListening(false);
      }
    };

    await runOneChunk();
  }, [playBeep]);

  const start = useCallback(() => {
    const bootstrap = async () => {
    console.log('[VoiceEngine] Bootstrapping — using backend Whisper STT directly');
    if (isActiveRef.current) {
      console.log('[VoiceEngine] Already active, skipping bootstrap');
      return;
    }
    isActiveRef.current = true;
    setLastError(null);
    void startBackendSttLoop();
    };
    void bootstrap();
  }, [playBeep, startBackendSttLoop]);

  // Keep isSpeakingRef in sync with TTS state so recognition pauses during speech
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

  // Stop when component using this hook unmounts
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { isListening, lastRawText, interimRawText, failCount, lastError, isSupported, start, stop };
}
