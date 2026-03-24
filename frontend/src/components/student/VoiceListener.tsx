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
  const barColor = active ? 'var(--accent-lt)' : 'var(--text-muted)';
  return (
    <div className="flex items-center gap-[2px] h-5" aria-hidden="true">
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          style={{
            background: barColor,
            width: '3px',
            borderRadius: '2px',
          }}
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

const MODE_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  Navigation: { 
    bg: 'rgba(45, 78, 232, 0.12)',
    text: 'var(--accent-lt)',
    dot: 'var(--accent-lt)',
    border: 'rgba(45, 78, 232, 0.2)'
  },
  Command: {
    bg: 'rgba(45, 78, 232, 0.12)',
    text: 'var(--accent-lt)',
    dot: 'var(--accent-lt)',
    border: 'rgba(45, 78, 232, 0.2)'
  },
  Dictation: {
    bg: 'rgba(217, 119, 6, 0.12)',
    text: 'var(--amber-lt)',
    dot: 'var(--amber-lt)',
    border: 'rgba(217, 119, 6, 0.2)'
  },
  Paused: {
    bg: 'rgba(217, 119, 6, 0.12)',
    text: 'var(--amber-lt)',
    dot: 'var(--amber-lt)',
    border: 'rgba(217, 119, 6, 0.2)'
  },
  Idle: {
    bg: 'rgba(255, 255, 255, 0.04)',
    text: 'var(--text-muted)',
    dot: 'var(--text-muted)',
    border: 'rgba(255, 255, 255, 0.08)'
  },
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
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5 border" style={{
          background: 'var(--surface2)',
          borderColor: 'var(--border)',
          backdropFilter: 'blur(10px)',
        }}>
          <motion.div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: isListening ? style.dot : 'var(--text-muted)',
            }}
            animate={isListening ? { scale: [1, 1.4, 1] } : {}}
            transition={isListening ? { duration: 1.2, repeat: Infinity } : {}}
          />
          <span className="text-xs font-medium" style={{
            color: isListening ? style.text : 'var(--text-muted)'
          }}>
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
        className="rounded-xl shadow-lg overflow-hidden"
        style={{
          background: style.bg,
          border: `1px solid ${style.border}`,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Main status bar */}
        <div className="flex items-center gap-3 px-4 py-2.5">
          {/* Pulsing mic icon */}
          <div className="relative">
            <motion.div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: isListening ? style.dot : 'var(--text-muted)',
              }}
              animate={isListening ? { scale: [1, 1.5, 1], opacity: [1, 0.6, 1] } : {}}
              transition={isListening ? { duration: 1.5, repeat: Infinity } : {}}
            />
          </div>

          {/* Mode label */}
          <span className="text-xs font-bold uppercase tracking-widest" style={{
            color: style.text
          }}>
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
              className="px-4 py-1.5"
              style={{
                borderTop: `1px solid ${style.border}`,
                background: 'rgba(255, 255, 255, 0.02)',
              }}
            >
              <p className="text-xs truncate max-w-[300px] italic" style={{
                color: 'var(--text-sec)'
              }}>
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
