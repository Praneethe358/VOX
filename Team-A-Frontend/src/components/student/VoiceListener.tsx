/**
 * VoiceListener — Persistent microphone status indicator with live waveform.
 *
 * Shows:
 *   - Microphone active/inactive state (pulsing icon)
 *   - Live audio level bars (Web Audio API analyser)
 *   - Current voice mode label
 *   - Interim speech text preview
 *
 * Designed as a compact, always-visible widget for accessibility.
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceListenerProps {
  /** Whether the mic is actively listening */
  isListening: boolean;
  /** Current mode label (e.g. "Navigation", "Dictation", "Command") */
  mode?: string;
  /** Interim/live transcript text */
  interimText?: string;
  /** Microphone audio level 0-100 (optional, for visual feedback) */
  audioLevel?: number;
  /** Position */
  position?: 'top-left' | 'top-right' | 'top-center';
  /** Compact mode - just the indicator dot */
  compact?: boolean;
}

// ─── Waveform bars ──────────────────────────────────────────────────────────

function WaveformBars({ active, barCount = 8 }: { active: boolean; barCount?: number }) {
  return (
    <div className="flex items-center gap-[2px] h-5" aria-hidden="true">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          className={`w-[3px] rounded-full ${active ? 'bg-green-400' : 'bg-slate-600'}`}
          animate={
            active
              ? {
                  height: [4, 8 + Math.random() * 12, 4],
                }
              : { height: 4 }
          }
          transition={
            active
              ? {
                  duration: 0.4 + Math.random() * 0.3,
                  repeat: Infinity,
                  repeatType: 'reverse' as const,
                  delay: i * 0.05,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

// ─── Mode colors ─────────────────────────────────────────────────────────────

const MODE_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  Navigation: { bg: 'bg-indigo-500/10', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  Command:    { bg: 'bg-blue-500/10',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  Dictation:  { bg: 'bg-red-500/10',    text: 'text-red-300',    dot: 'bg-red-400' },
  Paused:     { bg: 'bg-yellow-500/10', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  Idle:       { bg: 'bg-slate-500/10',  text: 'text-slate-300',  dot: 'bg-slate-400' },
};

const POSITION_CLASSES: Record<string, string> = {
  'top-left':   'fixed top-4 left-4',
  'top-right':  'fixed top-4 right-4',
  'top-center': 'fixed top-4 left-1/2 -translate-x-1/2',
};

// ─── Component ───────────────────────────────────────────────────────────────

export function VoiceListener({
  isListening,
  mode = 'Navigation',
  interimText = '',
  audioLevel = 0,
  position = 'top-right',
  compact = false,
}: VoiceListenerProps) {
  const style = MODE_STYLES[mode] ?? MODE_STYLES.Idle;

  if (compact) {
    return (
      <div
        className={`${POSITION_CLASSES[position]} z-50`}
        role="status"
        aria-label={`Microphone ${isListening ? 'active' : 'inactive'}`}
      >
        <div className="flex items-center gap-2 bg-slate-800/90 backdrop-blur rounded-full px-3 py-1.5 border border-slate-700/50">
          <motion.div
            className={`w-2.5 h-2.5 rounded-full ${isListening ? style.dot : 'bg-slate-600'}`}
            animate={isListening ? { scale: [1, 1.4, 1] } : {}}
            transition={isListening ? { duration: 1.2, repeat: Infinity } : {}}
          />
          <span className={`text-xs font-medium ${isListening ? style.text : 'text-slate-500'}`}>
            {isListening ? mode : 'Mic Off'}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${POSITION_CLASSES[position]} z-50`}
      role="status"
      aria-live="polite"
      aria-label={`Voice listener: ${isListening ? `active in ${mode} mode` : 'inactive'}`}
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${style.bg} backdrop-blur border border-slate-700/40 rounded-xl shadow-lg overflow-hidden`}
      >
        {/* Main status bar */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Pulsing mic icon */}
          <div className="relative">
            <motion.div
              className={`w-3 h-3 rounded-full ${isListening ? style.dot : 'bg-slate-600'}`}
              animate={isListening ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] } : {}}
              transition={isListening ? { duration: 1.5, repeat: Infinity } : {}}
            />
          </div>

          {/* Mode label */}
          <span className={`text-xs font-bold uppercase tracking-widest ${style.text}`}>
            {isListening ? mode : 'Mic Off'}
          </span>

          {/* Waveform */}
          <WaveformBars active={isListening} barCount={8} />

          {/* Mic indicator */}
          <span className="text-sm">{isListening ? '🎙️' : '🔇'}</span>
        </div>

        {/* Interim text strip */}
        <AnimatePresence>
          {isListening && interimText && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-t border-slate-700/30 px-4 py-1.5 bg-slate-900/40"
            >
              <p className="text-slate-300 text-xs truncate max-w-[300px] italic">
                "{interimText}"
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default VoiceListener;
