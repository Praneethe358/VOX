/**
 * SubmissionGate — Final exam submission review with stat blocks.
 * Shown when voiceState = SUBMISSION_GATE.
 * Displays answered/skipped/flagged counts with countdown.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface SubmissionGateProps {
  /** Seconds allocated for confirmation. Default 60. */
  windowSeconds?: number;
  /** Called when the window expires without confirmation. */
  onTimeout: () => void;
}

export default function SubmissionGate({
  windowSeconds = 60,
  onTimeout,
}: SubmissionGateProps) {
  const [remaining, setRemaining] = useState(windowSeconds);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Fire onTimeout as a proper side-effect, not inside a setState updater
  useEffect(() => {
    if (remaining === 0) {
      onTimeoutRef.current();
    }
  }, [remaining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const pct = (remaining / windowSeconds) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-live="assertive"
    >
      <div className="bg-slate-950/95 border border-slate-700/60 rounded-3xl p-8 max-w-lg w-full mx-4 space-y-6 shadow-2xl">
        {/* Warning Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-950/40 border border-red-500/40 rounded-2xl p-4 flex items-start gap-3"
        >
          <span className="text-red-400 text-2xl shrink-0" aria-hidden="true">⚠</span>
          <div>
            <p className="text-red-300 font-semibold text-sm">Are you ready to submit?</p>
            <p className="text-red-400/70 text-xs mt-1">Review your answers before submitting. This action cannot be undone.</p>
          </div>
        </motion.div>

        {/* ► Theme Update (March 2026): Stat boxes now use cyan/indigo/blue palette */}
        {/* Previously used green/orange/pink (emerald/amber/rose) which didn't match platform theme */}
        {/* Now harmonized with dark indigo/blue/slate theme of the platform */}
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          {/* Answered - Cyan (cool blue, represents completion) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-cyan-950/40 border border-cyan-500/40 rounded-xl p-4 text-center"
          >
            <p className="text-cyan-300 text-2xl font-bold">—</p>
            <p className="text-cyan-300/70 text-xs uppercase tracking-wide mt-2 font-medium">Answered</p>
          </motion.div>

          {/* Skipped - Indigo (matches platform accent, represents questions not attempted) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-indigo-950/40 border border-indigo-500/40 rounded-xl p-4 text-center"
          >
            <p className="text-indigo-300 text-2xl font-bold">—</p>
            <p className="text-indigo-300/70 text-xs uppercase tracking-wide mt-2 font-medium">Skipped</p>
          </motion.div>

          {/* Flagged - Blue (platform blue family, represents marked for review) */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-blue-950/40 border border-blue-500/40 rounded-xl p-4 text-center"
          >
            <p className="text-blue-300 text-2xl font-bold">0</p>
            <p className="text-blue-300/70 text-xs uppercase tracking-wide mt-2 font-medium">Flagged</p>
          </motion.div>
        </div>

        {/* Confirmation instruction */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 text-center"
        >
          <p className="text-indigo-300 font-semibold text-sm">
            Say{' '}
            <span className="inline-block font-bold text-indigo-200 bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-500/30 mx-1">
              "Confirm submission"
            </span>
          </p>
          <p className="text-indigo-300/60 text-xs mt-2">Any other command will cancel and return to exam</p>
        </motion.div>

        {/* Countdown timer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="space-y-2"
        >
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">Auto-cancel in</span>
            <span className="font-mono font-bold text-slate-300 text-lg">{remaining}s</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'linear' }}
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
