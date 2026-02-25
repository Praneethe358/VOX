import { useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "../api/apiService";

/* ── Mountain SVG component ── */
const MountainSilhouette = () => (
  <svg
    className="fixed bottom-0 left-0 w-full pointer-events-none z-[1]"
    viewBox="0 0 1440 320"
    preserveAspectRatio="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0,320 L0,215 L60,195 L130,170 L200,185 L270,155 L340,130 L410,150 L480,125 L540,100 L600,120 L660,145 L720,118 L780,95 L840,115 L900,140 L960,110 L1020,130 L1080,155 L1140,135 L1200,160 L1260,185 L1320,200 L1380,215 L1440,205 L1440,320 Z"
      fill="#1a1428"
      opacity="0.65"
    />
    <path
      d="M0,320 L0,265 L80,240 L160,255 L210,220 L280,200 L330,215 L390,190 L450,170 L510,185 L560,160 L620,175 L680,155 L740,170 L800,185 L860,165 L920,180 L980,200 L1030,185 L1090,210 L1150,225 L1210,240 L1280,255 L1360,265 L1440,260 L1440,320 Z"
      fill="#110e1c"
      opacity="0.85"
    />
    <path d="M0,320 L0,290 L1440,290 L1440,320 Z" fill="#0d0b17" />
  </svg>
);

export default function LoginFaceID() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ── Credential login handler ── */
  const handleCredentialLogin = useCallback(async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await adminApi.login(username, password);
      
      if (result.success) {
        setSuccess(true);
        // Store login state in sessionStorage
        sessionStorage.setItem('adminLoggedIn', 'true');
        sessionStorage.setItem('adminUsername', username);
        setTimeout(() => navigate("/admin"), 1200);
      } else {
        setError("Invalid username or password");
        setIsLoading(false);
      }
    } catch (error) {
      setError("Connection error. Please check if the backend is running.");
      setIsLoading(false);
    }
  }, [username, password, navigate]);

  /* ── Enter-key shortcut ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleCredentialLogin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCredentialLogin]);

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
      {/* Sky gradient background */}
      <div className="fixed inset-0 z-0 login-sky-gradient" />

      {/* Mountains */}
      <MountainSilhouette />

      {/* Back link */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={() => navigate("/")}
        className="fixed left-5 top-5 z-10 flex items-center gap-1.5 text-sm text-white/55 hover:text-white/90 transition-colors"
      >
        <span>←</span> Back
      </motion.button>

      {/* ---------- Card ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex w-full max-w-[360px] flex-col items-center px-4"
      >
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.06 }}
          className="mb-8 flex h-[70px] w-[70px] items-center justify-center rounded-full border-2 border-white/75 transition-colors hover:border-white"
        >
          <span className="select-none text-3xl font-light text-white tracking-tight">M</span>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* ── Credentials Form ── */}
          <motion.div
            key="cred"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.25 }}
            className="w-full space-y-3"
          >
            {/* Username */}
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45 text-sm">
                👤
              </span>
              <input
                type="text"
                placeholder="Admin id"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full rounded-full border-none bg-white/12 py-3.5 pl-10 pr-4 text-sm text-white/90 placeholder-slate-400 backdrop-blur-md outline-none transition-all focus:bg-white/18 focus:ring-2 focus:ring-pink-400/50 input-caret-pink"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/45 text-sm">
                  🔒
                </span>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-full border-none bg-white/12 py-3.5 pl-10 pr-4 text-sm text-white/90 placeholder-slate-400 backdrop-blur-md outline-none transition-all focus:bg-white/18 focus:ring-2 focus:ring-pink-400/50 input-caret-pink"
                />
              </div>

              {/* Error message */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-center text-xs text-red-400"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Login button */}
              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ y: 0 }}
                disabled={isLoading}
                onClick={handleCredentialLogin}
                className={`mt-2 w-full rounded-full py-3.5 text-sm font-semibold uppercase tracking-wider text-white shadow-lg transition-all disabled:opacity-70 ${
                  success ? "login-btn-success" : "login-btn-default"
                }`}
              >
                {isLoading ? "Logging in…" : success ? "✓ Welcome!" : "Log In"}
              </motion.button>

              {/* Forgot password */}
              <p className="pt-2 text-center text-xs text-white/40 hover:text-white/75 cursor-pointer transition-colors">
                Lost your password?
              </p>
            </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
