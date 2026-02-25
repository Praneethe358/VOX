import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/* ── Types ── */
interface ExamCard {
  id: number;
  title: string;
  subject: string;
  questions: number;
  duration: string;
  status: "upcoming" | "live" | "completed";
  date: string;
}

/* ── Stat badge ── */
const StatTile: React.FC<{
  icon: string;
  label: string;
  value: string;
  accent: string;
  delay: number;
}> = ({ icon, label, value, accent, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    whileHover={{ y: -4 }}
    className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-5 hover:border-indigo-500/30 transition-all"
  >
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      </div>
      <span className={`rounded-lg p-2 text-xl ${accent}`}>{icon}</span>
    </div>
  </motion.div>
);

/* ── Status pill ── */
const statusColors: Record<string, string> = {
  upcoming: "text-blue-400 bg-blue-400/10",
  live: "text-emerald-400 bg-emerald-400/10",
  completed: "text-slate-400 bg-slate-400/10",
};

export default function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    { icon: "📝", label: "Exams Taken", value: "8", accent: "bg-indigo-500/15" },
    { icon: "📊", label: "Average Score", value: "82%", accent: "bg-pink-500/15" },
    { icon: "🏆", label: "Best Score", value: "96%", accent: "bg-amber-500/15" },
    { icon: "⏳", label: "Pending", value: "2", accent: "bg-cyan-500/15" },
  ];

  const exams: ExamCard[] = [
    { id: 1, title: "Data Structures Mid-Term", subject: "CS201", questions: 50, duration: "90 min", status: "live", date: "Today" },
    { id: 2, title: "Operating Systems Quiz", subject: "CS301", questions: 30, duration: "45 min", status: "upcoming", date: "Feb 25" },
    { id: 3, title: "Algorithms Final", subject: "CS202", questions: 60, duration: "120 min", status: "upcoming", date: "Mar 02" },
    { id: 4, title: "Database Concepts", subject: "CS305", questions: 40, duration: "60 min", status: "completed", date: "Feb 18" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* ── Top navigation bar ── */}
      <motion.header
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-700/50 bg-slate-900/80 px-6 backdrop-blur-md"
      >
        <h1 className="bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-xl font-bold text-transparent">
          MindKraft
        </h1>
        <div className="flex items-center gap-4">
          <Link
            to="/admin"
            className="rounded-lg border border-slate-600/50 px-4 py-2 text-xs font-medium text-slate-300 hover:border-indigo-500/50 hover:text-white transition-all"
          >
            Admin Panel
          </Link>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="rounded-lg border border-red-500/50 px-4 py-2 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Logout
          </motion.button>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* ── Welcome section ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl font-semibold">Welcome back 👋</h2>
          <p className="mt-1 text-sm text-slate-400">
            Here's an overview of your exams and performance.
          </p>
        </motion.div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {stats.map((s, i) => (
            <StatTile key={i} {...s} delay={i * 0.08} />
          ))}
        </div>

        {/* ── Exams list ── */}
        <div>
          <h3 className="mb-4 text-lg font-semibold">Your Exams</h3>
          <div className="space-y-3">
            {exams.map((exam, idx) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + idx * 0.08 }}
                className="flex items-center justify-between rounded-xl border border-slate-700/50 bg-gradient-to-r from-slate-800/80 to-slate-900/80 p-5 hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-500/15 text-lg">
                    📄
                  </div>
                  <div>
                    <p className="font-medium text-white">{exam.title}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {exam.subject} • {exam.questions} questions • {exam.duration} • {exam.date}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                      statusColors[exam.status]
                    }`}
                  >
                    {exam.status}
                  </span>
                  {exam.status === "live" && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Link
                        to="/exam"
                        className="rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-pink-500 transition-all"
                      >
                        Start Exam →
                      </Link>
                    </motion.div>
                  )}
                  {exam.status === "completed" && (
                    <span className="text-xs text-slate-500">Score: 88%</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ── Quick-action cards ── */}
        <div className="grid gap-4 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6"
          >
            <h4 className="font-semibold text-white">🎤 Voice Mode</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Answer exam questions using your voice. The system will transcribe and evaluate your responses in real-time.
            </p>
            <Link
              to="/exam"
              className="mt-4 inline-flex rounded-lg bg-indigo-600/20 px-4 py-2 text-sm font-medium text-indigo-300 hover:bg-indigo-600/40 transition-colors"
            >
              Open Voice Mode
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6"
          >
            <h4 className="font-semibold text-white">📈 Performance</h4>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              Track your scores, review past submissions, and identify areas for improvement across all subjects.
            </p>
            <div className="mt-4 space-y-2">
              {["Data Structures", "Algorithms", "OS Concepts"].map((sub, i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs text-slate-400">{sub}</span>
                    <span className="text-xs font-semibold text-indigo-400">{78 + i * 7}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${78 + i * 7}%` }}
                      transition={{ duration: 1, delay: 0.8 + i * 0.15 }}
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-pink-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
