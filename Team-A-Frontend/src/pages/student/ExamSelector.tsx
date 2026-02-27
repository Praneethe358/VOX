/**
 * ExamSelector.tsx - Browse and select exams to take after login
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import { ExamData } from '../../types/student/exam.types';
import apiService from '../../services/student/api.service';

export function ExamSelector() {
  const navigate = useNavigate();
  const { student, authState } = useExamContext();
  const [exams, setExams] = useState<ExamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'available' | 'completed'>('available');

  // Redirect if not authenticated
  useEffect(() => {
    if (!authState?.isAuthenticated || !student) {
      navigate('/student/login');
    }
  }, [authState, student, navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Available Exams</h1>
            <p className="text-slate-400 mt-1">Welcome, {student.name}</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/student/dashboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Back to Dashboard
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'available', 'completed'] as const).map(tab => (
            <motion.button
              key={tab}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === tab
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </motion.button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-slate-400">Loading exams...</p>
          </div>
        )}

        {/* Exams Grid */}
        {!loading && filteredExams.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExams.map((exam, idx) => (
              <motion.div
                key={exam.examCode}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="group bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg p-6 hover:border-indigo-500/50 transition-all hover:shadow-xl hover:shadow-indigo-500/20"
              >
                {/* Header */}
                <div className="mb-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs font-semibold rounded-full">
                      {exam.subject}
                    </span>
                    <span className="text-2xl">📝</span>
                  </div>
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {exam.title}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">{exam.description}</p>
                </div>

                {/* Stats */}
                <div className="space-y-2 mb-4 pb-4 border-t border-slate-700">
                  <div className="flex justify-between text-sm mt-4">
                    <span className="text-slate-400">Duration</span>
                    <span className="text-slate-200 font-semibold">{exam.durationMinutes} min</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Marks</span>
                    <span className="text-slate-200 font-semibold">{exam.totalMarks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Questions</span>
                    <span className="text-slate-200 font-semibold">
                      {exam.sections.reduce((sum, s) => sum + s.questions.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Total Marks</span>
                    <span className="text-slate-200 font-semibold">{exam.totalMarks}</span>
                  </div>
                </div>

                {/* Sections Preview */}
                <div className="mb-4">
                  <p className="text-xs text-slate-400 mb-2">Sections:</p>
                  <div className="flex flex-wrap gap-1">
                    {exam.sections.map(section => (
                      <span
                        key={section.sectionId}
                        className="text-xs px-2 py-1 bg-slate-700/50 text-slate-300 rounded"
                      >
                        {section.sectionName}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                    getExamStatus(exam) === 'completed'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {getExamStatus(exam) === 'completed' ? '✓ Completed' : 'Available'}
                  </span>
                </div>

                {/* Action Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleExamSelect(exam)}
                  disabled={getExamStatus(exam) === 'completed'}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white rounded-lg font-semibold transition-all"
                >
                  {getExamStatus(exam) === 'completed' ? 'Already Completed' : 'Start Exam →'}
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredExams.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-5xl mb-4">📚</p>
            <p className="text-xl text-slate-400">No exams found</p>
            <p className="text-slate-500 mt-2">Check back later for available exams</p>
          </motion.div>
        )}
      </main>
    </div>
  );
}

export default ExamSelector;
