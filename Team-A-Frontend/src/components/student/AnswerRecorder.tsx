/**
 * AnswerRecorder.tsx - Record and manage exam answers via voice dictation
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import { useExamSession } from '../../hooks/student/useExamSession';
import { useSpeechToText } from '../../hooks/student/useVoiceProcessing';

interface AnswerRecorderProps {
  questionId: string;
  onAnswerSubmitted?: () => void;
}

type CaptureMode = 'idle' | 'recording' | 'processing' | 'playback';

export function AnswerRecorder({ questionId, onAnswerSubmitted }: AnswerRecorderProps) {
  const { session, submitAnswer } = useExamContext();
  const { isListening: sttIsListening, transcript, confidence } = useSpeechToText();

  const [mode, setMode] = useState<CaptureMode>('idle');
  const [answer, setAnswer] = useState('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Find existing answer for this question
  useEffect(() => {
    if (session && Array.isArray(session.answers)) {
      const existingAnswer = session.answers.find(ans => ans.questionId === questionId);
      if (existingAnswer) {
        setAnswer(existingAnswer.formattedAnswer || existingAnswer.rawTranscript);
      }
    }
  }, [questionId, session]);

  // Timer for recording duration
  useEffect(() => {
    if (mode === 'recording') {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode]);

  // Update answer from transcript
  useEffect(() => {
    if (transcript) {
      setAnswer(transcript);
    }
  }, [transcript]);

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const handleStartRecording = async () => {
    try {
      setMode('recording');
      setRecordingTime(0);
      audioChunksRef.current = [];

      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Setup media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioURL(url);
        setMode('playback');

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      // Also start voice command listening
      // await startListening(); // This starts the audio capture

    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Unable to access microphone. Please check permissions.');
      setMode('idle');
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mode === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSaveAnswer = async () => {
    if (!answer.trim()) {
      alert('Please provide an answer before saving.');
      return;
    }

    try {
      // Create StudentAnswer object with proper structure
      const studentAnswer = {
        questionId,
        sectionId: session?.currentSectionId || '',
        rawTranscript: answer,
        formattedAnswer: answer,
        confidence: confidence,
        attemptedAt: new Date(),
        submittedAt: new Date(),
        timeSpent: 0,
        wordCount: answer.split(/\s+/).length,
        suspiciousFlags: [],
        audioFile: audioURL ? { url: audioURL, duration: recordingTime, format: 'wav' } : undefined,
      };

      submitAnswer(studentAnswer);

      // Show success feedback
      setMode('idle');
      onAnswerSubmitted?.();
    } catch (err) {
      console.error('Error saving answer:', err);
      alert('Failed to save answer. Please try again.');
    }
  };

  const handleClearAnswer = () => {
    if (window.confirm('Clear this answer?')) {
      setAnswer('');
      setRecordingTime(0);
      setAudioURL(null);
      setMode('idle');
      audioChunksRef.current = [];
    }
  };

  const handlePlayback = () => {
    if (audioURL) {
      const audio = new Audio(audioURL);
      audio.play();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Your Answer</h3>
        <span className="text-xs text-slate-400">Voice command: 1</span>
      </div>

      {/* Recording Controls */}
      {mode === 'idle' || mode === 'recording' ? (
        <div className="space-y-4">
          {/* Record Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={mode === 'idle' ? handleStartRecording : handleStopRecording}
            className={`w-full py-4 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
              mode === 'recording'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {mode === 'recording' ? (
              <>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="w-3 h-3 bg-white rounded-full"
                />
                Stop Recording
              </>
            ) : (
              <>
                🎤 Start Recording
              </>
            )}
          </motion.button>

          {/* Recording Timer */}
          {mode === 'recording' && (
            <div className="text-center">
              <p className="text-2xl font-mono font-bold text-red-400">
                {formatRecordingTime(recordingTime)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Recording in progress...</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Processing State */}
      {mode === 'processing' && (
        <div className="flex flex-col items-center justify-center py-6">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mb-3"
          />
          <p className="text-slate-400">Converting speech to text...</p>
          {confidence > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Confidence: {Math.round(confidence * 100)}%
            </p>
          )}
        </div>
      )}

      {/* Answer Text Display */}
      {answer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-slate-700/50 rounded-lg border border-slate-600"
        >
          <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
            {answer}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {answer.split(' ').length} words
          </p>
        </motion.div>
      )}

      {/* Playback Controls */}
      {audioURL && (
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handlePlayback}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            🔊 Playback Audio
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClearAnswer}
            className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
          >
            Clear
          </motion.button>
        </div>
      )}

      {/* Save Button */}
      {answer.trim() && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveAnswer}
          className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        >
          ✓ Save Answer
        </motion.button>
      )}

      {/* Help Text */}
      <div className="bg-slate-900/50 rounded p-3 text-xs text-slate-400">
        <p>
          💡 <strong>Tip:</strong> Click the record button to start capturing your voice answer.
          The system will convert it to text automatically.
        </p>
      </div>

      {/* Microphone Status */}
      {sttIsListening && (
        <div className="flex items-center gap-2 text-green-400 text-xs">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="w-2 h-2 bg-green-400 rounded-full"
          />
          Microphone active
        </div>
      )}
    </motion.div>
  );
}

export default AnswerRecorder;
