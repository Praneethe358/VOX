import { useNavigate } from "react-router-dom";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminApi } from "../api/apiService";
import { useAuth } from "../context/AuthContext";



export default function LoginFaceID() {
  const navigate = useNavigate();
  const { onLoginSuccess } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ── Credential login handler — tries V1 JWT first, falls back to legacy ── */
  const handleCredentialLogin = useCallback(async () => {
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const userInput = username.trim();
      const isEmailInput = userInput.includes('@');

      // If user entered an email, try v1 first (email-based auth)
      if (isEmailInput) {
        try {
          const v1Promise = adminApi.v1Login(userInput, password);
          const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000));
          const v1Result = await Promise.race([v1Promise, timeout]);
          if (v1Result.success && v1Result.data?.token) {
            const admin = v1Result.data.admin;
            onLoginSuccess(v1Result.data.token, {
              id: admin.id,
              name: admin.name,
              email: admin.email,
              role: admin.role,
              mfaEnabled: admin.mfaEnabled,
            });
            setSuccess(true);
            setTimeout(() => navigate("/admin"), 800);
            return;
          }
        } catch {
          // v1 unavailable/timed out — fall through to legacy
        }
      }

      // Username or fallback path: use legacy login (accepts username/email)
      const result = await adminApi.login(userInput, password);
      if (result.success && result.data?.token) {
        const admin = result.data.admin || {};
        onLoginSuccess(result.data.token, {
          id: admin.id || '',
          name: admin.name || userInput,
          email: admin.email || userInput,
          role: admin.role || 'admin',
          mfaEnabled: false,
        });
        setSuccess(true);
        setTimeout(() => navigate("/admin"), 800);
      } else if (result.success) {
        setError('Login response missing token. Please try again.');
        setIsLoading(false);
      } else {
        setError(result.error || "Invalid username or password");
        setIsLoading(false);
      }
    } catch {
      setError("Connection error. Please check if the backend is running.");
      setIsLoading(false);
    }
  }, [username, password, navigate, onLoginSuccess]);

  /* ── Enter-key shortcut ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") handleCredentialLogin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCredentialLogin]);

  return (
    <section className="screen" id="s-landing" style={{ alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '32px' }}
      >
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate("/")}
          style={{ marginBottom: '12px', color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
        >
          <span>←</span> Back
        </motion.button>

        {/* Branding - Enhanced */}
        <div style={{ textAlign: 'center' }}>
          <div className="landing-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', gap: '14px' }}>
            <svg width="56" height="42" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M 0 24 L 6 24 C 9 24, 9 10, 12 10 C 15 10, 15 24, 18 24 C 21 24, 21 4, 24 4 C 27 4, 27 32, 30 32 C 33 32, 33 16, 36 16 C 39 16, 39 24, 42 24 L 48 24" stroke="var(--wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
            <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: '42px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-1.5px' }}>VOX</span>
          </div>
          <p style={{ color: 'var(--text-sec)', fontSize: '16px', letterSpacing: '1.2px', textTransform: 'uppercase', fontWeight: 600 }}>
            Admin Portal
          </p>
        </div>

        {/* Login Card - Enhanced Professional Style */}
        <div style={{ padding: '48px 40px', display: 'flex', flexDirection: 'column', gap: '24px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.10)', borderRadius: '20px', backdropFilter: 'blur(24px) saturate(160%)', WebkitBackdropFilter: 'blur(24px) saturate(160%)', boxShadow: '0 24px 64px rgba(0, 0, 0, 0.50), inset 0 1px 1px rgba(255, 255, 255, 0.08)' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key="cred"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25 }}
              style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
            >
              {/* Username - Larger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Admin ID
                </label>
                <input
                  type="text"
                  placeholder="ID or Email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoFocus
                  style={{ width: '100%', padding: '16px 18px', background: 'var(--surface2)', border: '1.5px solid var(--border2)', borderRadius: '10px', color: 'var(--text)', fontSize: '16px', fontWeight: 500, outline: 'none', transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(45, 78, 232, 0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'; }}
                />
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                  Local dev default: admin / ChangeMe@123
                </p>
              </div>

              {/* Password - Larger */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ width: '100%', padding: '16px 18px', background: 'var(--surface2)', border: '1.5px solid var(--border2)', borderRadius: '10px', color: 'var(--text)', fontSize: '16px', fontWeight: 500, outline: 'none', transition: 'all 0.3s ease', boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 0 3px rgba(45, 78, 232, 0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.boxShadow = 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'; }}
                />
              </div>

              {/* Error message - Enhanced */}
              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    style={{ color: '#ff6b6b', fontSize: '14px', textAlign: 'center', background: 'rgba(255, 107, 107, 0.08)', padding: '12px 16px', borderRadius: '9px', border: '1px solid rgba(255, 107, 107, 0.25)', fontWeight: 500 }}
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Login button - Larger and More Prominent */}
              <motion.button
                whileHover={{ y: -2, boxShadow: '0 12px 28px rgba(45, 78, 232, 0.2)' }}
                whileTap={{ y: 0 }}
                disabled={isLoading}
                onClick={handleCredentialLogin}
                style={{ width: '100%', marginTop: '12px', padding: '16px 24px', background: 'linear-gradient(135deg, var(--accent), var(--accent-lt))', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '16px', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer', outline: 'none', transition: 'all 0.3s ease', boxShadow: '0 8px 24px rgba(45, 78, 232, 0.15)', opacity: isLoading ? 0.85 : 1 }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                    <span style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(255, 255, 255, 0.3)', borderTopColor: '#fff', animation: 'spin 0.8s linear infinite' }}></span>
                    Authenticating…
                  </span>
                ) : success ? (
                  "✓ Welcome Back!"
                ) : (
                  "Sign In"
                )}
              </motion.button>

              {/* Forgot password - Enhanced */}
              <button 
                onClick={() => alert('Password reset not yet implemented')}
                style={{ paddingTop: '4px', textAlign: 'center', fontSize: '13px', color: 'var(--accent-lt)', cursor: 'pointer', background: 'none', border: 'none', fontWeight: 500, transition: 'color 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--accent-lt)' }}
              >
                Forgot your password?
              </button>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Security Badge */}
        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
        </div>
      </motion.div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}
