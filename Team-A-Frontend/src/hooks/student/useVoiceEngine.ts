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
  | 'start_exam';

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
    phrases: ['start answering', 'begin answering', 'answer now', 'start answer', 'begin answer'],
  },
  {
    action: 'stop_dictating',
    phrases: ['stop dictating', 'done', 'finished speaking', 'stop', 'i am done', 'end dictation'],
  },
  {
    action: 'repeat_question',
    phrases: ['repeat question', 'say again', 'read question', 'read again', 'repeat', 'hear again'],
  },
  {
    action: 'next_question',
    phrases: ['next question', 'go next', 'move forward', 'next', 'skip question', 'forward'],
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

const FUZZY_THRESHOLD = 0.78;

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
  failCount: number;
  start: () => void;
  stop: () => void;
}

type CommandCallback = (action: CommandAction, confidence: number, raw: string) => void;

export function useVoiceEngine(onCommand: CommandCallback): UseVoiceEngineReturn {
  const { voiceState, playBeep } = useVoiceContext();
  const [isListening, setIsListening] = useState(false);
  const [lastRawText, setLastRawText] = useState('');
  const [failCount, setFailCount] = useState(0);

  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const getSR = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return null;
    return SR;
  }, []);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) {
      console.warn('SpeechRecognition not supported');
      return;
    }
    if (isActiveRef.current) return;
    isActiveRef.current = true;

    const createRecognition = () => {
      if (!isActiveRef.current) return;

      const r = new SR();
      recognitionRef.current = r;

      r.continuous = false;
      r.interimResults = false;
      r.lang = 'en-US';
      r.maxAlternatives = 3;

      r.onstart = () => setIsListening(true);

      r.onresult = (event: any) => {
        const results: string[] = [];
        for (let i = event.resultIndex; i < event.results.length; i++) {
          for (let j = 0; j < event.results[i].length; j++) {
            results.push(event.results[i][j].transcript);
          }
        }

        let matched: { action: CommandAction; confidence: number } | null = null;
        let matchedRaw = '';

        for (const raw of results) {
          const m = matchCommand(raw);
          if (m && (!matched || m.confidence > matched.confidence)) {
            matched = m;
            matchedRaw = raw;
          }
        }

        if (matched) {
          setLastRawText(matchedRaw);
          setFailCount(0);
          playBeep('command');
          onCommandRef.current(matched.action, matched.confidence, matchedRaw);
        } else {
          setFailCount(c => c + 1);
          setLastRawText(results[0] || '');
        }
      };

      r.onend = () => {
        setIsListening(false);
        // Auto-restart while active (IVR-style always-on listening)
        if (isActiveRef.current) {
          setTimeout(createRecognition, 300);
        }
      };

      r.onerror = (e: any) => {
        if (e.error === 'no-speech' || e.error === 'aborted') {
          // Restart silently
          setIsListening(false);
          if (isActiveRef.current) {
            setTimeout(createRecognition, 400);
          }
          return;
        }
        console.error('SpeechRec error:', e.error);
        setIsListening(false);
        if (isActiveRef.current) {
          setTimeout(createRecognition, 1000);
        }
      };

      try {
        r.start();
      } catch {}
    };

    createRecognition();
  }, [getSR, playBeep]);

  // Stop when component using this hook unmounts
  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { isListening, lastRawText, failCount, start, stop };
}
