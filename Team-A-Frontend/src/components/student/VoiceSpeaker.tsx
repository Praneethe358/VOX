/**
 * VoiceSpeaker — TTS feedback component with visual speech indicator.
 *
 * Shows:
 *   - Currently speaking text (scrolling if long)
 *   - Speaking/idle animation
 *   - Speech progress indicator
 *
 * Wraps VoiceContext's TTS and provides visual feedback.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceContext } from '../../context/VoiceContext';

interface VoiceSpeakerProps {
  /** Position on screen */
  position?: 'bottom-center' | 'top-center' | 'bottom-left';
  /** Whether to show the component at all (hides when not speaking) */
  autoHide?: boolean;
}

export function VoiceSpeaker({
  position = 'bottom-center',
  autoHide = true,
}: VoiceSpeakerProps) {
  const { isSpeaking } = useVoiceContext();
  const [currentText, setCurrentText] = useState('');

  // Track speaking state from VoiceContext (now using backend espeak via Audio element)
  useEffect(() => {
    if (!isSpeaking) {
      // Clear text shortly after done speaking
      const t = setTimeout(() => setCurrentText(''), 1500);
      return () => clearTimeout(t);
    }
  }, [isSpeaking]);

  const positionClass = {
    'bottom-center': 'fixed bottom-20 left-1/2 -translate-x-1/2',
    'top-center':    'fixed top-16 left-1/2 -translate-x-1/2',
    'bottom-left':   'fixed bottom-20 left-4',
  }[position];

  if (autoHide && !isSpeaking) return null;

  return (
    <AnimatePresence>
      {isSpeaking && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`${positionClass} z-50`}
          role="status"
          aria-live="polite"
          aria-label="System is speaking"
        >
          <div className="bg-slate-800/95 backdrop-blur border border-indigo-500/30 rounded-xl px-5 py-3 shadow-xl flex items-center gap-3 max-w-md">
            {/* Speaking animation */}
            <div className="flex items-center gap-[3px]" aria-hidden="true">
              {[0, 1, 2, 3, 4].map(i => (
                <motion.div
                  key={i}
                  className="w-[3px] rounded-full bg-indigo-400"
                  animate={{
                    height: [6, 14 + Math.random() * 6, 6],
                  }}
                  transition={{
                    duration: 0.5 + Math.random() * 0.3,
                    repeat: Infinity,
                    repeatType: 'reverse',
                    delay: i * 0.08,
                  }}
                />
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">
                Speaking
              </p>
              {currentText && (
                <p className="text-slate-300 text-sm truncate mt-0.5">
                  {currentText.length > 80
                    ? currentText.substring(0, 80) + '…'
                    : currentText}
                </p>
              )}
            </div>

            {/* Volume icon */}
            <span className="text-lg">🔊</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default VoiceSpeaker;
