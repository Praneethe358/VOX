/**
 * ExamSelector.tsx - Browse and select exams to take after login
 *
 * Voice-enabled: Auto-reads exam list, accepts "select exam 1", "exam 2",
 * "go to dashboard", "help" etc.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import { ExamData } from '../../types/student/exam.types';
import apiService from '../../services/student/api.service';
import { useVoiceNavigation, NavCommand } from '../../hooks/useVoiceNavigation';
import { useAutoSpeak } from '../../hooks/useAutoSpeak';
import { useVoiceContext } from '../../context/VoiceContext';
import { VoiceCommandEngine } from '../../components/student/VoiceCommandEngine';
import { VoiceListener } from '../../components/student/VoiceListener';
import { VoiceSpeaker } from '../../components/student/VoiceSpeaker';
import VoxLogo from '../../components/branding/VoxLogo';
import ExamIcon from '../../components/icons/ExamIcon';

export function ExamSelector() {
  const navigate = useNavigate();
  const { student, setStudent, updateAuthState } = useExamContext();
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const { speak } = useVoiceContext();

  // ── Voice: auto-speak greeting ─────────────────────────────────────────
  useAutoSpeak(
    () => {
      if (!student) return null;
      const hour = new Date().getHours();
      const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
      return `${greeting}, ${student.name}. Welcome to your exams.`;
    },
    [student?.name],
    { delay: 400 },
  );

  // ── Voice: auto-speak exam list ────────────────────────────────────────
  useAutoSpeak(
    () => {
      if (loading) return null;
      if (exams.length === 0) return 'There are no exams available right now.';

      const examList = exams
        .slice(0, 5)
        .map((e, i) => `say Exam ${i + 1} for ${e.title}`)
        .join(', ');

      let text = `Please select the exam. ${examList}.`;
      if (exams.length > 5) {
        text += ` and ${exams.length - 5} more exams are published.`;
      }
      return text;
    },
    [loading, exams.length],
    { delay: 900 },
  );

  // ── Voice: navigation + exam selection ─────────────────────────────────
  const handleVoiceCommand = useCallback(
    (cmd: NavCommand) => {
      if (cmd.action === 'select_exam' && cmd.param) {
        const idx = parseInt(cmd.param, 10) - 1;
        if (idx >= 0 && idx < exams.length) {
          const selected = exams[idx];
          speak(`Starting ${selected.title}.`);
          handleExamSelect(selected);
          return true; // handled
        } else {
          speak(`Exam ${cmd.param} not found. There are ${exams.length} exams available.`);
          return true;
        }
      }
      return false; // let default handler do navigation
    },
    [exams, speak],
  );

  const handleUnknownCommand = useCallback(
    (raw: string) => {
      speak(`I didn't understand "${raw}". Say "help" for available commands, or "select exam" followed by a number.`);
    },
    [speak],
  );

  const { isListening, lastCommand, lastHeard, error: voiceError } = useVoiceNavigation({
    enabled: !loading,
    onCommand: handleVoiceCommand,
    onUnknownCommand: handleUnknownCommand,
    pageName: 'the exam selection page',
  });

  // Restore student profile from sessionStorage when context is empty (page refresh)
  useEffect(() => {
    if (!student && sessionStorage.getItem('studentAuth') === 'true') {
      const savedData = sessionStorage.getItem('studentData');
      if (savedData) {
        try {
          const profile = JSON.parse(savedData);
          setStudent(profile);
          updateAuthState({ isAuthenticated: true, student: profile, faceVerified: true });
        } catch { /* malformed JSON — clear stale data */ }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect only when there is genuinely no session
  useEffect(() => {
    if (!student && sessionStorage.getItem('studentAuth') !== 'true') {
      navigate('/student/login');
    }
  }, [student, navigate]);

  // Load available exams
  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAvailableExams();
      const apiExams = (response.data as { exams?: ExamData[] } | ExamData[] | undefined);
      const rawExams = Array.isArray(apiExams)
        ? apiExams
        : Array.isArray(apiExams?.exams)
        ? apiExams.exams
        : [];

      const parsedExams = rawExams.map((exam: any, examIndex: number) => {
        if (exam.examCode && exam.sections) {
          return exam as ExamData;
        }

        const questions = Array.isArray(exam.questions) ? exam.questions : [];
        return {
          examCode: exam.examCode || exam.code || `exam-${examIndex + 1}`,
          title: exam.title || 'Untitled Exam',
          subject: exam.subject || 'General',
          description: exam.description || 'Exam from tutor portal',
          durationMinutes: Number(exam.durationMinutes || 30),
          totalMarks: Number(exam.totalMarks || questions.length || 100),
          voiceNavigationEnabled: true,
          voiceLanguage: 'en',
          questionReadingEnabled: true,
          multilingualEnabled: false,
          supportedLanguages: ['en'],
          sections: [
            {
              sectionId: 'sec-1',
              sectionName: 'Section A',
              totalMarks: Number(exam.totalMarks || questions.length || 100),
              questions: questions.map((question: any, questionIndex: number) => ({
                questionId: String(question.questionId || question.id || `q-${questionIndex + 1}`),
                sectionId: 'sec-1',
                text: question.text || 'Question text unavailable',
                marks: Number(question.marks || 1),
                difficulty: question.difficulty || 'medium',
                type: question.type || 'descriptive',
                expectedAnswerLength: question.expectedAnswerLength || 'medium',
                order: Number(question.order || questionIndex + 1),
              })),
            },
          ],
          aiConfig: {
            sttEngine: 'vosk',
            sttLanguage: 'en',
            llmModel: 'llama3.2',
            grammarCorrectionEnabled: true,
            answerFormatting: true,
            autoSaveInterval: 20,
          },
        } as ExamData;
      });

      setExams(parsedExams);
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExamSelect = (exam: ExamData) => {
    // Navigate to pre-exam checklist
    navigate(`/student/exam/${exam.examCode}/checklist`, { state: { exam } });
  };

  const getExamStatus = (exam: ExamData): 'available' | 'completed' | 'upcoming' => {
    if (exam.examCode.includes('completed')) return 'completed';
    if (exam.examCode.includes('upcoming')) return 'upcoming';
    return 'available';
  };

  const availableExams = exams.filter(e => getExamStatus(e) === 'available');
  const completedExams = exams.filter(e => getExamStatus(e) === 'completed');
  const upcomingExams = exams.filter(e => getExamStatus(e) === 'upcoming');

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <section className="screen" id="s-examselect">
      {/* Voice UI overlays */}
      <VoiceListener isListening={isListening} mode="Navigation" position="top-right" />
      <VoiceSpeaker position="bottom-center" />
      <VoiceCommandEngine
        isListening={isListening}
        lastCommand={lastCommand}
        position="bottom-right"
        hints={[
          { command: '"Select exam 1"', icon: '📝', description: 'Select exam by number' },
          { command: '"Dashboard"',     icon: '🏠', description: 'Go to dashboard' },
          { command: '"Help"',          icon: '❓', description: 'List all commands' },
        ]}
      />

      {/* Voice feedback toast */}
      {(lastHeard || voiceError) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
          <div className="rounded-2xl px-5 py-3 text-sm text-center border" style={{
            background: 'var(--surface2)',
            backdropFilter: 'blur(12px)',
            borderColor: voiceError
              ? 'rgba(239, 68, 68, 0.2)'
              : lastHeard.startsWith('OK:')
              ? 'rgba(34, 197, 94, 0.2)'
              : 'rgba(255, 255, 255, 0.08)',
            color: voiceError
              ? 'var(--red-lt)'
              : lastHeard.startsWith('OK:')
              ? 'var(--green-lt)'
              : 'var(--text-sec)',
          }}>
            {voiceError ?? lastHeard}
          </div>
        </div>
      )}

      {/* Topbar */}
      <div className="es-topbar">
        <div className="landing-brand" style={{ margin: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="40" height="30" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0 24 L 6 24 C 9 24, 9 10, 12 10 C 15 10, 15 24, 18 24 C 21 24, 21 4, 24 4 C 27 4, 27 32, 30 32 C 33 32, 33 16, 36 16 C 39 16, 39 24, 42 24 L 48 24" 
              stroke="var(--wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '18px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>VOX</span>
        </div>
        <div className="es-topbar-actions">
          <div className="icon-btn" onClick={() => navigate('/')} title="Logout">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </div>
          <div className="avatar-chip">
            {student?.name.substring(0,2).toUpperCase() || 'ST'}
          </div>
        </div>
      </div>

      <div className="es-content">
        <div className="es-greeting">
          {(() => {
            const h = new Date().getHours();
            return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
          })()}, {student.name.split(' ')[0]}
        </div>
        <div className="es-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {exams.length} exams available
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent-lt animate-spin mb-4" />
            <p className="text-sec text-sm">Loading assessments...</p>
          </div>
        ) : (
          <>
            {/* Available Exams */}
            {availableExams.length > 0 && (
              <>
                <div className="sec-label">Available Now</div>
                {availableExams.map((exam, idx) => {
                  const questionCount = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
                  const iconLetter = exam.title.charAt(0).toUpperCase() || 'A';
                  return (
                    <div className="exam-card" key={exam.examCode} onClick={() => handleExamSelect(exam)}>
                      <div className="ex-icon ph">{iconLetter}</div>
                      <div className="ex-info">
                        <div className="ex-name">{exam.title}</div>
                        <div className="ex-meta">
                          {exam.durationMinutes} mins <span className="dot">•</span> {questionCount} Questions <span className="dot">•</span> {exam.totalMarks} Marks
                        </div>
                        <div className="chip chip-avail">
                          <div className="chip-dot"></div>Available
                        </div>
                      </div>
                      <button className="ex-btn primary" onClick={(e) => { e.stopPropagation(); handleExamSelect(exam); }} style={{ borderRadius: '8px' }}>
                        Start exam
                      </button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Completed Exams */}
            {completedExams.length > 0 && (
              <>
                <div className="sec-label" style={{ marginTop: '32px' }}>Completed</div>
                {completedExams.map((exam, idx) => {
                  const questionCount = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
                  const iconLetter = exam.title.charAt(0).toUpperCase() || 'C';
                  return (
                    <div className="exam-card" key={exam.examCode} style={{ opacity: 0.85 }}>
                      <div className="ex-icon ch">{iconLetter}</div>
                      <div className="ex-info">
                        <div className="ex-name">{exam.title}</div>
                        <div className="ex-meta">
                          {exam.durationMinutes} mins <span className="dot">•</span> {questionCount} Questions <span className="dot">•</span> {exam.totalMarks} Marks
                        </div>
                        <div className="chip chip-done">
                          <div className="chip-dot"></div>Completed
                        </div>
                      </div>
                      <button className="ex-btn ghost" style={{ borderRadius: '8px' }}>View results</button>
                    </div>
                  );
                })}
              </>
            )}

            {/* Upcoming Exams */}
            {upcomingExams.length > 0 && (
              <>
                <div className="sec-label" style={{ marginTop: '32px' }}>Upcoming</div>
                {upcomingExams.map((exam, idx) => {
                  const questionCount = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
                  const iconLetter = exam.title.charAt(0).toUpperCase() || 'U';
                  return (
                    <div className="exam-card" key={exam.examCode} style={{ opacity: 0.6 }}>
                      <div className="ex-icon ma">{iconLetter}</div>
                      <div className="ex-info">
                        <div className="ex-name">{exam.title}</div>
                        <div className="ex-meta">
                          {exam.durationMinutes} mins <span className="dot">•</span> {questionCount} Questions <span className="dot">•</span> {exam.totalMarks} Marks
                        </div>
                        <div className="chip chip-lock">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '4px' }}>
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          LOCKED
                        </div>
                      </div>
                      <button className="ex-btn locked" disabled>Start Exam</button>
                    </div>
                  );
                })}
              </>
            )}
            
            {exams.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-sec)', fontSize: '14px' }}>
                No assessments available at this time.
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default ExamSelector;
