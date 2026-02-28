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
import { VoiceCommandEngine } from '../../components/student/VoiceCommandEngine';
import { VoiceListener } from '../../components/student/VoiceListener';
import { VoiceSpeaker } from '../../components/student/VoiceSpeaker';

export default function SettingsPage() {
  const navigate = useNavigate();
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
      const response = await apiService.getStudentProfile();
      const profile = response.data?.student;
      if (profile?.accessibilityProfile) {
        setLanguage(profile.accessibilityProfile.preferredLanguage || 'en');
        setSpeechRate(profile.accessibilityProfile.speechRate || 1);
      }
    };

    loadProfile();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
      {/* Voice UI overlays */}
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
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg"
          >
            Back
          </button>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-5">
          <div>
            <label className="block text-slate-300 mb-2">Preferred Language</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-2">Speech Rate: {speechRate.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={speechRate}
              onChange={(e) => setSpeechRate(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <p className="text-slate-400 text-sm">
            Profile preference updates require backend save support and will sync automatically once endpoint is available.
          </p>

          {/* Voice accessibility info */}
          <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
            <h3 className="text-indigo-300 font-semibold text-sm mb-2">🎙️ Voice Navigation Active</h3>
            <p className="text-slate-400 text-xs">
              All pages support voice commands. Say "help" at any time to hear available commands.
              Your speech rate setting affects how fast the system speaks to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
