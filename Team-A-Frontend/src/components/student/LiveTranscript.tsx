/**
 * LiveTranscript — Real-time visual display of speech-to-text during answer dictation.
 *
 * Shows:
 *  • Confirmed text (finalText) — bright white, word-by-word as Web Speech API confirms it
 *  • Interim text — dimmed & italic, showing what's being heard right now
 *  • Recording indicator with pulsing dot
 *  • Word / character counter
 *  • Animated entrance for each confirmed word
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo } from 'react';

interface LiveTranscriptProps {
  finalText: string;
  interimText: string;
  isRecording: boolean;
}

export default function LiveTranscript({
  finalText,
  interimText,
  isRecording,
}: LiveTranscriptProps) {
  const wordCount = useMemo(
    () => (finalText.trim() ? finalText.trim().split(/\s+/).length : 0),
    [finalText],
  );

  const isEmpty = !finalText.trim() && !interimText.trim();

  return (
    <AnimatePresence>
      <motion.div
        key="live-transcript"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.25 }}
        className="bg-gradient-to-br from-red-950/60 to-slate-900/80 border border-red-500/30 rounded-2xl p-5"
        role="region"
        aria-label="Live speech transcript"
        aria-live="polite"
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {/* Pulsing record dot */}
            {isRecording && (
              <motion.span
                className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            )}
            <span className="text-red-300 font-semibold text-sm tracking-wide uppercase">
              {isRecording ? 'Listening…' : 'Processing…'}
            </span>
          </div>

          {wordCount > 0 && (
            <span className="text-slate-400 text-xs font-mono">
              {wordCount} word{wordCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Transcript body */}
        <div className="min-h-[60px] max-h-48 overflow-y-auto rounded-lg bg-slate-900/50 px-4 py-3">
          {isEmpty ? (
            <motion.p
              className="text-slate-500 italic text-sm select-none"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              Speak your answer now…
            </motion.p>
          ) : (
            <p className="text-white leading-relaxed text-base">
              {/* Confirmed text */}
              {finalText && (
                <span>{finalText}</span>
              )}
              {/* Interim (in-flight) text */}
              {interimText && (
                <motion.span
                  key={interimText.slice(-20)}
                  initial={{ opacity: 0.4 }}
                  animate={{ opacity: 0.75 }}
                  className="text-red-200/70 italic ml-1"
                  aria-hidden="true"
                >
                  {interimText}
                </motion.span>
              )}
            </p>
          )}
        </div>

        {/* Footer hint */}
        <p className="text-slate-500 text-xs mt-2 select-none">
          Speak naturally — recording stops after 10 seconds of silence · Say{' '}
          <span className="font-mono text-slate-400">"stop dictating"</span> to stop early
        </p>
      </motion.div>
    </AnimatePresence>
  );
}
