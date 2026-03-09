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
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-600/[0.06] rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-xl flex flex-col gap-6"
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Voice<span className="text-indigo-400">Secure</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Exam Briefing</p>
        </div>

        {/* Exam card */}
        <AnimatePresence mode="wait">
          {selectedExam ? (
            <motion.div
              key="exam-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-2xl p-7 space-y-5"
            >
              <h2 className="text-white text-xl font-bold tracking-tight">{selectedExam.title}</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Duration</p>
                  <p className="text-white font-bold text-xl mt-1">{selectedExam.durationMinutes}<span className="text-sm font-normal text-slate-400"> min</span></p>
                </div>
                <div className="text-center p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Questions</p>
                  <p className="text-white font-bold text-xl mt-1">{selectedExam.questionCount}</p>
                </div>
              </div>
              {selectedExam.instructions && (
                <p className="text-slate-400 text-sm leading-relaxed border-t border-white/[0.04] pt-4">
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
              <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
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
              className="flex items-center gap-3 glass-card rounded-xl px-4 py-3 border-indigo-500/[0.08]"
            >
              <motion.div
                className="w-2.5 h-2.5 rounded-full bg-indigo-400"
                animate={{ scale: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <p className="text-indigo-300/80 text-sm">Reading exam information aloud...</p>
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
              <div className="flex items-center justify-between glass-card rounded-xl px-5 py-4 border-indigo-500/[0.1]">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2.5 h-2.5 rounded-full bg-indigo-400"
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <p className="text-sm text-slate-300">
                    Say{' '}
                    <span className="font-mono font-semibold text-indigo-300 bg-indigo-500/[0.1] px-2 py-0.5 rounded-md">
                      "Start Exam"
                    </span>
                  </p>
                </div>
                <span className="text-slate-500 text-sm font-mono tabular-nums">{countdown}s</span>
              </div>

              {/* Countdown bar */}
              <div className="w-full h-1 rounded-full bg-white/[0.04] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                  animate={{ width: `${(countdown / 30) * 100}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </motion.div>
          )}

          {phase === 'starting' && (
            <motion.div
              key="starting"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 glass-card rounded-xl px-5 py-4 border-emerald-500/[0.1] justify-center"
            >
              <div className="w-4 h-4 rounded-full border-2 border-emerald-400/40 border-t-emerald-400 animate-spin" />
              <p className="text-emerald-300 font-semibold">Starting exam...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint */}
        {phase !== 'starting' && phase !== 'loading' && (
          <p className="text-center text-slate-600 text-[11px] tracking-wide">
            Listening for voice commands · Briefing repeats every 30s
          </p>
        )}
      </motion.div>
    </div>
  );
}
