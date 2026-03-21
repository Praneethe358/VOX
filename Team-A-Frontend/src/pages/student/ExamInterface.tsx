/**
 * ExamInterface.tsx — Vox hands-free exam page.
 *
 * No buttons. No mouse. No keyboard.
 * 13 voice commands, AI answer formatting, auto-save every 15 s.
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
import ModeIndicator from '../../components/student/ModeIndicator';
import StatusBar from '../../components/student/StatusBar';
import TimerDisplay from '../../components/student/TimerDisplay';
import SubmissionGate from '../../components/student/SubmissionGate';
import FormattedAnswerReview from '../../components/student/FormattedAnswerReview';
import LiveTranscript from '../../components/student/LiveTranscript';
import { AnswerInputBox } from '../../components/student/AnswerInputBox';
import { useToast } from '../../components/Toast';

import { studentApi, unifiedApiClient } from '../../api/client';
import { bridge } from '../../api/bridge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question { id: number | string; text: string; marks?: number; type?: 'mcq' | 'descriptive' | 'numerical'; options?: string[]; correctAnswer?: number; expectedAnswerLength?: 'short' | 'medium' | 'long'; difficulty?: 'easy' | 'medium' | 'hard'; }
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
  const toast = useToast();

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
  const [heardText, setHeardText] = useState('');          // always show what mic heard
  const [heardMatched, setHeardMatched] = useState(false);  // did it match a command?
  // Written answer support
  const [writtenAnswers, setWrittenAnswers] = useState<Map<string | number, string>>(new Map());
  const [isWrittenDictation, setIsWrittenDictation] = useState(false);  // flag: are we dictating for written answer?

  // Resolve studentId from all possible fields
  const resolvedStudentId = (student as any)?.studentId || (student as any)?.rollNumber || (student as any)?.registerNumber || sessionStorage.getItem('studentId') || 'UNKNOWN';
  const resolvedStudentName = (student as any)?.name || (student as any)?.fullName || sessionStorage.getItem('studentName') || 'Student';

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
            type: q.type === 'mcq' ? 'mcq' : (q.type === 'numerical' ? 'numerical' : 'descriptive'),
            options: Array.isArray(q.options) ? q.options : undefined,
            correctAnswer: q.correctAnswer,
            expectedAnswerLength: q.expectedAnswerLength ?? 'medium',
            difficulty: q.difficulty ?? 'medium',
          }));
          setQuestions(qs);
        }
      } catch { /* continue */ }
    };
    load();
    transition('COMMAND_MODE');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Auto-read question when index changes ───────────────────────────────────
  useEffect(() => {
    if (!currentQuestion || voiceState !== 'COMMAND_MODE') return;
    if (questionReadRef.current === currentQuestion.id) return;
    questionReadRef.current = currentQuestion.id;
    setCurrentQuestionText(currentQuestion.text);
    if (currentQuestion.type === 'mcq' && currentQuestion.options?.length) {
      const optionsText = currentQuestion.options.map((o, i) => `Option ${i + 1}: ${o}`).join('. ');
      speak(`Question ${currentIndex + 1} of ${questions.length}. ${currentQuestion.text}. ${optionsText}. Say option 1, 2, 3, or 4 to answer.`, { rate: 0.9 });
    } else {
      speak(`Question ${currentIndex + 1} of ${questions.length}. ${currentQuestion.text}. Say start answer or start answering to record your response. You can also type your answer in the text box below.`, { rate: 0.9 });
    }
  }, [currentIndex, questions.length, voiceState, currentQuestion, speak]);

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

  // ► PWA Migration (March 2026): Cleanup fullscreen on unmount
  // Ensures fullscreen is released when leaving exam view.
  // See: src/api/bridge.ts for exitKiosk implementation
  useEffect(() => {
    return () => {
      void bridge.exitKiosk();
    };
  }, []);

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
      await speak('No speech detected.');
      if (isWrittenDictation) {
        transition('COMMAND_MODE');
      } else {
        transition('COMMAND_MODE');
      }
      return;
    }

    // For written questions: keep answer equal to this dictation session transcript
    if (isWrittenDictation && currentQuestion && currentQuestion.type !== 'mcq') {
      setWrittenAnswers(prev => new Map(prev).set(currentQuestion.id, transcript));
      await speak('Dictation updated. Say continue dictation to add more, confirm answer to save, or edit answer to redo.');
      transition('COMMAND_MODE');
      return;
    }

    // For MCQ: go to answer review (original behavior)
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
  }, [speak, transition, setRawTranscript, setFormattedAnswer, currentQuestion, isWrittenDictation]);

  const { isRecording, interimText, finalText: dictationFinalText, lastError: dictationError, start: startDictation, stop: stopDictation, reset: resetDictation } =
    useDictation({ onDictationEnd: handleDictationEnd, silenceTimeout: 10_000 });

  // Keep written answer draft synced with finalized dictated text while recording.
  useEffect(() => {
    if (!isRecording || !isWrittenDictation || !currentQuestion || currentQuestion.type === 'mcq') return;
    setWrittenAnswers(prev => {
      const existing = prev.get(currentQuestion.id) || '';
      if (!dictationFinalText || existing === dictationFinalText) return prev;
      const next = new Map(prev);
      next.set(currentQuestion.id, dictationFinalText);
      return next;
    });
  }, [isRecording, isWrittenDictation, currentQuestion, dictationFinalText]);

  // ── Command handler ─────────────────────────────────────────────────────────
  async function handleCommand(action: string, _confidence: number, rawText?: string) {
    // Always update the heard-text display
    if (rawText) { setHeardText(rawText); setHeardMatched(true); }

    if (silenceWarnTimerRef.current) { clearTimeout(silenceWarnTimerRef.current); silenceWarnTimerRef.current = null; }

    // Cancel pending clear if any command other than confirm_clear arrives
    if (confirmClearPending && action !== 'confirm_clear') {
      setConfirmClearPending(false);
    }

    // In SUBMISSION_GATE, accept confirmation-like commands
    if (voiceState === 'SUBMISSION_GATE') {
      if (action === 'confirm_submission' || action === 'submit_exam' || action === 'im_ready' || action === 'confirm_answer') {
        finalizeSubmission();
        return;
      }
      // Any other recognized command cancels
      transition('COMMAND_MODE');
      speak('Submission cancelled. Returning to exam.');
      return;
    }

    switch (action) {
      case 'start_exam':
        speak('Exam is in progress. Say a command like next question, option 1, or start answering.');
        break;
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
        if (voiceState === 'ANSWER_REVIEW') {
          // Allow re-starting dictation from answer review
          stopEngine(); setRawTranscript(''); setFormattedAnswer(''); resetDictation();
          setIsWrittenDictation(!!currentQuestion && currentQuestion.type !== 'mcq');
          transition('DICTATION_MODE');
          await speak('Re-dictating. Speak your new answer.');
          startDictation();
          return;
        }
        if (voiceState !== 'COMMAND_MODE') return;
        if (currentQuestion?.type === 'mcq') { speak('This is a multiple choice question, please select an option.'); return; }
        stopEngine();
        setRawTranscript(''); setFormattedAnswer(''); resetDictation();
        setIsWrittenDictation(true);
        transition('DICTATION_MODE');
        await speak('Dictation active. Speak your answer now. I will stop after 10 seconds of silence.');
        startDictation();
        break;
      case 'start_answer':
        // New command for written questions: directly start recording for written answer
        if (voiceState !== 'COMMAND_MODE') return;
        if (!currentQuestion || currentQuestion.type === 'mcq') { speak('This is a multiple choice question, please select an option.'); return; }
        stopEngine();
        setIsWrittenDictation(true);
        resetDictation();
        transition('DICTATION_MODE');
        await speak('Dictation active. Speak your written answer now. I will stop after 10 seconds of silence.');
        startDictation();
        break;
      case 'option_1': case 'option_2': case 'option_3': case 'option_4': {
        if (voiceState !== 'COMMAND_MODE') return;
        if (currentQuestion?.type !== 'mcq' || !currentQuestion.options?.length) {
          speak('This is a descriptive question, please say start answering.');
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
        try { await studentApi.saveResponse({ studentId: resolvedStudentId, examCode, questionId: typeof currentQuestion.id === 'number' ? currentQuestion.id : parseInt(String(currentQuestion.id), 10) || (currentIndex + 1), rawAnswer: `Option ${optNum + 1}`, formattedAnswer: optText, confidence: 1 }); } catch { }
        speak(`Option ${optNum + 1} selected: ${optText}.`);
        // Auto-advance to next question after a short delay
        if (currentIndex < questions.length - 1) {
          setTimeout(() => { questionReadRef.current = null; setCurrentIndex(i => i + 1); }, 1800);
        } else {
          setTimeout(() => speak('All questions answered. Say submit exam when ready.'), 2000);
        }
        break;
      }
      case 'stop_dictating':
        if (voiceState !== 'DICTATION_MODE') return;
        stopDictation();
        break;
      case 'confirm_answer':
        if (voiceState !== 'ANSWER_REVIEW' && voiceState !== 'COMMAND_MODE') return;
        // For written answers in COMMAND_MODE, save the written answer
        if (voiceState === 'COMMAND_MODE' && currentQuestion && currentQuestion.type !== 'mcq') {
          const writtenText = writtenAnswers.get(currentQuestion.id) || '';
          if (!writtenText.trim()) {
            speak('No answer to confirm. Say start answer to record.');
            return;
          }
          confirmWrittenAnswer(currentQuestion.id, writtenText);
          return;
        }
        // For MCQ in ANSWER_REVIEW, confirm the formatted answer
        confirmAnswer();
        break;
      case 'edit_answer':
        if (currentQuestion && currentQuestion.type !== 'mcq' && voiceState === 'COMMAND_MODE') {
          stopEngine();
          setWrittenAnswers(prev => {
            const next = new Map(prev);
            next.set(currentQuestion.id, '');
            return next;
          });
          setRawTranscript('');
          setFormattedAnswer('');
          resetDictation();
          setIsWrittenDictation(true);
          transition('DICTATION_MODE');
          await speak('Starting fresh. Speak your new answer now.');
          startDictation();
          return;
        }
        if (voiceState !== 'ANSWER_REVIEW') return;
        stopEngine(); setRawTranscript(''); setFormattedAnswer(''); resetDictation();
        setIsWrittenDictation(!!currentQuestion && currentQuestion.type !== 'mcq');
        transition('DICTATION_MODE');
        await speak('Re-dictating. Speak your new answer.');
        startDictation();
        break;
      case 'continue_dictation':
        if (voiceState !== 'ANSWER_REVIEW' && voiceState !== 'COMMAND_MODE') return;
        const isWrittenQuestion = !!currentQuestion && currentQuestion.type !== 'mcq';
        // For written answers in COMMAND_MODE, continue recording
        if (isWrittenQuestion) {
          const existingText = (writtenAnswers.get(currentQuestion!.id) || '').trim();
          stopEngine();
          setIsWrittenDictation(true);
          transition('DICTATION_MODE');
          await speak('Continuing. Speak to add more to your answer.');
          startDictation(existingText);
          return;
        }
        // For MCQ in ANSWER_REVIEW, continue recording
        const baseMcqText = (rawTranscript || formattedAnswer || '').trim();
        stopEngine(); transition('DICTATION_MODE');
        await speak('Continuing. Speak to add more to your answer.');
        startDictation(baseMcqText);
        break;
      case 'read_my_answer':
        if (voiceState !== 'COMMAND_MODE' && voiceState !== 'ANSWER_REVIEW') return;
        if (voiceState === 'ANSWER_REVIEW') {
          const reviewText = formattedAnswer || rawTranscript;
          reviewText ? speak(`Your current answer is: ${reviewText}`) : speak('No answer recorded yet.');
        } else {
          savedAnswer ? speak(`Your saved answer is: ${savedAnswer.formattedText}`) : speak('No answer saved for this question.');
        }
        break;
      case 'clear_answer':
        if (voiceState !== 'COMMAND_MODE') return;
        if (!savedAnswer) { speak('No answer to clear for this question.'); return; }
        setConfirmClearPending(true);
        speak('Say confirm clear to delete this answer, or any other command to cancel.');
        break;
      case 'confirm_clear':
        if (!confirmClearPending) { speak('Nothing to confirm. Say clear answer first.'); return; }
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
        {
          const totalAnswered = answers.size + writtenAnswers.size;
          const unanswered = questions.length - totalAnswered;
          const summaryMsg = unanswered > 0
            ? `You have ${unanswered} unanswered question${unanswered > 1 ? 's' : ''}. `
            : 'All questions answered. ';
          transition('SUBMISSION_GATE');
          await speak(`${summaryMsg}Say confirm submission, submit, or yes to finalize. Anything else will cancel.`);
        }
        break;
      case 'confirm_submission':
        // Handled by SUBMISSION_GATE guard above
        break;
      case 'im_ready':
        if (voiceState === 'PAUSE_MODE') { timerResume(); transition('COMMAND_MODE'); speak('Exam resumed.'); startEngine(); }
        else if (voiceState === 'COMMAND_MODE') speak('Listening for commands. Say help for available commands.');
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
    lastHeardText,
    wasMatched,
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
    if (failCount === 3) {
      if (voiceState === 'COMMAND_MODE') {
        const isMcq = currentQuestion?.type === 'mcq';
        const isWritten = !!currentQuestion && currentQuestion.type !== 'mcq';
        if (isMcq) {
          speak('Available commands: Option 1, 2, 3, or 4. Next question. Previous question. Repeat question. Pause exam. Submit exam.');
        } else if (isWritten) {
          speak('Available commands: Start answer to record. Continue dictation to add more. Confirm answer to save. Next question. Previous question. Repeat question. Pause exam. Submit exam.');
        } else {
          speak('Available commands: Start answering. Next question. Previous question. Repeat question. Read my answer. Clear answer. Pause exam. Submit exam.');
        }
      } else if (voiceState === 'ANSWER_REVIEW') {
        speak('Available commands: Confirm answer. Edit answer. Continue dictation. Repeat question.');
      } else if (voiceState === 'PAUSE_MODE') {
        speak('Say resume exam or I am back to continue.');
      } else if (voiceState === 'SUBMISSION_GATE') {
        speak('Say confirm submission to submit, or any other command to cancel.');
      }
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
    try { await studentApi.autoSaveSession({ sessionId, examCode, questionId: String(currentQuestion.id), draftAnswer: text } as any); } catch { }
    // Save to V1 autosave (MongoDB Atlas)
    try { await studentApi.v1AutosaveAnswer({ examSessionId: sessionId, questionNumber: typeof currentQuestion.id === 'number' ? currentQuestion.id : parseInt(String(currentQuestion.id), 10) || (currentIndex + 1), rawSpeechText: rawTranscript, formattedAnswer: text }); } catch { }
    // Save to legacy response store
    try { await studentApi.saveResponse({ studentId: resolvedStudentId, examCode, questionId: typeof currentQuestion.id === 'number' ? currentQuestion.id : parseInt(String(currentQuestion.id), 10) || (currentIndex + 1), rawAnswer: rawTranscript, formattedAnswer: text, confidence: 1 }); } catch { }
    // Log voice activity
    try { await studentApi.logAudit({ studentId: resolvedStudentId, examCode, action: 'ANSWER_SUBMITTED', metadata: { questionId: currentQuestion.id, wordCount: text.split(/\s+/).length } }); } catch { }
    await speak('Answer saved.' + (currentIndex < questions.length - 1 ? ' Moving to next question.' : ' All questions answered.'));
    transition('COMMAND_MODE');
    if (currentIndex < questions.length - 1) { questionReadRef.current = null; setCurrentIndex(i => i + 1); }
  }

  async function confirmWrittenAnswer(questionId: string | number, text: string) {
    if (!text.trim()) { speak('No answer to save.'); return; }
    // For written answers, save without AI formatting
    setAnswers(p => new Map(p).set(questionId, { questionId, rawText: text, formattedText: text }));
    playBeep('success');
    // Save to backend
    try { await studentApi.autoSaveSession({ sessionId, examCode, questionId: String(questionId), draftAnswer: text } as any); } catch { }
    try { await studentApi.v1AutosaveAnswer({ examSessionId: sessionId, questionNumber: typeof questionId === 'number' ? questionId : parseInt(String(questionId), 10) || (currentIndex + 1), rawSpeechText: text, formattedAnswer: text }); } catch { }
    try { await studentApi.saveResponse({ studentId: resolvedStudentId, examCode, questionId: typeof questionId === 'number' ? questionId : parseInt(String(questionId), 10) || (currentIndex + 1), rawAnswer: text, formattedAnswer: text, confidence: 1 }); } catch { }
    try { await studentApi.logAudit({ studentId: resolvedStudentId, examCode, action: 'ANSWER_SUBMITTED', metadata: { questionId, wordCount: text.split(/\s+/).length, answerType: 'written' } }); } catch { }
    await speak('Answer saved.' + (currentIndex < questions.length - 1 ? ' Moving to next question.' : ' All questions answered.'));
    setWrittenAnswers(prev => { const n = new Map(prev); n.delete(questionId); return n; });  // clear from draft
    transition('COMMAND_MODE');
    if (currentIndex < questions.length - 1) { questionReadRef.current = null; setCurrentIndex(i => i + 1); }
  }

  async function finalizeSubmission() {
    transition('FINALIZE');
    stopEngine(); stopSpeaking();
    await speak('Submitting your exam. Please wait.');
    const studentId = resolvedStudentId;
    const studentName = resolvedStudentName;

    // Merge written answers into saved answers for submission
    const allAnswers = new Map(answers);
    writtenAnswers.forEach((text, qId) => {
      if (!allAnswers.has(qId)) {
        allAnswers.set(qId, {
          questionId: qId,
          rawText: text,
          formattedText: text,
        });
      }
    });

    // Submit to legacy endpoint
    try { await studentApi.submitExamSession({ sessionId, examCode, studentId, studentName, answers: Array.from(allAnswers.values()) } as any); } catch { }
    // Submit to V1 endpoint
    try { await studentApi.v1SubmitSession(sessionId); } catch { }
    // Submit to legacy DB
    try { await studentApi.logAudit({ studentId, examCode, action: 'EXAM_SUBMITTED', metadata: { answeredCount: allAnswers.size, totalQuestions: questions.length, studentName } }); } catch { }
    // End exam via legacy student API
    try { await studentApi.endExam(studentId, examCode); } catch { }
    setIsSubmitted(true);
    playBeep('success');
    await speak('Exam submitted successfully. Thank you.');
    // ► PWA Migration (March 2026): Exit fullscreen before navigation
    // Releases kiosk lockdown on exam submission
    await bridge.exitKiosk();
    // Pass real answer data via navigation state
    const answeredCount = allAnswers.size;
    const totalQ = questions.length;
    const elapsedMin = Math.max(1, Math.round((durationMinutes * 60 - remaining) / 60));
    // For MCQ: count correct answers for estimated score
    let correctCount = 0;
    answers.forEach((ans) => {
      const q = questions.find(qq => String(qq.id) === String(ans.questionId));
      if (q?.type === 'mcq' && q.correctAnswer !== undefined && ans.selectedOption === q.correctAnswer) {
        correctCount++;
      }
    });
    setTimeout(() => navigate('/student/submission-confirmation', {
      state: {
        examTitle: examTitle,
        examCode,
        answeredQuestions: answeredCount,
        totalQuestions: totalQ,
        timeSpent: elapsedMin,
        durationMinutes,
        estimatedScore: correctCount,
        totalMarks: totalQ,
      },
    }), 2500);
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

  return (
    <section className="screen" id="s-examinterface">
      {/* ── Pause Overlay ── */}
      <AnimatePresence>
        {voiceState === 'PAUSE_MODE' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-bg2/90 backdrop-blur-md flex items-center justify-center">
            <div className="text-center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '28px' }}>⏸</span>
              </div>
              <h2 style={{ color: 'var(--text)', fontSize: '20px', fontWeight: 800, fontFamily: "'Manrope', sans-serif" }}>Exam Paused</h2>
              <p style={{ color: 'var(--amber-lt)', fontSize: '13px', opacity: 0.8 }}>Say <strong>"Resume exam"</strong> to continue</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Submission Gate ── */}
      <AnimatePresence>
        {voiceState === 'SUBMISSION_GATE' && (
          <SubmissionGate
            windowSeconds={60}
            onTimeout={() => { transition('COMMAND_MODE'); speak('Submission cancelled. Returning to exam.'); }}
          />
        )}
      </AnimatePresence>

      {/* === LAYOUT: sidebar + main === */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── SIDEBAR ── */}
        <div className="ei-sidebar">

          {/* Brand + exam name */}
          <div className="sidebar-brand">
            <svg width="30" height="22" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M 0 24 L 6 24 C 9 24, 9 10, 12 10 C 15 10, 15 24, 18 24 C 21 24, 21 4, 24 4 C 27 4, 27 32, 30 32 C 33 32, 33 16, 36 16 C 39 16, 39 24, 42 24 L 48 24"
                stroke="var(--wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-brand-name">VOX</div>
              <div className="sidebar-exam-name">{examTitle || 'Loading exam...'}</div>
            </div>
          </div>

          {/* Questions section */}
          <div>
            <div className="qs-label" style={{ marginBottom: '10px' }}>
              <span>Questions</span>
              <span className="stat-em">{answers.size} / {questions.length}</span>
            </div>
            <div className="q-grid">
              {questions.map((q, i) => {
                const isAnswered = answers.has(q.id);
                const isCurrent = i === currentIndex;
                return (
                  <div
                    key={q.id}
                    className={`qn${isCurrent ? ' cur' : isAnswered ? ' ans' : ''}`}
                    onClick={() => { questionReadRef.current = null; setCurrentIndex(i); }}
                    title={`Question ${i + 1}${isAnswered ? ' — Answered' : ''}`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="legend">
            <div className="leg-item"><div className="leg-dot cur" style={{ background: 'var(--accent)', borderRadius: '50%', width: '8px', height: '8px' }}></div> Current</div>
            <div className="leg-item"><div className="leg-dot a"></div> Answered</div>
            <div className="leg-item"><div className="leg-dot u"></div> Not answered</div>
          </div>

          {/* Voice widget */}
          <div className="voice-widget">
            <div className="vw-header">
              <span className="vw-label">Voice Engine</span>
              <div className="vw-status">
                <div
                  className="live-dot"
                  style={{ backgroundColor: isListening || isRecording ? 'var(--green-lt)' : 'var(--text-muted)', width: '6px', height: '6px', borderRadius: '50%', animation: (isListening || isRecording) ? 'blink 1s ease infinite' : 'none' }}
                />
                <span>{isRecording ? 'Dictating' : isListening ? 'Listening' : 'Ready'}</span>
              </div>
            </div>

            {/* Viz or heard text */}
            {(lastHeardText || heardText) ? (
              <div className={`vw-heard${(wasMatched || heardMatched) ? ' matched' : ''}`}>
                &ldquo;{lastHeardText || heardText}&rdquo;
              </div>
            ) : (
              <div className="vw-viz">
                <div className="bar" style={{ height: (isListening || isRecording) ? '70%' : '15%', opacity: (isListening || isRecording) ? 0.9 : 0.35 }} />
                <div className="bar" style={{ height: (isListening || isRecording) ? '100%' : '25%', opacity: (isListening || isRecording) ? 1 : 0.35 }} />
                <div className="bar" style={{ height: (isListening || isRecording) ? '50%' : '15%', opacity: (isListening || isRecording) ? 0.8 : 0.35 }} />
                <div className="bar" style={{ height: (isListening || isRecording) ? '85%' : '20%', opacity: (isListening || isRecording) ? 0.9 : 0.35 }} />
                <div className="bar" style={{ height: (isListening || isRecording) ? '40%' : '10%', opacity: (isListening || isRecording) ? 0.7 : 0.35 }} />
              </div>
            )}

            <div className="vw-footer">
              <span className="vw-state">{voiceState.replace(/_/g, ' ')}</span>
              <span>{isSaving ? '● Saving…' : lastSaved ? `✓ ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '—'}</span>
            </div>
          </div>
        </div>

        {/* ── MAIN AREA ── */}
        <div className="ei-main">

          {/* Header */}
          <div className="ei-header">
            <div className="ei-exam-lbl">{examTitle}</div>

            {/* Progress bar */}
            <div className="ei-header-divider" />
            <div className="ei-progress-wrap">
              <span className="ei-progress-label">{answers.size}/{questions.length} answered</span>
              <div className="ei-progress-bar">
                <div
                  className="ei-progress-fill"
                  style={{ width: questions.length ? `${(answers.size / questions.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <div className="ei-header-divider" />

            {/* Timer */}
            <div className="ei-timer">
              <svg className="ei-timer-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {Math.floor(remaining / 60).toString().padStart(2, '0')}:{(remaining % 60).toString().padStart(2, '0')}
            </div>

            {/* Auto-save tag */}
            {lastSaved && (
              <div className="saved-tag">
                <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                Saved
              </div>
            )}

            <button id="btn-submit-exam" className="ei-submit" onClick={() => handleCommand('submit_exam', 1)}>
              Submit Exam
            </button>
          </div>

          {/* Body */}
          <div className="ei-body">
            <div className="ei-body-content">

              {/* Voice error banner */}
              {(!isVoiceSupported || voiceEngineError || dictationError) && (
                <div style={{ padding: '10px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: '10px', color: 'var(--wave)', fontSize: '13px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>⚠</span>
                  <span><strong>Voice unavailable:</strong> {voiceEngineError || dictationError || 'Speech recognition not supported in this browser.'}</span>
                </div>
              )}

              {/* AI answer review */}
              <AnimatePresence>
                {voiceState === 'ANSWER_REVIEW' && (
                  <div style={{ marginBottom: '20px' }}>
                    <FormattedAnswerReview
                      rawText={rawTranscript} formattedText={formattedAnswer}
                      isFormatting={isFormatting} formatError={formatError} questionNumber={currentIndex + 1}
                    />
                  </div>
                )}
              </AnimatePresence>

              {/* Question Box */}
              {currentQuestion && (
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="question-box"
                >
                  {/* Top row */}
                  <div className="q-toprow">
                    <div className="q-id">Question {currentIndex + 1} <span>/ {questions.length}</span></div>
                    {currentQuestion.marks && (
                      <div className="marks-tag">{currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}</div>
                    )}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {savedAnswer && (
                        <span className="chip chip-done" style={{ fontSize: '10px', padding: '3px 9px' }}>
                          <div className="chip-dot" />&nbsp;Answered
                        </span>
                      )}
                      {currentQuestion.type === 'mcq' && (
                        <span className="chip chip-avail" style={{ fontSize: '10px', padding: '3px 9px' }}>
                          MCQ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question text */}
                  <div className="qb-text">{currentQuestion.text}</div>

                  {/* MCQ options */}
                  {currentQuestion.type === 'mcq' && currentQuestion.options && currentQuestion.options.length > 0 && (
                    <div className="options">
                      {currentQuestion.options.map((opt, oi) => {
                        const isSelected = savedAnswer?.selectedOption === oi;
                        return (
                          <div
                            key={oi}
                            className={`opt${isSelected ? ' sel' : ''}`}
                            onClick={() => handleCommand(`option_${oi + 1}`, 1)}
                          >
                            <div className="opt-ltr">{String.fromCharCode(65 + oi)}</div>
                            <div className="opt-txt">{opt}</div>
                            {isSelected && (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--green-lt)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Written Answer */}
                  {currentQuestion.type !== 'mcq' && (
                    <div style={{ marginTop: '20px' }}>
                      <AnswerInputBox
                        questionId={currentQuestion.id}
                        questionText={currentQuestion.text}
                        value={isRecording && isWrittenDictation
                          ? [dictationFinalText, interimText].filter(Boolean).join(' ').trim()
                          : (writtenAnswers.get(currentQuestion.id) || '')}
                        onChange={(text) => setWrittenAnswers(prev => new Map(prev).set(currentQuestion.id, text))}
                        isRecording={isRecording && isWrittenDictation}
                        interimText={interimText && isWrittenDictation ? interimText : ''}
                        iFormattedAnswer={formattedAnswer}
                        expectedAnswerLength={currentQuestion.expectedAnswerLength || 'medium'}
                        placeholder="Say 'start answer' to record, or type your answer here…"
                      />
                    </div>
                  )}
                </motion.div>
              )}

              {/* Voice hint for MCQ */}
              {currentQuestion?.type === 'mcq' && (
                <div className="voice-cue">
                  <span>💬</span> Say <strong style={{ color: 'var(--green-lt)', margin: '0 3px' }}>"Option A"</strong>, <strong style={{ color: 'var(--green-lt)', margin: '0 3px' }}>"B"</strong>, <strong style={{ color: 'var(--green-lt)', margin: '0 3px' }}>"C"</strong>, or <strong style={{ color: 'var(--green-lt)', margin: '0 3px' }}>"D"</strong> to select
                </div>
              )}

              {/* Command chips */}
              {(voiceState === 'COMMAND_MODE' || voiceState === 'ANSWER_REVIEW') && (
                <div className="cmd-chips">
                  {(voiceState === 'ANSWER_REVIEW' ? [
                    { cmd: 'Confirm', icon: '✓' }, { cmd: 'Edit', icon: '✎' }, { cmd: 'Continue', icon: '+' }, { cmd: 'Repeat', icon: '↻' },
                  ] : currentQuestion?.type === 'mcq' ? [
                    { cmd: 'Option A/1', icon: '①' }, { cmd: 'Next', icon: '→' }, { cmd: 'Previous', icon: '←' }, { cmd: 'Pause', icon: '⏸' }, { cmd: 'Submit', icon: '↗' },
                  ] : [
                    { cmd: 'Start answer', icon: '◉' }, { cmd: 'Continue', icon: '+' }, { cmd: 'Confirm', icon: '✓' }, { cmd: 'Next', icon: '→' }, { cmd: 'Submit', icon: '↗' },
                  ]).map(item => (
                    <div key={item.cmd} className="cmd-chip">
                      <span className="cmd-chip-icon">{item.icon}</span>
                      &ldquo;{item.cmd}&rdquo;
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ExamInterface;