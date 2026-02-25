import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import MicWaveform from "../components/MicWaveform";
import StatusBadge from "../components/StatusBadge";

/* ── Types ── */
interface Question {
  id: number;
  text: string;
  topic: string;
}

/* ── Sample questions ── */
const questions: Question[] = [
  { id: 1, text: "Explain polymorphism with one real-world example.", topic: "OOP" },
  { id: 2, text: "What is the time complexity of merge sort and why?", topic: "Algorithms" },
  { id: 3, text: "Describe the difference between a stack and a queue.", topic: "Data Structures" },
  { id: 4, text: "What is a deadlock in operating systems? How can it be prevented?", topic: "OS" },
  { id: 5, text: "Explain normalization in databases up to 3NF.", topic: "DBMS" },
];

/* ── Timer helper ── */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ExamInterface() {
  const navigate = useNavigate();

  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90 * 60); // 90 minutes
  const [isRecording, setIsRecording] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const question = questions[currentQ];
  const answered = Object.keys(answers).length;
  const progress = Math.round((answered / questions.length) * 100);

  /* ── Countdown timer ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0) {
          clearInterval(interval);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ── Recording toggle ── */
  const toggleRecording = useCallback(() => {
    if (isRecording) {
      // Simulate saving an answer when stopping recording
      setAnswers((prev) => ({
        ...prev,
        [question.id]: "Voice answer recorded successfully.",
      }));
    }
    setIsRecording((r) => !r);
  }, [isRecording, question.id]);

  /* ── Navigation ── */
  const goNext = () => {
    setIsRecording(false);
    if (currentQ < questions.length - 1) setCurrentQ((c) => c + 1);
  };
  const goPrev = () => {
    setIsRecording(false);
    if (currentQ > 0) setCurrentQ((c) => c - 1);
  };

  /* ── Danger zone color for timer ── */
  const timerDanger = timeLeft < 300;

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* ── Top bar ── */}
      <motion.header
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
        className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-700/50 bg-slate-900/80 px-6 backdrop-blur-md"
      >
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Voice Exam</h1>
          <StatusBadge status={isRecording ? "recording" : "idle"} />
        </div>

        <div className="flex items-center gap-5">
          {/* Timer */}
          <div
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-mono font-semibold ${
              timerDanger
                ? "bg-red-500/15 text-red-400 animate-pulse"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            ⏱ {formatTime(timeLeft)}
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowSubmitModal(true)}
            className="rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 px-4 py-2 text-xs font-semibold shadow-lg hover:from-indigo-500 hover:to-pink-500 transition-all"
          >
            Submit Exam
          </motion.button>
        </div>
      </motion.header>

      {/* ── Main content ── */}
      <div className="flex flex-1">
        {/* ── Question nav sidebar ── */}
        <motion.aside
          initial={{ x: -200 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.3 }}
          className="hidden w-56 flex-col border-r border-slate-700/50 bg-slate-900/50 p-4 md:flex"
        >
          <p className="mb-3 text-xs font-semibold uppercase text-slate-500">
            Questions ({answered}/{questions.length})
          </p>

          {/* Progress bar */}
          <div className="mb-4 h-1.5 w-full rounded-full bg-slate-700/50 overflow-hidden">
            <motion.div
              animate={{ width: `${progress}%` }}
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-pink-500"
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            {questions.map((q, idx) => (
              <motion.button
                key={q.id}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setIsRecording(false);
                  setCurrentQ(idx);
                }}
                className={`flex h-9 w-full items-center justify-center rounded-lg text-xs font-semibold transition-all ${
                  idx === currentQ
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : answers[q.id]
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-400 border border-slate-700/50 hover:border-indigo-500/40"
                }`}
              >
                {idx + 1}
              </motion.button>
            ))}
          </div>

          <div className="mt-auto space-y-2 pt-6">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
              Answered
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />
              Current
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="h-2.5 w-2.5 rounded-sm bg-slate-800 border border-slate-700" />
              Unanswered
            </div>
          </div>
        </motion.aside>

        {/* ── Center question area ── */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl space-y-8"
            >
              {/* Question number & topic */}
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-medium text-indigo-400">
                  Question {currentQ + 1} of {questions.length}
                </span>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-400">
                  {question.topic}
                </span>
              </div>

              {/* Question text */}
              <div className="rounded-xl border border-slate-700/50 bg-gradient-to-br from-slate-800 to-slate-900 p-6">
                <p className="text-lg leading-relaxed text-slate-100">{question.text}</p>
              </div>

              {/* Waveform & mic control */}
              <div className="flex flex-col items-center gap-6 rounded-xl border border-slate-700/50 bg-slate-900/60 p-6">
                <MicWaveform active={isRecording} />

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleRecording}
                  className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl shadow-xl transition-all ${
                    isRecording
                      ? "bg-red-500 shadow-red-500/40 animate-pulse"
                      : "bg-gradient-to-br from-indigo-600 to-pink-600 shadow-indigo-500/30"
                  }`}
                >
                  {isRecording ? "⏹" : "🎤"}
                </motion.button>

                <p className="text-xs text-slate-400">
                  {isRecording
                    ? "Recording… Tap to stop and save your answer."
                    : answers[question.id]
                    ? "✓ Answer recorded. Tap to re-record."
                    : "Tap the microphone to start recording your answer."}
                </p>
              </div>

              {/* Answer preview */}
              {answers[question.id] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"
                >
                  <p className="text-xs font-medium text-emerald-400 mb-1">Saved Answer</p>
                  <p className="text-sm text-slate-300">{answers[question.id]}</p>
                </motion.div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goPrev}
                  disabled={currentQ === 0}
                  className="rounded-lg border border-slate-600/50 px-5 py-2.5 text-sm font-medium text-slate-300 hover:border-indigo-500/50 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={goNext}
                  disabled={currentQ === questions.length - 1}
                  className="rounded-lg bg-indigo-600/20 px-5 py-2.5 text-sm font-medium text-indigo-300 hover:bg-indigo-600/40 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* ── Submit confirmation modal ── */}
      <AnimatePresence>
        {showSubmitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm rounded-xl border border-slate-700/50 bg-slate-900 p-8 text-center shadow-2xl"
            >
              <p className="text-4xl mb-4">📋</p>
              <h3 className="text-lg font-semibold text-white">Submit Exam?</h3>
              <p className="mt-2 text-sm text-slate-400">
                You have answered {answered} of {questions.length} questions.
                {answered < questions.length && (
                  <span className="block mt-1 text-yellow-400">
                    {questions.length - answered} question(s) are unanswered.
                  </span>
                )}
              </p>
              <div className="mt-6 flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 rounded-lg border border-slate-600 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate("/dashboard")}
                  className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-pink-600 py-2.5 text-sm font-semibold text-white shadow-lg"
                >
                  Confirm Submit
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
