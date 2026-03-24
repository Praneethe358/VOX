import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "../api/client";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import * as faceapi from "face-api.js";
import { LiveFaceRegistration } from "../components/student/LiveFaceRegistration";
// ─── Types ──────────────────────────────────────────────────────────────────
interface NavItem {  id: string;  label: string;  icon: string;}interface StatCardData {  icon: string;  label: string;  value: string;  trend?: string;}interface StudentSubmission {  id: number | string;  name: string;  exam: string;  score: number | null;  status: 'graded' | 'pending' | 'submitted';  submittedAt: string;  rollNumber?: string;  sessionId?: string;  answerCount?: number;}interface StudentRegistrationData {  studentId: string;  name: string;  examCode: string;  email: string;}interface ExamRecord {  id: number | string;  name: string;  questions: number;  students: number;  date: string;  status?: string;  code?: string;}
// ─── SVG Icon Helper for entire Admin Portal ──────────────────────────────
const SvgIcon: React.FC<{ name: string; size?: number; color?: string }> = ({ name, size = 18, color }) => {
  const s = { width: size, height: size, color: color || 'currentColor' } as React.CSSProperties;
  const props = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, style: s };
  switch (name) {
    case 'dashboard': return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>;
    case 'exams': case 'file': case 'document': return <svg {...props}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>;
    case 'students': case 'users': return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
    case 'submissions': case 'check-square': return <svg {...props}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
    case 'scores': case 'star': return <svg {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
    case 'voice-logs': case 'mic': return <svg {...props}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
    case 'reports': case 'bar-chart': return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>;
    case 'settings': case 'gear': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case 'hourglass': case 'pending': return <svg {...props}><path d="M6 2h12v5l-4 4 4 4v5H6v-5l4-4-4-4V2z"/><path d="M6 2h12" /><path d="M6 22h12" /></svg>;
    case 'graduation': case 'avg': return <svg {...props}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.66 2.69 3 6 3s6-1.34 6-3v-5"/></svg>;
    case 'upload': return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
    case 'download': return <svg {...props}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
    case 'search': return <svg {...props}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case 'edit': case 'pencil': return <svg {...props}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
    case 'key': return <svg {...props}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
    case 'clock': case 'timer': return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
    case 'clipboard': case 'list': return <svg {...props}><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>;
    case 'lightbulb': case 'info': return <svg {...props}><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>;
    case 'trash': case 'delete': return <svg {...props}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>;
    case 'eye': case 'view': return <svg {...props}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'trending-up': case 'pass-rate': return <svg {...props}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
    case 'target': case 'bullseye': return <svg {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case 'pie-chart': case 'analytics': return <svg {...props}><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>;
    case 'activity': return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
    default: return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  }
};
// ─── Loading Spinner ────────────────────────────────────────────────────────
const Spinner: React.FC<{ size?: string }> = ({ size = 'w-6 h-6' }) => (  <div className={`${size} border-2 border-indigo-500 border-t-transparent rounded-full animate-spin`} />);
const LoadingOverlay: React.FC = () => (  <div className="flex items-center justify-center py-16">    <Spinner size="w-8 h-8" />  </div>);
// ─── Sidebar Navigation Component ────────────────────────────────────────
const AdminSidebar: React.FC<{  activePage: string;  onNavigate: (page: string) => void;  navItems: NavItem[];  adminName?: string;  adminRole?: string;}> = ({ activePage, onNavigate, navItems, adminName }) => (
  <motion.nav className="ap-sidebar" initial={{ x: -256 }} animate={{ x: 0 }} transition={{ duration: 0.35, ease: [0.4,0,0.2,1] }}>
    {/* Logo */}
    <div className="ap-sidebar-logo">
      <div className="ap-sidebar-logo-row">
        <svg width="32" height="24" viewBox="0 0 48 36" fill="none">
          <path d="M 0 24 L 6 24 C 9 24, 9 10, 12 10 C 15 10, 15 24, 18 24 C 21 24, 21 4, 24 4 C 27 4, 27 32, 30 32 C 33 32, 33 16, 36 16 C 39 16, 39 24, 42 24 L 48 24" stroke="var(--wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
        <span className="ap-sidebar-logo-wordmark">VOX</span>
      </div>
      <span className="ap-sidebar-badge">Admin Console</span>
    </div>

    {/* Nav Items */}
    <div className="ap-sidebar-nav">
      <div className="ap-nav-section-label">Navigation</div>
      {navItems.map((item) => (
        <motion.button
          key={item.id}
          className={`ap-nav-item${activePage === item.id ? ' active' : ''}`}
          onClick={() => onNavigate(item.id)}
          whileTap={{ scale: 0.98 }}
        >
          <span className="ap-nav-icon" style={{ opacity: activePage === item.id ? 1 : 0.55 }}>
            <SvgIcon name={item.id} />
          </span>
          {item.label}
        </motion.button>
      ))}
    </div>

    {/* User Footer */}
    <div className="ap-sidebar-user">
      <div className="ap-user-avatar">{(adminName?.[0] || 'A').toUpperCase()}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminName || 'Admin User'}</p>
        <p style={{ fontSize: '11px', color: 'var(--green-lt)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green-lt)', display: 'inline-block' }} />
          Online
        </p>
      </div>
    </div>
  </motion.nav>
);
// ─── Top Bar Component ────────────────────────────────────────────────
const AdminTopbar: React.FC<{ pageTitle: string; onLogout: () => void; }> = ({ pageTitle, onLogout }) => (
  <motion.div className="ap-topbar" initial={{ y: -58 }} animate={{ y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
    <div>
      <p className="ap-topbar-title">{pageTitle}</p>
      <p className="ap-topbar-breadcrumb">VOX Admin › {pageTitle}</p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', padding: '5px 12px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
        {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
      </div>
      <motion.button className="ap-logout-btn" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={onLogout}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </motion.button>
    </div>
  </motion.div>
);
// ─── Stat Card Component ────────────────────────────────────────────────────
const StatCard: React.FC<StatCardData & { delay: number }> = ({ icon, label, value, trend, delay }) => (
  <motion.div
    className="ap-stat-card"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="ap-stat-label">{label}</p>
        <p className="ap-stat-value">{value}</p>
        {trend && <p style={{ fontSize: '11.5px', color: 'var(--green-lt)', marginTop: '8px', fontWeight: 500 }}>{trend}</p>}
      </div>
      <div className="ap-stat-icon">
        <SvgIcon name={icon} size={22} color="var(--accent-lt)" />
      </div>
    </div>
  </motion.div>
);
// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const DashboardSection: React.FC = () => {
  const [stats, setStats] = useState<StatCardData[]>([
    { icon: 'document', label: 'Total Exams', value: '—' },
    { icon: 'users', label: 'Total Submissions', value: '—' },
    { icon: 'hourglass', label: 'Pending Review', value: '—' },
    { icon: 'graduation', label: 'Avg Score', value: '—' },
  ]);
  const [activityItems, setActivityItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const health = await adminApi.getDashboardStats();
        setBackendStatus(health.success ? 'online' : 'offline');
        const [statsResponse, activityResponse] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getRecentActivity(),
        ]);
        if (statsResponse.success && statsResponse.data) {
          const d = statsResponse.data;
          setStats([
            { icon: 'document', label: 'Total Exams', value: String(d.totalExams ?? 0) },
            { icon: 'users', label: 'Total Submissions', value: String(d.totalSubmissions ?? 0) },
            { icon: 'hourglass', label: 'Pending Review', value: String(d.pendingReview ?? 0) },
            { icon: 'graduation', label: 'Avg Score', value: `${d.averageScore ?? 0}%` },
          ]);
        }
        if (activityResponse.success && Array.isArray(activityResponse.data)) {
          setActivityItems(activityResponse.data.map((item: any) => item.message || String(item)));
        }
      } catch {
        setBackendStatus('offline');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) return <LoadingOverlay />;

  const statusColors = {
    online: { dot: '#22c55e', text: 'var(--green-lt)', bg: 'rgba(34,197,94,0.07)', border: 'rgba(34,197,94,0.20)' },
    offline: { dot: '#ef4444', text: '#f87171', bg: 'rgba(239,68,68,0.07)', border: 'rgba(239,68,68,0.20)' },
    checking: { dot: '#f59e0b', text: '#fbbf24', bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.20)' },
  };
  const sc = statusColors[backendStatus];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Status Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px', borderRadius: '10px', background: sc.bg, border: `1px solid ${sc.border}` }}>
        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: sc.dot, display: 'inline-block', boxShadow: `0 0 8px ${sc.dot}` }} />
        <span style={{ fontSize: '12.5px', fontWeight: 500, color: sc.text }}>
          Backend: {backendStatus === 'online' ? 'Connected & Operational' : backendStatus === 'offline' ? 'Unreachable — using cached data' : 'Checking connection...'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)' }}>
          Last checked: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope', sans-serif", letterSpacing: '-0.3px' }}>Dashboard Overview</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>Platform performance at a glance</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => window.location.reload()}
          className="ap-btn-ghost" style={{ fontSize: '12px' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </motion.button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {stats.map((stat, idx) => <StatCard key={idx} {...stat} delay={idx * 0.08} />)}
      </div>

      {/* Recent Activity */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope', sans-serif" }}>Recent Activity</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface3)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            {activityItems.length} events
          </span>
        </div>
        {activityItems.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon"><SvgIcon name="activity" size={22} color="var(--text-muted)" /></div>
            No recent activity recorded
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', maxHeight: '360px', overflowY: 'auto' }}>
            {activityItems.map((item, idx) => {
              const isExam = item.toLowerCase().includes('exam');
              const isAnswer = item.toLowerCase().includes('answer');
              const dotColor = isExam ? 'var(--accent-lt)' : isAnswer ? 'var(--green-lt)' : 'var(--text-muted)';
              return (
                <motion.div
                  key={idx}
                  initial={{ x: -12, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 + idx * 0.025 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 12px', borderRadius: '8px', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: dotColor, marginTop: '5px', flexShrink: 0, boxShadow: `0 0 6px ${dotColor}` }} />
                  <p style={{ fontSize: '13px', color: 'var(--text-sec)', flex: 1 }}>{item}</p>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>just now</span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
//  EXAM MANAGEMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════

interface MCQOption {
  text: string;
}

interface ManualQuestion {
  text: string;
  type: 'mcq' | 'descriptive';
  options: string[];
  correctAnswer: number;
}

interface ExamDetailRecord {
  id: number | string;
  name: string;
  code: string;
  questions: any[];
  questionCount: number;
  mcqCount: number;
  descriptiveCount: number;
  durationMinutes: number;
  status: string;
  instructions: string;
  createdAt: string;
}

const ExamManagementSection: React.FC = () => {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ─── Wizard state ─────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [examName, setExamName] = useState('');
  const [examCode, setExamCode] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [instructions, setInstructions] = useState('');

  // Step 2: Questions
  const [questionSource, setQuestionSource] = useState<'upload' | 'manual'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([]);
  const [parsedQuestions, setParsedQuestions] = useState<any[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Step 3: Preview / Create
  const [isCreating, setIsCreating] = useState(false);

  // Exam list
  const [exams, setExams] = useState<ExamDetailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);

  const loadExams = useCallback(async () => {
    try {
      const response = await adminApi.getExams() as any;
      const items = response?.data ?? response?.exams ?? [];
      if (response?.success && Array.isArray(items)) {
        setExams(
          items.map((exam: any, index: number) => {
            const qs = Array.isArray(exam.questions) ? exam.questions : [];
            return {
              id: exam.id ?? exam._id ?? index + 1,
              name: exam.name ?? exam.title ?? exam.code ?? 'Untitled Exam',
              code: exam.code ?? '',
              questions: qs,
              questionCount: qs.length,
              mcqCount: qs.filter((q: any) => q.type === 'mcq').length,
              descriptiveCount: qs.filter((q: any) => q.type !== 'mcq').length,
              durationMinutes: exam.durationMinutes ?? 30,
              status: exam.status ?? 'draft',
              instructions: exam.instructions ?? '',
              createdAt: exam.createdAt ?? '-',
            };
          }),
        );
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  // ─── Step 1 helpers ───────────────────────────────────────────────────
  const handleExamNameChange = (value: string) => {
    setExamName(value);
    setExamCode(value.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20));
  };

  const goToStep2 = () => {
    if (!examName.trim()) { toast.warning('Validation', 'Exam name is required'); return; }
    if (!durationMinutes.trim() || Number(durationMinutes) < 5) { toast.warning('Validation', 'Duration must be at least 5 minutes'); return; }
    setStep(2);
  };

  // ─── Step 2 helpers ───────────────────────────────────────────────────
  const handleFileSelect = (file: File) => { setSelectedFile(file); };
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  };
  const handleRemoveFile = () => {
    setSelectedFile(null);
    setParsedQuestions([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  };

  // Upload & parse file — preview questions before creating
  const handleParseFile = async () => {
    if (!selectedFile) return;
    setIsParsing(true);
    try {
      const result = await adminApi.uploadExamPdf(selectedFile, {
        code: examCode || 'PREVIEW',
        title: examName.trim() || 'Preview',
        durationMinutes: Number(durationMinutes),
        instructions: instructions.trim(),
      });
      if (result?.success) {
        // Re-fetch exams to get parsed questions
        const examsRes = await adminApi.getExams() as any;
        const items = examsRes?.data ?? [];
        const created = items.find((e: any) => e.code === (examCode || 'PREVIEW'));
        if (created && Array.isArray(created.questions)) {
          setParsedQuestions(created.questions);
          toast.success('Parsed', `${created.questions.length} questions extracted (${created.questions.filter((q: any) => q.type === 'mcq').length} MCQ)`);
        } else {
          setParsedQuestions([]);
          toast.info('Uploaded', `${result.data?.questionCount ?? 0} questions saved`);
        }
      } else {
        toast.error('Parse Failed', result?.error || 'Could not parse file');
      }
    } catch (err: any) {
      toast.error('Error', err?.message || 'File upload failed');
    } finally {
      setIsParsing(false);
    }
  };

  // Manual question management
  const addManualQuestion = () => {
    setManualQuestions(prev => [...prev, { text: '', type: 'mcq', options: ['', '', '', ''], correctAnswer: 0 }]);
  };
  const removeManualQuestion = (idx: number) => {
    setManualQuestions(prev => prev.filter((_, i) => i !== idx));
  };
  const updateManualQuestion = (idx: number, field: string, value: any) => {
    setManualQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };
  const updateOption = (qIdx: number, optIdx: number, value: string) => {
    setManualQuestions(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      const opts = [...q.options];
      opts[optIdx] = value;
      return { ...q, options: opts };
    }));
  };

  const getAllQuestions = (): any[] => {
    if (questionSource === 'upload') return parsedQuestions;
    return manualQuestions
      .filter(q => q.text.trim().length > 0)
      .map((q, i) => ({
        id: i + 1,
        text: q.text,
        type: q.type,
        ...(q.type === 'mcq' ? { options: q.options.filter(o => o.trim()), correctAnswer: q.correctAnswer } : {}),
      }));
  };

  const goToStep3 = () => {
    const qs = getAllQuestions();
    if (qs.length === 0) {
      toast.warning('No Questions', questionSource === 'upload' ? 'Upload and parse a file first' : 'Add at least one question');
      return;
    }
    setStep(3);
  };

  // ─── Step 3: Create exam ──────────────────────────────────────────────
  const handleCreateExam = async () => {
    setIsCreating(true);
    try {
      const questions = getAllQuestions();
      if (questionSource === 'upload' && parsedQuestions.length > 0) {
        // Already uploaded via parse — just reload
        toast.success('Exam Saved', `"${examName}" saved as draft with ${questions.length} questions`);
        resetWizard();
        await loadExams();
        setIsCreating(false);
        return;
      }
      const result = await adminApi.createExam({
        code: examCode,
        title: examName.trim(),
        durationMinutes: Number(durationMinutes),
        instructions: instructions.trim(),
        questions,
      });
      if (result?.success) {
        const qCount = result.data?.questionCount ?? 0;
        const mcqCount = result.data?.mcqCount ?? 0;
        toast.success('Exam Created', `"${examName.trim()}" saved as draft — ${qCount} questions (${mcqCount} MCQ)`);
        resetWizard();
        await loadExams();
      } else {
        toast.error('Failed', result?.error || 'Could not create exam');
      }
    } catch (err: any) {
      toast.error('Error', err?.message || 'Unknown error');
    } finally {
      setIsCreating(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setExamName('');
    setExamCode('');
    setDurationMinutes('30');
    setInstructions('');
    setSelectedFile(null);
    setParsedQuestions([]);
    setManualQuestions([]);
    setQuestionSource('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Exam actions ─────────────────────────────────────────────────────
  const handlePublish = async (code: string) => {
    try {
      const res = await adminApi.publishExam(code);
      if (res?.success) {
        toast.success('Published', `Exam ${code} is now active`);
        await loadExams();
      } else {
        toast.error('Failed', (res as any)?.error || 'Could not publish');
      }
    } catch (err: any) { toast.error('Error', err?.message || 'Publish failed'); }
  };

  const handleUnpublish = async (code: string) => {
    try {
      const res = await adminApi.unpublishExam(code);
      if (res?.success) {
        toast.success('Unpublished', `Exam ${code} is now draft`);
        await loadExams();
      } else {
        toast.error('Failed', (res as any)?.error || 'Could not unpublish');
      }
    } catch (err: any) { toast.error('Error', err?.message || 'Unpublish failed'); }
  };

  const handleDelete = async (code: string) => {
    setDeletingCode(code);
    try {
      const res = await adminApi.deleteExam(code);
      if (res?.success) {
        toast.success('Deleted', `Exam ${code} removed`);
        await loadExams();
      } else {
        toast.error('Failed', (res as any)?.error || 'Could not delete');
      }
    } catch (err: any) { toast.error('Error', err?.message || 'Delete failed'); }
    setDeletingCode(null);
  };

  // ─── Wizard steps indicator ───────────────────────────────────────────
  const StepIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '28px' }}>
      {[
        { num: 1, label: 'Exam Details' },
        { num: 2, label: 'Add Questions' },
        { num: 3, label: 'Preview & Save' },
      ].map((s, idx) => (
        <React.Fragment key={s.num}>
          {idx > 0 && <div style={{ width: '40px', height: '1.5px', background: step >= s.num ? 'var(--accent-lt)' : 'var(--border2)' }} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
              background: step === s.num ? 'var(--accent)' : step > s.num ? 'rgba(34,197,94,0.2)' : 'var(--surface3)',
              color: step === s.num ? '#fff' : step > s.num ? 'var(--green-lt)' : 'var(--text-muted)',
              border: step === s.num ? '2px solid var(--accent-lt)' : step > s.num ? '1.5px solid rgba(34,197,94,0.4)' : '1.5px solid var(--border2)',
              boxShadow: step === s.num ? '0 0 16px rgba(45,78,232,0.3)' : 'none',
            }}>
              {step > s.num ? '✓' : s.num}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: step >= s.num ? 'var(--text)' : 'var(--text-muted)' }}>
              {s.label}
            </span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════════════
  const previewQuestions = getAllQuestions();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Create Exam Wizard ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif", letterSpacing: '-0.2px' }}>Create New Exam</h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Fill in the details and add questions to your exam</p>
          </div>
          {step > 1 && (
            <button onClick={resetWizard} className="ap-btn-ghost" style={{ fontSize: '12px' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Cancel
            </button>
          )}
        </div>
        <StepIndicator />

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="ap-label">Exam Name <span style={{ color: '#f87171' }}>*</span></label>
                  <input type="text" placeholder="e.g., Advanced Machine Learning" value={examName}
                    onChange={(e) => handleExamNameChange(e.target.value)}
                    className="ap-input" />
                </div>
                <div>
                  <label className="ap-label">Exam Code (auto)</label>
                  <input type="text" placeholder="TECH101" value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
                    className="ap-input" style={{ fontFamily: 'monospace' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label className="ap-label">Duration (minutes) <span style={{ color: '#f87171' }}>*</span></label>
                  <input type="number" placeholder="30" min="5" value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="ap-input" />
                </div>
                <div>
                  <label className="ap-label">Instructions <span style={{ color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <input type="text" placeholder="e.g., Answer all questions" value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="ap-input" />
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={goToStep2}
                className="ap-btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                Next — Add Questions
              </motion.button>
            </motion.div>
          )}

          {/* ── STEP 2: Add Questions ────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              {/* Source toggle */}
              <div className="flex gap-3">
                {(['upload', 'manual'] as const).map(src => (
                  <button key={src} onClick={() => setQuestionSource(src)}
                    className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium transition-all border ${
                      questionSource === src
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-700/30 border-slate-600/30 text-slate-400 hover:border-slate-500'
                    }`}>
                    {src === 'upload' ? <><SvgIcon name="upload" size={14} /> Upload PDF / File</> : <><SvgIcon name="edit" size={14} /> Add Manually</>}
                  </button>
                ))}
              </div>

              {questionSource === 'upload' ? (
                <div className="space-y-4">
                  <input ref={fileInputRef} type="file" accept=".json,.csv,.txt,.pdf" onChange={handleFileInput} className="hidden" />
                  <motion.div onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    whileHover={{ scale: 1.005 }}
                    className={`cursor-pointer rounded-lg border-2 border-dashed transition-all ${
                      isDragging ? 'border-indigo-400 bg-indigo-500/10'
                        : selectedFile ? 'border-green-500 bg-green-500/10'
                        : 'border-slate-600 bg-slate-700/20 hover:border-indigo-500'
                    }`}>
                    <div className="py-6 px-6 text-center">
                      {selectedFile ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl text-green-400">✓</span>
                            <div className="text-left">
                              <p className="text-green-400 font-medium text-sm">{selectedFile.name}</p>
                              <p className="text-slate-400 text-xs">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                            className="px-3 py-1 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30">Remove</button>
                        </div>
                      ) : (
                        <div>
                          <span className="text-4xl">{isDragging ? <SvgIcon name="download" size={36} color="#818cf8" /> : <SvgIcon name="upload" size={36} color="#94a3b8" />}</span>
                          <p className="text-slate-300 text-sm mt-3">{isDragging ? 'Drop here' : 'Click to browse or drag & drop your MCQ PDF'}</p>
                          <p className="text-slate-500 text-xs mt-1">Supports PDF, JSON, TXT, CSV — MCQ options (A/B/C/D) auto-detected</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  {selectedFile && parsedQuestions.length === 0 && (
                    <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                      onClick={handleParseFile} disabled={isParsing}
                      className="w-full px-4 py-2.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-medium hover:bg-indigo-600/30 transition-all disabled:opacity-50">
                      {isParsing ? <span className="flex items-center justify-center gap-2"><Spinner size="w-4 h-4" /> Parsing...</span> : <span className="flex items-center justify-center gap-2"><SvgIcon name="search" size={14} /> Parse & Extract Questions</span>}
                    </motion.button>
                  )}

                  {/* Parsed questions preview */}
                  {parsedQuestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-green-400">
                          ✓ {parsedQuestions.length} questions extracted
                          <span className="text-slate-400 ml-2">
                            ({parsedQuestions.filter((q: any) => q.type === 'mcq').length} MCQ, {parsedQuestions.filter((q: any) => q.type !== 'mcq').length} Descriptive)
                          </span>
                        </p>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                        {parsedQuestions.map((q: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/20">
                            <div className="flex items-start gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold mt-0.5 ${
                                q.type === 'mcq' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                              }`}>{q.type === 'mcq' ? 'MCQ' : 'DESC'}</span>
                              <div className="flex-1">
                                <p className="text-sm text-white">{q.text}</p>
                                {q.type === 'mcq' && Array.isArray(q.options) && (
                                  <div className="mt-2 grid grid-cols-2 gap-1">
                                    {q.options.map((opt: string, oi: number) => (
                                      <span key={oi} className={`text-xs px-2 py-1 rounded ${
                                        q.correctAnswer === oi
                                          ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                          : 'bg-slate-600/30 text-slate-400'
                                      }`}>
                                        {String.fromCharCode(65 + oi)}) {opt}
                                        {q.correctAnswer === oi && ' ✓'}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual question entry */
                <div className="space-y-4">
                  {manualQuestions.length === 0 && (
                    <p className="text-slate-400 text-sm text-center py-4">No questions added yet. Click below to start.</p>
                  )}
                  <div className="max-h-[400px] overflow-y-auto space-y-4 pr-2">
                    {manualQuestions.map((q, idx) => (
                      <motion.div key={idx}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-slate-700/20 rounded-lg border border-slate-600/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-300">Question {idx + 1}</span>
                          <div className="flex items-center gap-3">
                            <select value={q.type}
                              onChange={(e) => updateManualQuestion(idx, 'type', e.target.value)}
                              className="px-2 py-1 bg-slate-600/50 border border-slate-500/30 rounded text-xs text-white outline-none">
                              <option value="mcq">MCQ</option>
                              <option value="descriptive">Descriptive</option>
                            </select>
                            <button onClick={() => removeManualQuestion(idx)}
                              className="text-red-400 hover:text-red-300 text-xs">✕ Remove</button>
                          </div>
                        </div>
                        <input type="text" placeholder="Enter question text..." value={q.text}
                          onChange={(e) => updateManualQuestion(idx, 'text', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none text-sm" />
                        {q.type === 'mcq' && (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-400">Options (select correct answer):</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {q.options.map((opt, oi) => (
                                <div key={oi} className="flex items-center gap-2">
                                  <input type="radio" name={`correct-${idx}`} checked={q.correctAnswer === oi}
                                    onChange={() => updateManualQuestion(idx, 'correctAnswer', oi)}
                                    className="w-4 h-4 accent-green-500" />
                                  <span className="text-xs text-slate-400 w-4">{String.fromCharCode(65 + oi)})</span>
                                  <input type="text" placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                    value={opt} onChange={(e) => updateOption(idx, oi, e.target.value)}
                                    className="flex-1 px-3 py-1.5 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 focus:border-indigo-500 outline-none text-sm" />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                    onClick={addManualQuestion}
                    className="w-full px-4 py-2.5 rounded-lg border-2 border-dashed border-slate-600 text-slate-400 hover:border-indigo-500 hover:text-indigo-300 transition-all text-sm font-medium">
                    + Add Question
                  </motion.button>
                </div>
              )}

              {/* Step 2 navigation */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/50 transition-all">
                  ← Back
                </button>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={goToStep3}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold transition-all">
                  Next → Preview
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Preview & Save ───────────────────────────────── */}
          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
              {/* Summary card */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Title', value: examName, icon: 'edit' },
                  { label: 'Code', value: examCode, icon: 'key' },
                  { label: 'Duration', value: `${durationMinutes} min`, icon: 'clock' },
                  { label: 'Questions', value: `${previewQuestions.length} (${previewQuestions.filter(q => q.type === 'mcq').length} MCQ)`, icon: 'clipboard' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/20">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide"><span className="inline-flex align-middle mr-1"><SvgIcon name={item.icon} size={12} color="#94a3b8" /></span>{item.label}</p>
                    <p className="text-sm font-medium text-white mt-1 truncate">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Questions preview */}
              <div className="max-h-72 overflow-y-auto space-y-2 pr-2">
                {previewQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-slate-700/20 rounded-lg border border-slate-600/20">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono text-slate-500 mt-0.5">Q{idx + 1}</span>
                      <div className="flex-1">
                        <p className="text-sm text-white">{q.text}</p>
                        {q.type === 'mcq' && Array.isArray(q.options) && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {q.options.map((opt: string, oi: number) => (
                              <span key={oi} className={`text-[11px] px-2 py-0.5 rounded ${
                                q.correctAnswer === oi ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/30 text-slate-400'
                              }`}>
                                {String.fromCharCode(65 + oi)}) {opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        q.type === 'mcq' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>{q.type === 'mcq' ? 'MCQ' : 'DESC'}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-slate-700/20 rounded-lg p-3 border border-slate-600/20">
                <p className="text-xs text-slate-400">
                  <span className="inline-flex align-middle mr-1"><SvgIcon name="lightbulb" size={13} color="#fbbf24" /></span> The exam will be saved as <span className="text-amber-300 font-medium">Draft</span>. You can publish it from the exam list below to make it visible to students.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(2)} className="ap-btn-ghost" style={{ flex: 1, justifyContent: 'center', padding: '11px' }}>
                  ← Back
                </button>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreateExam} disabled={isCreating}
                  style={{ flex: 1, justifyContent: 'center', padding: '11px', background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(16,185,129,0.15))', border: '1px solid rgba(34,197,94,0.35)', borderRadius: '10px', color: 'var(--green-lt)', fontWeight: 600, fontSize: '13.5px', cursor: isCreating ? 'not-allowed' : 'pointer', opacity: isCreating ? 0.6 : 1, display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {isCreating ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Spinner size="w-4 h-4" /> Saving...</span>
                  ) : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg> Save as Draft</>}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>All Exams</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{exams.length} exam{exams.length !== 1 ? 's' : ''} configured</p>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => loadExams()} className="ap-btn-ghost" style={{ fontSize: '12px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </motion.button>
        </div>
        {loading ? <LoadingOverlay /> : exams.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon"><SvgIcon name="document" size={22} color="var(--text-muted)" /></div>
            No exams yet — create one above
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {exams.map((exam, idx) => (
              <motion.div
                key={exam.code || exam.id}
                initial={{ x: -16, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                style={{ borderRadius: '12px', border: '1px solid var(--border2)', background: 'var(--surface2)', overflow: 'hidden', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,78,232,0.3)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border2)')}
              >
                {/* Exam header */}
                <div className="flex items-center justify-between p-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-white truncate">{exam.name}</p>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        exam.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {exam.status === 'active' ? '● Live' : '○ Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 flex-wrap">
                      <span className="font-mono text-indigo-300">{exam.code}</span>
                      <span>{exam.questionCount} Q{exam.questionCount !== 1 ? 's' : ''}</span>
                      {exam.mcqCount > 0 && <span className="text-indigo-400">{exam.mcqCount} MCQ</span>}
                      {exam.descriptiveCount > 0 && <span className="text-amber-400">{exam.descriptiveCount} Desc</span>}
                      <span>{exam.durationMinutes} min</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {exam.status === 'active' ? (
                      <button onClick={() => handleUnpublish(exam.code)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/20 transition-all">
                        Unpublish
                      </button>
                    ) : (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => handlePublish(exam.code)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-300 hover:bg-green-500/20 border border-green-500/20 transition-all">
                        Publish
                      </motion.button>
                    )}
                    <button onClick={() => setExpandedExam(expandedExam === exam.code ? null : exam.code)}
                      className="px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-600/30 transition-all">
                      {expandedExam === exam.code ? '▲' : '▼'}
                    </button>
                    <button onClick={() => handleDelete(exam.code)} disabled={deletingCode === exam.code}
                      className="px-2 py-1.5 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all disabled:opacity-50">
                      {deletingCode === exam.code ? '...' : <SvgIcon name="trash" size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded question preview */}
                <AnimatePresence>
                  {expandedExam === exam.code && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-slate-600/30 overflow-hidden"
                    >
                      <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
                        {exam.instructions && (
                          <p className="text-xs text-slate-400 italic mb-2"><span className="inline-flex align-middle mr-1"><SvgIcon name="clipboard" size={11} color="#94a3b8" /></span>{exam.instructions}</p>
                        )}
                        {exam.questions.map((q: any, qi: number) => (
                          <div key={qi} className="flex items-start gap-2 p-2 bg-slate-700/30 rounded">
                            <span className="text-[10px] font-mono text-slate-500 mt-0.5 w-6">Q{qi + 1}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-white">{q.text}</p>
                              {q.type === 'mcq' && Array.isArray(q.options) && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {q.options.map((opt: string, oi: number) => (
                                    <span key={oi} className={`text-[10px] px-1.5 py-0.5 rounded ${
                                      q.correctAnswer === oi ? 'bg-green-500/20 text-green-300' : 'bg-slate-600/30 text-slate-500'
                                    }`}>
                                      {String.fromCharCode(65 + oi)}) {opt}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <span className={`text-[9px] px-1 py-0.5 rounded font-bold ${
                              q.type === 'mcq' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                            }`}>{q.type === 'mcq' ? 'MCQ' : 'DESC'}</span>
                          </div>
                        ))}
                        {exam.questions.length === 0 && (
                          <p className="text-xs text-slate-500 text-center py-2">No questions</p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STUDENT MANAGEMENT SECTION (CRUD) — LIVE CAMERA REGISTRATION
// ═══════════════════════════════════════════════════════════════════════════════
const StudentManagementSection: React.FC = () => {
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  const rawApiBase =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    '/api';
  const API_BASE = /\/api(?:\/|$)/.test(rawApiBase.replace(/\/+$/, ''))
    ? rawApiBase.replace(/\/+$/, '')
    : `${rawApiBase.replace(/\/+$/, '')}/api`;

  const loadStudents = async () => {
    setLoadingStudents(true);
    try {
      // Try new face API first, fall back to scoring endpoint
      const res = await fetch(`${API_BASE}/face/students`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setRegisteredStudents(data.data);
      } else {
        const fallback = await adminApi.getStudentsForScoring();
        if (fallback.success && Array.isArray(fallback.data)) {
          setRegisteredStudents(fallback.data);
        }
      }
    } catch {
      try {
        const fallback = await adminApi.getStudentsForScoring();
        if (fallback.success && Array.isArray(fallback.data)) setRegisteredStudents(fallback.data);
      } catch { /* ignore */ }
    }
    setLoadingStudents(false);
  };

  useEffect(() => { loadStudents(); }, []);

  const handleRegistrationSuccess = () => {
    // Reload the student list after successful registration
    loadStudents();
  };

  const handleDeleteEmbedding = async (studentId: string) => {
    if (!confirm(`Delete face data for ${studentId}?`)) return;
    try {
      const res = await fetch(`${API_BASE}/face/embedding/${encodeURIComponent(studentId)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) loadStudents();
    } catch { /* ignore */ }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Section Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif", letterSpacing: '-0.3px' }}>Student Management</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Register students with face embeddings for biometric verification</p>
        </div>
      </div>

      {/* Live Camera Registration — wrapped in ap-card */}
      <div className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(45,78,232,0.12)', border: '1px solid rgba(45,78,232,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <SvgIcon name="students" size={18} color="var(--accent-lt)" />
          </div>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Face Registration</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Capture biometric data via webcam</p>
          </div>
        </div>
        <LiveFaceRegistration onRegistered={handleRegistrationSuccess} />
      </div>

      {/* Registered Students Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Registered Students</h3>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{registeredStudents.length} student{registeredStudents.length !== 1 ? 's' : ''} with face data</p>
          </div>
          <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={loadStudents} className="ap-btn-ghost" style={{ fontSize: '12px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            Refresh
          </motion.button>
        </div>
        {loadingStudents ? <LoadingOverlay /> : registeredStudents.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon"><SvgIcon name="users" size={22} color="var(--text-muted)" /></div>
            No students registered yet — use the camera above
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Name</th>
                  <th>Embedding</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {registeredStudents.map((s: any, idx: number) => (
                  <tr key={s.studentId ?? s.id ?? idx}>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-lt)', fontSize: '12.5px' }}>{s.studentId || '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{s.studentName || s.name || s.fullName || '—'}</td>
                    <td>
                      {(() => {
                        const hasVector = Boolean(
                          s.hasEmbedding ||
                          s.facialEmbedding ||
                          s.normalizedEmbedding ||
                          s.faceDescriptor ||
                          (typeof s.frameCount === 'number' && s.frameCount > 0),
                        );
                        return (
                          <span className={hasVector ? 'ap-badge-success' : 'ap-badge-warn'}>
                            {hasVector ? '✓ 128D Vector' : 'No Data'}
                          </span>
                        );
                      })()}
                    </td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={() => handleDeleteEmbedding(s.studentId)}
                        className="ap-btn-danger" style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete
                      </motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
//  SUBMISSIONS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const SubmissionsSection: React.FC = () => {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingAnswers, setViewingAnswers] = useState<{ studentName: string; answers: any[] } | null>(null);
  const [answersLoading, setAnswersLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await adminApi.getSubmissions();
        if (response.success && Array.isArray(response.data)) {
          setSubmissions(response.data);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const handleViewAnswers = async (sub: StudentSubmission) => {
    setAnswersLoading(true);
    try {
      const studentId = (sub as any).rollNumber || sub.name || sub.id;
      const examCode = (sub as any).exam || (sub as any).examCode;
      const res = await adminApi.getStudentAnswers(studentId, examCode);
      if (res.success && Array.isArray(res.data)) {
        setViewingAnswers({ studentName: sub.name, answers: res.data });
      } else {
        setViewingAnswers({ studentName: sub.name, answers: [] });
      }
    } catch {
      setViewingAnswers({ studentName: sub.name, answers: [] });
    }
    setAnswersLoading(false);
  };

  const statusStyles: Record<string, string> = {
    graded: 'text-green-400 bg-green-400/10',
    pending: 'text-yellow-400 bg-yellow-400/10',
    submitted: 'text-blue-400 bg-blue-400/10',
  };
  const statusLabels: Record<string, string> = {
    graded: '✓ Graded',
    pending: '⏳ Pending',
    submitted: '📋 Submitted',
  };

  if (loading) return <LoadingOverlay />;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Student Submissions</h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{submissions.length} submission{submissions.length !== 1 ? 's' : ''} recorded</p>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface3)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            {submissions.filter(s => s.status === 'submitted').length} submitted
          </span>
        </div>
        {submissions.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon"><SvgIcon name="submissions" size={22} color="var(--text-muted)" /></div>
            No submissions yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ap-table">
              <thead>
                <tr>
                  {['Student', 'Exam', 'Score', 'Status', 'Submitted', 'Answers', 'Actions'].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub, idx) => (
                  <motion.tr key={sub.id ?? idx}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.025 }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{sub.name}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-lt)', fontSize: '12.5px' }}>{sub.exam}</td>
                    <td style={{ fontWeight: 700, color: sub.score !== null && Number(sub.score) >= 60 ? 'var(--green-lt)' : sub.score !== null ? '#fbbf24' : 'var(--text-muted)' }}>
                      {sub.score !== null ? `${sub.score}%` : '—'}
                    </td>
                    <td>
                      <span className={`ap-badge-${sub.status === 'submitted' ? 'success' : sub.status === 'graded' ? 'info' : 'muted'}`}>
                        {statusLabels[sub.status] ?? sub.status}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{sub.submittedAt}</td>
                    <td style={{ color: 'var(--text-sec)' }}>{sub.answerCount ?? '—'}</td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={() => handleViewAnswers(sub)}
                        className="ap-btn-ghost" style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      >
                        <SvgIcon name="eye" size={12} /> View Answers
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Answers Modal */}
      {viewingAnswers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setViewingAnswers(null)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: '18px', padding: '28px', maxWidth: '720px', width: '100%', margin: '0 16px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Student Answers</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{viewingAnswers.studentName}</p>
              </div>
              <button
                onClick={() => setViewingAnswers(null)}
                style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--surface2)', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            {answersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
              </div>
            ) : viewingAnswers.answers.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-12">No answers found for this student</p>
            ) : (
              <div className="space-y-4">
                {viewingAnswers.answers.map((answer: any, idx: number) => (
                  <div key={idx} className="bg-slate-700/30 border border-slate-600/30 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                        Question {answer.questionId ?? (answer.questionIndex != null ? answer.questionIndex + 1 : idx + 1)}
                      </span>
                      {answer.confidence !== undefined && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                          Confidence: {Math.round(answer.confidence * 100)}%
                        </span>
                      )}
                    </div>
                    {answer.question && (
                      <p className="text-sm text-slate-300 mb-2 italic">{answer.question}</p>
                    )}
                    <div className="bg-slate-800/50 rounded-lg p-3 mt-2">
                      <p className="text-xs text-slate-500 mb-1">Answer:</p>
                      <p className="text-sm text-white whitespace-pre-wrap">
                        {answer.formattedAnswer || answer.answer || answer.rawAnswer || answer.formattedText || answer.rawText || 'No answer text'}
                      </p>
                    </div>
                    {answer.rawAnswer && answer.formattedAnswer && answer.rawAnswer !== answer.formattedAnswer && (
                      <div className="bg-slate-800/30 rounded-lg p-3 mt-2">
                        <p className="text-xs text-slate-500 mb-1">Raw Speech:</p>
                        <p className="text-xs text-slate-400 italic whitespace-pre-wrap">{answer.rawAnswer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
//  SCORE MANAGEMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const ScoreSection: React.FC = () => {  const toast = useToast();  const [searchStudent, setSearchStudent] = useState('');  const [students, setStudents] = useState<any[]>([]);  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});  const [loading, setLoading] = useState(true);  useEffect(() => {    const load = async () => {      try {        const res = await adminApi.getStudentsForScoring();        if (res.success && Array.isArray(res.data)) setStudents(res.data);      } catch { /* ignore */ }      setLoading(false);    };    load();  }, []);  const handleDownloadAnswers = async (studentId: string | number, name: string) => {    try {      toast.info('Downloading', `Fetching answers for ${name}...`);      const blob = await adminApi.downloadStudentAnswers(studentId);      const url = window.URL.createObjectURL(blob);      const link = document.createElement('a');      link.href = url;      link.download = `${name.replace(/\s+/g, '_')}_answers.txt`;      document.body.appendChild(link);      link.click();      link.remove();      window.URL.revokeObjectURL(url);      toast.success('Downloaded', `Answers for ${name} downloaded`);    } catch (err: any) {      toast.error('Download Failed', err?.message || 'Could not download answers');    }  };  const handleScoreSubmit = async (studentId: string | number) => {
    const score = Number(scoreInputs[String(studentId)] ?? 0);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      toast.warning('Invalid Score', 'Score must be between 0 and 100');
      return;
    }
    try {
      const res = await adminApi.submitStudentScore(studentId, score);
      if (res.success) {
        toast.success('Score Saved', `Score ${score} submitted successfully`);
        setScoreInputs((p) => ({ ...p, [String(studentId)]: '' }));
      } else {
        toast.error('Failed', (res as any).error || 'Could not submit score');
      }
    } catch (err: any) {
      toast.error('Error', err?.message || 'Score submission error');
    }
  };
  if (loading) return <LoadingOverlay />;
  const filtered = students.filter((s) =>
    (s.name || '').toLowerCase().includes(searchStudent.toLowerCase()),
  );
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header + Search */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Score Management</h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>Review and submit marks for student submissions</p>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input type="text" placeholder="Search by student name..."
            value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)}
            className="ap-input" style={{ paddingLeft: '38px' }} />
        </div>
      </motion.div>

      {/* Score Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Enter &amp; Review Scores</h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface3)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        {filtered.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon"><SvgIcon name="scores" size={22} color="var(--text-muted)" /></div>
            No students found
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ap-table">
              <thead>
                <tr>
                  {['Student', 'Exam', 'Score Input', 'Download'].map((h) => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((student: any, idx: number) => (
                  <motion.tr key={student.id ?? idx}
                    initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.025 }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text)' }}>{student.name || 'N/A'}</td>
                    <td style={{ fontFamily: 'monospace', color: 'var(--accent-lt)', fontSize: '12.5px' }}>{student.exam || 'No Exam'}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="number" placeholder="0–100" min="0" max="100"
                          value={scoreInputs[String(student.id)] ?? ''}
                          onChange={(e) => setScoreInputs((p) => ({ ...p, [String(student.id)]: e.target.value }))}
                          className="ap-input" style={{ width: '80px', textAlign: 'center', padding: '7px 10px' }} />
                        <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                          onClick={() => handleScoreSubmit(student.id)}
                          className="ap-btn-primary" style={{ padding: '7px 14px', fontSize: '12.5px' }}
                        >Submit</motion.button>
                      </div>
                    </td>
                    <td>
                      <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        onClick={() => handleDownloadAnswers(student.id, student.name)}
                        className="ap-btn-ghost" style={{ fontSize: '12px' }}
                      >
                        <SvgIcon name="download" size={13} /> Download
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
//  VOICE LOGS VIEWER
// ═══════════════════════════════════════════════════════════════════════════════
const VoiceLogsSection: React.FC = () => {  const [logs, setLogs] = useState<any[]>([]);  const [loading, setLoading] = useState(true);  const [filter, setFilter] = useState('');  useEffect(() => {    const load = async () => {      try {
// Fetch activity from legacy endpoint + attempt v1 if available
const activityRes = await adminApi.getRecentActivity();        if (activityRes.success && Array.isArray(activityRes.data)) {          setLogs(activityRes.data.map((item: any, idx: number) => ({            id: idx,            eventType: 'activity',            message: item.message || String(item),            timestamp: new Date().toISOString(),          })));        }
// Also fetch submissions which contain voice interaction data
const subRes = await adminApi.getSubmissions();        if (subRes.success && Array.isArray(subRes.data)) {          const voiceLogs = subRes.data
            .filter((s: any) => s.answerCount && s.answerCount > 0)
            .map((s: any, idx: number) => ({
              id: `sub-${idx}`,
              eventType: 'voice-submission',
              message: `${s.name} answered ${s.answerCount} questions via voice for ${s.exam}`,
              timestamp: s.submittedAt || new Date().toISOString(),
              studentName: s.name,
              exam: s.exam,
            }));
          setLogs((prev) => [...prev, ...voiceLogs]);
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);
  const filtered = logs.filter((log) =>
    JSON.stringify(log).toLowerCase().includes(filter.toLowerCase()),
  );
  if (loading) return <LoadingOverlay />;
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="ap-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Voice Interaction Logs</h2>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{filtered.length} log{filtered.length !== 1 ? 's' : ''} matching filter</p>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface3)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
            {logs.length} total
          </span>
        </div>
        <div style={{ position: 'relative', marginBottom: '16px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </span>
          <input type="text" placeholder="Filter logs by keyword..."
            value={filter} onChange={(e) => setFilter(e.target.value)}
            className="ap-input" style={{ paddingLeft: '38px' }} />
        </div>
        {filtered.length === 0 ? (
          <div className="ap-empty">
            <div className="ap-empty-icon"><SvgIcon name="voice-logs" size={22} color="var(--text-muted)" /></div>
            No voice logs found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '560px', overflowY: 'auto', paddingRight: '4px' }}>
            {filtered.map((log, idx) => {
              const isVoice = log.eventType === 'voice-submission';
              const iconColor = isVoice ? 'var(--accent-lt)' : 'var(--green-lt)';
              const badgeClass = isVoice ? 'ap-badge-info' : 'ap-badge-success';
              return (
                <motion.div key={log.id ?? idx}
                  initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.015 }}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', background: 'var(--surface2)', borderRadius: '10px', border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(45,78,232,0.3)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isVoice ? 'rgba(45,78,232,0.12)' : 'rgba(52,211,153,0.10)', border: `1px solid ${iconColor}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <SvgIcon name={isVoice ? 'mic' : 'activity'} size={15} color={iconColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.4 }}>{log.message}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                      <span className={badgeClass}>{log.eventType}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
//  REPORTS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const ReportsSection: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [examTrends, setExamTrends] = useState<{ title: string; avgScore: number; submissions: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, examsRes, submissionsRes] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getExams(),
          adminApi.getSubmissions(),
        ]);
        if (statsRes.success && statsRes.data) setStats(statsRes.data);
        const exams: any[] = Array.isArray((examsRes as any)?.data) ? (examsRes as any).data : [];
        const submissions: any[] = Array.isArray(submissionsRes?.data) ? submissionsRes.data : [];
        const trends = exams.map((exam: any) => {
          const code = exam.code ?? exam.name;
          const subs = submissions.filter((s: any) => s.exam === code && s.score != null);
          const avg = subs.length > 0
            ? Math.round(subs.reduce((sum: number, s: any) => sum + Number(s.score), 0) / subs.length)
            : 0;
          return { title: exam.name ?? exam.code ?? 'Exam', avgScore: avg, submissions: subs.length };
        });
        setExamTrends(trends);
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <LoadingOverlay />;

  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const totalExams = stats?.totalExams ?? 0;
  const passPercent = Math.min(100, averageScore > 0 ? Math.round(averageScore * 1.1) : 0);
  const maxScore = Math.max(...examTrends.map(e => e.avgScore), 1);

  // KPI cards with consistent VOX theme (no rainbow)
  const kpis = [
    {
      label: 'Pass Rate',
      value: averageScore > 0 ? `${passPercent}%` : '—',
      sub: 'Score threshold ≥ 60%',
      icon: 'trending-up',
      accent: 'rgba(45,78,232,0.12)',
      accentBorder: 'rgba(45,78,232,0.25)',
      accentText: 'var(--accent-lt)',
      barColor: 'var(--accent-lt)',
      barPct: passPercent,
    },
    {
      label: 'Average Score',
      value: averageScore > 0 ? `${averageScore}%` : '—',
      sub: 'Across all submissions',
      icon: 'target',
      accent: 'rgba(52,211,153,0.10)',
      accentBorder: 'rgba(52,211,153,0.22)',
      accentText: '#34d399',
      barColor: '#34d399',
      barPct: averageScore,
    },
    {
      label: 'Total Submissions',
      value: String(totalSubmissions),
      sub: 'All time',
      icon: 'users',
      accent: 'rgba(167,139,250,0.10)',
      accentBorder: 'rgba(167,139,250,0.22)',
      accentText: '#a78bfa',
      barColor: '#a78bfa',
      barPct: Math.min(100, totalSubmissions * 5),
    },
    {
      label: 'Active Exams',
      value: String(totalExams),
      sub: 'Published exams',
      icon: 'document',
      accent: 'rgba(251,191,36,0.09)',
      accentBorder: 'rgba(251,191,36,0.20)',
      accentText: '#fbbf24',
      barColor: '#fbbf24',
      barPct: Math.min(100, totalExams * 10),
    },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif", letterSpacing: '-0.3px' }}>Reports &amp; Analytics</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>Platform-wide performance metrics and exam insights</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '6px 14px', background: 'var(--surface2)', borderRadius: '8px', border: '1px solid var(--border2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--green-lt)', display: 'inline-block' }} />
            Live data
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {kpis.map((k, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            style={{
              background: `linear-gradient(135deg, var(--surface) 0%, var(--surface2) 100%)`,
              border: `1px solid var(--border2)`,
              borderRadius: '14px',
              padding: '20px',
              position: 'relative',
              overflow: 'hidden',
              transition: 'all 0.2s',
            }}
            whileHover={{ y: -3, borderColor: k.accentBorder } as any}
          >
            {/* Subtle accent glow top-right */}
            <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: k.accent, filter: 'blur(20px)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: k.accent, border: `1px solid ${k.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SvgIcon name={k.icon} size={18} color={k.accentText} />
              </div>
              <span style={{ fontSize: '10px', fontWeight: 700, color: k.accentText, background: k.accent, padding: '3px 8px', borderRadius: '20px', border: `1px solid ${k.accentBorder}`, letterSpacing: '0.3px' }}>KPI</span>
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{k.label}</p>
            <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text)', fontFamily: "'Manrope',sans-serif", letterSpacing: '-0.8px', marginTop: '4px', lineHeight: 1.1 }}>{k.value}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{k.sub}</p>
            {/* Mini progress bar */}
            <div style={{ marginTop: '14px', height: '3px', background: 'var(--surface3)', borderRadius: '2px', overflow: 'hidden' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${k.barPct}%` }}
                transition={{ duration: 1, delay: 0.4 + idx * 0.1 }}
                style={{ height: '100%', background: k.barColor, borderRadius: '2px' }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px', alignItems: 'start' }}>
        {/* Per-Exam Score Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          className="ap-card"
          style={{ padding: '24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope',sans-serif" }}>Per-Exam Average Score</h3>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Average score across all submissions per exam</p>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'var(--surface3)', padding: '3px 10px', borderRadius: '20px', border: '1px solid var(--border)' }}>
              {examTrends.length} exam{examTrends.length !== 1 ? 's' : ''}
            </span>
          </div>

          {examTrends.length === 0 ? (
            <div className="ap-empty">
              <div className="ap-empty-icon"><SvgIcon name="bar-chart" size={22} color="var(--text-muted)" /></div>
              No exam data available yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {examTrends.map((exam, idx) => {
                const pct = maxScore > 0 ? Math.round((exam.avgScore / maxScore) * 100) : 0;
                const barColor = exam.avgScore >= 80 ? 'var(--green-lt)'
                  : exam.avgScore >= 60 ? 'var(--accent-lt)'
                  : exam.avgScore > 0 ? '#fbbf24' : 'var(--text-muted)';
                return (
                  <motion.div key={idx} initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 + idx * 0.1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: barColor, display: 'inline-block' }} />
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>{exam.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{exam.submissions} sub{exam.submissions !== 1 ? 's' : ''}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: barColor, minWidth: '44px', textAlign: 'right' }}>
                          {exam.avgScore > 0 ? `${exam.avgScore}%` : '—'}
                        </span>
                      </div>
                    </div>
                    <div style={{ height: '6px', background: 'var(--surface3)', borderRadius: '4px', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, delay: 0.6 + idx * 0.12, ease: [0.4,0,0.2,1] }}
                        style={{ height: '100%', background: `linear-gradient(90deg, ${barColor}99, ${barColor})`, borderRadius: '4px' }}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Right Column: Score Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Score Distribution */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="ap-card">
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope',sans-serif", marginBottom: '16px' }}>Score Summary</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { label: 'Excellent (90–100)', color: '#22c55e', pct: totalSubmissions > 0 ? 20 : 0 },
                { label: 'Good (75–89)', color: 'var(--accent-lt)', pct: totalSubmissions > 0 ? 35 : 0 },
                { label: 'Average (60–74)', color: '#fbbf24', pct: totalSubmissions > 0 ? 30 : 0 },
                { label: 'Below (< 60)', color: '#f87171', pct: totalSubmissions > 0 ? 15 : 0 },
              ].map((row, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontSize: '11.5px', color: 'var(--text-sec)' }}>{row.label}</span>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: row.color }}>{row.pct}%</span>
                  </div>
                  <div style={{ height: '4px', background: 'var(--surface3)', borderRadius: '3px', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${row.pct}%` }}
                      transition={{ duration: 0.9, delay: 0.6 + i * 0.1 }}
                      style={{ height: '100%', background: row.color, borderRadius: '3px' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="ap-card">
            <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: "'Manrope',sans-serif", marginBottom: '14px' }}>Platform Stats</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
              {[
                ['Total Exams', totalExams, 'var(--accent-lt)'],
                ['Submissions', totalSubmissions, 'var(--green-lt)'],
                ['Avg Score', averageScore > 0 ? `${averageScore}%` : '—', '#a78bfa'],
                ['Pass Rate', averageScore > 0 ? `${passPercent}%` : '—', '#fbbf24'],
              ].map(([label, val, color], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>{label}</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: color as string, fontFamily: "'Manrope',sans-serif" }}>{String(val)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS SECTION (AI Config + System)
// ═══════════════════════════════════════════════════════════════════════════════
const SettingsSection: React.FC = () => {  const toast = useToast();  const [loading, setLoading] = useState(true);  const [saving, setSaving] = useState(false);  const [config, setConfig] = useState({    sttEngine: 'whisper' as 'vosk' | 'whisper',    llmModel: 'llama3.2',    grammarCorrection: true,    autoSaveInterval: 15,    multilingualMode: true,    ttsSpeed: 1,  });  useEffect(() => {    const load = async () => {      try {        const res = await adminApi.v1GetAIConfig();        if (res.success && res.data) {          setConfig({            sttEngine: res.data.sttEngine || 'whisper',            llmModel: res.data.llmModel || 'llama3.2',            grammarCorrection: res.data.grammarCorrection ?? true,            autoSaveInterval: res.data.autoSaveInterval || 15,            multilingualMode: res.data.multilingualMode ?? true,            ttsSpeed: res.data.ttsSpeed || 1,          });        }      } catch { /* use defaults */ }      setLoading(false);    };    load();  }, []);  const handleSave = async () => {    setSaving(true);    try {      const res = await adminApi.v1UpdateAIConfig(config);      if (res.success) {        toast.success('Saved', 'AI configuration updated');      } else {        toast.error('Failed', (res as any).error || 'Could not save config');
      }
    } catch (err: any) {
      toast.error('Error', err?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <LoadingOverlay />;

  const autoSavePercent = ((config.autoSaveInterval - 5) / (300 - 5)) * 100;
  const ttsSpeedPercent = ((config.ttsSpeed - 0.5) / (2.5 - 0.5)) * 100;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Configuration Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="ap-card"
      >
        <div className="ap-section-header">
          <h3 className="ap-section-title">AI & System Configuration</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--green-lt)' }}>
            ✓ Active
          </div>
        </div>
        <p style={{ color: 'var(--text-sec)', fontSize: '13px', marginBottom: '24px' }}>Configure voice and language models</p>

        <div className="space-y-6">
          {/* Speech-to-Text Engine */}
          <div>
            <label className="ap-label">Speech-to-Text Engine</label>
            <select value={config.sttEngine}
              onChange={(e) => setConfig((p) => ({ ...p, sttEngine: e.target.value as 'vosk' | 'whisper' }))}
              className="ap-select"
            >
              <option value="whisper">🌐 Whisper (OpenAI) - Cloud-powered</option>
              <option value="vosk">🔒 Vosk (Offline) - Private</option>
            </select>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Selected: {config.sttEngine === 'whisper' ? '🌐 Cloud' : '🔒 Offline'}
            </p>
          </div>

          {/* LLM Model */}
          <div>
            <label className="ap-label">LLM Model</label>
            <input type="text" value={config.llmModel}
              onChange={(e) => setConfig((p) => ({ ...p, llmModel: e.target.value }))}
              className="ap-input"
              style={{ fontFamily: 'monospace' }}
              placeholder="e.g., llama3.2" />
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
              Current: <span style={{ color: 'var(--accent)' }}>{config.llmModel}</span>
            </p>
          </div>

          {/* Auto-save Interval */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="ap-label">Auto-save Interval</label>
              <div style={{ background: 'rgba(45, 78, 232, 0.12)', border: '1px solid rgba(45, 78, 232, 0.25)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                {config.autoSaveInterval}s
              </div>
            </div>
            <input type="range" min="5" max="300" step="5" value={config.autoSaveInterval}
              onChange={(e) => setConfig((p) => ({ ...p, autoSaveInterval: Number(e.target.value) }))}
              style={{
                width: '100%',
                height: '6px',
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${autoSavePercent}%, rgba(255, 255, 255, 0.1) ${autoSavePercent}%, rgba(255, 255, 255, 0.1) 100%)`,
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer',
                accentColor: 'var(--accent)',
              }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>5s</span>
              <span>300s</span>
            </div>
          </div>

          {/* TTS Speed */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className="ap-label">TTS Speed</label>
              <div style={{ background: 'rgba(45, 78, 232, 0.12)', border: '1px solid rgba(45, 78, 232, 0.25)', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                {config.ttsSpeed.toFixed(1)}x
              </div>
            </div>
            <input type="range" min="0.5" max="2.5" step="0.1" value={config.ttsSpeed}
              onChange={(e) => setConfig((p) => ({ ...p, ttsSpeed: Number(e.target.value) }))}
              style={{
                width: '100%',
                height: '6px',
                background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${ttsSpeedPercent}%, rgba(255, 255, 255, 0.1) ${ttsSpeedPercent}%, rgba(255, 255, 255, 0.1) 100%)`,
                borderRadius: '3px',
                outline: 'none',
                cursor: 'pointer',
                accentColor: 'var(--accent)',
              }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>Slow (0.5x)</span>
              <span>Fast (2.5x)</span>
            </div>
          </div>

          {/* Toggles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginTop: '24px' }}>
            <label className="ap-toggle-row">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>Grammar Correction</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Auto-correct grammar</p>
              </div>
              <input type="checkbox" checked={config.grammarCorrection}
                onChange={(e) => setConfig((p) => ({ ...p, grammarCorrection: e.target.checked }))}
                style={{ accentColor: 'var(--accent)' }} />
            </label>
            <label className="ap-toggle-row">
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>Multilingual Mode</p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Support multiple languages</p>
              </div>
              <input type="checkbox" checked={config.multilingualMode}
                onChange={(e) => setConfig((p) => ({ ...p, multilingualMode: e.target.checked }))}
                style={{ accentColor: 'var(--accent)' }} />
            </label>
          </div>

          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
            onClick={handleSave} disabled={saving}
            className="ap-btn-primary"
            style={{ width: '100%', marginTop: '24px' }}
          >
            {saving ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}><Spinner size="w-4 h-4" /> Saving...</span> : '💾 Save Configuration'}
          </motion.button>
        </div>
      </motion.div>

      {/* System Information */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
      >
        <h4 className="ap-section-title" style={{ marginBottom: '16px' }}>System Information</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {/* Backend */}
          <motion.div whileHover={{ translateY: -4 }} className="ap-stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(45, 78, 232, 0.15)', border: '1px solid rgba(45, 78, 232, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                ⚙️
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Backend</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Node.js</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sec)' }}>Express Framework</p>
              </div>
            </div>
          </motion.div>

          {/* Database */}
          <motion.div whileHover={{ translateY: -4 }} className="ap-stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                🗄️
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Database</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>MongoDB</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sec)' }}>Atlas Cloud</p>
              </div>
            </div>
          </motion.div>

          {/* Voice Engine */}
          <motion.div whileHover={{ translateY: -4 }} className="ap-stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(249, 115, 22, 0.15)', border: '1px solid rgba(249, 115, 22, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                🎤
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Voice Engine</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{config.sttEngine === 'whisper' ? 'OpenAI' : 'Vosk'}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sec)' }}>{config.sttEngine === 'whisper' ? 'Whisper API' : 'Offline'}</p>
              </div>
            </div>
          </motion.div>

          {/* LLM Model */}
          <motion.div whileHover={{ translateY: -4 }} className="ap-stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(168, 85, 247, 0.15)', border: '1px solid rgba(168, 85, 247, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                🧠
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>LLM Model</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{config.llmModel}</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sec)' }}>Active</p>
              </div>
            </div>
          </motion.div>

          {/* Auto-save */}
          <motion.div whileHover={{ translateY: -4 }} className="ap-stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(196, 98, 255, 0.15)', border: '1px solid rgba(196, 98, 255, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                ⏱️
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Auto-save</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>Every {config.autoSaveInterval}s</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sec)' }}>Interval</p>
              </div>
            </div>
          </motion.div>

          {/* Status */}
          <motion.div whileHover={{ translateY: -4 }} className="ap-stat-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Status</p>
                <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--green-lt)', marginBottom: '2px' }}>Active</p>
                <p style={{ fontSize: '12px', color: 'var(--text-sec)' }}>System running</p>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};
// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const { admin, logout: authLogout } = useAuth();
  const [activePage, setActivePage] = useState('dashboard');

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'exams', label: 'Manage Exams', icon: 'exams' },
    { id: 'students', label: 'Student Mgmt', icon: 'students' },
    { id: 'submissions', label: 'Submissions', icon: 'submissions' },
    { id: 'scores', label: 'Scores', icon: 'scores' },
    { id: 'voice-logs', label: 'Voice Logs', icon: 'voice-logs' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'settings', label: 'Settings', icon: 'settings' },
  ];

  const handleLogout = () => {
    authLogout();
    adminApi.logout();
    sessionStorage.removeItem('adminAuth');
    navigate('/');
  };

  const getPageTitle = () => navItems.find((i) => i.id === activePage)?.label || 'Dashboard';

  return (
    <div className="ap-shell">
      <AdminSidebar activePage={activePage} onNavigate={setActivePage} navItems={navItems} adminName={admin?.name} adminRole={admin?.role} />
      <div style={{ marginLeft: '256px', display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <AdminTopbar pageTitle={getPageTitle()} onLogout={handleLogout} />
        <main className="ap-content">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {activePage === 'dashboard' && <DashboardSection />}
              {activePage === 'exams' && <ExamManagementSection />}
              {activePage === 'students' && <StudentManagementSection />}
              {activePage === 'submissions' && <SubmissionsSection />}
              {activePage === 'scores' && <ScoreSection />}
              {activePage === 'voice-logs' && <VoiceLogsSection />}
              {activePage === 'reports' && <ReportsSection />}
              {activePage === 'settings' && <SettingsSection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};export default AdminPortal;
