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
    <section className="screen" id="s-landing" style={{ alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        {/* Branding */}
        <div style={{ textAlign: 'center' }}>
          <div className="landing-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', gap: '12px' }}>
            <svg width="48" height="36" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0 24 L 6 24 C 9 24, 9 10, 12 10 C 15 10, 15 24, 18 24 C 21 24, 21 4, 24 4 C 27 4, 27 32, 30 32 C 33 32, 33 16, 36 16 C 39 16, 39 24, 42 24 L 48 24" stroke="var(--wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '32px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-1px' }}>VOX</span>
          </div>
          <p style={{ color: 'var(--text-sec)', fontSize: '14px', letterSpacing: '0.5px' }}>
            Password Login
          </p>
        </div>

        {/* Login Card */}
        <form
          onSubmit={handleLogin}
          className="glass-card"
          style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '32px' }}
        >
          {/* Email */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="email" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Password */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="password" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ width: '100%', padding: '12px 16px', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '15px', outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)' }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
            />
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)' }}
            >
              {error}
            </motion.p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="ex-btn primary"
            style={{ width: '100%', marginTop: '8px' }}
          >
            {isLoading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                Logging in…
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        {/* Back to face login */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => navigate('/student/login')}
            style={{ background: 'none', border: 'none', color: 'var(--text-sec)', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back to face recognition login
          </button>
        </div>
      </motion.div>
    </section>
  );
}
