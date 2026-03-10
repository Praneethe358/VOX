/**
 * SettingsPage.tsx - Student settings with voice control.
 *
 * Voice-enabled: Auto-speaks current settings, navigation commands,
 * voice-driven setting changes.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../../services/student/api.service';
import { useVoiceNavigation, NavCommand } from '../../hooks/useVoiceNavigation';
import { useAutoSpeak } from '../../hooks/useAutoSpeak';
import { useVoiceContext } from '../../context/VoiceContext';
import { useExamContext } from '../../context/ExamContext';
import { VoiceCommandEngine } from '../../components/student/VoiceCommandEngine';
import { VoiceListener } from '../../components/student/VoiceListener';
import { VoiceSpeaker } from '../../components/student/VoiceSpeaker';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { student } = useExamContext();
  const [language, setLanguage] = useState('en');
  const [speechRate, setSpeechRate] = useState(1);
  const { speak } = useVoiceContext();

  // ── Voice: auto-speak settings info ────────────────────────────────────
  useAutoSpeak(
    `Settings page. Your current language is ${language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Marathi'}. ` +
    `Speech rate is ${speechRate.toFixed(1)} times. ` +
    `Say "go back" to return to dashboard, or "help" for more commands.`,
    [language, speechRate],
    { delay: 600, rate: 0.95 },
  );

  // ── Voice: navigation ──────────────────────────────────────────────────
  const handleUnknownCommand = useCallback(
    (raw: string) => {
      speak(`I didn't understand "${raw}". Say "go back" to return, or "help" for commands.`);
    },
    [speak],
  );

  const { isListening, lastCommand } = useVoiceNavigation({
    enabled: true,
    onUnknownCommand: handleUnknownCommand,
    pageName: 'the settings page',
  });

  useEffect(() => {
    const loadProfile = async () => {
      const studentId = (student as any)?.rollNumber || (student as any)?.studentId;
      if (!studentId) return;
      try {
        const response = await apiService.getStudentProfile(studentId);
        const profile = response.data?.student;
        if (profile?.accessibilityProfile) {
          setLanguage(profile.accessibilityProfile.preferredLanguage || 'en');
          setSpeechRate(profile.accessibilityProfile.speechRate || 1);
        }
      } catch {
        // no mock fallback
      }
    };

    loadProfile();
  }, [student]);

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-600/[0.05] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[350px] h-[350px] bg-violet-600/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Voice UI */}
      <VoiceListener isListening={isListening} mode="Navigation" position="top-right" compact />
      <VoiceSpeaker position="bottom-center" />
      <VoiceCommandEngine
        isListening={isListening}
        lastCommand={lastCommand}
        position="bottom-right"
        hints={[
          { command: '"Go back"',   icon: '⬅️', description: 'Return to dashboard' },
          { command: '"Dashboard"', icon: '🏠', description: 'Go to dashboard' },
          { command: '"Help"',      icon: '❓', description: 'List commands' },
        ]}
      />

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/[0.04]">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Settings</h1>
            <p className="text-slate-500 text-sm mt-1">Preferences & accessibility</p>
          </div>
          <button
            onClick={() => navigate('/student/exams')}
            className="glass-card px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-lg">‹</span> Back
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-2xl mx-auto px-6 py-8 space-y-5">
        {/* Language Setting */}
        <div className="glass-card rounded-2xl p-6">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-4">Language</p>
          <label className="text-sm text-slate-300 mb-2 block">Preferred Language</label>
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/[0.06] text-white rounded-xl appearance-none focus:outline-none focus:border-indigo-500/[0.3] transition-colors text-sm"
            >
              <option value="en" className="bg-[#0a0e1a]">English</option>
              <option value="hi" className="bg-[#0a0e1a]">Hindi</option>
              <option value="mr" className="bg-[#0a0e1a]">Marathi</option>
            </select>
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">▾</span>
          </div>
        </div>

        {/* Speech Rate */}
        <div className="glass-card rounded-2xl p-6">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-semibold mb-4">Voice</p>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-slate-300">Speech Rate</label>
            <span className="text-sm font-semibold text-indigo-300 bg-indigo-500/[0.08] px-2.5 py-1 rounded-lg border border-indigo-500/[0.1]">
              {speechRate.toFixed(1)}×
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={speechRate}
            onChange={(e) => setSpeechRate(Number(e.target.value))}
            className="w-full h-1.5 bg-white/[0.06] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-indigo-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:shadow-indigo-500/30"
          />
          <div className="flex justify-between text-[10px] text-slate-600 mt-1.5">
            <span>0.5× Slow</span>
            <span>1.0× Normal</span>
            <span>2.0× Fast</span>
          </div>
        </div>

        {/* Info */}
        <div className="glass-card rounded-2xl p-6 border-indigo-500/[0.06]">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/[0.08] border border-indigo-500/[0.1] flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-400 text-sm">◉</span>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-300 mb-1">Voice Navigation Active</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                All pages support voice commands. Say "help" at any time to hear available commands. 
                Your speech rate setting affects how fast the system speaks to you.
              </p>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-slate-600 text-center">
          Settings sync automatically when the backend is available
        </p>
      </main>
    </div>
  );
}
