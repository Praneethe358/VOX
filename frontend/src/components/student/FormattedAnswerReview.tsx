/**
 * FormattedAnswerReview — Displays formatted AI answer and listens for
 * "Confirm answer", "Edit answer", or "Continue dictation".
 * Display-only — all interaction happens through voice.
 */

import { motion } from 'framer-motion';

interface FormattedAnswerReviewProps {
  rawText: string;
  formattedText: string;
  isFormatting: boolean;
  formatError: string | null;
  questionNumber: number;
}

export default function FormattedAnswerReview({
  rawText,
  formattedText,
  isFormatting,
  formatError,
  questionNumber,
}: FormattedAnswerReviewProps) {
  const displayText = formattedText || rawText;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="bg-gradient-to-br from-teal-900/40 to-slate-900/60 border border-teal-500/40 rounded-2xl p-6 space-y-5"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">📖</span>
        <div>
          <h3 className="text-white font-bold text-lg">Your Answer — Question {questionNumber}</h3>
          <p className="text-teal-300/70 text-sm">
            {isFormatting ? 'AI is formatting your answer…' : formatError ? 'Using raw transcript (AI unavailable)' : 'Formatted by AI'}
          </p>
        </div>
        {isFormatting && (
          <div className="ml-auto">
            <motion.div
              className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-transparent"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            />
          </div>
        )}
      </div>

      {/* Answer text */}
      <div className="bg-slate-800/50 rounded-xl p-4 min-h-[100px]">
        {isFormatting ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                className="h-4 bg-slate-700/60 rounded"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                style={{ width: `${70 + i * 10}%` }}
              />
            ))}
          </div>
        ) : (
          <p className="text-white text-lg leading-relaxed whitespace-pre-wrap" tabIndex={-1}>
            {displayText || <span className="text-slate-500 italic">No answer recorded.</span>}
          </p>
        )}
      </div>

      {/* Voice commands reminder */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { cmd: '"Confirm answer"', icon: '✅', desc: 'Save this answer' },
          { cmd: '"Edit answer"',    icon: '✏️', desc: 'Replace & re-dictate' },
          { cmd: '"Continue dictation"', icon: '➕', desc: 'Append more' },
        ].map(item => (
          <div
            key={item.cmd}
            className="bg-slate-800/40 border border-slate-600/30 rounded-lg p-3 text-center"
          >
            <div className="text-2xl mb-1" aria-hidden="true">{item.icon}</div>
            <p className="text-teal-300 font-mono text-xs font-semibold">{item.cmd}</p>
            <p className="text-slate-400 text-[11px] mt-0.5">{item.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
