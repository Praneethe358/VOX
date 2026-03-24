/**
 * AnswerInputBox.tsx - Text input for written exam answers with voice dictation support
 * 
 * Features:
 * - Real-time text input with editing
 * - Word count display (advisory)
 * - Voice dictation support (fills text via speech-to-text)
 * - Hybrid mode: voice fills + manual editing allowed
 * - Visual feedback for voice recording state
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnswerInputBoxProps {
  questionId: string | number;
  questionText: string;
  placeholder?: string;
  value: string;
  onChange: (text: string) => void;
  isRecording?: boolean;
  interimText?: string;
  onFocus?: () => void;
  onBlur?: () => void;
  disabled?: boolean;
  iFormattedAnswer?: string;
  expectedAnswerLength?: 'short' | 'medium' | 'long';
}

export function AnswerInputBox({
  questionId,
  questionText,
  placeholder = 'Speak your answer or type here...',
  value,
  onChange,
  isRecording = false,
  interimText = '',
  onFocus,
  onBlur,
  disabled = false,
  iFormattedAnswer = '',
  expectedAnswerLength = 'medium',
}: AnswerInputBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  // Update counts whenever value changes
  useEffect(() => {
    const words = value.trim().split(/\s+/).filter(w => w.length > 0).length;
    const chars = value.length;
    setWordCount(words);
    setCharCount(chars);
  }, [value]);

  // Auto-scroll textarea when content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 300)}px`;
    }
  }, [value, interimText]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    onFocus?.();
  }, [onFocus]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    onBlur?.();
  }, [onBlur]);

  // Get expected word count hints based on answer length
  const getExpectedHint = () => {
    switch (expectedAnswerLength) {
      case 'short':
        return '(Expected: 20-50 words)';
      case 'long':
        return '(Expected: 200+ words)';
      case 'medium':
      default:
        return '(Expected: 100-200 words)';
    }
  };

  // Determine if answer length is suspicious
  const getWordCountColor = () => {
    if (wordCount === 0) return 'text-slate-400';
    if (expectedAnswerLength === 'short' && wordCount > 100)
      return 'text-yellow-400';
    if (expectedAnswerLength === 'long' && wordCount < 50)
      return 'text-yellow-400';
    if (expectedAnswerLength === 'medium' && (wordCount < 20 || wordCount > 300))
      return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      {/* Header with expected length hint */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">Your Answer</label>
        <span className="text-xs text-slate-500">{getExpectedHint()}</span>
      </div>

      {/* Main text input area with voice recording indicator */}
      <div
        className={`relative rounded-lg border-2 transition-all ${
          isRecording
            ? 'border-red-500 bg-red-500/5 shadow-lg shadow-red-500/20'
            : isFocused
              ? 'border-indigo-500 bg-slate-800/50'
              : 'border-slate-600 bg-slate-800/30 hover:border-slate-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Recording indicator pulse */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute top-3 right-3 flex items-center gap-2"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-2 h-2 bg-red-500 rounded-full"
              />
              <span className="text-xs text-red-400 font-medium">Recording...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full bg-transparent text-white placeholder-slate-500 p-4 pr-12 resize-none focus:outline-none min-h-[120px] max-h-[300px] font-medium ${
            isRecording ? 'shadow-recorded' : ''
          }`}
        />
      </div>

      {/* Interim text display when recording */}
      <AnimatePresence>
        {isRecording && interimText && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-l-4 border-red-500 pl-3 py-2 bg-red-500/10 rounded text-sm text-red-300"
          >
            <span className="text-xs text-red-400 font-semibold">Hearing: </span>
            <span className="italic">{interimText}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Formatted answer preview */}
      <AnimatePresence>
        {iFormattedAnswer && iFormattedAnswer !== value && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-l-4 border-green-500 pl-3 py-2 bg-green-500/10 rounded text-sm"
          >
            <span className="text-xs text-green-400 font-semibold">AI Formatted: </span>
            <span className="text-green-200">{iFormattedAnswer}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Word count and character info */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex gap-3">
          <span className={`font-medium ${getWordCountColor()}`}>
            {wordCount} word{wordCount !== 1 ? 's' : ''}
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">{charCount} character{charCount !== 1 ? 's' : ''}</span>
        </div>
        {wordCount > 0 && expectedAnswerLength === 'short' && wordCount > 100 && (
          <span className="text-yellow-400">⚠️ Longer than typical for short answer</span>
        )}
        {wordCount > 0 && expectedAnswerLength === 'long' && wordCount < 50 && (
          <span className="text-yellow-400">⚠️ Consider elaborating</span>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-slate-500 italic">
        💬 Say "start answering" or "start answer" to record via voice. You can edit the text below while recording. Say "stop dictating" to finish.
      </p>
    </motion.div>
  );
}
