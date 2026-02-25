import { motion } from "framer-motion";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SplashScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate("/login"), 2800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 text-white">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-indigo-600/30 to-pink-600/30 blur-3xl"
        />
      </div>

      {/* Logo & Title */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Logo mark */}
        <motion.div
          initial={{ rotate: -10 }}
          animate={{ rotate: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600 to-pink-600 shadow-2xl shadow-indigo-500/25"
        >
          <span className="select-none text-3xl font-bold text-white">M</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-gradient-to-r from-indigo-300 via-white to-pink-300 bg-clip-text text-4xl font-bold tracking-tight text-transparent"
        >
          MindKraft
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-3 text-sm font-medium text-slate-400"
        >
          Voice-Based Exam Interface
        </motion.p>

        {/* Loading indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-10 flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-indigo-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, delay: i * 0.2, repeat: Infinity }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}
