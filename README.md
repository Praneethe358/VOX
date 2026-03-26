# Vox: Your AI-Powered Scribe Partner

> **Empowering inclusive education with an AI-driven, 100% voice-navigated examination platform.**<br>
> Vox eliminates the need for human scribes by providing a seamless, fully speech-to-text hybrid testing environment.

---

## 🌟 Vision & Mission

Traditional examinations present significant barriers for students with accessibility needs or physical limitations. Often, they must rely on human scribes—which can cause scheduling issues, misinterpretations, and a loss of personal independence.

**Vox represents the future of accessible testing as your personal AI scribe.** From login to submission, a student never has to touch the keyboard. Our system combines frictionless biometric access, advanced voice navigation, and intelligent speech-to-text formatting to create an equitable, human-equivalent scribe experience. Security (like face recognition) is utilized primarily to make the experience *password-free and seamless*, rather than restrictive.

---

## 🚀 Key Accessibility Features

### 🎙️ 100% Hands-Free Journey
- **Password-Free Login:** Face authentication allows students to log in and confirm their identity simply by looking at the camera. Say goodbye to typing complex passwords.
- **Voice Navigation:** Complete platform traversal via voice ("Select exam 1", "Go to Dashboard", "Start Exam").
- **Smart Briefing:** Exams begin with an automated, natural-sounding audio walkthrough of rules.
- **Landing Page Voice Onboarding:** On first load, Vox speaks *"Welcome to Vox. Say Student or Admin to continue."* for instant role-based routing.

### 📝 The AI Scribe Experience (Phase 2)
- **Hybrid Question Support:** Exams now support **MCQ**, **Descriptive**, and **Numerical** question types in a single exam.
- **Direct Voice Dictation:** For descriptive/written questions, speech is instantly transcribed directly into the answer box with zero latency via the Web Speech API.
- **Voice-Controlled MCQ:** Speak your option ("Option A", "Submit") to navigate multiple-choice seamlessly.
- **Smart Pacing & Silence Detection:**
  - The system respects your thinking time but knows when you are done. The dictation agent automatically stops after 5 seconds of silence.
  - Optional Llama-3 AI formatting corrects the syntax and grammar of MCQ spoken responses. Written answers are preserved as-is to maintain student authenticity.
- **Full Vocal Control:** Change your mind entirely via voice. Say "edit answer" to redo, "continue dictation" to append, or "confirm answer" to save.
- **Word Count Advisory:** Real-time word/character count with color-coded guidance (green = within range, yellow = advisory warning) — never restrictive.

### 🛡️ Safe, Secure & Worry-Free
- **Fullscreen Kiosk Mode:** HTML5 Fullscreen API prevents accidental navigations or distractions without compromising voice interactions (migrated from Electron in PWA phase).
- **Continuous Auto-Save:** Exam progress (both MCQ and written answers) is implicitly saved every 15 seconds, completely removing the anxiety of "forgetting to save".
- **Auto-Submission:** Exams auto-submit upon timer expiration, followed by an automated 15-second redirect. No manual clicks required.
- **JWT-Protected APIs:** All admin and student endpoints are secured with role-based JWT authentication.
- **NoSQL Injection Protection:** Pydantic schema validation on all request models blocks injection payloads.

---

## 🗣️ Voice Command Reference

### Written Question Commands
| Command | Alternatives | Action |
|---------|-------------|--------|
| **start answer** | "start writing", "begin writing" | Begin voice recording for written answer |
| **continue dictation** | "add more", "keep going" | Append more text to existing answer |
| **confirm answer** | "save answer", "accept answer" | Save the written answer |
| **edit answer** | "redo answer" | Clear and restart dictation |
| **clear answer** | "delete answer", "erase answer" | Remove the draft answer |
| **read my answer** | "what did I say" | Read back the saved answer |

### MCQ & Universal Commands
| Command | Alternatives | Action |
|---------|-------------|--------|
| **option 1/2/3/4** | "answer 1", "choice A" | Select MCQ option |
| **next question** | "go next" | Advance to next question |
| **previous question** | "go back" | Return to previous question |
| **repeat question** | "say again", "read question" | Hear the question aloud |
| **pause exam** | — | Pause the exam |
| **submit exam** | — | Open submission gate |

---

## 💻 Tech Stack

