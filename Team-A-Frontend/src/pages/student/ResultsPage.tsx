/**
 * ResultsPage.tsx - Exam results display with voice readout.
 *
 * Voice-enabled: Auto-reads results summary, navigation commands.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../../services/student/api.service';
import { useVoiceNavigation } from '../../hooks/useVoiceNavigation';
import { useAutoSpeak } from '../../hooks/useAutoSpeak';
import { useVoiceContext } from '../../context/VoiceContext';
import { VoiceCommandEngine } from '../../components/student/VoiceCommandEngine';
import { VoiceListener } from '../../components/student/VoiceListener';
import { VoiceSpeaker } from '../../components/student/VoiceSpeaker';

interface ResultItem {
  sessionId: string;
  examTitle: string;
  score: number;
  totalMarks: number;
  submittedAt: string;
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { speak } = useVoiceContext();

  // ── Voice: auto-speak results summary ──────────────────────────────────
  useAutoSpeak(
    () => {
      if (loading) return null;
      if (results.length === 0) return 'No exam results available yet. Say "go back" to return to the dashboard.';
      const topResults = results.slice(0, 3).map(
        (r, i) => `${r.examTitle}: ${r.score} out of ${r.totalMarks}`
      ).join('. ');
      return `You have ${results.length} exam result${results.length > 1 ? 's' : ''}. ${topResults}. Say "go back" to return, or "help" for more commands.`;
    },
    [loading, results.length],
    { delay: 600, rate: 0.95 },
  );

  // ── Voice: navigation ──────────────────────────────────────────────────
  const handleUnknownCommand = useCallback(
    (raw: string) => {
      speak(`Command not recognized. Say "go back" to return to dashboard, or "help" for commands.`);
    },
    [speak],
  );

  const { isListening, lastCommand } = useVoiceNavigation({
    enabled: !loading,
    onUnknownCommand: handleUnknownCommand,
    pageName: 'the results page',
  });

  useEffect(() => {
    const loadResults = async () => {
      try {
        setLoading(true);
        const response = await apiService.getAllResults();
        const raw = (response.data as { results?: any[] } | any[] | undefined);
        const list = Array.isArray(raw) ? raw : raw?.results || [];
        setResults(
          list.map((item: any) => ({
            sessionId: item.sessionId || item._id || 'N/A',
            examTitle: item.examTitle || item.examName || item.examCode || 'Exam',
            score: Number(item.score ?? item.estimatedScore ?? 0),
            totalMarks: Number(item.totalMarks ?? 100),
            submittedAt: item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '-',
          }))
        );
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0e1a] relative overflow-hidden">
      {/* Ambient */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-violet-600/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Voice UI */}
      <VoiceListener isListening={isListening} mode="Navigation" position="top-right" compact />
      <VoiceSpeaker position="bottom-center" />
      <VoiceCommandEngine
        isListening={isListening}
        lastCommand={lastCommand}
        position="bottom-right"
        hints={[
          { command: '"Go back"',      icon: '⬅️', description: 'Return to dashboard' },
          { command: '"Dashboard"',    icon: '🏠', description: 'Go to dashboard' },
          { command: '"Take exam"',    icon: '📝', description: 'Browse exams' },
          { command: '"Help"',         icon: '❓', description: 'List all commands' },
        ]}
      />

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Results</h1>
            <p className="text-slate-500 text-sm mt-1">Your exam performance history</p>
          </div>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="glass-card px-4 py-2.5 rounded-xl text-sm text-slate-300 hover:text-white transition-colors flex items-center gap-2"
          >
            <span className="text-lg">‹</span> Back
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin mb-4" />
            <p className="text-slate-500 text-sm">Loading results...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/[0.04] flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl text-slate-600">◇</span>
            </div>
            <p className="text-lg text-slate-300 font-medium mb-1">No results yet</p>
            <p className="text-sm text-slate-500">Complete an exam to see your results here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => {
              const pct = Math.round((result.score / Math.max(result.totalMarks, 1)) * 100);
              const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
              const gradeColor = pct >= 70 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-red-400';
              return (
                <motion.div
                  key={result.sessionId + index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className="glass-card rounded-2xl p-5 flex items-center gap-5"
                >
                  {/* Grade Circle */}
                  <div className={`w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-lg font-bold ${gradeColor}`}>{grade}</span>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{result.examTitle}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{result.submittedAt}</p>
                  </div>

                  {/* Score */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-indigo-300">{result.score}<span className="text-slate-500 text-sm font-normal">/{result.totalMarks}</span></p>
                    <p className="text-[11px] text-slate-500">{pct}%</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
