/**
 * VoiceCommandEngine — Centralized voice command processor overlay.
 *
 * Shows real-time command recognition feedback:
 *   - Detected command name + icon
 *   - Confidence score bar
 *   - Listening / processing / error states
 *   - Available command hints
 *
 * Designed to sit as a fixed overlay on any student page.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NavCommand } from '../../hooks/useVoiceNavigation';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CommandHint {
  command: string;
  icon: string;
  description: string;
}

interface VoiceCommandEngineProps {
  /** Whether listening is active */
  isListening: boolean;
  /** Last recognized command */
  lastCommand: NavCommand | null;
  /** Command hints to display */
  hints?: CommandHint[];
  /** Whether to show expanded hint panel */
  showHints?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Position on screen */
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right';
}

// ─── Default command hints ───────────────────────────────────────────────────

const DEFAULT_HINTS: CommandHint[] = [
  { command: '"Go to dashboard"',  icon: '🏠', description: 'Navigate to dashboard' },
  { command: '"Take exam"',        icon: '📝', description: 'Browse exams' },
  { command: '"View results"',     icon: '📊', description: 'See your results' },
  { command: '"Settings"',         icon: '⚙️', description: 'Open settings' },
  { command: '"Go back"',          icon: '⬅️', description: 'Previous page' },
  { command: '"Help"',             icon: '❓', description: 'List all commands' },
  { command: '"Logout"',           icon: '🚪', description: 'Sign out' },
];

// ─── Position styles ─────────────────────────────────────────────────────────

const POSITION_CLASSES: Record<string, string> = {
  'bottom-right':  'fixed bottom-4 right-4',
  'bottom-left':   'fixed bottom-4 left-4',
  'bottom-center': 'fixed bottom-4 left-1/2 -translate-x-1/2',
  'top-right':     'fixed top-20 right-4',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function VoiceCommandEngine({
  isListening,
  lastCommand,
  hints = DEFAULT_HINTS,
  showHints = false,
  error = null,
  position = 'bottom-right',
}: VoiceCommandEngineProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [hintsExpanded, setHintsExpanded] = useState(showHints);

  // Show feedback briefly when command arrives
  useEffect(() => {
    if (lastCommand && lastCommand.action !== 'unknown') {
      setShowFeedback(true);
      const t = setTimeout(() => setShowFeedback(false), 2500);
      return () => clearTimeout(t);
    }
  }, [lastCommand]);

  const confidenceColor = (c: number) =>
    c >= 0.8 ? 'bg-green-500' : c >= 0.5 ? 'bg-yellow-500' : 'bg-red-500';

  const actionLabel = (action: string) => {
    const labels: Record<string, string> = {
      go_dashboard: '🏠 Dashboard',
      go_exams:     '📝 Exams',
      go_results:   '📊 Results',
      go_settings:  '⚙️ Settings',
      go_back:      '⬅️ Back',
      logout:       '🚪 Logout',
      select_exam:  '📋 Select Exam',
      help:         '❓ Help',
    };
    return labels[action] ?? action;
  };

  return (
    <div
      className={`${POSITION_CLASSES[position]} z-50 flex flex-col items-end gap-2`}
      role="status"
      aria-live="polite"
      aria-label="Voice command engine status"
    >
      {/* Command feedback toast */}
      <AnimatePresence>
        {showFeedback && lastCommand && lastCommand.action !== 'unknown' && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="bg-slate-800/95 backdrop-blur border border-indigo-500/40 rounded-xl px-4 py-3 shadow-xl min-w-[200px]"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{actionLabel(lastCommand.action).split(' ')[0]}</span>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">
                  {actionLabel(lastCommand.action)}
                </p>
                <p className="text-slate-400 text-xs font-mono">"{lastCommand.raw}"</p>
              </div>
            </div>
            {/* Confidence bar */}
            <div className="mt-2 w-full h-1.5 rounded-full bg-slate-700 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lastCommand.confidence * 100}%` }}
                className={`h-full rounded-full ${confidenceColor(lastCommand.confidence)}`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-red-900/80 backdrop-blur border border-red-500/40 rounded-xl px-4 py-2 text-red-200 text-sm max-w-[280px]"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hints panel */}
      <AnimatePresence>
        {hintsExpanded && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="bg-slate-800/95 backdrop-blur border border-slate-700/50 rounded-xl p-3 shadow-xl min-w-[240px]"
          >
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-2 font-semibold">
              Voice Commands
            </p>
            <div className="space-y-1.5">
              {hints.map((hint) => (
                <div
                  key={hint.command}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{hint.icon}</span>
                  <span className="text-indigo-300 font-mono text-xs">{hint.command}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mic status button */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setHintsExpanded(h => !h)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 transition-colors ${
          isListening
            ? 'bg-indigo-600 border-indigo-400 shadow-indigo-500/30'
            : 'bg-slate-800 border-slate-600 shadow-slate-900/30'
        }`}
        aria-label={isListening ? 'Microphone active - tap for command hints' : 'Microphone inactive - tap for command hints'}
      >
        {/* Animated pulse ring when listening */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-indigo-400"
            animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
        <span className="text-2xl relative z-10">{isListening ? '🎙️' : '🔇'}</span>
      </motion.button>
    </div>
  );
}

export default VoiceCommandEngine;
export type { CommandHint };
