/**
 * ExamInterface.tsx — VoiceSecure hands-free exam page.
 *
 * No buttons. No mouse. No keyboard.
 * 13 voice commands, AI answer formatting, kiosk lock, auto-save every 15 s.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import { useVoiceContext } from '../../context/VoiceContext';
import { useVoiceEngine } from '../../hooks/student/useVoiceEngine';
import { useDictation } from '../../hooks/student/useDictation';
import { useExamTimer } from '../../hooks/student/useExamTimer';
import { useAutoSave } from '../../hooks/student/useAutoSave';
import { useKioskMode } from '../../hooks/student/useKioskMode';
import ModeIndicator from '../../components/student/ModeIndicator';
import StatusBar from '../../components/student/StatusBar';
import TimerDisplay from '../../components/student/TimerDisplay';
import SubmissionGate from '../../components/student/SubmissionGate';
import FormattedAnswerReview from '../../components/student/FormattedAnswerReview';
import LiveTranscript from '../../components/student/LiveTranscript';

import { studentApi, unifiedApiClient } from '../../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question { id: number | string; text: string; marks?: number; type?: 'mcq' | 'descriptive'; options?: string[]; correctAnswer?: number; }
interface SavedAnswer { questionId: string | number; rawText: string; formattedText: string; selectedOption?: number; }

// ─── Main Component ───────────────────────────────────────────────────────────

export function ExamInterface() {
  const navigate = useNavigate();
  const { examId } = useParams<{ examId: string }>();
  const { exam: contextExam, student } = useExamContext();
  const {
    voiceState, transition, speak, stopSpeaking,
    rawTranscript, setRawTranscript,
    formattedAnswer, setFormattedAnswer,
    setCurrentQuestionText, playBeep,
  } = useVoiceContext();
  const { enableKiosk } = useKioskMode();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [examTitle, setExamTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [examCode, setExamCode] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string | number, SavedAnswer>>(new Map());
  const [sessionId] = useState(() => `vs_${Date.now()}`);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [confirmClearPending, setConfirmClearPending] = useState(false);

  const questionReadRef = useRef<number | string | null>(null);
  const silenceWarnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const savedAnswer = currentQuestion ? answers.get(currentQuestion.id) : null;

  // ── Load exam ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const code = examId ?? (contextExam as any)?.examCode ?? 'TECH101';
        setExamCode(code);
        const res = await (unifiedApiClient as any).getExamById(code) as any;
        const data = res?.data ?? res;
        if (data) {
          setExamTitle(data.title ?? data.name ?? code);
          setDurationMinutes(Number(data.durationMinutes ?? 60));
          const qs: Question[] = (data.questions ?? []).map((q: any, i: number) => ({
            id: q.id ?? i + 1,
            text: q.text ?? q.question ?? `Question ${i + 1}`,
            marks: q.marks ?? 1,
            type: q.type === 'mcq' ? 'mcq' : 'descriptive',
            options: Array.isArray(q.options) ? q.options : undefined,
            correctAnswer: q.correctAnswer,
          }));
          setQuestions(qs.length ? qs : [{ id: 1, text: 'Sample question.', marks: 1 }]);
        }
      } catch { /* continue */ }
    };
    load();
    enableKiosk();
    transition('COMMAND_MODE');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-read question when index changes ───────────────────────────────────
  useEffect(() => {
    if (!currentQuestion || voiceState === 'DICTATION_MODE') return;
    if (questionReadRef.current === currentQuestion.id) return;
    questionReadRef.current = currentQuestion.id;
    setCurrentQuestionText(currentQuestion.text);
    if (currentQuestion.type === 'mcq' && currentQuestion.options?.length) {
      const optionsText = currentQuestion.options.map((o, i) => `Option ${i + 1}: ${o}`).join('. ');
      speak(`Question ${currentIndex + 1} of ${questions.length}. ${currentQuestion.text}. ${optionsText}. Say option 1, 2, 3, or 4 to answer.`, { rate: 0.9 });
    } else {
      speak(`Question ${currentIndex + 1} of ${questions.length}. ${currentQuestion.text}. Say start answering to record your answer.`, { rate: 0.9 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, questions.length]);

  // ── Silence warning (60 s) ─────────────────────────────────────────────────
  useEffect(() => {
    if (voiceState !== 'COMMAND_MODE') {
      if (silenceWarnTimerRef.current) clearTimeout(silenceWarnTimerRef.current);
      return;
    }
    silenceWarnTimerRef.current = setTimeout(() => {
      speak("Are you still there? Say I'm ready to continue.");
    }, 60_000);
    return () => { if (silenceWarnTimerRef.current) clearTimeout(silenceWarnTimerRef.current); };
  }, [voiceState, speak]);

  // ── Timer ───────────────────────────────────────────────────────────────────
  const { remaining, isPaused, pause: timerPause, resume: timerResume } = useExamTimer({
    durationMinutes,
    onExpire: () => { speak('Time is up. Submitting in 10 seconds.'); setTimeout(finalizeSubmission, 10_000); },
    onFiveMinWarning: () => speak('Warning: 5 minutes remaining.'),
  });

  // ── Auto-save ───────────────────────────────────────────────────────────────
  const snapshot = isSubmitted ? null : { sessionId, examCode, answers: Array.from(answers.values()) } as any;
  const { isSaving, lastSaved } = useAutoSave(snapshot, 15_000);

  // ── Dictation ───────────────────────────────────────────────────────────────
  const handleDictationEnd = useCallback(async (transcript: string) => {
    if (!transcript.trim()) {
      await speak('No speech detected. Returning to command mode.');
      transition('COMMAND_MODE');
      return;
    }
    setRawTranscript(transcript);
    transition('ANSWER_REVIEW');
    setIsFormatting(true);
    setFormatError(null);
    setFormattedAnswer('');
    try {
      const res = await studentApi.formatAnswer(transcript, currentQuestion?.text ?? '');
      if ((res as any).success && (res as any).data?.formatted) {
        const fmt = (res as any).data.formatted;
        setFormattedAnswer(fmt);
        await speak(`Your formatted answer is: ${fmt}. Say confirm answer to save, edit answer to redo, or continue dictation to add more.`);
      } else throw new Error();
    } catch {
      setFormatError('AI formatting unavailable. Using raw answer.');
      setFormattedAnswer(transcript);
      await speak(`Your answer is: ${transcript}. Say confirm answer to save, or edit answer to redo.`);
    } finally { setIsFormatting(false); }
  }, [speak, transition, setRawTranscript, setFormattedAnswer, currentQuestion]);

  const { isRecording, interimText, finalText: dictationFinalText, lastError: dictationError, start: startDictation, stop: stopDictation, reset: resetDictation } =
    useDictation({ onDictationEnd: handleDictationEnd, silenceTimeout: 3500 });

  // ── Command handler ─────────────────────────────────────────────────────────
  async function handleCommand(action: string, _confidence: number) {
    if (silenceWarnTimerRef.current) { clearTimeout(silenceWarnTimerRef.current); silenceWarnTimerRef.current = null; }
    switch (action) {
      case 'next_question':
        if (voiceState !== 'COMMAND_MODE') return;
        navigateQ(1);
        break;
      case 'previous_question':
        if (voiceState !== 'COMMAND_MODE') return;
        navigateQ(-1);
        break;
      case 'repeat_question':
        if (voiceState !== 'COMMAND_MODE' && voiceState !== 'ANSWER_REVIEW') return;
        if (currentQuestion) {
          if (currentQuestion.type === 'mcq' && currentQuestion.options?.length) {
            const optionsText = currentQuestion.options.map((o, i) => `Option ${i + 1}: ${o}`).join('. ');
            speak(`Question ${currentIndex + 1}. ${currentQuestion.text}. ${optionsText}`);
          } else {
            speak(`Question ${currentIndex + 1}. ${currentQuestion.text}`);
          }
        }
        break;
      case 'start_answering':
        if (voiceState !== 'COMMAND_MODE') return;
        if (currentQuestion?.type === 'mcq') { speak('This is a multiple choice question. Say option 1, 2, 3, or 4.'); return; }
        stopEngine();
        setRawTranscript(''); setFormattedAnswer(''); resetDictation();
        transition('DICTATION_MODE');
        await speak('Dictation active. Speak your answer now. I will stop after 3 seconds of silence.');
        startDictation();
        break;
      case 'option_1': case 'option_2': case 'option_3': case 'option_4': {
        if (voiceState !== 'COMMAND_MODE') return;
        if (currentQuestion?.type !== 'mcq' || !currentQuestion.options?.length) {
          speak('This question does not have options. Say start answering instead.');
          return;
        }
        const optNum = parseInt(action.split('_')[1]) - 1;
        if (optNum >= (currentQuestion.options?.length ?? 0)) { speak('Invalid option number.'); return; }
        const optText = currentQuestion.options![optNum];
        setAnswers(p => new Map(p).set(currentQuestion.id, {
          questionId: currentQuestion.id,
          rawText: `Option ${optNum + 1}: ${optText}`,
          formattedText: `Option ${optNum + 1}: ${optText}`,
          selectedOption: optNum,
        }));
        playBeep('success');
        try { await studentApi.saveResponse({ studentId: (student as any)?.studentId ?? 'UNKNOWN', examCode, questionId: typeof currentQuestion.id === 'number' ? currentQuestion.id : parseInt(String(currentQuestion.id), 10) || (currentIndex + 1), rawAnswer: `Option ${optNum + 1}`, formattedAnswer: optText, confidence: 1 }); } catch {}
        await speak(`Option ${optNum + 1} selected: ${optText}. Answer saved.` + (currentIndex < questions.length - 1 ? ' Moving to next question.' : ''));
        if (currentIndex < questions.length - 1) { questionReadRef.current = null; setCurrentIndex(i => i + 1); }
        break;
      }
      case 'stop_dictating':
        if (voiceState !== 'DICTATION_MODE') return;
        stopDictation();
        break;
      case 'confirm_answer':
        if (voiceState !== 'ANSWER_REVIEW') return;
        confirmAnswer();
        break;
      case 'edit_answer':
        if (voiceState !== 'ANSWER_REVIEW') return;
        stopEngine(); setRawTranscript(''); setFormattedAnswer(''); resetDictation();
        transition('DICTATION_MODE');
        await speak('Re-dictating. Speak your new answer.');
        startDictation();
        break;
      case 'continue_dictation':
        if (voiceState !== 'ANSWER_REVIEW') return;
        stopEngine(); transition('DICTATION_MODE');
        await speak('Continuing. Speak to add more.');
        startDictation();
        break;
      case 'read_my_answer':
        if (voiceState !== 'COMMAND_MODE') return;
        savedAnswer ? speak(`Your saved answer is: ${savedAnswer.formattedText}`) : speak('No answer saved for this question.');
        break;
      case 'clear_answer':
        if (voiceState !== 'COMMAND_MODE') return;
        setConfirmClearPending(true);
        speak('Say confirm clear to delete this answer, or any command to cancel.');
        break;
      case 'confirm_clear':
        if (!confirmClearPending) return;
        setConfirmClearPending(false);
        if (currentQuestion) { setAnswers(p => { const n = new Map(p); n.delete(currentQuestion.id); return n; }); playBeep('success'); speak('Answer cleared.'); }
        break;
      case 'pause_exam':
        if (voiceState !== 'COMMAND_MODE') return;
        timerPause(); stopEngine(); transition('PAUSE_MODE');
        speak('Exam paused. Say resume exam when ready.');
        break;
      case 'resume_exam':
        if (voiceState !== 'PAUSE_MODE') return;
        timerResume(); transition('COMMAND_MODE');
        speak('Exam resumed.');
        startEngine();
        break;
      case 'submit_exam':
        if (voiceState !== 'COMMAND_MODE') return;
        stopEngine(); transition('SUBMISSION_GATE');
        break;
      case 'confirm_submission':
        if (voiceState !== 'SUBMISSION_GATE') return;
        finalizeSubmission();
        break;
      case 'im_ready':
        if (voiceState === 'PAUSE_MODE') { timerResume(); transition('COMMAND_MODE'); speak('Exam resumed.'); startEngine(); }
        else speak('Listening for commands.');
        break;
      default: break;
    }
  }

  const {
    start: startEngine,
    stop: stopEngine,
    failCount,
    isListening,
    lastRawText,
    interimRawText,
    lastError: voiceEngineError,
    isSupported: isVoiceSupported,
  } = useVoiceEngine(handleCommand as any);

  // Start engine when entering listening states
  useEffect(() => {
    if (['COMMAND_MODE', 'PAUSE_MODE', 'SUBMISSION_GATE', 'ANSWER_REVIEW'].includes(voiceState)) {
      startEngine();
      if (voiceState === 'COMMAND_MODE') playBeep('command');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceState]);

  // Read hint when repeated failures (only once at threshold, not every increment)
  useEffect(() => {
    if (failCount === 3 && voiceState === 'COMMAND_MODE') {
      speak('Available commands: Start answering, Next question, Previous question, Repeat question, Read my answer, Pause exam, Submit exam.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [failCount]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function navigateQ(delta: number) {
    const next = currentIndex + delta;
    if (next < 0) { speak('This is the first question.'); return; }
    if (next >= questions.length) { speak('This is the last question.'); return; }
    questionReadRef.current = null;
    setCurrentIndex(next);
  }

  async function confirmAnswer() {
    if (!currentQuestion) return;
    const text = formattedAnswer || rawTranscript;
    if (!text.trim()) { speak('No answer to save.'); transition('COMMAND_MODE'); return; }
    setAnswers(p => new Map(p).set(currentQuestion.id, { questionId: currentQuestion.id, rawText: rawTranscript, formattedText: text }));
    setRawTranscript(''); setFormattedAnswer('');
    playBeep('success');
    // Save to legacy autosave
    try { await studentApi.autoSaveSession({ sessionId, examCode, questionId: String(currentQuestion.id), draftAnswer: text } as any); } catch {}
    // Save to V1 autosave (MongoDB Atlas)
    try { await studentApi.v1AutosaveAnswer({ examSessionId: sessionId, questionNumber: typeof currentQuestion.id === 'number' ? currentQuestion.id : parseInt(String(currentQuestion.id), 10) || (currentIndex + 1), rawSpeechText: rawTranscript, formattedAnswer: text }); } catch {}
    // Save to legacy response store
    try { await studentApi.saveResponse({ studentId: (student as any)?.studentId ?? 'UNKNOWN', examCode, questionId: typeof currentQuestion.id === 'number' ? currentQuestion.id : parseInt(String(currentQuestion.id), 10) || (currentIndex + 1), rawAnswer: rawTranscript, formattedAnswer: text, confidence: 1 }); } catch {}
    // Log voice activity
    try { await studentApi.logAudit({ studentId: (student as any)?.studentId ?? 'UNKNOWN', examCode, action: 'ANSWER_SUBMITTED', metadata: { questionId: currentQuestion.id, wordCount: text.split(/\s+/).length } }); } catch {}
    await speak('Answer saved.' + (currentIndex < questions.length - 1 ? ' Moving to next question.' : ' All questions answered.'));
    transition('COMMAND_MODE');
    if (currentIndex < questions.length - 1) { questionReadRef.current = null; setCurrentIndex(i => i + 1); }
  }

  async function finalizeSubmission() {
    transition('FINALIZE');
    stopEngine(); stopSpeaking();
    await speak('Submitting your exam. Please wait.');
    const studentId = (student as any)?.studentId ?? 'UNKNOWN';
    // Submit to legacy endpoint
    try { await studentApi.submitExamSession({ sessionId, examCode, studentId, answers: Array.from(answers.values()) } as any); } catch {}
    // Submit to V1 endpoint
    try { await studentApi.v1SubmitSession(sessionId); } catch {}
    // Submit to legacy DB
    try { await studentApi.logAudit({ studentId, examCode, action: 'EXAM_SUBMITTED', metadata: { answeredCount: answers.size, totalQuestions: questions.length } }); } catch {}
    // End exam via legacy student API
    try { await studentApi.endExam(studentId, examCode); } catch {}
    setIsSubmitted(true);
    playBeep('success');
    await speak('Exam submitted successfully. Thank you.');
    setTimeout(() => navigate('/student/submission-confirmation'), 2500);
  }

  // ── Submitted screen ────────────────────────────────────────────────────────
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-emerald-500/[0.08] rounded-full blur-[100px]" />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10 text-center space-y-5">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/[0.1] border border-emerald-500/[0.15] flex items-center justify-center mx-auto">
            <span className="text-emerald-400 text-3xl">✓</span>
          </div>
          <h2 className="text-white text-2xl font-bold tracking-tight">Exam Submitted</h2>
          <p className="text-slate-500 text-sm">Redirecting to confirmation...</p>
        </motion.div>
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0e1a] flex flex-col select-none relative overflow-hidden">
      {/* Subtle ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-violet-600/[0.03] rounded-full blur-[100px]" />
      </div>

      <StatusBar
        currentQ={currentIndex + 1}
        totalQ={questions.length}
        remainingSeconds={remaining}
        isSaving={isSaving}
        lastSaved={lastSaved}
        voiceState={voiceState}
        examTitle={examTitle}
      />

      <div className="flex-1 flex flex-col gap-4 p-6 max-w-3xl mx-auto w-full relative z-10">

        <ModeIndicator voiceState={voiceState} isListening={isListening || isRecording} interimText={interimText} />

        {/* Live transcript during dictation */}
        <AnimatePresence>
          {voiceState === 'DICTATION_MODE' && (
            <LiveTranscript
              finalText={dictationFinalText}
              interimText={interimText}
              isRecording={isRecording}
            />
          )}
        </AnimatePresence>

        <div className="flex justify-center">
          <TimerDisplay remainingSeconds={remaining} isPaused={isPaused} />
        </div>

        {/* Voice status / error banner */}
        {(!isVoiceSupported || voiceEngineError || dictationError) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card rounded-xl px-4 py-3 ${voiceEngineError ? 'border-red-500/[0.1]' : 'border-amber-500/[0.1]'}`}
            role="alert"
          >
            <p className={`${voiceEngineError ? 'text-red-300' : 'text-amber-300'} text-xs font-semibold mb-0.5`}>
              {voiceEngineError ? 'Voice input issue' : 'Voice info'}
            </p>
            <p className={`${voiceEngineError ? 'text-red-400/70' : 'text-amber-400/70'} text-[11px] leading-relaxed`}>
              {voiceEngineError || dictationError || 'Speech recognition is not supported in this browser.'}
            </p>
          </motion.div>
        )}

        {/* Question card */}
        {currentQuestion && (
          <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-mono text-slate-500 bg-white/[0.03] px-2.5 py-1 rounded-lg border border-white/[0.04]">
                Q{currentIndex + 1}/{questions.length}
              </span>
              {currentQuestion.type === 'mcq' && (
                <span className="text-[11px] text-indigo-400 bg-indigo-500/[0.08] px-2 py-0.5 rounded-lg border border-indigo-500/[0.1] font-semibold">MCQ</span>
              )}
              {currentQuestion.marks && (
                <span className="text-[11px] text-slate-500">{currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}</span>
              )}
              {savedAnswer && (
                <span className="ml-auto bg-emerald-500/[0.08] text-emerald-400 text-[11px] px-2.5 py-1 rounded-lg border border-emerald-500/[0.1] font-medium">
                  ✓ {savedAnswer.selectedOption !== undefined ? `Option ${savedAnswer.selectedOption + 1}` : 'Answered'}
                </span>
              )}
            </div>
            <p className="text-white text-lg leading-relaxed font-medium">{currentQuestion.text}</p>

            {/* MCQ Option Cards */}
            {currentQuestion.type === 'mcq' && currentQuestion.options && currentQuestion.options.length > 0 && (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQuestion.options.map((opt, oi) => {
                  const isSelected = savedAnswer?.selectedOption === oi;
                  return (
                    <motion.div
                      key={oi}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: oi * 0.08 }}
                      className={`rounded-xl p-4 border transition-all ${
                        isSelected
                          ? 'bg-emerald-500/[0.08] border-emerald-500/[0.2] shadow-sm shadow-emerald-500/10'
                          : 'bg-white/[0.02] border-white/[0.05] hover:border-indigo-400/[0.15]'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
                          isSelected
                            ? 'bg-emerald-500/[0.15] text-emerald-300 border border-emerald-500/[0.2]'
                            : 'bg-indigo-500/[0.08] text-indigo-300 border border-indigo-500/[0.1]'
                        }`}>
                          {oi + 1}
                        </div>
                        <div className="flex-1">
                          <p className={`text-sm leading-relaxed ${isSelected ? 'text-emerald-200 font-medium' : 'text-slate-300'}`}>
                            {opt}
                          </p>
                          <p className="text-[10px] text-slate-600 mt-1 font-mono">
                            Say "Option {oi + 1}"
                          </p>
                        </div>
                        {isSelected && <span className="text-emerald-400 text-sm mt-1">✓</span>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* AI answer review */}
        <AnimatePresence>
          {voiceState === 'ANSWER_REVIEW' && (
            <FormattedAnswerReview
              rawText={rawTranscript} formattedText={formattedAnswer}
              isFormatting={isFormatting} formatError={formatError} questionNumber={currentIndex + 1}
            />
          )}
        </AnimatePresence>

        {/* Saved answer readback */}
        <AnimatePresence>
          {voiceState === 'COMMAND_MODE' && savedAnswer && (
            <motion.div key="saved" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card rounded-xl p-4 border-emerald-500/[0.06]">
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-2">Saved Answer</p>
              <p className="text-slate-300 text-sm leading-relaxed">{savedAnswer.formattedText}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause overlay */}
        <AnimatePresence>
          {voiceState === 'PAUSE_MODE' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-[#0a0e1a]/90 backdrop-blur-md flex items-center justify-center">
              <div className="text-center space-y-5">
                <div className="w-20 h-20 rounded-3xl bg-amber-500/[0.08] border border-amber-500/[0.12] flex items-center justify-center mx-auto">
                  <span className="text-amber-400 text-3xl">⏸</span>
                </div>
                <h2 className="text-white text-2xl font-bold tracking-tight">Exam Paused</h2>
                <p className="text-amber-300/80 text-sm font-mono">Say "Resume exam" to continue</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submission gate */}
        <AnimatePresence>
          {voiceState === 'SUBMISSION_GATE' && (
            <SubmissionGate
              windowSeconds={20}
              onTimeout={() => { transition('COMMAND_MODE'); speak('Submission cancelled. Returning to exam.'); }}
            />
          )}
        </AnimatePresence>

        {/* Last heard text feedback */}
        {voiceState === 'COMMAND_MODE' && (interimRawText || lastRawText) && (
          <motion.div
            key={interimRawText || lastRawText}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card rounded-xl px-4 py-2.5 flex items-center gap-3"
          >
            <span className="text-[10px] text-slate-600 uppercase tracking-widest shrink-0 font-semibold">
              {interimRawText ? 'Hearing' : 'Heard'}
            </span>
            <span className={`text-sm italic truncate ${
              interimRawText ? 'text-indigo-300/70' : 'text-slate-400'
            }`}>
              {interimRawText || lastRawText}
            </span>
            {!interimRawText && failCount > 0 && (
              <span className="ml-auto text-amber-400/50 text-[10px] shrink-0 font-medium">no match</span>
            )}
          </motion.div>
        )}

        {/* Command hints */}
        {voiceState === 'COMMAND_MODE' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {(currentQuestion?.type === 'mcq' ? [
              { cmd: '"Option 1"', icon: '①' }, { cmd: '"Option 2"', icon: '②' },
              { cmd: '"Option 3"', icon: '③' }, { cmd: '"Option 4"', icon: '④' },
              { cmd: '"Next question"', icon: '→' }, { cmd: '"Previous"', icon: '←' },
              { cmd: '"Repeat"', icon: '↻' }, { cmd: '"Submit exam"', icon: '↗' },
            ] : [
              { cmd: '"Start answering"', icon: '◉' }, { cmd: '"Next question"', icon: '→' },
              { cmd: '"Previous"', icon: '←' }, { cmd: '"Repeat"', icon: '↻' },
              { cmd: '"Read answer"', icon: '◈' }, { cmd: '"Clear answer"', icon: '⊘' },
              { cmd: '"Pause exam"', icon: '‖' }, { cmd: '"Submit exam"', icon: '↗' },
            ]).map(item => (
              <div key={item.cmd} className="bg-white/[0.02] border border-white/[0.03] rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-indigo-400/40 text-xs">{item.icon}</span>
                <span className="text-slate-500 text-[11px] font-mono">{item.cmd}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Progress dots */}
        {questions.length > 0 && questions.length <= 30 && (
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            {questions.map((q, i) => (
              <div key={q.id} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                i === currentIndex
                  ? 'bg-indigo-400 scale-125 shadow-sm shadow-indigo-400/50'
                  : answers.has(q.id)
                  ? 'bg-emerald-500/80'
                  : 'bg-white/[0.06]'
              }`} />
            ))}
          </div>
        )}

        <p className="text-center text-slate-600 text-[11px] mt-1 tracking-wide">
          {answers.size} of {questions.length} answered · Voice-only mode
        </p>
      </div>
    </div>
  );
}

export default ExamInterface;