### Frontend (`frontend/`)
| Technology | Version | Purpose |
|-----------|---------|---------|
| **React** | 18.x | UI rendering and stateful components |
| **TypeScript** | 5.x | Type safety across the entire frontend |
| **Vite** | 6.x | Dev server, HMR, and production bundling |
| **React Router DOM** | 6.x | Route protection and page flow |
| **Tailwind CSS** | 3.x | Accessible dark-theme UI (indigo/blue/slate palette) |
| **Framer Motion** | 12.x | Transitions, micro-animations, and interaction feedback |
| **face-api.js** | 0.22.x | Client-side face embedding extraction for biometric login |
| **Web Speech API** | Native | Browser-native Speech-to-Text & Text-to-Speech |
| **vite-plugin-pwa** | 1.1.x | Service worker, offline support, installability |

### Backend (`backend/`)
| Technology | Version | Purpose |
|-----------|---------|---------|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.116+ | Async API framework with auto-generated docs |
| **Uvicorn** | 0.35+ | High-performance ASGI server |
| **PyMongo** | 4.x | MongoDB driver |
| **Pydantic** | 2.x | Strict schema validation (22 request models) |
| **PyJWT** | 2.x | JWT-based authentication |
| **bcrypt** | 4.x | Password hashing (plaintext fallback removed) |
| **pypdf** | 5.x | PDF question extraction (MCQ + descriptive + numerical) |
| **httpx** | 0.28+ | Async HTTP client for Ollama LLM calls |
| **slowapi** | 0.1.9 | Rate limiting on authentication endpoints |
| **pydantic-settings** | 2.x | Configuration management |

### AI & Voice Stack
| Technology | Purpose |
|-----------|---------|
| **Web Speech API** | Browser-native STT for commands and written dictation |
| **SpeechSynthesis API** | Primary TTS for prompts and navigation feedback |
| **espeak-ng** | Server-side TTS fallback via `/api/ai/tts-speak` |
| **Ollama + Llama 3** | MCQ review-mode answer formatting (not for written answers) |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker Compose** | Multi-container orchestration (frontend, backend, MongoDB) |
| **Nginx** | Reverse proxy, static serving, security headers |
| **MongoDB 7.0** | Document database with authenticated access |

---

## ⚙️ Running Vox

### Option 1: Docker (Recommended)

#### Prerequisites
- Docker & Docker Compose
- (Optional) Locally running `Ollama` on port `11434` for grammar features

#### Start the Platform
```bash
git clone <repository_url>
cd mindkraft
docker compose up -d --build
```

#### Access Points & Ports
| Service | URL | Port |
|---------|-----|------|
| **Frontend** (Student & Admin UI) | `http://localhost:4100` | 4100 |
| **Backend** API & Swagger Docs | `http://localhost:4000/docs` | 4000 |
| **MongoDB** | `mongodb://localhost:4200` | 4200 |

#### Database Access (Docker)
*See [docs/MONGODB_DOCKER_GUIDE.md](docs/MONGODB_DOCKER_GUIDE.md) for full query documentation.*
```bash
docker exec -it mindkraft-mongo-1 mongosh \
  --username voxadmin --password VoxSecure2026! \
  --authenticationDatabase admin vox
```

### Option 2: Local Development

#### Prerequisites
- Python 3.11+, Node.js 18+, MongoDB 7.x+

#### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 4000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Default Credentials
| Account | Email / Username | Password |
|---------|-----------------|----------|
| **Super Admin** | `admin@vox.edu` | `ChangeMe@123` |

---

## 📂 Project Structure

```text
mindkraft/
├── README.md                           ← This file
├── docker-compose.yml                  ← Container orchestration
├── seed_data.js                        ← MongoDB seed data
│
├── frontend/                           ← React 18 + Vite + TypeScript (PWA)
│   ├── src/
│   │   ├── api/                       ← API client (bridge.ts, apiService.ts, client.ts)
│   │   ├── components/student/        ← AnswerInputBox, SubmissionGate, MicWaveform
│   │   ├── hooks/student/             ← useDictation, useVoiceEngine, useFaceRecognition
│   │   ├── context/                   ← AuthContext, ExamContext, VoiceContext
│   │   ├── pages/                     ← LandingPage, ExamInterface, AdminPortal
│   │   ├── services/                  ← Student API services
│   │   ├── types/                     ← TypeScript type definitions
│   │   └── utils/                     ← Utility functions (faceApiLoader)
│   ├── public/models/                 ← face-api.js ML models
│   ├── vite.config.ts                 ← Vite + PWA plugin configuration
│   └── package.json                   ← Dependencies & scripts
│
├── backend/                            ← Python FastAPI (Modular Router Architecture)
│   ├── app/
│   │   ├── main.py                    ← App setup, CORS, error handlers (185 lines)
│   │   ├── schemas.py                 ← 22 Pydantic request models with validation
│   │   ├── routers/                   ← 5 domain-specific route modules
│   │   │   ├── admin.py              ← 15 JWT-protected admin endpoints
│   │   │   ├── auth.py               ← Student login + face recognize
│   │   │   ├── face.py               ← Face registration, verification, management
│   │   │   ├── student.py            ← Exam access, answer submission
│   │   │   └── v1.py                 ← V1 API (admin mgmt, sessions, config)
│   │   ├── security.py               ← JWT middleware, bcrypt, role-based auth
│   │   ├── config.py                 ← Pydantic Settings configuration
│   │   ├── database.py               ← MongoDB repository & initialization
│   │   ├── services/                  ← AI (TTS, LLM), Face, PDF parser
│   │   └── utils/                     ← Input sanitization (safe_str, sanitize_value)
│   └── requirements.txt              ← Python dependencies
│
├── nginx/                              ← Reverse proxy & security headers
│   └── nginx.conf
│
└── docs/                               ← Comprehensive documentation (22 files)
```

