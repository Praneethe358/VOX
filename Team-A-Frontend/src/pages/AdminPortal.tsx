import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { adminApi } from '../api/apiService';
import * as faceapi from 'face-api.js';

interface NavItem {
  id: string;
  label: string;
  icon: string;
}

interface StatCard {
  icon: string;
  label: string;
  value: string;
  trend?: string;
}

interface StudentSubmission {
  id: number;
  name: string;
  exam: string;
  score: number | null;
  status: 'graded' | 'pending' | 'submitted';
  submittedAt: string;
}

interface StudentRegistrationData {
  studentId: string;
  name: string;
  examCode: string;
  email: string;
}

// ─── Sidebar Navigation Component ──────────────────────────────────────
const AdminSidebar: React.FC<{
  activePage: string;
  onNavigate: (page: string) => void;
  navItems: NavItem[];
}> = ({ activePage, onNavigate, navItems }) => {
  return (
    <motion.nav
      initial={{ x: -240 }}
      animate={{ x: 0 }}
      transition={{ duration: 0.3 }}
      className="w-60 min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 border-r border-slate-700/50 flex flex-col fixed left-0 top-0 z-100"
    >
      {/* Logo Section */}
      <div className="px-6 py-7 border-b border-slate-700/50">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
          MindKraft
        </h1>
        <p className="text-xs text-slate-400 mt-1">Admin Console v1.0</p>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4 px-3 space-y-2">
        <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Navigation
        </div>
        {navItems.map((item) => (
          <motion.button
            key={item.id}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(item.id)}
            className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
              activePage === item.id
                ? 'bg-gradient-to-r from-indigo-600/30 to-pink-600/30 text-white border border-indigo-500/30'
                : 'text-slate-300 hover:bg-slate-800/50 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </motion.button>
        ))}
      </div>

      {/* User Info */}
      <div className="px-6 py-4 border-t border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-pink-500" />
          <div>
            <p className="text-sm font-medium text-white">Admin User</p>
            <p className="text-xs text-slate-400">Active</p>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

// ─── Top Bar Component ──────────────────────────────────────────────────
const AdminTopbar: React.FC<{
  pageTitle: string;
  onLogout: () => void;
}> = ({ pageTitle, onLogout }) => {
  return (
    <motion.div
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="h-16 bg-slate-900/80 border-b border-slate-700/50 flex items-center justify-between px-8 sticky top-0 backdrop-blur-md"
    >
      <h2 className="text-lg font-semibold text-white">{pageTitle}</h2>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onLogout}
        className="px-4 py-2 rounded-lg border border-red-500/50 text-red-400 font-medium hover:bg-red-500/10 transition-colors"
      >
        Logout
      </motion.button>
    </motion.div>
  );
};

// ─── Statistics Card Component ──────────────────────────────────────────
const StatCard: React.FC<StatCard & { delay: number }> = ({
  icon,
  label,
  value,
  trend,
  delay,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -4 }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6 hover:border-indigo-500/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{label}</p>
          <p className="text-3xl font-bold text-white mt-2">{value}</p>
          {trend && (
            <p className="text-xs text-green-400 mt-2">↑ {trend} from last month</p>
          )}
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </motion.div>
  );
};

