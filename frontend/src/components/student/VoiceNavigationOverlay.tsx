/**
 * VoiceNavigationOverlay.tsx - Display voice commands being detected during exam
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceNavigationOverlayProps {
  command?: string;
  confidence: number;
}

const COMMAND_DESCRIPTIONS: Record<string, string> = {
  'start_answer': 'Starting answer recording',
  'read_again': 'Reading question',
  'next': 'Next question',
  'previous': 'Previous question',
  'repeat': 'Repeating question',
  'submit': 'Submitting exam',
};

export function VoiceNavigationOverlay({ command, confidence }: VoiceNavigationOverlayProps) {
  if (!command) return null;

  const description = COMMAND_DESCRIPTIONS[command] || command;
  const isHighConfidence = confidence > 0.8;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed top-24 left-1/2 z-50 -translate-x-1/2"
      >
        <div className={`
          flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
          ${isHighConfidence 
            ? 'bg-green-900/90 border border-green-500/50' 
            : 'bg-yellow-900/90 border border-yellow-500/50'
          }
          backdrop-blur-sm
        `}>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.4, repeat: 1 }}
            className={`text-xl ${isHighConfidence ? '✓' : '⚠'}`}
          >
            {isHighConfidence ? '✓' : '⚠'}
          </motion.div>

          <div>
            <p className={`text-sm font-semibold ${
              isHighConfidence ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {description}
            </p>
            <p className="text-xs text-slate-300">
              Confidence: {Math.round(confidence * 100)}%
            </p>
          </div>

          <motion.div
            animate={{ width: [0, 100] }}
            transition={{ duration: 1 }}
            className={`h-1 rounded ${isHighConfidence ? 'bg-green-500' : 'bg-yellow-500'}`}
            style={{ width: `${confidence * 100}px` }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default VoiceNavigationOverlay;
