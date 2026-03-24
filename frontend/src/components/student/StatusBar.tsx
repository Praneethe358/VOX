/**
 * StatusBar — Top bar: question N/Total | Time | Auto-save indicator | Mode dot.
 * Display-only. No interactive elements.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { VoiceSystemState } from '../../context/VoiceContext';
import VoxLogo from '../branding/VoxLogo';
import ExamIcon from '../icons/ExamIcon';

interface StatusBarProps {
  currentQ: number;
  totalQ: number;
  remainingSeconds: number;
  isSaving: boolean;
  lastSaved: Date | null;
  voiceState: VoiceSystemState;
  examTitle: string;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const STATE_DOT: Record<string, string> = {
  COMMAND_MODE:    'bg-indigo-400',
  DICTATION_MODE:  'bg-red-400',
  PAUSE_MODE:      'bg-yellow-400',
  SUBMISSION_GATE: 'bg-orange-400',
  ANSWER_REVIEW:   'bg-teal-400',
  FINALIZE:        'bg-green-400',
};

export default function StatusBar({
  currentQ,
  totalQ,
  remainingSeconds,
  isSaving,
  lastSaved,
  voiceState,
  examTitle,
}: StatusBarProps) {
  const isLow = remainingSeconds <= 300;
  const dotColor = STATE_DOT[voiceState] ?? 'bg-slate-400';

  return (
    <div className="bg-slate-900/80 backdrop-blur border-b border-slate-700/50 px-6 py-3 flex items-center justify-between gap-4">
      {/* Left: Exam name */}
      <div className="flex items-center gap-3 min-w-0">
        <VoxLogo size="sm" showTagline={false} />
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5">
            <ExamIcon className="h-3.5 w-3.5 text-indigo-300" />
            <span className="text-[11px] text-slate-500 uppercase tracking-[0.18em]">Active Exam</span>
          </div>
          <p className="text-slate-300 text-sm font-medium truncate max-w-xs" title={examTitle}>
            {examTitle}
          </p>
        </div>
      </div>

      {/* Center: Question counter */}
      <div className="flex items-center gap-2">
        <span className="text-white font-bold text-base">
          Q {currentQ} / {totalQ}
        </span>
        <div className="w-32 h-1.5 rounded-full bg-slate-700">
          <motion.div
            className="h-full rounded-full bg-indigo-500"
            animate={{ width: `${(currentQ / Math.max(totalQ, 1)) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Right: Time + save + mode dot */}
      <div className="flex items-center gap-4">
        {/* Timer */}
        <motion.span
          className={`font-mono font-bold text-lg ${isLow ? 'text-red-400' : 'text-green-400'}`}
          animate={isLow ? { opacity: [1, 0.4, 1] } : {}}
          transition={{ duration: 0.8, repeat: Infinity }}
        >
          {formatTime(remainingSeconds)}
        </motion.span>

        {/* Auto-save indicator */}
        <AnimatePresence mode="wait">
          {isSaving ? (
            <motion.span
              key="saving"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-yellow-400 text-xs"
            >
              saving…
            </motion.span>
          ) : lastSaved ? (
            <motion.span
              key="saved"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-green-400 text-xs"
            >
              ✓ saved
            </motion.span>
          ) : null}
        </AnimatePresence>

        {/* Mode dot */}
        <motion.div
          className={`w-2.5 h-2.5 rounded-full ${dotColor}`}
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </div>
    </div>
  );
}
