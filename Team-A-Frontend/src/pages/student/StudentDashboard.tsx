/**
 * StudentDashboard.tsx - Main student dashboard showing upcoming exams and performance
 *
 * Voice-enabled: Auto-speaks welcome, listens for navigation commands.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import apiService from '../../services/student/api.service';
import { useVoiceNavigation, NavCommand } from '../../hooks/useVoiceNavigation';
import { useAutoSpeak } from '../../hooks/useAutoSpeak';
import { VoiceCommandEngine } from '../../components/student/VoiceCommandEngine';
import { VoiceListener } from '../../components/student/VoiceListener';
import { VoiceSpeaker } from '../../components/student/VoiceSpeaker';

interface DashboardStats {
  completedExams: number;
  upcomingExams: number;
  averageScore: number;
  totalTimeSpent: number;
}

export function StudentDashboard() {
  const navigate = useNavigate();
  const { student, authState, updateAuthState, setStudent } = useExamContext();
  const [stats, setStats] = useState<DashboardStats>({
    completedExams: 0,
    upcomingExams: 0,
    averageScore: 0,
    totalTimeSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  // ── Voice: auto-speak welcome ──────────────────────────────────────────
  useAutoSpeak(
    () =>
      student
        ? `Welcome to your dashboard, ${student.name}. ` +
          `You have ${stats.upcomingExams} upcoming exams and ${stats.completedExams} completed. ` +
          `Say "take exam" to start, "view results" for scores, or "help" for all commands.`
        : null,
    [student?.name, loading],
    { delay: 800 },
  );

  // ── Voice: navigation commands ─────────────────────────────────────────
  const handleVoiceCommand = useCallback((cmd: NavCommand) => {
    if (cmd.action === 'logout') {
      updateAuthState({ isAuthenticated: false, student: null, faceVerified: false, sessionToken: undefined });
      setStudent(null);
      sessionStorage.removeItem('studentAuth');
      sessionStorage.removeItem('studentId');
      sessionStorage.removeItem('studentData');
      // let default navigation handle it
      return false;
    }
    return false; // let default handler navigate
  }, [updateAuthState, setStudent]);

  const handleUnknownCommand = useCallback((raw: string) => {
    // silently ignore — VoiceCommandEngine shows feedback
  }, []);

  const { isListening, lastCommand, lastHeard, error: voiceError } = useVoiceNavigation({
    enabled: !loading,
    onCommand: handleVoiceCommand,
    onUnknownCommand: handleUnknownCommand,
    pageName: 'the student dashboard',
  });

  // Restore student from sessionStorage if context is empty
  useEffect(() => {
    if (!student && sessionStorage.getItem('studentAuth') === 'true') {
      const savedData = sessionStorage.getItem('studentData');
      if (savedData) {
        try {
          const profile = JSON.parse(savedData);
          setStudent(profile);
          updateAuthState({ isAuthenticated: true, student: profile, faceVerified: true });
        } catch { /* ignore */ }
      }
    }
  }, [student, setStudent, updateAuthState]);

  // Load dashboard data
  useEffect(() => {
    if (!student && !sessionStorage.getItem('studentAuth')) {
      navigate('/student/login');
      return;
    }
    loadDashboardData();
  }, [student, navigate]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardStudentStats();
      const data = response.data as Partial<DashboardStats> | undefined;

      setStats({
        completedExams: data?.completedExams ?? 0,
        upcomingExams: data?.upcomingExams ?? 0,
        averageScore: data?.averageScore ?? 0,
        totalTimeSpent: data?.totalTimeSpent ?? 0,
      });
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
      {/* Voice UI overlays */}
      <VoiceListener isListening={isListening} mode="Navigation" position="top-right" />
      <VoiceSpeaker position="bottom-center" />
      <VoiceCommandEngine
        isListening={isListening}
        lastCommand={lastCommand}
        position="bottom-right"
        hints={[
          { command: '"Take exam"',    icon: '📝', description: 'Browse available exams' },
          { command: '"View results"', icon: '📊', description: 'See your scores' },
          { command: '"Settings"',     icon: '⚙️', description: 'Open preferences' },
          { command: '"Logout"',       icon: '🚪', description: 'Sign out' },
          { command: '"Help"',         icon: '❓', description: 'List all commands' },
        ]}
      />
      {(lastHeard || voiceError) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
          <div className={`rounded-xl px-4 py-2 text-sm text-center backdrop-blur border ${
            voiceError ? 'bg-red-900/80 border-red-500/50 text-red-200'
            : lastHeard.startsWith('OK:') ? 'bg-green-900/80 border-green-500/50 text-green-200'
            : 'bg-slate-800/90 border-slate-600/50 text-slate-300'
          }`}>{voiceError ?? lastHeard}</div>
        </div>
      )}
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Welcome, {student.name}!</h1>
            <p className="text-slate-400 mt-1">Student ID: {student.studentId}</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              updateAuthState({
                isAuthenticated: false,
                student: null,
                faceVerified: false,
                sessionToken: undefined
              });
              setStudent(null);
              sessionStorage.removeItem('studentAuth');
              sessionStorage.removeItem('studentId');
              sessionStorage.removeItem('studentData');
              navigate('/student/login');
            }}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 rounded-lg font-medium transition-colors"
          >
            Logout
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: 'Exams Completed',
              value: stats.completedExams,
              icon: '✓',
              color: 'from-green-600 to-emerald-600'
            },
            {
              label: 'Upcoming Exams',
              value: stats.upcomingExams,
              icon: '📅',
              color: 'from-blue-600 to-cyan-600'
            },
            {
              label: 'Average Score',
              value: `${stats.averageScore}%`,
              icon: '📊',
              color: 'from-indigo-600 to-purple-600'
            },
            {
              label: 'Total Time Spent',
              value: `${stats.totalTimeSpent}h`,
              icon: '⏱',
              color: 'from-pink-600 to-rose-600'
            }
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-gradient-to-br ${stat.color} rounded-lg p-6 text-white shadow-lg`}
            >
              <div className="text-3xl mb-2">{stat.icon}</div>
              <p className="text-sm opacity-90 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-1 bg-slate-800 border border-slate-700 rounded-lg p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/student/exams')}
                className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white rounded-lg font-semibold transition-all"
              >
                Take an Exam
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/student/results')}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition-colors"
              >
                View Results
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/student/settings')}
                className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition-colors"
              >
                Settings
              </motion.button>
            </div>
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="lg:col-span-2 bg-slate-800 border border-slate-700 rounded-lg p-6"
          >
            <h2 className="text-xl font-bold text-white mb-4">System Status</h2>
            
            <div className="space-y-3">
              {[
                { name: 'Server Status', status: 'online' },
                { name: 'Face Recognition', status: 'online' },
                { name: 'Voice Processing', status: 'online' },
                { name: 'Database', status: 'online' }
              ].map((service, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-slate-300">{service.name}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className={`text-sm font-semibold ${
                      service.status === 'online' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-slate-800 border border-slate-700 rounded-lg p-6"
        >
          <h2 className="text-xl font-bold text-white mb-4">Recent Activity</h2>

          <div className="space-y-3">
            {[
              { exam: 'Mathematics Unit 1', status: 'Completed', score: '92%', date: 'Today' },
              { exam: 'Physics Unit 2', status: 'In Progress', score: '-', date: 'Today' },
              { exam: 'Chemistry Basic', status: 'Completed', score: '78%', date: 'Yesterday' },
              { exam: 'Biology Advanced', status: 'Completed', score: '85%', date: '2 days ago' }
            ].map((activity, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 transition-colors">
                <div className="flex-1">
                  <p className="text-white font-semibold">{activity.exam}</p>
                  <p className="text-xs text-slate-400">{activity.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-sm font-semibold ${
                    activity.status === 'Completed' ? 'text-green-400' :
                    activity.status === 'In Progress' ? 'text-blue-400' :
                    'text-slate-400'
                  }`}>
                    {activity.status}
                  </span>
                  {activity.score !== '-' && (
                    <span className="text-sm text-indigo-400 font-semibold">{activity.score}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-lg p-6"
        >
          <h3 className="text-lg font-bold text-blue-400 mb-2">🎙️ Voice-First Mode Active</h3>
          <p className="text-blue-300 text-sm mb-3">
            This portal is fully voice-controlled. Use the commands below to navigate hands-free.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {[
              { cmd: '"Take exam"', desc: 'Browse exams' },
              { cmd: '"View results"', desc: 'See scores' },
              { cmd: '"Settings"', desc: 'Preferences' },
              { cmd: '"Go back"', desc: 'Previous page' },
              { cmd: '"Logout"', desc: 'Sign out' },
              { cmd: '"Help"', desc: 'All commands' },
            ].map(item => (
              <div key={item.cmd} className="bg-blue-500/10 rounded-lg px-3 py-2">
                <p className="text-indigo-300 text-xs font-mono">{item.cmd}</p>
                <p className="text-slate-400 text-xs">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default StudentDashboard;
