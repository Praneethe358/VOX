import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useExamContext } from '../../context/ExamContext';
import { useVoiceContext } from '../../context/VoiceContext';
import apiService from '../../services/student/api.service';
import { setStoredToken } from '../../api/client';
import type { StudentProfile } from '../../types/student/student.types';

export default function PasswordFallbackLogin() {
  const navigate = useNavigate();
  const { updateAuthState, setStudent } = useExamContext();
  const { speak, playBeep } = useVoiceContext();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await apiService.loginWithPassword(email.trim(), password);

      // Check for connection / server errors first
      if (!(res as any)?.success && (res as any)?.error) {
        const errMsg = (res as any).error as string;
        if (errMsg.toLowerCase().includes('connection') || errMsg.toLowerCase().includes('unable to reach')) {
          setError('Cannot connect to server. Please make sure the backend is running.');
        } else {
          setError('Invalid email or password. Please try again.');
        }
        playBeep('error');
        setIsLoading(false);
        return;
      }

      const data = (res as any)?.data ?? res;

      if (data?.authenticated && data?.student) {
        playBeep('success');
        // Store JWT token so authenticated API calls work
        if (data.token) {
          setStoredToken(data.token);
        }
        const s = data.student;
        const profile: StudentProfile = {
          studentId: s.studentId ?? s.rollNumber ?? 'UNKNOWN',
          name: s.name ?? 'Student',
          email: s.email ?? email,
          phoneNumber: '',
          enrollmentDate: new Date(),
          disabilityType: 'other',
          faceDescriptor: [],
          accessibilityProfile: {
            requiresVoiceNavigation: true,
            preferredLanguage: 'en',
            speechRate: 1,
            fontSize: 16,
            highContrast: false,
            textToSpeech: true,
          },
        };

        setStudent(profile);
        updateAuthState({
          isAuthenticated: true,
          student: profile,
          faceVerified: false,
          loginTimestamp: new Date(),
        });
        sessionStorage.setItem('studentAuth', 'true');
        sessionStorage.setItem('studentId', profile.studentId);
        sessionStorage.setItem('studentData', JSON.stringify(profile));

        await speak(`Welcome, ${profile.name}.`);
        navigate('/student/exams');
      } else {
        setError('Invalid email or password. Please try again.');
        playBeep('error');
      }
    } catch {
      setError('Login failed. Check your credentials and try again.');
      playBeep('error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md flex flex-col gap-6"
      >
        {/* Branding */}
        <div className="text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
            VoiceSecure
          </h1>
          <p className="text-slate-400 text-sm mt-1 tracking-wide">
            Password Login
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleLogin}
          className="bg-slate-800/60 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 flex flex-col gap-4 shadow-2xl"
        >
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            />
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Logging in…
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Back to face login */}
        <div className="text-center">
          <button
            onClick={() => navigate('/student/login')}
            className="text-slate-500 hover:text-slate-300 text-sm underline transition-colors"
          >
            ← Back to face recognition login
          </button>
        </div>
      </motion.div>
    </div>
  );
}
