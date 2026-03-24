/**
 * QuestionDisplay.tsx - Display individual exam question with formatting
 * Supports both MCQ and written (descriptive) questions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Question } from '../../types/student/exam.types';
import { AnswerInputBox } from './AnswerInputBox';

interface QuestionDisplayProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  isFlagged: boolean;
  onFlag: () => void;
  onReadQuestion: () => void;
  // For written answers only
  writtenAnswer?: string;
  onWrittenAnswerChange?: (answer: string) => void;
  isRecordingAnswer?: boolean;
  interimRecordingText?: string;
  formattedAnswer?: string;
  // For MCQ only
  mcqOptions?: string[];
  selectedOption?: number | null;
  onOptionSelect?: (optionIndex: number) => void;
}

export function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  isFlagged,
  onFlag,
  onReadQuestion,
  writtenAnswer = '',
  onWrittenAnswerChange,
  isRecordingAnswer = false,
  interimRecordingText = '',
  formattedAnswer = '',
  mcqOptions = [],
  selectedOption = null,
  onOptionSelect,
}: QuestionDisplayProps) {
  const [timeSpent, setTimeSpent] = useState(0);
  const isWrittenQuestion = question.type === 'descriptive' || question.type === 'numerical';
  const isMCQQuestion = mcqOptions.length > 0 && question.type !== 'descriptive' && question.type !== 'numerical';

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
            {/* Question type badge */}
            <span
              className={`text-xs px-2 py-1 rounded-full font-medium ${
                isMCQQuestion
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-purple-500/20 text-purple-300'
              }`}
            >
              {isMCQQuestion ? 'Multiple Choice' : 'Written Answer'}
            </span>
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
            title="Read question aloud"
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

      {/* MCQ Options Section */}
      <AnimatePresence>
        {isMCQQuestion && mcqOptions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-2"
          >
            {/* <p className="text-sm text-slate-400">Say the option number (1, 2, 3, or 4):</p> */}
            {mcqOptions.map((option, index) => (
              <motion.button
                key={index}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOptionSelect?.(index)}
                className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                  selectedOption === index
                    ? 'border-indigo-500 bg-indigo-500/20 text-white'
                    : 'border-slate-600 bg-slate-800/50 text-slate-300 hover:border-slate-500 hover:bg-slate-800'
                }`}
              >
                <span className="font-bold mr-2">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
                {selectedOption === index && <span className="float-right">✓</span>}
              </motion.button>
            ))}
            <p className="text-xs text-slate-500 mt-3 italic">
              💬 Say the option number or letter (1/A, 2/B, 3/C, 4/D) to select your answer.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Written Answer Input Section */}
      <AnimatePresence>
        {isWrittenQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AnswerInputBox
              questionId={question.questionId}
              questionText={question.text}
              value={writtenAnswer}
              onChange={onWrittenAnswerChange || (() => {})}
              isRecording={isRecordingAnswer}
              interimText={interimRecordingText}
              iFormattedAnswer={formattedAnswer}
              expectedAnswerLength={question.expectedAnswerLength}
              placeholder="Speak your answer or type here..."
            />
          </motion.div>
        )}
      </AnimatePresence>

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
