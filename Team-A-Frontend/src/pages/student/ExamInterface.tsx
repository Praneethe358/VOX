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

interface Question { id: number | string; text: string; marks?: number; }
interface SavedAnswer { questionId: string | number; rawText: string; formattedText: string; }

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
    speak(`Question ${currentIndex + 1} of ${questions.length}. ${currentQuestion.text}. Say start answering to record your answer.`, { rate: 0.9 });
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
        if (currentQuestion) speak(`Question ${currentIndex + 1}. ${currentQuestion.text}`);
        break;
      case 'start_answering':
        if (voiceState !== 'COMMAND_MODE') return;
        stopEngine();
        setRawTranscript(''); setFormattedAnswer(''); resetDictation();
        transition('DICTATION_MODE');
        await speak('Dictation active. Speak your answer now. I will stop after 3 seconds of silence.');
        startDictation();
        break;
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

  // Read hint when repeated failures
  useEffect(() => {
    if (failCount >= 3 && voiceState === 'COMMAND_MODE') {
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-4">
          <div className="text-7xl">✅</div>
          <h2 className="text-white text-2xl font-bold">Exam Submitted</h2>
          <p className="text-slate-400">Redirecting…</p>
        </motion.div>
      </div>
    );
  }

  // ── Main UI ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col select-none">

      <StatusBar
        currentQ={currentIndex + 1}
        totalQ={questions.length}
        remainingSeconds={remaining}
        isSaving={isSaving}
        lastSaved={lastSaved}
        voiceState={voiceState}
        examTitle={examTitle}
      />

      <div className="flex-1 flex flex-col gap-4 p-6 max-w-3xl mx-auto w-full">

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
            className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
            role="alert"
          >
            <p className="text-red-300 text-sm font-semibold mb-1">Voice input is unavailable</p>
            <p className="text-red-200 text-xs leading-relaxed">
              {voiceEngineError || dictationError || 'Speech recognition is not supported in this browser.'}
            </p>
            {voiceEngineError?.toLowerCase().includes('whisper') && (
              <p className="text-red-200/80 text-[11px] mt-1">
                Whisper fallback needs backend `/api/ai/stt-command` and a working `whisper` binary on the server.
              </p>
            )}
          </motion.div>
        )}

        {/* Question card */}
        {currentQuestion && (
          <motion.div key={currentQuestion.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="bg-gradient-to-br from-slate-800/70 to-slate-900/70 border border-slate-700/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-indigo-400 font-mono text-sm">Q {currentIndex + 1} / {questions.length}</span>
              {savedAnswer && <span className="ml-auto bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full">✓ Answered</span>}
            </div>
            <p className="text-white text-xl leading-relaxed font-medium">{currentQuestion.text}</p>
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
              className="bg-slate-800/40 border border-green-500/20 rounded-xl p-4">
              <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Your Saved Answer</p>
              <p className="text-slate-200 leading-relaxed">{savedAnswer.formattedText}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pause overlay */}
        <AnimatePresence>
          {voiceState === 'PAUSE_MODE' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/75 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-7xl">⏸</div>
                <h2 className="text-white text-3xl font-bold">Exam Paused</h2>
                <p className="text-yellow-300 text-lg font-mono">Say "Resume exam" to continue</p>
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
            className="bg-slate-800/40 border border-slate-700/30 rounded-xl px-4 py-2 flex items-center gap-2"
          >
            <span className="text-slate-500 text-xs uppercase tracking-widest shrink-0">
              {interimRawText ? 'Hearing' : 'Heard'}
            </span>
            <span className={`text-sm italic truncate ${
              interimRawText ? 'text-indigo-300/80' : 'text-slate-300'
            }`}>
              {interimRawText || lastRawText}
            </span>
            {!interimRawText && failCount > 0 && (
              <span className="ml-auto text-yellow-400/70 text-xs shrink-0">no match</span>
            )}
          </motion.div>
        )}

        {/* Command hints */}
        {voiceState === 'COMMAND_MODE' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { cmd: '"Start answering"', icon: '🎙️' }, { cmd: '"Next question"', icon: '➡️' },
              { cmd: '"Previous question"', icon: '⬅️' }, { cmd: '"Repeat question"', icon: '🔁' },
              { cmd: '"Read my answer"', icon: '📖' }, { cmd: '"Clear answer"', icon: '🗑️' },
              { cmd: '"Pause exam"', icon: '⏸' }, { cmd: '"Submit exam"', icon: '📤' },
            ].map(item => (
              <div key={item.cmd} className="bg-slate-800/30 border border-slate-700/30 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-sm">{item.icon}</span>
                <span className="text-slate-400 text-xs font-mono">{item.cmd}</span>
              </div>
            ))}
          </motion.div>
        )}

        {/* Progress dots */}
        {questions.length > 0 && questions.length <= 30 && (
          <div className="flex flex-wrap gap-1.5 justify-center mt-2">
            {questions.map((q, i) => (
              <div key={q.id} className={`w-3 h-3 rounded-full transition-colors ${
                i === currentIndex ? 'bg-indigo-400 scale-125' : answers.has(q.id) ? 'bg-green-500' : 'bg-slate-700'
              }`} />
            ))}
          </div>
        )}

        <p className="text-center text-slate-600 text-xs mt-2">
          {answers.size} of {questions.length} answered · Voice-only mode
        </p>
      </div>
    </div>
  );
}

export default ExamInterface;