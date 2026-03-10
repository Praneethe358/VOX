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

export function ExamSelector() {
  const navigate = useNavigate();
  const { student, authState, setStudent, updateAuthState } = useExamContext();
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'completed'>('available');
  const { speak } = useVoiceContext();

  // ── Voice: auto-speak exam list ────────────────────────────────────────
  useAutoSpeak(
    () => {
      if (loading || exams.length === 0) return null;
      const examList = exams
        .slice(0, 5)
        .map((e, i) => `Exam ${i + 1}: ${e.title}, ${e.durationMinutes} minutes`)
        .join('. ');
      return (
        `You have ${exams.length} available exam${exams.length > 1 ? 's' : ''}. ` +
        examList +
        `. Say "select exam" followed by the number to begin, or "help" for more commands.`
      );
    },
    [loading, exams.length],
    { delay: 600 },
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

  const getExamStatus = (exam: ExamData) => {
    if (exam.examCode.includes('completed')) return 'completed';
    return 'available';
  };

  const filteredExams = exams.filter(exam => {
    const status = getExamStatus(exam);
    if (filter === 'available') return status === 'available';
    if (filter === 'completed') return status === 'completed';
    return true;
  });

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
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/[0.07] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/[0.05] rounded-full blur-[100px]" />
      </div>

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
          <div className={`glass rounded-2xl px-5 py-3 text-sm text-center ${
            voiceError
              ? 'border-red-500/20 text-red-300'
              : lastHeard.startsWith('OK:')
              ? 'border-emerald-500/20 text-emerald-300'
              : 'text-slate-300'
          }`}>
            {voiceError ?? lastHeard}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Exam Library</h1>
            <p className="text-slate-500 text-sm mt-1">Browse and select your exams</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/')}
            className="glass-card px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-lg">‹</span> Home
          </motion.button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Filter Pills */}
        <div className="flex gap-2 mb-8">
          {(['all', 'available', 'completed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                filter === tab
                  ? 'bg-indigo-500/[0.15] text-indigo-300 border border-indigo-500/[0.25] shadow-lg shadow-indigo-500/[0.08]'
                  : 'text-slate-500 hover:text-slate-300 border border-transparent'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'available' && !loading && (
                <span className="ml-2 text-xs opacity-60">({exams.filter(e => getExamStatus(e) !== 'completed').length})</span>
              )}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Loading exams...</p>
          </div>
        )}

        {/* Exam Cards */}
        {!loading && filteredExams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExams.map((exam, idx) => {
              const completed = getExamStatus(exam) === 'completed';
              const questionCount = exam.sections.reduce((sum, s) => sum + s.questions.length, 0);
              return (
                <motion.div
                  key={exam.examCode}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.4 }}
                  className={`group glass-card rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/[0.15] hover:shadow-xl hover:shadow-indigo-500/[0.06] ${
                    completed ? 'opacity-60' : ''
                  }`}
                >
                  {/* Top Row: Subject + Voice hint */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 bg-indigo-500/[0.08] text-indigo-400 text-[11px] font-semibold uppercase tracking-wider rounded-lg border border-indigo-500/[0.08]">
                      {exam.subject}
                    </span>
                    <span className="text-[11px] text-slate-600 font-mono">
                      🎙 exam {idx + 1}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-[15px] font-semibold text-white mb-1.5 group-hover:text-indigo-200 transition-colors leading-snug">
                    {exam.title}
                  </h3>
                  <p className="text-xs text-slate-500 mb-5 leading-relaxed line-clamp-2">{exam.description}</p>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-xs text-slate-500 mb-0.5">Duration</p>
                      <p className="text-sm font-semibold text-slate-200">{exam.durationMinutes}m</p>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-xs text-slate-500 mb-0.5">Questions</p>
                      <p className="text-sm font-semibold text-slate-200">{questionCount}</p>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <p className="text-xs text-slate-500 mb-0.5">Marks</p>
                      <p className="text-sm font-semibold text-slate-200">{exam.totalMarks}</p>
                    </div>
                  </div>

                  {/* Sections */}
                  <div className="flex flex-wrap gap-1.5 mb-5">
                    {exam.sections.map(section => (
                      <span
                        key={section.sectionId}
                        className="text-[11px] px-2 py-0.5 bg-white/[0.03] text-slate-400 rounded-md border border-white/[0.04]"
                      >
                        {section.sectionName}
                      </span>
                    ))}
                  </div>

                  {/* Status + Action */}
                  <div className="flex items-center gap-3">
                    {completed ? (
                      <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/[0.1] text-emerald-400 text-sm font-medium">
                        <span>✓</span> Completed
                      </div>
                    ) : (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleExamSelect(exam)}
                        className="flex-1 py-2.5 rounded-xl bg-indigo-500/[0.12] hover:bg-indigo-500/[0.2] border border-indigo-500/[0.15] text-indigo-300 hover:text-indigo-200 text-sm font-semibold transition-all duration-200"
                      >
                        Start Exam →
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredExams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-24"
          >
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/[0.04] flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl">◇</span>
            </div>
            <p className="text-lg text-slate-300 font-medium mb-1">No exams found</p>
            <p className="text-sm text-slate-500">Check back later for available exams</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default ExamSelector;
