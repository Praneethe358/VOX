/**
 * QuestionDisplay.tsx - Display individual exam question with formatting
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { Question } from '../../types/student/exam.types';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  isFlagged: boolean;
  onFlag: () => void;
  onReadQuestion: () => void;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  isFlagged,
  onFlag,
  onReadQuestion,
}: QuestionDisplayProps) {
  const [timeSpent, setTimeSpent] = useState(0);

  // Track time spent on this question
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [question.questionId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const renderQuestionText = (text: string) => {
    // Replace markdown-like formatting
    return text
      .split('\n')
      .map((line, idx) => (
        <p key={idx} className="mb-2 last:mb-0">
          {line}
        </p>
      ));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Question Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block px-3 py-1 bg-indigo-500 text-white text-sm font-semibold rounded-full">
              Q {questionNumber}/{totalQuestions}
            </span>
            {question.marks && (
              <span className="text-sm text-slate-400">
                {question.marks} mark{question.marks > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white leading-relaxed">
            {question.text}
          </h2>
        </div>

        <div className="flex gap-2 ml-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onReadQuestion}
            title="Read question aloud (Voice command: 2)"
            className="p-2 bg-slate-700 hover:bg-slate-600 text-indigo-400 rounded-lg transition-colors"
          >
            🔊
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onFlag}
            title={`${isFlagged ? 'Unflag' : 'Flag'} for review`}
            className={`p-2 rounded-lg transition-colors ${
              isFlagged
                ? 'bg-yellow-500/30 text-yellow-400'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-400'
            }`}
          >
            {isFlagged ? '🚩' : '🏁'}
          </motion.button>
        </div>
      </div>

      {/* Question Details */}
      {question.sectionId && (
        <div className="text-xs text-slate-400">
          Section: <span className="text-slate-300 font-medium">{question.sectionId}</span>
        </div>
      )}

      {/* Question Options - Not in current Question type, would need extension */}

      {/* Question Stats Footer */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-4 border-t border-slate-700">
        <span>Time spent: {formatTime(timeSpent)}</span>
        <span>Difficulty: <strong>{question.difficulty}</strong></span>
      </div>

      {/* Accessibility Note */}
      <div className="bg-slate-900/50 rounded p-3 text-xs text-slate-400">
        <p>
          💡 <strong>Tip:</strong> Use voice commands for hands-free navigation.
          Press <strong>2</strong> to hear the question read aloud.
        </p>
      </div>
    </motion.div>
  );
}

export default QuestionDisplay;
