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
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 mx-auto" />
          <p className="text-slate-500 text-sm">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-400 mx-auto" />
          <p className="text-slate-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Completed', value: stats.completedExams, icon: '✓', accent: 'from-emerald-500/10 to-emerald-500/5', border: 'border-emerald-500/10', text: 'text-emerald-400', glow: 'shadow-emerald-500/5' },
    { label: 'Upcoming', value: stats.upcomingExams, icon: '◎', accent: 'from-blue-500/10 to-blue-500/5', border: 'border-blue-500/10', text: 'text-blue-400', glow: 'shadow-blue-500/5' },
    { label: 'Avg. Score', value: `${stats.averageScore}%`, icon: '◈', accent: 'from-indigo-500/10 to-indigo-500/5', border: 'border-indigo-500/10', text: 'text-indigo-400', glow: 'shadow-indigo-500/5' },
    { label: 'Time Spent', value: `${stats.totalTimeSpent}h`, icon: '◷', accent: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/10', text: 'text-purple-400', glow: 'shadow-purple-500/5' },
  ];

  const quickActions = [
    { label: 'Take an Exam', desc: 'Browse available exams', path: '/student/exams', accent: 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500', shadow: 'shadow-indigo-500/20' },
    { label: 'View Results', desc: 'See your past scores', path: '/student/results', accent: 'glass-light hover:bg-slate-700/50', shadow: '' },
    { label: 'Settings', desc: 'Preferences & accessibility', path: '/student/settings', accent: 'glass-light hover:bg-slate-700/50', shadow: '' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] right-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-600/[0.03] blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-purple-600/[0.03] blur-[100px]" />
      </div>

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

      {/* Voice feedback toast */}
      {(lastHeard || voiceError) && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl px-4 py-2 text-sm text-center backdrop-blur-md border ${
              voiceError ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              : lastHeard.startsWith('OK:') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-slate-800/80 border-white/5 text-slate-400'
            }`}>{voiceError ?? lastHeard}</motion.div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-500/20">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">Welcome back, {student.name}</h1>
              <p className="text-slate-500 text-xs font-mono">{student.studentId}</p>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              updateAuthState({ isAuthenticated: false, student: null, faceVerified: false, sessionToken: undefined });
              setStudent(null);
              sessionStorage.removeItem('studentAuth');
              sessionStorage.removeItem('studentId');
              sessionStorage.removeItem('studentData');
              navigate('/student/login');
            }}
            className="px-3 py-1.5 text-xs text-slate-500 hover:text-rose-400 border border-white/[0.05] hover:border-rose-500/20 rounded-xl transition-all duration-200"
          >
            Logout
          </motion.button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {statCards.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.4 }}
              className={`bg-gradient-to-br ${stat.accent} border ${stat.border} rounded-2xl p-5 shadow-lg ${stat.glow}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`text-lg ${stat.text}`}>{stat.icon}</span>
                <span className="text-slate-600 text-[10px] uppercase tracking-widest font-medium">{stat.label}</span>
              </div>
              <p className={`text-3xl font-bold ${stat.text}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-4 space-y-3"
          >
            <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4 px-1">Quick Actions</h2>
            {quickActions.map((action, idx) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.01, y: -1 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => navigate(action.path)}
                className={`w-full px-5 py-4 rounded-2xl text-left transition-all duration-200 ${action.accent} ${action.shadow ? `shadow-lg ${action.shadow}` : ''}`}
              >
                <p className="text-white font-semibold text-sm">{action.label}</p>
                <p className="text-white/50 text-xs mt-0.5">{action.desc}</p>
              </motion.button>
            ))}
          </motion.div>

          {/* System Status */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-8 glass-card rounded-2xl p-6"
          >
            <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4">System Status</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Backend Server', icon: '⬡' },
                { name: 'Face Recognition', icon: '◉' },
                { name: 'Voice Engine', icon: '◈' },
                { name: 'Database', icon: '⬢' },
              ].map((service) => (
                <div key={service.name} className="flex items-center gap-3 p-3 bg-emerald-500/[0.03] border border-emerald-500/[0.06] rounded-xl">
                  <span className="text-slate-500 text-sm">{service.icon}</span>
                  <span className="text-slate-300 text-sm flex-1">{service.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/30" />
                    <span className="text-emerald-400 text-xs font-medium">Online</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 glass-card rounded-2xl p-6"
        >
          <h2 className="text-xs uppercase tracking-widest text-slate-500 font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-2">
            {[
              { exam: 'Mathematics Unit 1', status: 'Completed', score: '92%', date: 'Today', statusColor: 'text-emerald-400' },
              { exam: 'Physics Unit 2', status: 'In Progress', score: '—', date: 'Today', statusColor: 'text-blue-400' },
              { exam: 'Chemistry Basic', status: 'Completed', score: '78%', date: 'Yesterday', statusColor: 'text-emerald-400' },
              { exam: 'Biology Advanced', status: 'Completed', score: '85%', date: '2 days ago', statusColor: 'text-emerald-400' },
            ].map((activity, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-white/[0.02] transition-colors group">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${activity.statusColor === 'text-emerald-400' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm font-medium truncate">{activity.exam}</p>
                    <p className="text-slate-600 text-xs">{activity.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium ${activity.statusColor}`}>{activity.status}</span>
                  {activity.score !== '—' && (
                    <span className="text-indigo-400 text-sm font-semibold tabular-nums">{activity.score}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Voice help panel */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 bg-indigo-500/[0.04] border border-indigo-500/[0.08] rounded-2xl p-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            <h3 className="text-xs uppercase tracking-widest text-indigo-400 font-semibold">Voice-First Mode Active</h3>
          </div>
          <p className="text-slate-500 text-sm mb-4">Speak any command to navigate hands-free.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { cmd: '"Take exam"', desc: 'Browse exams' },
              { cmd: '"View results"', desc: 'See scores' },
              { cmd: '"Settings"', desc: 'Preferences' },
              { cmd: '"Go back"', desc: 'Previous page' },
              { cmd: '"Logout"', desc: 'Sign out' },
              { cmd: '"Help"', desc: 'All commands' },
            ].map(item => (
              <div key={item.cmd} className="bg-indigo-500/[0.04] border border-indigo-500/[0.06] rounded-xl px-3 py-2">
                <p className="text-indigo-300 text-xs font-mono">{item.cmd}</p>
                <p className="text-slate-600 text-[11px]">{item.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </main>
    </div>
  );
}

export default StudentDashboard;
