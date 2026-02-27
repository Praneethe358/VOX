/**
 * TimerDisplay — Large prominent timer for exam interface.
 * Pulses red when ≤ 5 minutes remain.
 */

import { motion } from 'framer-motion';

interface TimerDisplayProps {
  remainingSeconds: number;
  isPaused: boolean;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerDisplay({ remainingSeconds, isPaused }: TimerDisplayProps) {
  const isLow = remainingSeconds <= 300;
  const color = isPaused
    ? 'text-yellow-400'
    : isLow
    ? 'text-red-400'
    : 'text-green-400';

  return (
    <div className="flex flex-col items-center gap-1" aria-label={`Time remaining: ${formatTime(remainingSeconds)}`}>
      <span className="text-slate-400 text-xs uppercase tracking-widest">
        {isPaused ? 'PAUSED' : 'Time Remaining'}
      </span>
      <motion.span
        className={`font-mono font-black text-4xl md:text-5xl ${color}`}
        animate={isLow && !isPaused ? { opacity: [1, 0.5, 1], scale: [1, 1.05, 1] } : {}}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        {formatTime(remainingSeconds)}
      </motion.span>
    </div>
  );
}
