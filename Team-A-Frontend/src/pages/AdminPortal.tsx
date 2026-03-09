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
// ─── Loading Spinner ────────────────────────────────────────────────────────
const Spinner: React.FC<{ size?: string }> = ({ size = 'w-6 h-6' }) => (  <div className={`${size} border-2 border-indigo-500 border-t-transparent rounded-full animate-spin`} />);
const LoadingOverlay: React.FC = () => (  <div className="flex items-center justify-center py-16">    <Spinner size="w-8 h-8" />  </div>);
// ─── Sidebar Navigation Component ──────────────────────────────────────────
const AdminSidebar: React.FC<{  activePage: string;  onNavigate: (page: string) => void;  navItems: NavItem[];  adminName?: string;  adminRole?: string;}> = ({ activePage, onNavigate, navItems, adminName, adminRole }) => (  <motion.nav    initial={{ x: -240 }}    animate={{ x: 0 }}    transition={{ duration: 0.3 }}    className="w-60 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-700/50 flex flex-col fixed left-0 top-0 z-[100]"  >    <div className="px-6 py-7 border-b border-slate-700/50">      <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">        MindKraft      </h1>      <p className="text-xs text-slate-400 mt-1">Admin Console v2.0</p>    </div>    <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">      <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">        Navigation      </div>      {navItems.map((item) => (        <motion.button          key={item.id}          whileHover={{ x: 4 }}          whileTap={{ scale: 0.98 }}          onClick={() => onNavigate(item.id)}          className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${            activePage === item.id              ? 'bg-gradient-to-r from-indigo-600/30 to-pink-600/30 text-white border border-indigo-500/30'              : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'          }`}        >          <span className="text-lg">{item.icon}</span>          {item.label}        </motion.button>      ))}    </div>    <div className="px-6 py-4 border-t border-slate-700/50">      <div className="flex items-center gap-3">        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">          A        </div>        <div>          <p className="text-sm font-medium text-white">{adminName || 'Admin User'}</p>          <p className="text-xs text-green-400">● {adminRole || 'Online'}</p>        </div>      </div>    </div>  </motion.nav>);
// ─── Top Bar Component ──────────────────────────────────────────────────────
const AdminTopbar: React.FC<{  pageTitle: string;  onLogout: () => void;}> = ({ pageTitle, onLogout }) => (  <motion.div    initial={{ y: -64 }}    animate={{ y: 0 }}    transition={{ duration: 0.3, delay: 0.1 }}    className="h-16 bg-slate-900/80 border-b border-slate-700/50 flex items-center justify-between px-8 sticky top-0 z-50 backdrop-blur-md"  >    <h2 className="text-lg font-semibold text-white">{pageTitle}</h2>    <div className="flex items-center gap-4">      <motion.button        whileHover={{ scale: 1.05 }}        whileTap={{ scale: 0.95 }}        onClick={onLogout}        className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 font-medium hover:bg-red-500/10 transition-colors text-sm"      >        Logout      </motion.button>    </div>  </motion.div>);
// ─── Stat Card Component ────────────────────────────────────────────────────
const StatCard: React.FC<StatCardData & { delay: number }> = ({ icon, label, value, trend, delay }) => (  <motion.div    initial={{ opacity: 0, y: 20 }}    animate={{ opacity: 1, y: 0 }}    transition={{ duration: 0.3, delay }}    whileHover={{ y: -4 }}    className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-indigo-500/30 transition-all"  >    <div className="flex items-start justify-between">      <div>        <p className="text-slate-400 text-sm font-medium">{label}</p>        <p className="text-3xl font-bold text-white mt-2">{value}</p>        {trend && <p className="text-xs text-green-400 mt-2">{trend}</p>}      </div>      <div className="text-3xl">{icon}</div>    </div>  </motion.div>);
// ═══════════════════════════════════════════════════════════════════════════════
//  DASHBOARD SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const DashboardSection: React.FC = () => {  const [stats, setStats] = useState<StatCardData[]>([    { icon: '📄', label: 'Total Exams', value: '—' },    { icon: '👥', label: 'Total Submissions', value: '—' },    { icon: '⏳', label: 'Pending Review', value: '—' },    { icon: '🎓', label: 'Avg Score', value: '—' },  ]);  const [activityItems, setActivityItems] = useState<string[]>([]);  const [loading, setLoading] = useState(true);  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'checking'>('checking');  useEffect(() => {    const loadData = async () => {      setLoading(true);      try {
// Check backend health
const health = await adminApi.getDashboardStats();        setBackendStatus(health.success ? 'online' : 'offline');        const [statsResponse, activityResponse] = await Promise.all([          adminApi.getDashboardStats(),          adminApi.getRecentActivity(),        ]);        if (statsResponse.success && statsResponse.data) {          const d = statsResponse.data;          setStats([            { icon: '📄', label: 'Total Exams', value: String(d.totalExams ?? 0) },            { icon: '👥', label: 'Total Submissions', value: String(d.totalSubmissions ?? 0) },            { icon: '⏳', label: 'Pending Review', value: String(d.pendingReview ?? 0) },            { icon: '🎓', label: 'Avg Score', value: `${d.averageScore ?? 0}%` },          ]);        }        if (activityResponse.success && Array.isArray(activityResponse.data)) {          setActivityItems(activityResponse.data.map((item: any) => item.message || String(item)));        }      } catch {        setBackendStatus('offline');      } finally {        setLoading(false);      }    };    loadData();  }, []);  if (loading) return <LoadingOverlay />;  return (    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">      {/* Backend Status Banner */}      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${        backendStatus === 'online'          ? 'bg-green-500/10 border border-green-500/30 text-green-300'          : backendStatus === 'offline'          ? 'bg-red-500/10 border border-red-500/30 text-red-300'          : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'      }`}>        <span className={`w-2 h-2 rounded-full ${backendStatus === 'online' ? 'bg-green-400' : backendStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'}`} />        Backend: {backendStatus === 'online' ? 'Connected' : backendStatus === 'offline' ? 'Unreachable — showing cached data' : 'Checking...'}      </div>      {/* Stats Grid */}      <div>        <h3 className="text-xl font-semibold text-white mb-6">Dashboard Overview</h3>        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">          {stats.map((stat, idx) => (            <StatCard key={idx} {...stat} delay={idx * 0.1} />          ))}        </div>      </div>      {/* Recent Activity */}      <motion.div        initial={{ opacity: 0, y: 20 }}        animate={{ opacity: 1, y: 0 }}        transition={{ delay: 0.4 }}        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"      >        <h4 className="text-lg font-semibold text-white mb-4">Recent Activity</h4>        {activityItems.length === 0 ? (          <p className="text-slate-400 text-sm text-center py-4">No recent activity</p>        ) : (          <div className="space-y-3">            {activityItems.map((item, idx) => (              <motion.div                key={idx}                initial={{ x: -20, opacity: 0 }}                animate={{ x: 0, opacity: 1 }}                transition={{ delay: 0.5 + idx * 0.1 }}                className="flex items-start gap-3 text-slate-300"              >                <span className="text-indigo-400 mt-1">→</span>                <p className="text-sm">{item}</p>              </motion.div>            ))}          </div>        )}      </motion.div>    </motion.div>  );};
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
    <div className="flex items-center justify-center gap-2 mb-8">
      {[
        { num: 1, label: 'Exam Details' },
        { num: 2, label: 'Add Questions' },
        { num: 3, label: 'Preview & Save' },
      ].map((s, idx) => (
        <React.Fragment key={s.num}>
          {idx > 0 && <div className={`w-12 h-0.5 ${step >= s.num ? 'bg-indigo-500' : 'bg-slate-600'}`} />}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step === s.num
                ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/50'
                : step > s.num
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {step > s.num ? '✓' : s.num}
            </div>
            <span className={`text-xs font-medium hidden sm:inline ${step >= s.num ? 'text-white' : 'text-slate-500'}`}>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* ── Create Exam Wizard ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-8"
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">Create New Exam</h3>
          {step > 1 && (
            <button onClick={resetWizard} className="text-xs text-slate-400 hover:text-white transition-colors">
              ✕ Cancel
            </button>
          )}
        </div>
        <StepIndicator />

        <AnimatePresence mode="wait">
          {/* ── STEP 1: Exam Details ──────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Exam Name <span className="text-red-400">*</span></label>
                  <input type="text" placeholder="e.g., Advanced Machine Learning" value={examName}
                    onChange={(e) => handleExamNameChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Exam Code (auto)</label>
                  <input type="text" placeholder="TECH101" value={examCode}
                    onChange={(e) => setExamCode(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes) <span className="text-red-400">*</span></label>
                  <input type="number" placeholder="30" min="5" value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Instructions <span className="text-slate-500 font-normal">(optional)</span></label>
                  <input type="text" placeholder="e.g., Answer all questions" value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} onClick={goToStep2}
                className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold transition-all">
                Next → Add Questions
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
                    {src === 'upload' ? '📄 Upload PDF / File' : '✏️ Add Manually'}
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
                          <span className="text-4xl">{isDragging ? '📥' : '📤'}</span>
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
                      {isParsing ? <span className="flex items-center justify-center gap-2"><Spinner size="w-4 h-4" /> Parsing...</span> : '🔍 Parse & Extract Questions'}
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
                  { label: 'Title', value: examName, icon: '📝' },
                  { label: 'Code', value: examCode, icon: '🔑' },
                  { label: 'Duration', value: `${durationMinutes} min`, icon: '⏱️' },
                  { label: 'Questions', value: `${previewQuestions.length} (${previewQuestions.filter(q => q.type === 'mcq').length} MCQ)`, icon: '📋' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-slate-700/30 rounded-lg border border-slate-600/20">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wide">{item.icon} {item.label}</p>
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
                  💡 The exam will be saved as <span className="text-amber-300 font-medium">Draft</span>. You can publish it from the exam list below to make it visible to students.
                </p>
              </div>

              {/* Step 3 navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep(2)}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-600 text-slate-300 font-medium hover:bg-slate-700/50 transition-all">
                  ← Back
                </button>
                <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  onClick={handleCreateExam}
                  disabled={isCreating}
                  className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold transition-all disabled:opacity-60">
                  {isCreating ? (
                    <span className="flex items-center justify-center gap-2"><Spinner size="w-4 h-4" /> Saving...</span>
                  ) : '✓ Save as Draft'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Exam List ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">All Exams</h4>
          <button onClick={() => loadExams()} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">↻ Refresh</button>
        </div>
        {loading ? <LoadingOverlay /> : exams.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No exams yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {exams.map((exam, idx) => (
              <motion.div
                key={exam.code || exam.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 + idx * 0.04 }}
                className="bg-slate-700/20 rounded-lg border border-slate-600/30 hover:border-indigo-500/30 transition-all overflow-hidden"
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
                      {deletingCode === exam.code ? '...' : '🗑'}
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
                          <p className="text-xs text-slate-400 italic mb-2">📋 {exam.instructions}</p>
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

  const API_BASE =
    (import.meta.env.VITE_API_URL as string | undefined) ||
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    'http://localhost:3000/api';

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Live Camera Registration */}
      <LiveFaceRegistration onRegistered={handleRegistrationSuccess} />

      {/* Registered Students with Face Embeddings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-white">Registered Students</h4>
          <button onClick={loadStudents} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">↻ Refresh</button>
        </div>
        {loadingStudents ? <LoadingOverlay /> : registeredStudents.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No students registered yet. Use the camera above to register.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">Student ID</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">Embedding</th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {registeredStudents.map((s: any, idx: number) => (
                  <tr key={s.studentId ?? s.id ?? idx} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-3 text-sm text-indigo-300 font-mono">{s.studentId || '-'}</td>
                    <td className="px-4 py-3 text-sm text-white font-medium">{s.studentName || s.name || s.fullName || '-'}</td>
                    <td className="px-4 py-3 text-sm">
                      {(() => {
                        const hasVector = Boolean(
                          s.hasEmbedding ||
                          s.facialEmbedding ||
                          s.normalizedEmbedding ||
                          s.faceDescriptor ||
                          (typeof s.frameCount === 'number' && s.frameCount > 0),
                        );

                        return (
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        hasVector
                          ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                      }`}>
                        {hasVector
                          ? '✓ 128D Vector' : 'No Data'}
                      </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDeleteEmbedding(s.studentId)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
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
const SubmissionsSection: React.FC = () => {  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);  const [loading, setLoading] = useState(true);  useEffect(() => {    const load = async () => {      try {        const response = await adminApi.getSubmissions();        if (response.success && Array.isArray(response.data)) {          setSubmissions(response.data);        }      } catch { /* ignore */ }      setLoading(false);    };    load();  }, []);  const statusStyles: Record<string, string> = {    graded: 'text-green-400 bg-green-400/10',    pending: 'text-yellow-400 bg-yellow-400/10',    submitted: 'text-blue-400 bg-blue-400/10',  };  const statusLabels: Record<string, string> = {    graded: '✓ Graded',    pending: '⏳ Pending',    submitted: '📋 Submitted',  };  if (loading) return <LoadingOverlay />;  return (    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"    >      <h3 className="text-lg font-semibold text-white mb-6">Student Submissions</h3>      {submissions.length === 0 ? (        <p className="text-slate-400 text-sm text-center py-8">No submissions yet</p>      ) : (        <div className="overflow-x-auto">          <table className="w-full">            <thead>              <tr className="border-b border-slate-700/50">                {['Student', 'Exam', 'Score', 'Status', 'Submitted', 'Answers'].map((h) => (                  <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-slate-400">{h}</th>                ))}              </tr>            </thead>            <tbody>              {submissions.map((sub, idx) => (                <motion.tr key={sub.id ?? idx}                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}                  transition={{ delay: idx * 0.03 }}                  className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"                >                  <td className="px-4 py-3 text-sm text-white font-medium">{sub.name}</td>                  <td className="px-4 py-3 text-sm text-slate-300 font-mono">{sub.exam}</td>                  <td className="px-4 py-3 text-sm text-slate-300">{sub.score !== null ? `${sub.score}%` : '—'}</td>                  <td className="px-4 py-3 text-sm">                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyles[sub.status] ?? 'text-slate-400 bg-slate-400/10'}`}>                      {statusLabels[sub.status] ?? sub.status}                    </span>                  </td>                  <td className="px-4 py-3 text-sm text-slate-400">{sub.submittedAt}</td>                  <td className="px-4 py-3 text-sm text-slate-400">{sub.answerCount ?? '-'}</td>                </motion.tr>              ))}            </tbody>          </table>        </div>      )}    </motion.div>  );};
// ═══════════════════════════════════════════════════════════════════════════════
//  SCORE MANAGEMENT SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const ScoreSection: React.FC = () => {  const toast = useToast();  const [searchStudent, setSearchStudent] = useState('');  const [students, setStudents] = useState<any[]>([]);  const [scoreInputs, setScoreInputs] = useState<Record<string, string>>({});  const [loading, setLoading] = useState(true);  useEffect(() => {    const load = async () => {      try {        const res = await adminApi.getStudentsForScoring();        if (res.success && Array.isArray(res.data)) setStudents(res.data);      } catch { /* ignore */ }      setLoading(false);    };    load();  }, []);  const handleDownloadAnswers = async (studentId: string | number, name: string) => {    try {      toast.info('Downloading', `Fetching answers for ${name}...`);      const blob = await adminApi.downloadStudentAnswers(studentId);      const url = window.URL.createObjectURL(blob);      const link = document.createElement('a');      link.href = url;      link.download = `${name.replace(/\s+/g, '_')}_answers.txt`;      document.body.appendChild(link);      link.click();      link.remove();      window.URL.revokeObjectURL(url);      toast.success('Downloaded', `Answers for ${name} downloaded`);    } catch (err: any) {      toast.error('Download Failed', err?.message || 'Could not download answers');    }  };  const handleScoreSubmit = async (studentId: string | number) => {    const score = Number(scoreInputs[String(studentId)] ?? 0);    if (Number.isNaN(score) || score < 0 || score > 100) {      toast.warning('Invalid Score', 'Score must be between 0 and 100');      return;    }    try {      const res = await adminApi.submitStudentScore(studentId, score);      if (res.success) {        toast.success('Score Saved', `Score ${score} submitted successfully`);        setScoreInputs((p) => ({ ...p, [String(studentId)]: '' }));      } else {        toast.error('Failed', (res as any).error || 'Could not submit score');      }    } catch (err: any) {      toast.error('Error', err?.message || 'Score submission error');    }  };  if (loading) return <LoadingOverlay />;  const filtered = students.filter((s) =>    (s.name || '').toLowerCase().includes(searchStudent.toLowerCase()),  );  return (    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"      >        <h3 className="text-lg font-semibold text-white mb-4">Score Management</h3>        <input type="text" placeholder="Search by student name..."          value={searchStudent} onChange={(e) => setSearchStudent(e.target.value)}          className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none" />      </motion.div>      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"      >        <h4 className="text-lg font-semibold text-white mb-6">Enter & Review Scores</h4>        {filtered.length === 0 ? (          <p className="text-slate-400 text-sm text-center py-6">No students found</p>        ) : (          <div className="overflow-x-auto">            <table className="w-full">              <thead>                <tr className="border-b border-slate-700/50">                  {['Student', 'Exam', 'Score Input', 'Download'].map((h) => (                    <th key={h} className="text-left px-4 py-3 text-sm font-semibold text-slate-400">{h}</th>                  ))}                </tr>              </thead>              <tbody>                {filtered.map((student: any, idx: number) => (                  <motion.tr key={student.id ?? idx}                    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}                    transition={{ delay: idx * 0.03 }}                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"                  >                    <td className="px-4 py-3 text-sm text-white font-medium">{student.name}</td>                    <td className="px-4 py-3 text-sm text-slate-300 font-mono">{student.exam}</td>                    <td className="px-4 py-3 text-sm">                      <div className="flex items-center gap-2">                        <input type="number" placeholder="0–100" min="0" max="100"                          value={scoreInputs[String(student.id)] ?? ''}                          onChange={(e) => setScoreInputs((p) => ({ ...p, [String(student.id)]: e.target.value }))}                          className="w-20 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none text-center" />                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}                          onClick={() => handleScoreSubmit(student.id)}                          className="px-3 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 transition-colors font-medium text-sm"                        >Submit</motion.button>                      </div>                    </td>                    <td className="px-4 py-3 text-sm">                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}                        onClick={() => handleDownloadAnswers(student.id, student.name)}                        className="px-4 py-2 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/40 transition-colors font-medium text-sm"                      >📥 Download</motion.button>                    </td>                  </motion.tr>                ))}              </tbody>            </table>          </div>        )}      </motion.div>    </motion.div>  );};
// ═══════════════════════════════════════════════════════════════════════════════
//  VOICE LOGS VIEWER
// ═══════════════════════════════════════════════════════════════════════════════
const VoiceLogsSection: React.FC = () => {  const [logs, setLogs] = useState<any[]>([]);  const [loading, setLoading] = useState(true);  const [filter, setFilter] = useState('');  useEffect(() => {    const load = async () => {      try {
// Fetch activity from legacy endpoint + attempt v1 if available
const activityRes = await adminApi.getRecentActivity();        if (activityRes.success && Array.isArray(activityRes.data)) {          setLogs(activityRes.data.map((item: any, idx: number) => ({            id: idx,            eventType: 'activity',            message: item.message || String(item),            timestamp: new Date().toISOString(),          })));        }
// Also fetch submissions which contain voice interaction data
const subRes = await adminApi.getSubmissions();        if (subRes.success && Array.isArray(subRes.data)) {          const voiceLogs = subRes.data            .filter((s: any) => s.answerCount && s.answerCount > 0)            .map((s: any, idx: number) => ({              id: `sub-${idx}`,              eventType: 'voice-submission',              message: `${s.name} answered ${s.answerCount} questions via voice for ${s.exam}`,              timestamp: s.submittedAt || new Date().toISOString(),              studentName: s.name,              exam: s.exam,            }));          setLogs((prev) => [...prev, ...voiceLogs]);        }      } catch { /* ignore */ }      setLoading(false);    };    load();  }, []);  const filtered = logs.filter((log) =>    JSON.stringify(log).toLowerCase().includes(filter.toLowerCase()),  );  if (loading) return <LoadingOverlay />;  return (    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"      >        <h3 className="text-lg font-semibold text-white mb-4">Voice Interaction Logs</h3>        <input type="text" placeholder="Filter logs..."          value={filter} onChange={(e) => setFilter(e.target.value)}          className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none mb-4" />        {filtered.length === 0 ? (          <p className="text-slate-400 text-sm text-center py-8">No voice logs found</p>        ) : (          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">            {filtered.map((log, idx) => (              <motion.div key={log.id ?? idx}                initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}                transition={{ delay: idx * 0.02 }}                className="flex items-start gap-3 p-3 bg-slate-700/20 rounded-lg border border-slate-700/30 hover:border-indigo-500/20 transition-all"              >                <span className={`mt-0.5 text-sm ${                  log.eventType === 'voice-submission' ? 'text-blue-400' : 'text-indigo-400'                }`}>                  {log.eventType === 'voice-submission' ? '🎤' : '📝'}                </span>                <div className="flex-1">                  <p className="text-sm text-slate-200">{log.message}</p>                  <div className="flex items-center gap-3 mt-1">                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${                      log.eventType === 'voice-submission'                        ? 'bg-blue-500/20 text-blue-300'                        : 'bg-indigo-500/20 text-indigo-300'                    }`}>{log.eventType}</span>                    <span className="text-xs text-slate-500">                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}                    </span>                  </div>                </div>              </motion.div>            ))}          </div>        )}      </motion.div>    </motion.div>  );};
// ═══════════════════════════════════════════════════════════════════════════════
//  REPORTS SECTION
// ═══════════════════════════════════════════════════════════════════════════════
const ReportsSection: React.FC = () => {  const [stats, setStats] = useState<any>(null);  const [examTrends, setExamTrends] = useState<{ title: string; avgScore: number }[]>([]);  const [loading, setLoading] = useState(true);  useEffect(() => {    const load = async () => {      try {        const [statsRes, examsRes, submissionsRes] = await Promise.all([          adminApi.getDashboardStats(),          adminApi.getExams(),          adminApi.getSubmissions(),        ]);        if (statsRes.success && statsRes.data) setStats(statsRes.data);        const exams: any[] = Array.isArray((examsRes as any)?.data) ? (examsRes as any).data : [];        const submissions: any[] = Array.isArray(submissionsRes?.data) ? submissionsRes.data : [];        const trends = exams.map((exam: any) => {          const code = exam.code ?? exam.name;          const subs = submissions.filter((s: any) => s.exam === code && s.score != null);          const avg = subs.length > 0            ? Math.round(subs.reduce((sum: number, s: any) => sum + Number(s.score), 0) / subs.length)            : 0;          return { title: exam.name ?? exam.code ?? 'Exam', avgScore: avg };        });        setExamTrends(trends);      } catch { /* ignore */ }      setLoading(false);    };    load();  }, []);  if (loading) return <LoadingOverlay />;  const totalSubmissions = stats?.totalSubmissions ?? 0;  const averageScore = stats?.averageScore ?? 0;  const totalExams = stats?.totalExams ?? 0;  const passPercent = Math.min(100, averageScore > 0 ? Math.round(averageScore * 1.1) : 0);  const metrics = [    { title: 'Pass Rate', value: averageScore > 0 ? `${passPercent}%` : '—', icon: '📈', color: 'from-green-600 to-emerald-600' },    { title: 'Average Score', value: averageScore > 0 ? String(averageScore) : '—', icon: '🎯', color: 'from-blue-600 to-cyan-600' },    { title: 'Submissions', value: String(totalSubmissions), icon: '👥', color: 'from-purple-600 to-pink-600' },    { title: 'Active Exams', value: String(totalExams), icon: '📊', color: 'from-orange-600 to-red-600' },  ];  return (    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">      <h3 className="text-xl font-semibold text-white">Reports & Analytics</h3>      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">        {metrics.map((m, idx) => (          <motion.div key={idx}            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}            transition={{ delay: idx * 0.1 }} whileHover={{ y: -4 }}            className={`bg-gradient-to-br ${m.color} rounded-xl p-6 text-white shadow-lg transition-all`}          >            <div className="flex items-start justify-between">              <div>                <p className="text-sm font-medium opacity-90">{m.title}</p>                <p className="text-3xl font-bold mt-3">{m.value}</p>              </div>              <span className="text-3xl opacity-80">{m.icon}</span>            </div>          </motion.div>        ))}      </div>      {/* Per-Exam Chart */}      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"      >        <h4 className="text-lg font-semibold text-white mb-6">Per-Exam Average Score</h4>        {examTrends.length === 0 ? (          <p className="text-slate-400 text-sm text-center py-8">No exam data yet</p>        ) : (          <div className="space-y-4">            {examTrends.map((exam, idx) => (              <motion.div key={idx}                initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}                transition={{ delay: 0.5 + idx * 0.1 }}              >                <div className="flex justify-between mb-2">                  <span className="text-sm text-slate-300">{exam.title}</span>                  <span className="text-sm font-semibold text-indigo-400">                    {exam.avgScore > 0 ? `${exam.avgScore}%` : 'No submissions'}                  </span>                </div>                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">                  <motion.div                    initial={{ width: 0 }}                    animate={{ width: `${exam.avgScore}%` }}                    transition={{ duration: 1, delay: 0.6 + idx * 0.1 }}                    className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"                  />                </div>              </motion.div>            ))}          </div>        )}      </motion.div>    </motion.div>  );};
// ═══════════════════════════════════════════════════════════════════════════════
//  SETTINGS SECTION (AI Config + System)
// ═══════════════════════════════════════════════════════════════════════════════
const SettingsSection: React.FC = () => {  const toast = useToast();  const [loading, setLoading] = useState(true);  const [saving, setSaving] = useState(false);  const [config, setConfig] = useState({    sttEngine: 'whisper' as 'vosk' | 'whisper',    llmModel: 'llama3.2',    grammarCorrection: true,    autoSaveInterval: 15,    multilingualMode: true,    ttsSpeed: 1,  });  useEffect(() => {    const load = async () => {      try {        const res = await adminApi.v1GetAIConfig();        if (res.success && res.data) {          setConfig({            sttEngine: res.data.sttEngine || 'whisper',            llmModel: res.data.llmModel || 'llama3.2',            grammarCorrection: res.data.grammarCorrection ?? true,            autoSaveInterval: res.data.autoSaveInterval || 15,            multilingualMode: res.data.multilingualMode ?? true,            ttsSpeed: res.data.ttsSpeed || 1,          });        }      } catch { /* use defaults */ }      setLoading(false);    };    load();  }, []);  const handleSave = async () => {    setSaving(true);    try {      const res = await adminApi.v1UpdateAIConfig(config);      if (res.success) {        toast.success('Saved', 'AI configuration updated');      } else {        toast.error('Failed', (res as any).error || 'Could not save config');      }    } catch (err: any) {      toast.error('Error', err?.message || 'Save failed');    } finally {      setSaving(false);    }  };  if (loading) return <LoadingOverlay />;  return (    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"      >        <h3 className="text-lg font-semibold text-white mb-6">AI & System Configuration</h3>        <div className="space-y-5">          {/* STT Engine */}          <div>            <label className="block text-sm font-medium text-slate-300 mb-2">Speech-to-Text Engine</label>            <select value={config.sttEngine}              onChange={(e) => setConfig((p) => ({ ...p, sttEngine: e.target.value as 'vosk' | 'whisper' }))}              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-indigo-500 outline-none"            >              <option value="whisper">Whisper (OpenAI)</option>              <option value="vosk">Vosk (Offline)</option>            </select>          </div>          {/* LLM Model */}          <div>            <label className="block text-sm font-medium text-slate-300 mb-2">LLM Model</label>            <input type="text" value={config.llmModel}              onChange={(e) => setConfig((p) => ({ ...p, llmModel: e.target.value }))}              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none font-mono" />          </div>          {/* Auto-save Interval */}          <div>            <label className="block text-sm font-medium text-slate-300 mb-2">Auto-save Interval (seconds)</label>            <input type="number" min="5" max="300" value={config.autoSaveInterval}              onChange={(e) => setConfig((p) => ({ ...p, autoSaveInterval: Number(e.target.value) }))}              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:border-indigo-500 outline-none" />          </div>          {/* TTS Speed */}          <div>            <label className="block text-sm font-medium text-slate-300 mb-2">TTS Speed ({config.ttsSpeed}x)</label>            <input type="range" min="0.5" max="2.5" step="0.1" value={config.ttsSpeed}              onChange={(e) => setConfig((p) => ({ ...p, ttsSpeed: Number(e.target.value) }))}              className="w-full accent-indigo-500" />          </div>          {/* Toggles */}          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">            <label className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">              <input type="checkbox" checked={config.grammarCorrection}                onChange={(e) => setConfig((p) => ({ ...p, grammarCorrection: e.target.checked }))}                className="w-4 h-4 accent-indigo-500" />              <div>                <p className="text-sm text-white font-medium">Grammar Correction</p>                <p className="text-xs text-slate-400">Auto-correct grammar in answers</p>              </div>            </label>            <label className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors">              <input type="checkbox" checked={config.multilingualMode}                onChange={(e) => setConfig((p) => ({ ...p, multilingualMode: e.target.checked }))}                className="w-4 h-4 accent-indigo-500" />              <div>                <p className="text-sm text-white font-medium">Multilingual Mode</p>                <p className="text-xs text-slate-400">Support multiple languages</p>              </div>            </label>          </div>          <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}            onClick={handleSave} disabled={saving}            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-60"          >            {saving ? <span className="flex items-center justify-center gap-2"><Spinner size="w-4 h-4" /> Saving...</span> : 'Save Configuration'}          </motion.button>        </div>      </motion.div>      {/* System Info */}      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"      >        <h4 className="text-lg font-semibold text-white mb-4">System Information</h4>        <div className="space-y-3 text-sm">          {[            ['Backend', 'Node.js + Express'],            ['Database', 'MongoDB Atlas'],            ['Voice Engine', config.sttEngine === 'whisper' ? 'OpenAI Whisper' : 'Vosk'],            ['LLM', config.llmModel],            ['Auto-save', `Every ${config.autoSaveInterval}s`],          ].map(([k, v]) => (            <div key={k} className="flex justify-between py-2 border-b border-slate-700/30">              <span className="text-slate-400">{k}</span>              <span className="text-white font-medium">{v}</span>            </div>          ))}        </div>      </motion.div>    </motion.div>  );};
// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN ADMIN PORTAL
// ═══════════════════════════════════════════════════════════════════════════════
const AdminPortal: React.FC = () => {  const navigate = useNavigate();  const { admin, logout: authLogout } = useAuth();  const [activePage, setActivePage] = useState('dashboard');  const navItems: NavItem[] = [    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },    { id: 'exams', label: 'Manage Exams', icon: '📝' },    { id: 'students', label: 'Student Mgmt', icon: '🧑‍🎓' },    { id: 'submissions', label: 'Submissions', icon: '📋' },    { id: 'scores', label: 'Scores', icon: '⭐' },    { id: 'voice-logs', label: 'Voice Logs', icon: '🎤' },    { id: 'reports', label: 'Reports', icon: '📊' },    { id: 'settings', label: 'Settings', icon: '⚙️' },  ];  const handleLogout = () => {    authLogout();    adminApi.logout();    sessionStorage.removeItem('adminAuth');    navigate('/');  };  const getPageTitle = () => navItems.find((i) => i.id === activePage)?.label || 'Dashboard';  return (    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">      <AdminSidebar activePage={activePage} onNavigate={setActivePage} navItems={navItems} adminName={admin?.name} adminRole={admin?.role} />      <div className="ml-60 flex flex-col min-h-screen">        <AdminTopbar pageTitle={getPageTitle()} onLogout={handleLogout} />        <main className="flex-1 px-8 py-8 overflow-y-auto">          <AnimatePresence mode="wait">            <motion.div              key={activePage}              initial={{ opacity: 0, y: 10 }}              animate={{ opacity: 1, y: 0 }}              exit={{ opacity: 0, y: -10 }}              transition={{ duration: 0.3 }}            >              {activePage === 'dashboard' && <DashboardSection />}              {activePage === 'exams' && <ExamManagementSection />}              {activePage === 'students' && <StudentManagementSection />}              {activePage === 'submissions' && <SubmissionsSection />}              {activePage === 'scores' && <ScoreSection />}              {activePage === 'voice-logs' && <VoiceLogsSection />}              {activePage === 'reports' && <ReportsSection />}              {activePage === 'settings' && <SettingsSection />}            </motion.div>          </AnimatePresence>        </main>      </div>    </div>  );};
export default AdminPortal;
