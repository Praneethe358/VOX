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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4">
      {/* Voice UI overlays */}
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
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">My Results</h1>
          <button
            onClick={() => navigate('/student/dashboard')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-lg"
          >
            Back
          </button>
        </div>

        {loading ? (
          <p className="text-slate-300">Loading results...</p>
        ) : results.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 text-slate-300">
            No results available yet.
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((result, index) => (
              <motion.div
                key={result.sessionId + index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-slate-800 border border-slate-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-white font-semibold">{result.examTitle}</p>
                    <p className="text-slate-400 text-sm">Session: {result.sessionId}</p>
                    <p className="text-slate-400 text-sm">Submitted: {result.submittedAt}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-400 text-xl font-bold">{result.score}/{result.totalMarks}</p>
                    <p className="text-slate-400 text-sm">
                      {Math.round((result.score / Math.max(result.totalMarks, 1)) * 100)}%
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
