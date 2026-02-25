import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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
  const stats: StatCard[] = [
    { icon: '📄', label: 'Total Exams', value: '24', trend: '+12%' },
    { icon: '👥', label: 'Total Submissions', value: '342', trend: '+28%' },
    { icon: '⏳', label: 'Pending Review', value: '23', trend: '-5%' },
    { icon: '🎓', label: 'Avg Score', value: '76.5%', trend: '+3.2%' },
  ];

  const activityItems = [
    'Data Structures Mid-Term graded (48 students completed)',
    'Operating Systems Quiz created and published',
    'Algorithms Final exam pending review (12 submissions)',
    'New admin user onboarded: Dr. Priya Sharma',
  ];

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

  const exams = [
    { id: 1, name: 'Data Structures', questions: 50, students: 48, date: 'Feb 20, 2026' },
    { id: 2, name: 'Operating Systems', questions: 40, students: 52, date: 'Feb 18, 2026' },
    { id: 3, name: 'Algorithms', questions: 60, students: 45, date: 'Feb 15, 2026' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-8"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Create New Exam</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Exam Name
            </label>
            <input
              type="text"
              placeholder="e.g., Advanced Machine Learning"
              className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Number of Questions
              </label>
              <input
                type="number"
                placeholder="50"
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                placeholder="90"
                className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold transition-all"
          >
            📤 Upload Questions File
          </motion.button>
        </div>
      </motion.div>

      {/* Recent Exams */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-4">Recent Exams</h4>
        <div className="space-y-3">
          {exams.map((exam, idx) => (
            <motion.div
              key={exam.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + idx * 0.1 }}
              className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/30 hover:border-indigo-500/30 transition-all"
            >
              <div>
                <p className="font-medium text-white">{exam.name}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {exam.questions} questions • {exam.students} students • {exam.date}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 transition-colors"
              >
                Edit
              </motion.button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ─── Submissions Section ────────────────────────────────────────────────
const SubmissionsSection: React.FC = () => {
  const submissions: StudentSubmission[] = [
    {
      id: 1,
      name: 'Arjun Sharma',
      exam: 'Data Structures',
      score: 88,
      status: 'graded',
      submittedAt: 'Feb 20, 10:30 AM',
    },
    {
      id: 2,
      name: 'Priya Menon',
      exam: 'Algorithms',
      score: null,
      status: 'pending',
      submittedAt: 'Feb 21, 3:45 PM',
    },
    {
      id: 3,
      name: 'Rahul Verma',
      exam: 'OS Quiz',
      score: 92,
      status: 'graded',
      submittedAt: 'Feb 19, 11:20 AM',
    },
    {
      id: 4,
      name: 'Aisha Khan',
      exam: 'Data Structures',
      score: null,
      status: 'submitted',
      submittedAt: 'Feb 21, 2:15 PM',
    },
    {
      id: 5,
      name: 'Dev Patel',
      exam: 'Algorithms',
      score: 75,
      status: 'graded',
      submittedAt: 'Feb 18, 5:00 PM',
    },
  ];

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
  
  const students = [
    { id: 1, name: 'Arjun Sharma', exam: 'Data Structures', submitted: true },
    { id: 2, name: 'Priya Menon', exam: 'Algorithms', submitted: true },
    { id: 3, name: 'Rahul Verma', exam: 'OS Quiz', submitted: true },
    { id: 4, name: 'Aisha Khan', exam: 'Data Structures', submitted: true },
    { id: 5, name: 'Dev Patel', exam: 'Algorithms', submitted: true },
  ];

  const handleDownloadAnswers = (studentId: number, studentName: string) => {
    // Simulate download
    console.log(`Downloading answers for student ${studentId}: ${studentName}`);
  };

  const handleScoreSubmit = (studentId: number, score: string) => {
    // Simulate score update
    console.log(`Score updated for student ${studentId}: ${score}`);
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
                          className="w-20 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-indigo-500 outline-none text-center"
                        />
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleScoreSubmit(student.id, '0')}
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

// ─── Reports Section ────────────────────────────────────────────────────
const ReportsSection: React.FC = () => {
  const reportMetrics = [
    { title: 'Overall Pass Rate', value: '78.5%', icon: '📈', color: 'from-green-600 to-emerald-600' },
    { title: 'Average Score', value: '74.2', icon: '🎯', color: 'from-blue-600 to-cyan-600' },
    { title: 'Total Students', value: '342', icon: '👥', color: 'from-purple-600 to-pink-600' },
    { title: 'Active Exams', value: '12', icon: '📊', color: 'from-orange-600 to-red-600' },
  ];

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

      {/* Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-6"
      >
        <h4 className="text-lg font-semibold text-white mb-6">Performance Trend</h4>
        <div className="space-y-4">
          {['Data Structures', 'Algorithms', 'OS Concepts', 'Database'].map((exam, idx) => (
            <motion.div
              key={idx}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 + idx * 0.1 }}
            >
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-300">{exam}</span>
                <span className="text-sm font-semibold text-indigo-400">{70 + idx * 5}%</span>
              </div>
              <div className="w-full h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${70 + idx * 5}%` }}
                  transition={{ duration: 1, delay: 0.6 + idx * 0.1 }}
                  className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"
                />
              </div>
            </motion.div>
          ))}
        </div>
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
