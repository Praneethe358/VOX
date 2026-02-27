/**
 * ExamBriefing.tsx — Voice-guided pre-exam briefing page.
 *
 * Flow:
 *   1. Load available exams from API.
 *   2. TTS reads: exam name, duration, number of questions, instructions.
 *   3. "Say 'Start Exam' to begin the exam."
 *   4. Voice engine waits — on hearing "start exam" → navigate to interface.
 *   5. If 30 s pass without command → re-read briefing (looping).
 *
 * Fully hands-free.  No buttons required.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import { useVoiceContext } from '../../context/VoiceContext';
import { useVoiceEngine } from '../../hooks/student/useVoiceEngine';
import type { CommandAction } from '../../hooks/student/useVoiceEngine';
import apiService from '../../services/student/api.service';

// ─── Type for the API exam summary ───────────────────────────────────────────

interface ExamSummary {
  examCode: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  instructions?: string;
  status: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExamBriefing() {
  const navigate = useNavigate();
  const { setExam } = useExamContext();
  const { speak, stopSpeaking, transition: voiceTransition, playBeep } = useVoiceContext();

  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamSummary | null>(null);
  const [phase, setPhase] = useState<'loading' | 'briefing' | 'waiting' | 'starting'>('loading');
  const [countdown, setCountdown] = useState(30);
  const briefingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasReadRef = useRef(false);

  // ── Voice engine (EXAM_BRIEFING state) ───────────────────────────────────

  const handleCommand = useCallback(
    (action: CommandAction) => {
      if (action === 'start_exam' && phase === 'waiting') {
        playBeep('success');
        setPhase('starting');
      }
    },
    [phase, playBeep],
  );

  const { start: startEngine, stop: stopEngine } = useVoiceEngine(handleCommand);

  // ── Load exams on mount ───────────────────────────────────────────────────

  useEffect(() => {
    voiceTransition('EXAM_BRIEFING');

    const load = async () => {
      try {
        const res = await apiService.getAvailableExams() as any;
        const items: any[] = res?.data ?? res?.exams ?? [];
        const active = items
          .filter((e: any) => e.status === 'active' || e.status === 'published')
          .map((e: any): ExamSummary => ({
            examCode: e.code ?? e.examCode ?? 'UNKNOWN',
            title: e.title ?? e.name ?? 'Untitled Exam',
            durationMinutes: Number(e.durationMinutes ?? 60),
            questionCount: Array.isArray(e.questions) ? e.questions.length : Number(e.questionCount ?? 0),
            instructions: e.instructions ?? '',
            status: e.status ?? 'active',
          }));

        if (active.length === 0) {
          setPhase('loading');
          await speak('No active exams are available at this time. Please contact your administrator.');
          return;
        }

        setExams(active);
        setSelectedExam(active[0]); // Pick first active exam
      } catch {
        await speak('Could not load exam information. Please try again later.');
      }
    };

    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Read briefing when exam is selected ──────────────────────────────────

  const readBriefing = useCallback(
    async (exam: ExamSummary) => {
      hasReadRef.current = true;
      setPhase('briefing');
      stopSpeaking();

      const instructionText = exam.instructions
        ? ` Instructions: ${exam.instructions}`
        : '';

      await speak(
        `Upcoming exam: ${exam.title}. ` +
          `Duration: ${exam.durationMinutes} minutes. ` +
          `Total questions: ${exam.questionCount}.` +
          instructionText,
        { rate: 0.9 },
      );

      await speak(
        'When you are ready, say "Start Exam" to begin. ' +
          'You have 30 seconds before I repeat the briefing.',
      );

      setPhase('waiting');
      setCountdown(30);
      startEngine();
    },
    [speak, stopSpeaking, startEngine],
  );

  useEffect(() => {
    if (selectedExam && !hasReadRef.current) {
      readBriefing(selectedExam);
    }
  }, [selectedExam, readBriefing]);

  // ── Countdown while waiting for "start exam" ─────────────────────────────

  useEffect(() => {
    if (phase !== 'waiting') return;

    const interval = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(interval);
          // Re-read briefing
          if (selectedExam) {
            hasReadRef.current = false;
            stopEngine();
            readBriefing(selectedExam);
          }
          return 30;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, selectedExam, stopEngine, readBriefing]);

  // ── Start exam ───────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase !== 'starting' || !selectedExam) return;

    stopEngine();
    stopSpeaking();

    const go = async () => {
      await speak('Starting your exam. Good luck!');
      // Persist exam data into context
      // We store a lightweight ExamData-compatible object
      setExam({
        examCode: selectedExam.examCode,
        title: selectedExam.title,
        durationMinutes: selectedExam.durationMinutes,
        sections: [],          // populated by ExamInterface on load
        totalMarks: 0,
        passingMarks: 0,
        instructions: selectedExam.instructions ?? '',
      } as any);

      navigate(`/student/exam/${selectedExam.examCode}/interface`);
    };

    go();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            VoiceSecure
          </h1>
          <p className="text-slate-400 text-sm mt-1">Exam Briefing</p>
        </div>

        {/* Exam card */}
        <AnimatePresence mode="wait">
          {selectedExam ? (
            <motion.div
              key="exam-card"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-2xl p-7 space-y-4"
            >
              <h2 className="text-white text-2xl font-bold">{selectedExam.title}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-widest">Duration</p>
                  <p className="text-white font-bold text-xl mt-0.5">{selectedExam.durationMinutes} min</p>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <p className="text-slate-400 text-xs uppercase tracking-widest">Questions</p>
                  <p className="text-white font-bold text-xl mt-0.5">{selectedExam.questionCount}</p>
                </div>
              </div>
              {selectedExam.instructions && (
                <p className="text-slate-300 text-sm leading-relaxed border-t border-slate-700/50 pt-3">
                  {selectedExam.instructions}
                </p>
              )}
            </motion.div>
          ) : phase === 'loading' ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center py-12"
            >
              <motion.div
                className="w-10 h-10 rounded-full border-4 border-indigo-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Phase indicator */}
        <AnimatePresence mode="wait">
          {phase === 'briefing' && (
            <motion.div
              key="briefing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/30 rounded-xl px-4 py-3"
            >
              <motion.div
                className="w-3 h-3 rounded-full bg-blue-400"
                animate={{ scale: [1, 1.4, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <p className="text-blue-300 text-sm">Reading exam information aloud…</p>
            </motion.div>
          )}

          {phase === 'waiting' && (
            <motion.div
              key="waiting"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between bg-indigo-500/10 border border-indigo-500/30 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-3 h-3 rounded-full bg-indigo-400"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <p className="text-indigo-300 font-medium">
                    Say{' '}
                    <span className="font-mono font-bold bg-indigo-500/20 px-1.5 py-0.5 rounded">
                      "Start Exam"
                    </span>{' '}
                    to begin
                  </p>
                </div>
                <span className="text-slate-400 text-sm font-mono">{countdown}s</span>
              </div>

              {/* Countdown bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-indigo-500"
                  animate={{ width: `${(countdown / 30) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}

          {phase === 'starting' && (
            <motion.div
              key="starting"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-4 justify-center"
            >
              <motion.div
                className="w-4 h-4 rounded-full border-2 border-green-400 border-t-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-green-300 font-bold text-lg">Starting exam…</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Command hint */}
        {phase !== 'starting' && phase !== 'loading' && (
          <p className="text-center text-slate-500 text-xs">
            Listening for voice commands • Briefing repeats every 30 s
          </p>
        )}
      </motion.div>
    </div>
  );
}
