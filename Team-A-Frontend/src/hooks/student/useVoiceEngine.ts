/**
 * useVoiceEngine — Core voice command engine for Vox.
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
  | 'start_answer'
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
    phrases: ['start answering', 'begin answering', 'answer now', 'begin answer',
      'answer question', 'i want to answer', 'record answer', 'start recording', 'begin recording'],
  },
  {
    action: 'start_answer',
    phrases: ['start answer', 'start writing', 'begin writing', 'write answer', 'start writing answer'],
  },
  {
    action: 'stop_dictating',
    phrases: ['stop dictating', 'done dictating', 'finished speaking', 'i am done', 'end dictation',
      'stop speaking', 'finish speaking', 'i have finished', 'done speaking', 'stop recording'],
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
    phrases: ['clear answer', 'delete answer', 'erase answer', 'remove answer', 'clear my answer'],
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
    phrases: ['resume exam', 'continue exam', "i'm back", 'i am back', 'resume exam now'],
  },
  {
    action: 'confirm_answer',
    phrases: ['confirm answer', 'save answer', 'accept answer', 'finalize answer', 'confirm my answer'],
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
    phrases: ['submit exam', 'finish exam', 'end exam', 'submit my exam', 'i want to submit',
      'summary exam', 'some exam', 'submit the exam', 'done with exam', 'finish the exam',
      'end the exam', 'im done with exam', 'complete exam', 'submit exams'],
  },
  {
    action: 'confirm_submission',
    phrases: ['confirm submission', 'yes submit', 'finalize exam', 'confirm submit',
      'confirmed submission', 'confirm the submission', 'confirm my submission',
      'yes confirm', 'yes finalize', 'submit now', 'yes i confirm', 'do submit',
      'i confirm', 'please submit', 'go ahead submit', 'submit it',
      'yes please submit', 'confirm exam submission', 'final submit',
      'confirm some mission', 'confirmed', 'confirm it', 'yes do it',
      'confirm exam', 'yes end exam', 'yes finish',
      'yes', 'submit', 'yes please', 'do it', 'go ahead', 'sure',
      'confirm yes', 'yes yes', 'ok submit', 'okay submit'],
  },
  {
    action: 'im_ready',
    phrases: ["i'm ready", 'i am ready', 'ready', 'still here', 'yes i am here'],
  },
  // ─── MCQ option selection commands ──────────────────────────────────
  {
    action: 'option_1',
    phrases: ['option 1', 'option one', 'first option', 'answer 1', 'answer one',
      'choice 1', 'choice one', 'option a', 'answer a', 'select 1', 'select one', 'select a'],
  },
  {
    action: 'option_2',
    phrases: ['option 2', 'option two', 'second option', 'answer 2', 'answer two',
      'choice 2', 'choice two', 'option b', 'answer b', 'select 2', 'select two', 'select b'],
  },
  {
    action: 'option_3',
    phrases: ['option 3', 'option three', 'third option', 'answer 3', 'answer three',
      'choice 3', 'choice three', 'option c', 'answer c', 'select 3', 'select three', 'select c'],
  },
  {
    action: 'option_4',
    phrases: ['option 4', 'option four', 'fourth option', 'answer 4', 'answer four',
      'choice 4', 'choice four', 'option d', 'answer d', 'select 4', 'select four', 'select d'],
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

const FUZZY_THRESHOLD = 0.65;

export function matchCommand(raw: string): { action: CommandAction; confidence: number } | null {
  const normalized = raw
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim();

  if (!normalized) return null;

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

  // 3. Fuzzy match on full text
  let best: { action: CommandAction; confidence: number } | null = null;
  for (const entry of COMMAND_TABLE) {
    for (const phrase of entry.phrases) {
      const ratio = fuzzyRatio(normalized, phrase);
      if (ratio >= FUZZY_THRESHOLD && (!best || ratio > best.confidence)) {
        best = { action: entry.action, confidence: ratio };
      }
    }
  }
  if (best) return best;

  // 4. Sliding window — try matching consecutive word subsequences
  //    Catches cases like "uh next question please" → "next question"
  const words = normalized.split(/\s+/);
  if (words.length > 2) {
    for (let windowSize = Math.min(words.length, 4); windowSize >= 2; windowSize--) {
      for (let start = 0; start <= words.length - windowSize; start++) {
        const sub = words.slice(start, start + windowSize).join(' ');
        for (const entry of COMMAND_TABLE) {
          for (const phrase of entry.phrases) {
            if (sub === phrase) return { action: entry.action, confidence: 0.9 };
            const ratio = fuzzyRatio(sub, phrase);
            if (ratio >= 0.75 && (!best || ratio > best.confidence)) {
              best = { action: entry.action, confidence: ratio * 0.9 };
            }
          }
        }
      }
    }
  }

  return best;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseVoiceEngineReturn {
  isListening: boolean;
  lastRawText: string;
  lastHeardText: string;    // always set — even for unmatched text
  wasMatched: boolean;      // whether lastHeardText matched a command
  interimRawText: string;
  failCount: number;
  lastError: string | null;
  isSupported: boolean;
  start: () => void;
  stop: () => void;
}

type CommandCallback = (action: CommandAction, confidence: number, raw: string) => void;

export function useVoiceEngine(onCommand: CommandCallback): UseVoiceEngineReturn {
  const { playBeep, isSpeaking, speak } = useVoiceContext();
  const [isListening, setIsListening] = useState(false);
  const [lastRawText, setLastRawText] = useState('');
  const [lastHeardText, setLastHeardText] = useState('');
  const [wasMatched, setWasMatched] = useState(false);
  const [interimRawText, setInterimRawText] = useState('');
  const [failCount, setFailCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isActiveRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;
  const speakRef = useRef(speak);
  speakRef.current = speak;
  const isSpeakingRef = useRef(false);
  const ttsStoppedAtRef = useRef(0);       // timestamp when TTS last stopped
  const watchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastEventTimeRef = useRef(0);      // timestamp of last recognition event
  const restartCountRef = useRef(0);       // count rapid restarts to avoid tight loop
  const silencePromptSpokenRef = useRef(false);
  const lastSilencePromptAtRef = useRef(0);
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
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    if (watchdogRef.current) {
      clearInterval(watchdogRef.current);
      watchdogRef.current = null;
    }
    setIsListening(false);
  }, []);

  const startBrowserRecognition = useCallback(() => {
    const SR = getSR();
    if (!SR) return;

    // Clean up any existing instance before creating a new one
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;
    recognitionRef.current = recognition;
    let gotResultThisSession = false;

    recognition.onstart = () => {
      console.log('[VoiceEngine] Browser SpeechRecognition started');
      setIsListening(true);
      lastEventTimeRef.current = Date.now();
      restartCountRef.current = 0;
      gotResultThisSession = false;
    };

    recognition.onaudiostart = () => {
      lastEventTimeRef.current = Date.now();
    };

    recognition.onsoundstart = () => {
      lastEventTimeRef.current = Date.now();
    };

    recognition.onresult = (event: any) => {
      lastEventTimeRef.current = Date.now();
      gotResultThisSession = true;
      silencePromptSpokenRef.current = false;

      // Skip processing results that arrived while TTS was speaking
      // (the mic may have picked up TTS audio)
      if (isSpeakingRef.current) return;
      const msSinceTts = Date.now() - ttsStoppedAtRef.current;
      if (ttsStoppedAtRef.current > 0 && msSinceTts < 800) return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setInterimRawText(interimTranscript);
      }

      if (finalTranscript) {
        const raw = finalTranscript.trim();
        console.log('[VoiceEngine] Browser STT result:', raw);
        setLastRawText(raw);
        setLastHeardText(raw);
        setInterimRawText('');

        // Try all alternatives for better matching
        let matched = matchCommand(raw);
        if (!matched) {
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (!event.results[i].isFinal) continue;
            for (let a = 1; a < event.results[i].length; a++) {
              const alt = event.results[i][a].transcript.trim();
              if (alt) {
                matched = matchCommand(alt);
                if (matched) {
                  console.log('[VoiceEngine] Matched on alternative:', alt);
                  break;
                }
              }
            }
            if (matched) break;
          }
        }

        if (matched) {
          console.log('[VoiceEngine] Browser STT matched command:', matched.action, 'confidence:', matched.confidence);
          setWasMatched(true);
          setFailCount(0);
          setLastError(null);
          playBeep('command');
          onCommandRef.current(matched.action, matched.confidence, raw);
        } else {
          console.log('[VoiceEngine] Browser STT no command match for:', raw);
          setWasMatched(false);
          setFailCount(c => c + 1);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[VoiceEngine] Browser SpeechRecognition error:', event.error);
      lastEventTimeRef.current = Date.now();

      if (event.error === 'not-allowed') {
        setLastError('Microphone permission denied. Allow mic access in browser settings.');
        setIsListening(false);
        isActiveRef.current = false;
        return;
      }

      if (event.error === 'network') {
        console.warn('[VoiceEngine] Network error — will retry on onend');
        setLastError('Voice recognition network issue — reconnecting…');
      }

      // 'no-speech', 'aborted', 'audio-capture', 'network' — all recovered via onend restart
    };

    recognition.onend = () => {
      lastEventTimeRef.current = Date.now();

      if (!isActiveRef.current || recognitionRef.current !== recognition) {
        setIsListening(false);
        return;
      }

      // If TTS is currently speaking, wait until it's done before restarting
      if (isSpeakingRef.current) {
        console.log('[VoiceEngine] TTS speaking — deferring restart');
        setIsListening(false);
        return; // The TTS-finished effect will restart recognition
      }

      if (!gotResultThisSession) {
        const now = Date.now();
        const canPrompt = !silencePromptSpokenRef.current && (now - lastSilencePromptAtRef.current > 15000);
        if (canPrompt) {
          void speakRef.current('hello are you still there ?? please say the command to proceed');
          silencePromptSpokenRef.current = true;
          lastSilencePromptAtRef.current = now;
        }
      } else {
        silencePromptSpokenRef.current = false;
      }

      // Back off on rapid restarts to avoid a tight loop
      restartCountRef.current += 1;
      const delay = restartCountRef.current > 5 ? 1000 : restartCountRef.current > 2 ? 300 : 50;
      console.log(`[VoiceEngine] onend — restarting in ${delay}ms (restart #${restartCountRef.current})`);

      setTimeout(() => {
        if (!isActiveRef.current) return;
        try {
          recognition.start();
        } catch (err) {
          console.warn('[VoiceEngine] Restart failed, creating fresh instance');
          recognitionRef.current = null;
          // Create a completely fresh recognition instance
          setTimeout(() => {
            if (isActiveRef.current && !isSpeakingRef.current) {
              startBrowserRecognition();
            }
          }, 500);
        }
      }, delay);
    };

    try {
      recognition.start();
    } catch {
      setLastError('Failed to start browser speech recognition.');
    }
  }, [getSR, playBeep]);

  const start = useCallback(() => {
    if (isActiveRef.current) {
      console.log('[VoiceEngine] Already active, skipping bootstrap');
      return;
    }
    isActiveRef.current = true;
    lastEventTimeRef.current = Date.now();
    restartCountRef.current = 0;
    setLastError(null);

    // Use browser Web Speech API for command recognition
    const SR = getSR();
    if (SR) {
      console.log('[VoiceEngine] Bootstrapping — using browser Web Speech API');
      startBrowserRecognition();

      // Watchdog: if no recognition events for 15s and not TTS-speaking, force restart
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      watchdogRef.current = setInterval(() => {
        if (!isActiveRef.current) {
          if (watchdogRef.current) clearInterval(watchdogRef.current);
          return;
        }
        if (isSpeakingRef.current) return; // Don't watchdog during TTS
        const silenceMs = Date.now() - lastEventTimeRef.current;
        if (silenceMs > 15000) {
          console.warn('[VoiceEngine] Watchdog: no events for 15s — restarting recognition');
          if (recognitionRef.current) {
            try { recognitionRef.current.abort(); } catch {}
            recognitionRef.current = null;
          }
          startBrowserRecognition();
        }
      }, 5000);
    } else {
      console.log('[VoiceEngine] Browser Speech API unavailable');
      setLastError('Browser speech recognition unavailable in this browser.');
      setIsListening(false);
    }
  }, [getSR, startBrowserRecognition]);

  // Keep isSpeakingRef in sync with TTS state so recognition pauses during speech
  useEffect(() => {
    const wasSpeaking = isSpeakingRef.current;
    isSpeakingRef.current = isSpeaking;
    // Record timestamp when TTS transitions from speaking → silent
    if (wasSpeaking && !isSpeaking) {
      ttsStoppedAtRef.current = Date.now();

      // TTS just finished — restart browser recognition if it was paused/stopped
      if (isActiveRef.current) {
        setTimeout(() => {
          if (!isActiveRef.current || isSpeakingRef.current) return;
          // If recognition is dead (no instance or not listening), restart it
          if (!recognitionRef.current) {
            console.log('[VoiceEngine] TTS finished — restarting recognition');
            startBrowserRecognition();
          } else {
            // Try to restart the existing instance
            try {
              recognitionRef.current.start();
              console.log('[VoiceEngine] TTS finished — resumed recognition');
            } catch {
              // Already running — that's fine
            }
          }
        }, 400); // Small delay for echo to die down
      }
    }

    // TTS just started — abort recognition to prevent it picking up TTS audio
    if (!wasSpeaking && isSpeaking && isActiveRef.current) {
      if (recognitionRef.current) {
        console.log('[VoiceEngine] TTS started — pausing recognition');
        try { recognitionRef.current.abort(); } catch {}
      }
    }
  }, [isSpeaking, startBrowserRecognition]);

  // Stop when component using this hook unmounts
  useEffect(() => {
    return () => {
      stop();
      if (watchdogRef.current) {
        clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, [stop]);

  return { isListening, lastRawText, lastHeardText, wasMatched, interimRawText, failCount, lastError, isSupported, start, stop };
}
