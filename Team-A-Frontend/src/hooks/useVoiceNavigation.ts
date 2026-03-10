/**
 * useVoiceNavigation — Voice-driven page navigation for non-exam pages.
 *
 * Uses continuous = FALSE + auto-restart pattern (more reliable in Chrome
 * than continuous = true which silently stops firing results).
 * Returns lastHeard for visible feedback so user knows mic is working.
 *
 * Pauses recognition while TTS is speaking to avoid echo feedback.
 * Falls back to backend Whisper STT when Web Speech API is unavailable.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVoiceContext } from '../context/VoiceContext';
import apiService from '../services/student/api.service';

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

// Known Whisper hallucinations — phantom text generated from silence/ambient noise
const WHISPER_HALLUCINATIONS = new Set([
  'you', 'thank you', 'thanks for watching', 'the', 'bye',
  'hmm', 'um', 'uh', 'ah', 'oh', 'so', 'yeah', 'okay',
  'thank you for watching', 'thanks for listening',
  'subscribe', 'like and subscribe',
  'i', 'a', 'the end', 'silence',
]);

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
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceNavigation(options: UseVoiceNavigationOptions = {}) {
  const { enabled = true, onCommand, onUnknownCommand, pageName = 'this page' } = options;
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
  const isSpeakingRef      = useRef(false);
  const usingBackendRef    = useRef(false);
  const mediaStreamRef     = useRef<MediaStream | null>(null);
  const backendTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveFailuresRef = useRef(0);
  const MAX_FAILURES     = 3;

  shouldListenRef.current  = enabled;
  onCommandRef.current     = onCommand;
  onUnknownRef.current     = onUnknownCommand;
  navigateRef.current      = navigate;
  speakRef.current         = speak;
  playBeepRef.current      = playBeep;
  pageNameRef.current      = pageName;

  // Keep isSpeakingRef in sync so recognition pauses during TTS
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);

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

  // ── Backend Whisper STT fallback ───────────────────────────────────────────

  const startBackendSttLoop = useCallback(async () => {
    console.log('[VoiceNav] Starting backend Whisper STT fallback loop');
    usingBackendRef.current = true;

    try {
      if (!mediaStreamRef.current) {
        mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('[VoiceNav] Mic stream acquired for backend STT');
      }
    } catch (err) {
      console.error('[VoiceNav] Mic permission denied for backend STT:', err);
      setError('Microphone blocked. Allow mic access in browser settings.');
      usingBackendRef.current = false;
      return;
    }

    const runOneChunk = async () => {
      if (!shouldListenRef.current || !usingBackendRef.current || !mediaStreamRef.current) return;

      // Pause while TTS is speaking to avoid echo
      if (isSpeakingRef.current) {
        backendTimerRef.current = setTimeout(runOneChunk, 400);
        return;
      }

      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType: 'audio/webm' });

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        if (!shouldListenRef.current || !usingBackendRef.current) return;
        try {
          const blob = new Blob(chunks, { type: 'audio/webm' });
          console.log('[VoiceNav] Sending', blob.size, 'bytes to backend STT');
          const result = await apiService.convertCommandToText(blob);
          const raw = (result?.text ?? '').trim();
          console.log('[VoiceNav] Backend STT result:', raw || '(empty)');
          // Filter out Whisper hallucinations (phantom text from silence/noise)
          const normalized = raw.toLowerCase().replace(/[^\w\s]/g, '').trim();
          if (raw && normalized.length >= 3 && !WHISPER_HALLUCINATIONS.has(normalized)) {
            setLastHeard(raw);
            const cmd = matchNavCommand(raw);
            if (cmd.action !== 'unknown') {
              dispatchCommand(cmd);
            } else {
              setLastHeard(`"${raw}" — no match`);
              if (onUnknownRef.current) onUnknownRef.current(raw);
            }
          } else if (raw) {
            console.log('[VoiceNav] Ignoring hallucination/noise:', raw);
          }
        } catch (err) {
          console.error('[VoiceNav] Backend STT error:', err);
        }
        if (shouldListenRef.current && usingBackendRef.current) {
          backendTimerRef.current = setTimeout(runOneChunk, 250);
        }
      };

      try {
        recorder.start();
        setIsListening(true);
        setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop(); }, 3500);
      } catch (err) {
        console.error('[VoiceNav] Recorder start failed:', err);
        setIsListening(false);
      }
    };

    await runOneChunk();
  }, [dispatchCommand]);

  // ── Web Speech API primary recognition ─────────────────────────────────────

  const startOnce = useCallback(() => {
    if (!shouldListenRef.current) return;

    // If already using backend STT, don't restart browser recognition
    if (usingBackendRef.current) {
      console.log('[VoiceNav] Already using backend STT, skipping browser recognition');
      return;
    }

    // Delay start while TTS is speaking to prevent echo feedback
    if (isSpeakingRef.current) {
      console.log('[VoiceNav] TTS speaking — delaying recognition start');
      restartTimerRef.current = setTimeout(startOnce, 400);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      console.warn('[VoiceNav] SpeechRecognition not supported — falling back to backend Whisper');
      setError('Browser speech recognition unavailable. Using backend Whisper.');
      void startBackendSttLoop();
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
    };
    r.onresult = (event: any) => {
      // Ignore results captured during TTS playback (echo feedback)
      if (isSpeakingRef.current) {
        console.log('[VoiceNav] Ignoring result during TTS playback');
        return;
      }
      gotResultThisSession = true;
      consecutiveFailuresRef.current = 0;
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

      // Don't restart if stopped or already switched to backend
      if (!shouldListenRef.current || usingBackendRef.current) return;

      // Track consecutive failures for backoff + fallback
      if (!gotResultThisSession) {
        consecutiveFailuresRef.current++;
      } else {
        consecutiveFailuresRef.current = 0;
      }

      // Fall back to Whisper after too many consecutive failures
      if (consecutiveFailuresRef.current >= MAX_FAILURES) {
        console.warn('[VoiceNav] SpeechRecognition failed', consecutiveFailuresRef.current,
          'times — falling back to backend Whisper STT');
        setError('Browser speech recognition not capturing audio. Switching to backend Whisper.');
        void startBackendSttLoop();
        return;
      }

      // Exponential backoff: 300ms, 600ms, 1200ms … capped at 3000ms
      const baseDelay = isSpeakingRef.current ? 600 : 300;
      const backoffDelay = Math.min(baseDelay * Math.pow(2, consecutiveFailuresRef.current), 3000);
      console.log('[VoiceNav] SpeechRecognition ended — restarting in', backoffDelay, 'ms',
        consecutiveFailuresRef.current > 0 ? `(failures: ${consecutiveFailuresRef.current})` : '');
      restartTimerRef.current = setTimeout(startOnce, backoffDelay);
    };
    r.onerror = (ev: any) => {
      console.error('[VoiceNav] SpeechRecognition error:', ev.error);
      setIsListening(false);

      if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
        console.warn('[VoiceNav] Mic blocked — falling back to backend Whisper');
        setError('Browser mic blocked. Switching to backend Whisper.');
        void startBackendSttLoop();
        return;
      }

      // Count ALL errors toward the fallback threshold
      consecutiveFailuresRef.current++;

      if (ev.error === 'no-speech' || ev.error === 'aborted') {
        // Let onend handle restart/fallback to avoid double-trigger
        return;
      }

      if (ev.error === 'audio-capture') {
        setError('Microphone not detected or busy. Switching to backend recognition...');
      } else if (ev.error === 'network') {
        setError('Speech recognition network error. Using backend Whisper.');
      } else {
        console.warn('[VoiceNav]', ev.error);
      }

      // Fall back to Whisper on persistent errors
      if (consecutiveFailuresRef.current >= MAX_FAILURES) {
        console.warn('[VoiceNav] Persistent errors — switching to backend Whisper STT');
        void startBackendSttLoop();
        return;
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
  }, [dispatchCommand, startBackendSttLoop]);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    usingBackendRef.current = false;
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    if (backendTimerRef.current) { clearTimeout(backendTimerRef.current); backendTimerRef.current = null; }
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} recognitionRef.current = null; }
    if (mediaStreamRef.current) { mediaStreamRef.current.getTracks().forEach(t => t.stop()); mediaStreamRef.current = null; }
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