// ─── Dashboard Section ──────────────────────────────────────────────────
const DashboardSection: React.FC = () => {
  const [stats, setStats] = useState<StatCard[]>([
    { icon: '📄', label: 'Total Exams', value: '0' },
    { icon: '👥', label: 'Total Submissions', value: '0' },
    { icon: '⏳', label: 'Pending Review', value: '0' },
    { icon: '🎓', label: 'Avg Score', value: '0%' },
  ]);
  const [activityItems, setActivityItems] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const [statsResponse, activityResponse] = await Promise.all([
        adminApi.getDashboardStats(),
        adminApi.getRecentActivity(),
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats([
          { icon: '📄', label: 'Total Exams', value: String(statsResponse.data.totalExams ?? 0) },
          { icon: '👥', label: 'Total Submissions', value: String(statsResponse.data.totalSubmissions ?? 0) },
          { icon: '⏳', label: 'Pending Review', value: String(statsResponse.data.pendingReview ?? 0) },
          { icon: '🎓', label: 'Avg Score', value: `${statsResponse.data.averageScore ?? 0}%` },
        ]);
      }

      if (activityResponse.success && Array.isArray(activityResponse.data)) {
        setActivityItems(activityResponse.data.map(item => item.message));
      }
    };

    loadData();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <div>
        <h3 className="text-xl font-semibold text-white mb-6">Dashboard Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, idx) => (
            <StatCard key={idx} {...stat} delay={idx * 0.1} />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-4">Recent Activity</h4>
        <div className="space-y-3">
          {activityItems.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
              className="flex items-start gap-3 text-slate-300"
            >
              <span className="text-indigo-400 mt-1">→</span>
              <p className="text-sm">{item}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Exam Management Section ────────────────────────────────────────────
const ExamManagementSection: React.FC = () => {
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [examName, setExamName] = useState('');
  const [examCode, setExamCode] = useState('');
  const [manualQuestions, setManualQuestions] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [isCreatingExam, setIsCreatingExam] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [exams, setExams] = useState<Array<{ id: number; name: string; questions: number; students: number; date: string; status?: string; code?: string }>>([]);

  const loadExams = async () => {
    const response = await adminApi.getExams() as any;
    const items = response?.data ?? response?.exams ?? [];
    if (response?.success && Array.isArray(items)) {
      const normalized = items.map((exam: any, index: number) => ({
        id: exam.id ?? index + 1,
        name: exam.name ?? exam.title ?? exam.code ?? 'Untitled Exam',
        questions: Array.isArray(exam.questions) ? exam.questions.length : Number(exam.questions ?? 0),
        students: Number(exam.students ?? 0),
        date: exam.date ?? '-',
        status: exam.status,
        code: exam.code,
      }));
      setExams(normalized);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  // Auto-generate exam code from name
  const handleExamNameChange = (value: string) => {
    setExamName(value);
    setExamCode(value.trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '').slice(0, 20));
  };

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setFileName(file.name);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };
  const handleClick = () => fileInputRef.current?.click();

  const handleCreateExam = async () => {
    if (!examName.trim() || !durationMinutes.trim()) {
      setErrorMsg('Please fill in Exam Name and Duration.');
      return;
    }

    setIsCreatingExam(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      let result: any;

      if (selectedFile) {
        // File-based creation (PDF / JSON / TXT / CSV)
        result = await adminApi.uploadExamPdf(selectedFile, {
          code: examCode,
          title: examName.trim(),
          durationMinutes: Number(durationMinutes),
        });
      } else {
        // JSON-based creation – parse manual questions if provided
        const questions = manualQuestions
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 3)
          .map((line, i) => ({ id: i + 1, text: line.replace(/^[\d]+[.):\s]+/, '').trim() || line }));

        result = await adminApi.createExam({
          code: examCode,
          title: examName.trim(),
          durationMinutes: Number(durationMinutes),
          questions,
        });
      }

      if (result?.success) {
        const qCount = result?.data?.questionCount ?? 0;
        setSuccessMsg(`✓ Exam "${examName.trim()}" created successfully with ${qCount} question${qCount !== 1 ? 's' : ''}! It is now live.`);
        setExamName('');
        setExamCode('');
        setManualQuestions('');
        setDurationMinutes('');
        handleRemoveFile();
        await loadExams();
      } else {
        setErrorMsg(result?.error || 'Failed to create exam. Please try again.');
      }
    } catch (error: any) {
      setErrorMsg(`Error: ${error?.message || 'Unknown error. Check console.'}`);
      console.error('Failed to create exam:', error);
    } finally {
      setIsCreatingExam(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Create Exam Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-8"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Create New Exam</h3>

        {/* Success / Error banners */}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-green-500/20 border border-green-500/40 text-green-300 text-sm">
            {successMsg}
          </motion.div>
        )}
        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-sm">
            {errorMsg}
          </motion.div>
        )}

        <div className="space-y-4">
          {/* Exam Name + Exam Code row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Exam Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="e.g., Advanced Machine Learning"
                value={examName}
                onChange={(e) => handleExamNameChange(e.target.value)}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Exam Code (auto-generated)</label>
              <input
                type="text"
                placeholder="e.g., TECH101"
                value={examCode}
                onChange={(e) => setExamCode(e.target.value.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, ''))}
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Duration (minutes) <span className="text-red-400">*</span></label>
            <input
              type="number"
              placeholder="90"
              min="5"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
            />
          </div>

          {/* Manual question entry */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Questions <span className="text-slate-500 font-normal">(one per line — optional if uploading a file)</span>
            </label>
            <textarea
              rows={5}
              placeholder={"1. What is the full form of AI?\n2. Define Machine Learning in one sentence.\n3. Who is the father of Artificial Intelligence?"}
              value={manualQuestions}
              onChange={(e) => setManualQuestions(e.target.value)}
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:border-indigo-500 outline-none resize-y text-sm font-mono"
            />
            {manualQuestions.trim() && (
              <p className="text-xs text-slate-400 mt-1">
                {manualQuestions.split('\n').filter((l) => l.trim().length > 3).length} question(s) detected
              </p>
            )}
          </div>

          {/* File Upload (optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Upload Questions File <span className="text-slate-500 font-normal">(optional — PDF, JSON, TXT, CSV)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.csv,.txt,.pdf"
              onChange={handleFileInput}
              className="hidden"
              aria-label="Upload questions file"
            />
            <motion.div
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              whileHover={{ scale: 1.005 }}
              className={`cursor-pointer rounded-lg border-2 border-dashed transition-all ${
                isDragging ? 'border-indigo-400 bg-indigo-500/10'
                : selectedFile ? 'border-green-500 bg-green-500/10'
                : 'border-slate-600 bg-slate-700/20 hover:border-indigo-500 hover:bg-slate-700/40'
              }`}
            >
              <div className="py-5 px-6 text-center">
                {selectedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✓</span>
                      <div className="text-left">
                        <p className="text-green-400 font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-slate-400 text-xs">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(); }}
                      className="px-3 py-1 text-xs rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <span className="text-3xl">{isDragging ? '📥' : '📤'}</span>
                    <p className="text-slate-300 text-sm mt-2">{isDragging ? 'Drop file here' : 'Click to browse or drag & drop'}</p>
                    <p className="text-slate-500 text-xs mt-1">Supports PDF, JSON, TXT, CSV</p>
                  </div>
                )}
              </div>
            </motion.div>
            {selectedFile && (
              <p className="text-xs text-slate-400 mt-1">File will be parsed for questions. Manual questions above will be ignored.</p>
            )}
          </div>

          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateExam}
            disabled={isCreatingExam || !examName.trim() || !durationMinutes.trim()}
            className="w-full px-4 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isCreatingExam ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Exam...
              </span>
            ) : 'Create & Publish Exam'}
          </motion.button>
        </div>
      </motion.div>

      {/* Exam List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-4">Existing Exams</h4>
        {exams.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No exams yet. Create one above.</p>
        ) : (
          <div className="space-y-3">
            {exams.map((exam, idx) => (
              <motion.div
                key={exam.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-indigo-500/30 transition-all"
              >
                <div>
                  <p className="font-medium text-white">{exam.name}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {exam.code && <span className="font-mono mr-2 text-indigo-300">{exam.code}</span>}
                    {exam.questions} question{exam.questions !== 1 ? 's' : ''}
                    {exam.date && exam.date !== '-' && ` • ${exam.date}`}
                  </p>
                  {exam.status && (
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-medium ${exam.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                      {exam.status === 'active' ? '● Active' : exam.status}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Submissions Section ────────────────────────────────────────────────
const SubmissionsSection: React.FC = () => {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);

  useEffect(() => {
    const loadSubmissions = async () => {
      const response = await adminApi.getSubmissions();
      if (response.success && Array.isArray(response.data)) {
        setSubmissions(response.data);
      }
    };

    loadSubmissions();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded':
        return 'text-green-400 bg-green-400/10';
      case 'pending':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'submitted':
        return 'text-blue-400 bg-blue-400/10';
      default:
        return 'text-slate-400 bg-slate-400/10';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'graded':
        return '✓ Graded';
      case 'pending':
        return '⏳ Pending';
      case 'submitted':
        return '📋 Submitted';
      default:
        return status;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
    >
      <h3 className="text-lg font-semibold text-white mb-6">Student Submissions</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/50">
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                Student Name
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                Exam
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                Score
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                Submitted
              </th>
              <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub, idx) => (
              <motion.tr
                key={sub.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-white font-medium">{sub.name}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{sub.exam}</td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  {sub.score ? `${sub.score}%` : '—'}
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(sub.status)}`}>
                    {getStatusLabel(sub.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{sub.submittedAt}</td>
                <td className="px-4 py-3 text-sm">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    className="text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    Review
                  </motion.button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ─── Score Management Section ──────────────────────────────────────────
const ScoreSection: React.FC = () => {
  const [searchStudent, setSearchStudent] = useState('');
  const [students, setStudents] = useState<Array<{ id: number; name: string; exam: string; submitted: boolean }>>([]);
  const [scoreInputs, setScoreInputs] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadStudents = async () => {
      const response = await adminApi.getStudentsForScoring();
      if (response.success && Array.isArray(response.data)) {
        setStudents(response.data);
      }
    };

    loadStudents();
  }, []);

  const handleDownloadAnswers = async (studentId: number, studentName: string) => {
    try {
      const blob = await adminApi.downloadStudentAnswers(studentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${studentName.replace(/\s+/g, '_')}_answers.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download answers:', error);
    }
  };

  const handleScoreSubmit = async (studentId: number) => {
    const score = Number(scoreInputs[studentId] ?? 0);
    if (Number.isNaN(score)) {
      return;
    }

    const response = await adminApi.submitStudentScore(studentId, score);
    if (!response.success) {
      console.error('Failed to submit score:', response.error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Student Score Management</h3>
        <input
          type="text"
          placeholder="Search by student name..."
          value={searchStudent}
          onChange={(e) => setSearchStudent(e.target.value)}
          className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
        />
      </motion.div>

      {/* Score Entry Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-6">Enter & Review Scores</h4>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                  Student Name
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                  Exam
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                  Enter Score
                </th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-slate-400">
                  Download Answers
                </th>
              </tr>
            </thead>
            <tbody>
              {students
                .filter((student) =>
                  student.name.toLowerCase().includes(searchStudent.toLowerCase())
                )
                .map((student, idx) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {student.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">{student.exam}</td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Score"
                          min="0"
                          max="100"
                          value={scoreInputs[student.id] ?? ''}
                          onChange={(e) =>
                            setScoreInputs((prev) => ({
                              ...prev,
                              [student.id]: e.target.value,
                            }))
                          }
                          className="w-20 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none text-center"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleScoreSubmit(student.id)}
                          className="px-3 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 transition-colors font-medium"
                        >
                          Submit
                        </motion.button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() =>
                          handleDownloadAnswers(student.id, student.name)
                        }
                        className="px-4 py-2 rounded-lg bg-green-600/20 text-green-300 hover:bg-green-600/40 transition-colors font-medium"
                      >
                        📥 Download
                      </motion.button>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Bulk Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-4">Bulk Actions</h4>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold transition-all"
          >
            📥 Download All Answers
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold transition-all"
          >
            📤 Export Scores
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const StudentRegistrationSection: React.FC = () => {
  const [formData, setFormData] = useState<StudentRegistrationData>({
    studentId: '',
    name: '',
    examCode: 'TECH101',
    email: '',
  });
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const loadModels = async () => {
    const MODEL_URL = '/models';
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
  };

  const extractDescriptorFromPhoto = async (file: File): Promise<number[]> => {
    await loadModels();

    const imageUrl = URL.createObjectURL(file);
    const img = new Image();
    img.src = imageUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const detections = await faceapi
      .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    const detection = detections
      .slice()
      .sort((a, b) => (b.detection.box.width * b.detection.box.height) - (a.detection.box.width * a.detection.box.height))[0];

    URL.revokeObjectURL(imageUrl);

    if (!detection) {
      throw new Error('No clear face found in the uploaded photo');
    }

    return Array.from(detection.descriptor);
  };

  const handleRegisterStudent = async () => {
    if (!formData.studentId || !formData.name || !formData.examCode || !selectedPhoto) {
      setIsError(true);
      setStatusMessage('Please fill all required fields and upload a face photo');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Processing face photo...');
    setIsError(false);

    try {
      const faceDescriptor = await extractDescriptorFromPhoto(selectedPhoto);
      setStatusMessage('Saving student face details...');

      const response = await adminApi.registerStudent({
        studentId: formData.studentId,
        name: formData.name,
        examCode: formData.examCode,
        email: formData.email,
        faceDescriptor,
      });

      if (!response.success) {
        throw new Error(response.error || 'Registration failed');
      }

      setStatusMessage('Student face registered successfully');
      setIsError(false);
      setFormData({ studentId: '', name: '', examCode: 'TECH101', email: '' });
      setSelectedPhoto(null);
    } catch (error) {
      setIsError(true);
      setStatusMessage(error instanceof Error ? error.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Register Student Face</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Student ID"
            value={formData.studentId}
            onChange={(e) => setFormData((prev) => ({ ...prev, studentId: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
          />
          <input
            type="text"
            placeholder="Student Name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
          />
          <input
            type="text"
            placeholder="Exam Code"
            value={formData.examCode}
            onChange={(e) => setFormData((prev) => ({ ...prev, examCode: e.target.value.toUpperCase() }))}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm text-slate-300 mb-2">Upload Face Photo</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setSelectedPhoto(e.target.files?.[0] || null)}
            className="w-full px-4 py-2 bg-slate-700/40 border border-slate-600 rounded-lg text-slate-200"
          />
          {selectedPhoto && (
            <p className="text-xs text-slate-400 mt-2">Selected: {selectedPhoto.name}</p>
          )}
        </div>

        {statusMessage && (
          <p className={`mt-4 text-sm ${isError ? 'text-red-400' : 'text-green-400'}`}>
            {statusMessage}
          </p>
        )}

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleRegisterStudent}
          disabled={isSubmitting}
          className="mt-5 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 text-white font-semibold hover:from-indigo-500 hover:to-pink-500 disabled:opacity-60"
        >
          {isSubmitting ? 'Registering...' : 'Register Face Data'}
        </motion.button>
      </motion.div>
    </motion.div>
  );
};

// ─── Reports Section ────────────────────────────────────────────────────
const ReportsSection: React.FC = () => {
  const [stats, setStats] = React.useState<{
    totalExams: number;
    totalSubmissions: number;
    pendingReview: number;
    averageScore: number;
  } | null>(null);
  const [examTrends, setExamTrends] = React.useState<{ title: string; avgScore: number }[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [statsRes, examsRes, submissionsRes] = await Promise.all([
          adminApi.getDashboardStats(),
          adminApi.getExams(),
          adminApi.getSubmissions(),
        ]);

        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data as any);
        }

        // Build per-exam average scores from submissions
        const exams: any[] = Array.isArray(examsRes?.data) ? examsRes.data : [];
        const submissions: any[] = Array.isArray(submissionsRes?.data) ? submissionsRes.data : [];

        const trends = exams.map((exam: any) => {
          const examCode = exam.code ?? exam.name;
          const examSubmissions = submissions.filter(
            (s: any) => s.exam === examCode && s.score !== null && s.score !== undefined
          );
          const avg = examSubmissions.length > 0
            ? Math.round(examSubmissions.reduce((sum: number, s: any) => sum + Number(s.score), 0) / examSubmissions.length)
            : 0;
          return { title: exam.name ?? exam.code ?? 'Exam', avgScore: avg };
        });
        setExamTrends(trends);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const totalExams = stats?.totalExams ?? 0;
  const passRate = totalSubmissions > 0
    ? Math.round((averageScore / 100) * totalSubmissions) + '/' + totalSubmissions
    : '—';
  const passPercent = Math.min(100, averageScore > 0 ? Math.round(averageScore * 1.1) : 0);

  const reportMetrics = [
    { title: 'Overall Pass Rate', value: averageScore > 0 ? `${passPercent}%` : '—', icon: '📈', color: 'from-green-600 to-emerald-600' },
    { title: 'Average Score', value: averageScore > 0 ? String(averageScore) : '—', icon: '🎯', color: 'from-blue-600 to-cyan-600' },
    { title: 'Total Submissions', value: String(totalSubmissions), icon: '👥', color: 'from-purple-600 to-pink-600' },
    { title: 'Active Exams', value: String(totalExams), icon: '📊', color: 'from-orange-600 to-red-600' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h3 className="text-xl font-semibold text-white">Reports & Analytics</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {reportMetrics.map((metric, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ y: -4 }}
            className={`bg-gradient-to-br ${metric.color} rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-all`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">{metric.title}</p>
                <p className="text-3xl font-bold mt-3">{metric.value}</p>
              </div>
              <span className="text-3xl opacity-80">{metric.icon}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Per-Exam Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-6">Per-Exam Average Score</h4>
        {examTrends.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No exam data yet. Upload and publish exams to see performance trends.</p>
        ) : (
          <div className="space-y-4">
            {examTrends.map((exam, idx) => (
              <motion.div
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
              >
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-300">{exam.title}</span>
                  <span className="text-sm font-semibold text-indigo-400">
                    {exam.avgScore > 0 ? `${exam.avgScore}%` : 'No submissions'}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${exam.avgScore}%` }}
                    transition={{ duration: 1, delay: 0.6 + idx * 0.1 }}
                    className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

// ─── Main Admin Portal Component ────────────────────────────────────────
export const AdminPortal: React.FC = () => {
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('dashboard');

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'exams', label: 'Manage Exams', icon: '📝' },
    { id: 'students', label: 'Register Student', icon: '🧑‍🎓' },
    { id: 'submissions', label: 'Submissions', icon: '📋' },
    { id: 'scores', label: 'Score', icon: '⭐' },
    { id: 'reports', label: 'Reports', icon: '📊' },
  ];

  const handleLogout = () => {
    navigate('/');
  };

  const getPageTitle = () => {
    return navItems.find((item) => item.id === activePage)?.label || 'Dashboard';
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 min-h-screen">
      {/* Sidebar */}
      <AdminSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        navItems={navItems}
      />

      {/* Main Content */}
      <div className="ml-60 flex flex-col min-h-screen">
        {/* Topbar */}
        <AdminTopbar pageTitle={getPageTitle()} onLogout={handleLogout} />

        {/* Content Area */}
        <main className="flex-1 px-8 py-8 overflow-y-auto">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activePage === 'dashboard' && <DashboardSection />}
            {activePage === 'exams' && <ExamManagementSection />}
            {activePage === 'students' && <StudentRegistrationSection />}
            {activePage === 'submissions' && <SubmissionsSection />}
            {activePage === 'scores' && <ScoreSection />}
            {activePage === 'reports' && <ReportsSection />}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminPortal;
