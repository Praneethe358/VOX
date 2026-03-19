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

  const confidenceColor = (c: number) => {
    if (c >= 0.8) return 'var(--green-lt)';
    if (c >= 0.5) return 'var(--amber-lt)';
    return 'var(--red-lt)';
  };

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
            className="rounded-xl px-4 py-3 shadow-xl min-w-[200px]"
            style={{
              background: 'var(--surface2)',
              border: '1px solid rgba(45, 78, 232, 0.2)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{actionLabel(lastCommand.action).split(' ')[0]}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {actionLabel(lastCommand.action)}
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>"{lastCommand.raw}"</p>
              </div>
            </div>
            {/* Confidence bar */}
            <div className="mt-2 w-full h-1.5 rounded-full overflow-hidden" style={{
              background: 'rgba(255, 255, 255, 0.08)'
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${lastCommand.confidence * 100}%` }}
                className="h-full rounded-full"
                style={{
                  background: confidenceColor(lastCommand.confidence)
                }}
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
            className="rounded-xl px-4 py-2 text-sm max-w-[280px]"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--red-lt)',
            }}
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
            className="rounded-xl p-3 shadow-xl min-w-[240px]"
            style={{
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <p className="text-xs uppercase tracking-wider mb-2 font-semibold" style={{
              color: 'var(--text-muted)'
            }}>
              Voice Commands
            </p>
            <div className="space-y-1.5">
              {hints.map((hint) => (
                <div
                  key={hint.command}
                  className="flex items-center gap-2 text-sm"
                >
                  <span>{hint.icon}</span>
                  <span className="font-mono text-xs" style={{
                    color: 'var(--accent-lt)'
                  }}>{hint.command}</span>
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
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl border-2 transition-colors"
        style={{
          background: isListening ? 'rgba(45, 78, 232, 0.2)' : 'var(--surface2)',
          borderColor: isListening ? 'rgba(45, 78, 232, 0.3)' : 'var(--border)',
          boxShadow: isListening ? '0 0 20px rgba(45, 78, 232, 0.2)' : 'none',
        }}
        aria-label={isListening ? 'Microphone active - tap for command hints' : 'Microphone inactive - tap for command hints'}
      >
        {/* Animated pulse ring when listening */}
        {isListening && (
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: 'rgba(45, 78, 232, 0.4)',
            }}
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
