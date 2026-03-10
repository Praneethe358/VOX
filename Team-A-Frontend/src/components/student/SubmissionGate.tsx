/**
 * SubmissionGate — Visual countdown during double-confirm submission window.
 * Shown when voiceState = SUBMISSION_GATE.
 * Purely display; action comes from voice command engine.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface SubmissionGateProps {
  /** Seconds allocated for confirmation. Default 20. */
  windowSeconds?: number;
  /** Called when the window expires without confirmation. */
  onTimeout: () => void;
}

export default function SubmissionGate({
  windowSeconds = 20,
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
      <div className="bg-gradient-to-br from-orange-900/90 to-slate-900/90 border border-orange-500/60 rounded-2xl p-10 max-w-md w-full mx-4 flex flex-col items-center gap-6 shadow-2xl">
        <div className="text-6xl select-none" aria-hidden="true">⚠️</div>

        <h2 className="text-white text-2xl font-bold text-center">
          Submit Exam?
        </h2>
        <p className="text-orange-200 text-center text-lg leading-relaxed">
          Say{' '}
          <span className="font-bold text-orange-300 bg-orange-500/20 px-2 py-0.5 rounded">
            "Confirm submission"
          </span>{' '}
          to finalize. Anything else will cancel.
        </p>

        {/* Countdown bar */}
        <div className="w-full">
          <div className="flex justify-between text-sm text-orange-300/70 mb-1">
            <span>Canceling in</span>
            <span className="font-mono font-bold text-orange-300">{remaining}s</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'linear' }}
            />
          </div>
        </div>

        <p className="text-slate-400 text-sm text-center">
          Silence or any other command will return to your exam.
        </p>
      </div>
    </motion.div>
  );
}
