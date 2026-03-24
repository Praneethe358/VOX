/**
 * useVoiceNavigation — Voice-driven page navigation for non-exam pages.
 *
 * Uses continuous = FALSE + auto-restart pattern (more reliable in Chrome
 * than continuous = true which silently stops firing results).
 * Returns lastHeard for visible feedback so user knows mic is working.
 *
 * Pauses recognition while TTS is speaking to avoid echo feedback.
 * When silence is detected, prompts the user with TTS:
 * "hello are you still there ?? please say the command to proceed"
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceContext } from '../context/VoiceContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NavAction =
  | 'go_dashboard'
  | 'go_exams'
  | 'go_results'
  | 'go_settings'
  | 'go_back'
  | 'logout'
  | 'select_exam'
  | 'help'
  | 'unknown';

export interface NavCommand {
  action: NavAction;
  confidence: number;
  raw: string;
  param?: string;
}

// ─── Pattern table (order matters — more specific first) ─────────────────────

const NAV_PATTERNS: { pattern: RegExp; action: NavAction }[] = [
  // Select exam (must come before generic "exam")
  { pattern: /\b(?:select|choose|pick|open|start)\s+exam\s*(?:number\s*)?(\d+)\b/i, action: 'select_exam' },
  { pattern: /\bexam\s+(?:number\s*)?(\d+)\b/i,                                     action: 'select_exam' },
  { pattern: /\bselect\s+(?:number\s*)?(\d+)\b/i,                                   action: 'select_exam' },

  // Dashboard
  { pattern: /\bdashboard\b/i,      action: 'go_dashboard' },
  { pattern: /\bhome\b/i,           action: 'go_dashboard' },
  { pattern: /\bmain\s*(?:page|screen|menu)\b/i, action: 'go_dashboard' },

  // Exams list
  { pattern: /\bexams?\b/i,         action: 'go_exams' },
  { pattern: /\btake\s*(?:an?\s*)?exam\b/i, action: 'go_exams' },
  { pattern: /\bbrowse\b/i,         action: 'go_exams' },

  // Results
  { pattern: /\bresults?\b/i,       action: 'go_results' },
  { pattern: /\bscores?\b/i,        action: 'go_results' },
  { pattern: /\bgrades?\b/i,        action: 'go_results' },

  // Settings
  { pattern: /\bsettings?\b/i,      action: 'go_settings' },
  { pattern: /\bpreferences?\b/i,   action: 'go_settings' },
  { pattern: /\bconfigur/i,         action: 'go_settings' },

  // Back
  { pattern: /\bgo\s*back\b/i,      action: 'go_back' },
  { pattern: /\bgo\s+to\s+back\b/i, action: 'go_back' },
  { pattern: /\breturn\s*(?:home|back)?\b/i, action: 'go_back' },
  { pattern: /\bprevious\s*page\b/i, action: 'go_back' },

  // Logout
  { pattern: /\blog\s*out\b/i,      action: 'logout' },
  { pattern: /\bsign\s*out\b/i,     action: 'logout' },
  { pattern: /\bexit\s*(?:app|portal|system)?\b/i, action: 'logout' },
  { pattern: /\bbye\b/i,            action: 'logout' },

  // Help
  { pattern: /\bhelp\b/i,           action: 'help' },
  { pattern: /\bcommands?\b/i,      action: 'help' },
  { pattern: /\bwhat\s*can\b/i,     action: 'help' },
];

export function matchNavCommand(raw: string): NavCommand {
  const text = raw.toLowerCase().replace(/[^\w\s]/g, '').trim();
  for (const { pattern, action } of NAV_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return { action, confidence: 0.9, raw: text, param: match[1] ?? undefined };
    }
  }
  return { action: 'unknown', confidence: 0, raw: text };
}

// ─── Hook options ─────────────────────────────────────────────────────────────

interface UseVoiceNavigationOptions {
  enabled?: boolean;
  onCommand?: (cmd: NavCommand) => boolean | void;
  onUnknownCommand?: (raw: string) => void;
  pageName?: string;
  silencePromptEnabled?: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceNavigation(options: UseVoiceNavigationOptions = {}) {
  const {
    enabled = true,
    onCommand,
    onUnknownCommand,
    pageName = 'this page',
    silencePromptEnabled = true,
  } = options;
  const navigate = useNavigate();
  const { speak, playBeep, isSpeaking } = useVoiceContext();

  const [isListening, setIsListening] = useState(false);
  const [lastCommand, setLastCommand] = useState<NavCommand | null>(null);
  const [lastHeard, setLastHeard] = useState('');
  const [error, setError] = useState<string | null>(null);

  const shouldListenRef    = useRef(enabled);
  const recognitionRef     = useRef<any>(null);
  const restartTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCommandRef       = useRef(onCommand);
  const onUnknownRef       = useRef(onUnknownCommand);
  const navigateRef        = useRef(navigate);
  const speakRef           = useRef(speak);
  const playBeepRef        = useRef(playBeep);
  const pageNameRef        = useRef(pageName);
  const silencePromptEnabledRef = useRef(silencePromptEnabled);
  const isSpeakingRef      = useRef(false);
  const wasSpeakingRef     = useRef(false);
  const silencePromptSpokenRef = useRef(false);
  const lastActivityAtRef  = useRef(0);

  shouldListenRef.current  = enabled;
  onCommandRef.current     = onCommand;
  onUnknownRef.current     = onUnknownCommand;
  navigateRef.current      = navigate;
  speakRef.current         = speak;
  playBeepRef.current      = playBeep;
  pageNameRef.current      = pageName;
  silencePromptEnabledRef.current = silencePromptEnabled;

  // Keep speaking state synced and track when TTS finishes.
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;

    if (wasSpeakingRef.current && !isSpeaking) {
      // Start silence tracking only after TTS fully stops.
      lastActivityAtRef.current = Date.now();
      silencePromptSpokenRef.current = false;
    }

    wasSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  const dispatchCommand = useCallback((cmd: NavCommand) => {
    console.log('[VoiceNav] ✓ Command matched:', cmd.action, '| raw:', cmd.raw, '| confidence:', cmd.confidence);
    setLastCommand(cmd);
    setLastHeard(`OK: ${cmd.raw}`);
    if (onCommandRef.current) {
      const handled = onCommandRef.current(cmd);
      if (handled === true) return;
    }
    playBeepRef.current('command');
    switch (cmd.action) {
      case 'go_dashboard':
        void speakRef.current('Going to exam list.');
        navigateRef.current('/student/exams');
        break;
      case 'go_exams':
        void speakRef.current('Opening exam list.');
        navigateRef.current('/student/exams');
        break;
      case 'go_results':
        void speakRef.current('Showing your results.');
        navigateRef.current('/student/results');
        break;
      case 'go_settings':
        void speakRef.current('Opening settings.');
        navigateRef.current('/student/settings');
        break;
      case 'go_back':
        void speakRef.current('Going back.');
        (navigateRef.current as any)(-1);
        break;
      case 'logout':
        void speakRef.current('Logging out.');
        sessionStorage.removeItem('studentAuth');
        sessionStorage.removeItem('studentId');
        sessionStorage.removeItem('studentData');
        navigateRef.current('/student/login');
        break;
      case 'help':
        void speakRef.current(
          `You are on ${pageNameRef.current}. Say: dashboard, exams, results, settings, go back, logout, or select exam followed by a number.`
        );
        break;
      case 'select_exam':
        void speakRef.current(`Exam ${cmd.param} selected.`);
        break;
      default:
        break;
    }
  }, []);



  // ── Web Speech API primary recognition ─────────────────────────────────────

  const startOnce = useCallback(() => {
    if (!shouldListenRef.current) return;

    // Delay start while TTS is speaking to prevent echo feedback
    if (isSpeakingRef.current) {
      console.log('[VoiceNav] TTS speaking — delaying recognition start');
      restartTimerRef.current = setTimeout(startOnce, 400);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('[VoiceNav] SpeechRecognition not supported');
      setError('Browser speech recognition unavailable.');
      return;
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    console.log('[VoiceNav] Creating SpeechRecognition instance');
    const r = new SR();
    r.continuous     = false;
    r.interimResults = true;
    r.lang           = 'en-US';
    r.maxAlternatives = 5;
    let gotResultThisSession = false;
    r.onstart = () => {
      console.log('[VoiceNav] SpeechRecognition started — listening…');
      setIsListening(true);
      setError(null);
      gotResultThisSession = false;
      if (lastActivityAtRef.current === 0 && !isSpeakingRef.current) {
        lastActivityAtRef.current = Date.now();
      }
    };
    r.onresult = (event: any) => {
      // Ignore results captured during TTS playback (echo feedback)
      if (isSpeakingRef.current) {
        console.log('[VoiceNav] Ignoring result during TTS playback');
        return;
      }
      gotResultThisSession = true;
      lastActivityAtRef.current = Date.now();
      silencePromptSpokenRef.current = false;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.trim();
        if (!transcript) continue;
        if (!event.results[i].isFinal) {
          setLastHeard(`... ${transcript}`);
          console.log('[VoiceNav] Interim:', transcript);
          continue;
        }
        console.log('[VoiceNav] Final transcript:', transcript);
        let matched: NavCommand | null = null;
        for (let alt = 0; alt < event.results[i].length; alt++) {
          const t = event.results[i][alt].transcript.trim();
          if (!t) continue;
          const cmd = matchNavCommand(t);
          if (cmd.action !== 'unknown') { matched = cmd; break; }
        }
        if (matched) {
          dispatchCommand(matched);
        } else {
          setLastHeard(`"${transcript}" — no match`);
          console.log('[VoiceNav] No command match for:', transcript);
          if (onUnknownRef.current) onUnknownRef.current(transcript);
        }
      }
    };
    r.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;

      // Don't restart if stopped
      if (!shouldListenRef.current) return;

      // Speak the silence prompt only after 15s of real inactivity
      // (from TTS stop or last detected speech).
      if (silencePromptEnabledRef.current && !gotResultThisSession) {
        const now = Date.now();
        const hasInactivityWindow =
          lastActivityAtRef.current > 0 && now - lastActivityAtRef.current >= 15000;
        if (!silencePromptSpokenRef.current && hasInactivityWindow) {
          console.log('[VoiceNav] No speech detected — prompting user');
          void speakRef.current('hello are you still there ?? please say the command to proceed');
          silencePromptSpokenRef.current = true;
        }
      } else {
        silencePromptSpokenRef.current = false;
      }

      // Always restart listening
      const restartDelay = isSpeakingRef.current ? 600 : 300;
      console.log('[VoiceNav] SpeechRecognition ended — restarting in', restartDelay, 'ms');
      restartTimerRef.current = setTimeout(startOnce, restartDelay);
    };
    r.onerror = (ev: any) => {
      console.error('[VoiceNav] SpeechRecognition error:', ev.error);
      setIsListening(false);

      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        console.warn('[VoiceNav] Mic blocked');
        setError('Microphone access denied. Please allow mic access in browser settings.');
        return;
      }

      if (ev.error === 'no-speech' || ev.error === 'aborted') {
        // Let onend handle restart to avoid double-trigger
        return;
      }

      if (ev.error === 'audio-capture') {
        setError('Microphone not detected or busy.');
      } else if (ev.error === 'network') {
        setError('Speech recognition network error.');
      } else {
        console.warn('[VoiceNav]', ev.error);
      }

      if (shouldListenRef.current) {
        restartTimerRef.current = setTimeout(startOnce, 1200);
      }
    };
    try {
      r.start();
      recognitionRef.current = r;
    } catch (err) {
      console.error('[VoiceNav] Failed to start SpeechRecognition:', err);
      if (shouldListenRef.current) restartTimerRef.current = setTimeout(startOnce, 500);
    }
  }, [dispatchCommand]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    lastActivityAtRef.current = 0;
    silencePromptSpokenRef.current = false;
    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    console.log('[VoiceNav] startListening called, enabled:', shouldListenRef.current);
    shouldListenRef.current = true;
    startOnce();
  }, [startOnce]);

  useEffect(() => {
    if (enabled) startListening();
    else stopListening();
    return stopListening;
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isListening, lastCommand, lastHeard, error, startListening, stopListening };
}