---

## 🔒 Security Summary

The platform has undergone a [comprehensive security audit](docs/SECURITY_AUDIT.md) identifying 18 vulnerabilities across OWASP Top 10 categories. **Phase 2 hardening** addressed the 6 most critical:

| Vulnerability | Status | Fix Applied |
|--------------|--------|-------------|
| Unauthenticated admin APIs (CVSS 9.8) | ✅ Fixed | `require_admin_jwt` on all 15 endpoints |
| Plaintext password fallback (CVSS 9.1) | ✅ Fixed | Only bcrypt accepted |
| Client-side auth bypass (CVSS 8.5) | ✅ Fixed | JWT-only authentication |
| NoSQL injection (CVSS 8.2) | ✅ Partial | `safe_str()` + Pydantic models |
| Stack trace leakage | ✅ Fixed | Generic error messages |
| Admin login returns no JWT | ✅ Fixed | JWT issued on login |

*See [docs/SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md) for full details and remaining items.*

---

## 📖 Documentation Index

### Getting Started
- **[QUICKSTART.md](docs/QUICKSTART.md)** — 5-minute rapid development setup
- **[SETUP.md](docs/SETUP.md)** — Complete environment setup guide (Windows, macOS, Linux)

### Architecture & Design
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — System design, voice state model, and data flows
- **[TECH_STACK.md](docs/TECH_STACK.md)** — Detailed technology choices and configuration
- **[PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** — Complete file organization and directory layout
- **[PHASE4_ARCHITECTURE.md](docs/PHASE4_ARCHITECTURE.md)** — Modular router refactoring (monolith → 5 routers + Pydantic)

### Feature Documentation
- **[PHASE_2_WRITTEN_EXAMS.md](docs/PHASE_2_WRITTEN_EXAMS.md)** — Written exam support with STT dictation
- **[ADMIN_SETTINGS_REDESIGN.md](docs/ADMIN_SETTINGS_REDESIGN.md)** — Admin Settings UI redesign
- **[MIGRATION.md](docs/MIGRATION.md)** — Electron → PWA migration guide

### Security
- **[SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md)** — Full pre-hardening security audit report
- **[SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md)** — Fixes applied (Phase 2 critical)

### DevOps & Deployment
- **[DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)** — Container operations & production deployment
- **[MONGODB_DOCKER_GUIDE.md](docs/MONGODB_DOCKER_GUIDE.md)** — Database access & query cheatsheet

### Code Quality
- **[CODE_DOCUMENTATION.md](docs/CODE_DOCUMENTATION.md)** — Inline documentation standards & style guide
- **[FILE_CHANGE_INDEX.md](docs/FILE_CHANGE_INDEX.md)** — Quick reference for all file changes
- **[DOCUMENTATION_SUMMARY.md](docs/DOCUMENTATION_SUMMARY.md)** — Analysis summary of all documentation updates
- **[VERIFICATION_CHECKLIST.md](docs/VERIFICATION_CHECKLIST.md)** — Documentation update verification checklist
- **[RESTRUCTURING.md](docs/RESTRUCTURING.md)** — Project layout restructuring changelog

### Other
- **[INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)** — API endpoints & frontend-backend integration
- **[PRESENTATION.md](docs/PRESENTATION.md)** — Project presentation slide guide

---

## 📊 Project Statistics

| Metric | Count |
|--------|-------|
| Python files (backend core) | 6 + 5 routers + schemas |
| React components | 20+ |
| Custom hooks | 15+ |
| Pages | 12+ |
| API endpoints | 54+ (across 6 router modules) |
| Pydantic request models | 22 |
| Voice commands supported | 13+ |
| ML models (face-api.js) | 3 |
| Documentation files | 22 |

---

*Vox Platform — Redefining accessibility, engineering independence.*
