import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.section 
      className="screen" 
      id="s-landing"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Brand — wave logo */}
      <div className="landing-brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(8px, 2vw, 16px)' }}>
          <svg width="clamp(48px, 10vw, 68px)" height="clamp(36px, 7.5vw, 52px)" viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M 0 24 L 6 24 C 9 24, 9 10, 12 10 C 15 10, 15 24, 18 24 C 21 24, 21 4, 24 4 C 27 4, 27 32, 30 32 C 33 32, 33 16, 36 16 C 39 16, 39 24, 42 24 L 48 24" 
              stroke="var(--wave)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
          <h1 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 'clamp(36px, 8vw, 54px)', fontWeight: 800, color: 'var(--text)', letterSpacing: '-1.5px', margin: 0 }}>VOX</h1>
        </div>
        <div className="tagline" style={{ marginTop: 'clamp(8px, 1.5vw, 12px)' }}>Your AI Powered Scribe Partner</div>
      </div>

      {/* Role Selection */}
      <div className="role-cards">
        {/* Student Card */}
        <div className="role-card" onClick={() => navigate('/student/login')}>
          <div className="role-icon-wrap student">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-lt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
          <div className="role-title">Student</div>
          <div className="role-desc">Sign in with face authentication or your student credentials</div>
          <div className="role-cta">
            <span>CONTINUE</span> 
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
        
        {/* Admin Card */}
        <div className="role-card" onClick={() => navigate('/admin-login')}>
          <div className="role-icon-wrap admin">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#A78BFA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
              <path d="M9 12l2 2 4-4"></path>
            </svg>
          </div>
          <div className="role-title">Administrator</div>
          <div className="role-desc">Manage exams, monitor sessions and view reports</div>
          <div className="role-cta">
            <span>CONTINUE</span> 
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </div>

      {/* Voice Pill */}
      <div className="voice-pill">
        <div className="mic-circle">
          <svg viewBox="0 0 24 24">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 18.5V22M8 22h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </div>
        <div className="waveform">
          <div className="wf-bar"></div><div className="wf-bar"></div><div className="wf-bar"></div><div className="wf-bar"></div><div className="wf-bar"></div><div className="wf-bar"></div>
        </div>
        <div className="voice-label" style={{ marginLeft: '8px' }}>
          Listening — say <b>"Student"</b> or <b>"Admin"</b> to continue
        </div>
      </div>
    </motion.section>
  );
};

export default LandingPage;
