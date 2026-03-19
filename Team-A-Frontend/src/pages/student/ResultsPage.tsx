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
    <section id="s-results">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 50% 50% at 50% -10%, rgba(45,78,232,0.08) 0%, transparent 70%)' }} />
      
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

      {/* Main Content */}
      <motion.div 
        className="sub-modal" 
        style={{ maxWidth: '720px', width: '100%', marginTop: '-60px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <div className="sub-hdr">
          <div className="sub-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
          <div>
            <div className="sub-title">Your Results</div>
            <div className="sub-exam">Exam performance history</div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ display: 'inline-flex', width: '32px', height: '32px', borderRadius: '50%', border: '2px solid var(--surface3)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
            <p style={{ color: 'var(--text-sec)', fontSize: '13px' }}>Loading results...</p>
          </div>
        ) : results.length === 0 ? (
          <div style={{ textAlign: 'center', paddingY: '48px' }}>
            <div style={{ width: '48px', height: '48px', margin: '0 auto 16px', background: 'var(--surface2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: 'var(--text-muted)' }}>◇</div>
            <p style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: 600, color: 'var(--text)', marginBottom: '4px' }}>No results yet</p>
            <p style={{ fontSize: '13px', color: 'var(--text-sec)' }}>Complete an exam to see your results</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {results.map((result, index) => {
              const pct = Math.round((result.score / Math.max(result.totalMarks, 1)) * 100);
              const grade = pct >= 90 ? 'A+' : pct >= 80 ? 'A' : pct >= 70 ? 'B' : pct >= 60 ? 'C' : pct >= 50 ? 'D' : 'F';
              const gradeColor = pct >= 70 ? 'var(--green-lt)' : pct >= 50 ? 'var(--amber-lt)' : 'var(--red-lt)';
              
              return (
                <motion.div
                  key={result.sessionId + index}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: 'clamp(12px, 2vw, 14px) clamp(12px, 3vw, 16px)',
                    background: 'var(--surface)',
                    border: '1px solid var(--border2)',
                    borderRadius: 'var(--radius)',
                    cursor: 'pointer',
                    transition: 'all .18s'
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(45,78,232,0.4)';
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--surface2)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border2)';
                    (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)';
                  }}
                >
                  {/* Grade Badge */}
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius)', background: 'var(--surface3)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '16px', fontWeight: 800, color: gradeColor }}>{grade}</span>
                  </div>

                  {/* Details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'clamp(13px, 2vw, 14px)', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>{result.examTitle}</p>
                    <p style={{ fontSize: 'clamp(10px, 2vw, 12px)', color: 'var(--text-sec)' }}>{result.submittedAt}</p>
                  </div>

                  {/* Score */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: 'clamp(14px, 2.5vw, 16px)', fontWeight: 800, color: 'var(--accent-lt)', marginBottom: '2px' }}>
                      {result.score}<span style={{ fontSize: 'clamp(11px, 2vw, 12px)', color: 'var(--text-sec)', fontWeight: 500, marginLeft: '4px' }}>/{result.totalMarks}</span>
                    </p>
                    <p style={{ fontSize: 'clamp(10px, 2vw, 11px)', color: 'var(--text-muted)' }}>{pct}%</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
