import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../api/apiService';

export default function StudentPortal() {
  const navigate = useNavigate();
  const [studentName, setStudentName] = useState('');
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    // Check if student is logged in
    const isLoggedIn = sessionStorage.getItem('studentLoggedIn');
    if (!isLoggedIn) {
      navigate('/student-login');
      return;
    }

    // Get student info
    const name = sessionStorage.getItem('studentName') || 'Student';
    setStudentName(name);

    const loadExams = async () => {
      const response = await studentApi.getAvailableExams();
      if (response.success && Array.isArray(response.data)) {
        setExams(
          response.data.map((exam: any) => ({
            code: exam.code,
            title: exam.title,
            duration: `${exam.durationMinutes} min`,
            questions: Array.isArray(exam.questions) ? exam.questions.length : 0,
            status: exam.status || 'available',
          }))
        );
      }
    };

    loadExams();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem('studentLoggedIn');
    sessionStorage.removeItem('studentName');
    sessionStorage.removeItem('studentRollNumber');
    navigate('/');
  };

  const handleStartExam = (examCode: string) => {
    sessionStorage.setItem('currentExam', examCode);
    navigate('/exam');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Top Bar */}
      <motion.header
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-700/50 bg-slate-900/80 px-6 backdrop-blur-md"
      >
        <h1 className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-xl font-bold text-transparent">
          MindKraft Student
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">Welcome, {studentName}!</span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="rounded-lg border border-red-500/50 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Logout
          </motion.button>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold">Hello, {studentName}! 👋</h2>
          <p className="mt-1 text-sm text-slate-400">
            Select an exam below to get started.
          </p>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Available Exams</p>
                <p className="text-2xl font-bold text-white mt-2">{exams.length}</p>
              </div>
              <span className="text-2xl">📝</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Completed</p>
                <p className="text-2xl font-bold text-white mt-2">0</p>
              </div>
              <span className="text-2xl">✅</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400">Average Score</p>
                <p className="text-2xl font-bold text-white mt-2">--</p>
              </div>
              <span className="text-2xl">📊</span>
            </div>
          </motion.div>
        </div>

        {/* Exams List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Available Exams</h3>
          <div className="space-y-3">
            {exams.map((exam, idx) => (
              <motion.div
                key={exam.code}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.1 }}
                className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-5 hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500/15 text-lg">
                    📄
                  </div>
                  <div>
                    <p className="font-medium text-white">{exam.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {exam.code} • {exam.questions} questions • {exam.duration}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full px-3 py-1 text-xs font-medium capitalize bg-green-400/10 text-green-400">
                    {exam.status}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleStartExam(exam.code)}
                    className="rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-pink-500 transition-all"
                  >
                    Start Exam →
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Voice Mode Card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6"
        >
          <h4 className="font-semibold text-white">🎤 Voice-Based Exam Mode</h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Answer exam questions using your voice. The system will transcribe and evaluate your 
            responses in real-time. Ensure you're in a quiet environment for best results.
          </p>
        </motion.div>
      </main>
    </div>
  );
}
