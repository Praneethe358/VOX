/**
 * ModeIndicator — Shows current voice mode (COMMAND vs DICTATING vs PAUSED …)
 * and live microphone waveform animation with a prominent listening badge.
 * Fully display-only.  No interactive elements.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { VoiceSystemState } from '../../context/VoiceContext';

interface ModeIndicatorProps {
  voiceState: VoiceSystemState;
  isListening: boolean;
  interimText?: string;
}

const MODE_LABELS: Partial<Record<VoiceSystemState, string>> = {
  COMMAND_MODE: '🎤 COMMAND MODE',
  DICTATION_MODE: '🔴 DICTATING',
  PAUSE_MODE: '⏸ EXAM PAUSED',
  SUBMISSION_GATE: '⚠️ CONFIRM SUBMISSION',
  ANSWER_REVIEW: '📖 REVIEWING ANSWER',
  EXAM_BRIEFING: '📋 EXAM BRIEFING',
  FACE_AUTH: '👁 FACE SCAN',
  FINALIZE: '✅ SUBMITTING',
  LOCKED: '🔒 LOCKED',
};

const MODE_COLORS: Partial<Record<VoiceSystemState, string>> = {
  COMMAND_MODE: 'from-indigo-600/30 to-indigo-900/30 border-indigo-500/50',
  DICTATION_MODE: 'from-red-600/30 to-red-900/30 border-red-500/60',
  PAUSE_MODE: 'from-yellow-600/30 to-yellow-900/30 border-yellow-500/50',
  SUBMISSION_GATE: 'from-orange-600/30 to-orange-900/30 border-orange-500/60',
  ANSWER_REVIEW: 'from-teal-600/30 to-teal-900/30 border-teal-500/50',
  EXAM_BRIEFING: 'from-blue-600/30 to-blue-900/30 border-blue-500/50',
  FACE_AUTH: 'from-purple-600/30 to-purple-900/30 border-purple-500/50',
  FINALIZE: 'from-green-600/30 to-green-900/30 border-green-500/50',
  LOCKED: 'from-red-800/30 to-red-950/30 border-red-700/60',
};

const BAR_COUNT = 12;

export default function ModeIndicator({
  voiceState,
  isListening,
  interimText,
}: ModeIndicatorProps) {
  const label = MODE_LABELS[voiceState] ?? voiceState;
  const color = MODE_COLORS[voiceState] ?? 'from-slate-600/30 to-slate-900/30 border-slate-500/50';

  return (
    <div
      className={`bg-gradient-to-r ${color} border rounded-xl px-5 py-3 flex flex-col gap-2`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {/* Mode label + listening badge + bars */}
      <div className="flex items-center gap-3">
        <span className="text-white font-bold text-lg tracking-wide select-none">{label}</span>

        {/* Pulsing listening badge */}
        <AnimatePresence>
          {isListening && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5 bg-green-500/20 border border-green-400/40 rounded-full px-3 py-1"
            >
              {/* Pulsing dot */}
              <motion.span
                className="inline-block w-2.5 h-2.5 rounded-full bg-green-400"
                animate={{ opacity: [1, 0.3, 1], scale: [1, 0.85, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <span className="text-green-300 text-xs font-semibold tracking-wide">
                Listening…
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Not listening badge */}
        <AnimatePresence>
          {!isListening && voiceState !== 'PAUSE_MODE' && voiceState !== 'LOCKED' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 bg-slate-500/10 border border-slate-500/20 rounded-full px-3 py-1"
            >
              <span className="inline-block w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-slate-400 text-xs font-medium">Mic off</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated waveform bars */}
        {isListening && (
          <div className="flex items-end gap-[3px] h-5 ml-auto" aria-hidden="true">
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <motion.div
                key={i}
                className={`w-[3px] rounded-full ${
                  voiceState === 'DICTATION_MODE' ? 'bg-red-400' : 'bg-indigo-400'
                }`}
                animate={{
                  height: [
                    `${6 + Math.sin(i * 0.8) * 4}px`,
                    `${10 + Math.sin(i * 1.4 + 1) * 8}px`,
                    `${6 + Math.sin(i * 0.8) * 4}px`,
                  ],
                }}
                transition={{
                  duration: 0.6 + i * 0.05,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: i * 0.04,
                }}
              />
            ))}
          </div>
        )}

        {/* Static dots when not listening */}
        {!isListening && voiceState !== 'PAUSE_MODE' && voiceState !== 'LOCKED' && (
          <div className="flex items-end gap-[3px] h-5 ml-auto opacity-30" aria-hidden="true">
            {Array.from({ length: BAR_COUNT }).map((_, i) => (
              <div key={i} className="w-[3px] h-[6px] rounded-full bg-slate-400" />
            ))}
          </div>
        )}
      </div>

      {/* Real-time interim transcript — shows what mic is hearing right now */}
      <AnimatePresence>
        {isListening && interimText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="text-slate-400 text-sm italic truncate">
              <span className="text-slate-500 text-xs mr-1.5 not-italic">hearing:</span>
              "{interimText}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
