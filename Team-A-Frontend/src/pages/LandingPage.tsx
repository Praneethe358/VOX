import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      <div className="max-w-5xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent mb-4">
            MindKraft
          </h1>
          <p className="text-slate-400 text-lg">
            Voice-Based Exam Interface
          </p>
        </motion.div>

        {/* Login Options */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Admin Login */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -8 }}
            onClick={() => navigate('/admin-login')}
            className="cursor-pointer bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 hover:border-indigo-500/50 transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">👨‍💼</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Admin Login</h2>
              <p className="text-slate-400 mb-6">
                Manage exams, upload questions, review submissions, and grade student responses.
              </p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span>
                  <span>Create & manage exams</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span>
                  <span>Review submissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-indigo-400">✓</span>
                  <span>Grade & download answers</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Student Login */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            whileHover={{ y: -8 }}
            onClick={() => navigate('/student/login')}
            className="cursor-pointer bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-2xl p-8 hover:border-pink-500/50 transition-all"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center mb-6">
                <span className="text-4xl">🎓</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Student Login</h2>
              <p className="text-slate-400 mb-6">
                Access your exams, answer questions using voice input, and view your results.
              </p>
              <div className="flex flex-col gap-2 text-sm text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="text-pink-400">✓</span>
                  <span>Face verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-400">✓</span>
                  <span>Voice-based answers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-400">✓</span>
                  <span>View exam results</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-12 text-slate-500 text-sm"
        >
          <p>Select your role to continue</p>
        </motion.div>
      </div>
    </div>
  );
}
