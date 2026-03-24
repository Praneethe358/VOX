# Vox

> A **voice-first, AI-powered, hybrid examination platform** with biometric face authentication, voice dictation or manual typing for answers, real-time AI answer formatting (MCQ mode), and kiosk-mode security lockdown.

---

## Key Highlights

- **Hybrid student journey** — face login → voice navigation → mixed MCQ+written exams with voice commands or manual input
- **Landing voice onboarding** — on opening `/`, app speaks: "Welcome to Vox. Say Student or Admin to continue."
- **100% hands-free option for MCQ exams** — face login → voice navigation → voice MCQ selection → voice submission
- **Hybrid option for descriptive/written exams** — voice/manual login + voice commands + manual text typing for written answers
- **13+ in-exam voice commands** with fuzzy matching (Levenshtein ≥ 0.78) — seamlessly works during dictation or manual mode  
- **Hybrid AI stack** — Browser Web Speech API (STT) + Ollama/Llama 3 (MCQ formatting only) + espeak-ng TTS + face-api.js biometrics
- **Python FastAPI backend** — modern async framework with automatic API documentation
- **Real-time auto-save** every 15 seconds with revision history

---

## Current Features

### Authentication
- **Admin** — username/password login (`/api/admin/login` + `/api/v1/auth/admin-login` JWT)
- **Student face login** — webcam → face-api.js 128D embedding → backend cosine similarity (threshold ≥ 0.85) → JWT
- **Student password fallback** — email + password (`/api/auth/login`) → JWT
- **Rate limiting** — max 5 failed face attempts per student per 15-minute window
- **Liveness detection** — landmark movement tracking to reject photos

### Face Recognition
- Multi-frame registration (5 frames averaged → L2-normalized 128D embeddings)
- Cosine similarity primary match (≥ 0.85) with Euclidean distance fallback (< 0.55)
- Per-student and per-exam verification modes
- Login attempt history & tracking

### Voice & AI
- **STT (Speech-to-Text)** — Browser-native Web Speech API (zero-latency, no backend audio processing)
  - **Landing voice onboarding** (`LandingPage`) — recognizes "student"/"admin" and routes directly to login pages
  - **Command mode** (`useVoiceEngine`) — instant command detection with fuzzy matching
  - **Written dictation mode** (`useDictation`) — real-time transcript streams directly into the answer box during speaking
  - **10-second silence detection** — auto-stops dictation when speech pauses
  - **15-second silence reminder** (`useVoiceNavigation`) — "hello are you still there ?? please say the command to proceed"
    - Enabled for navigation pages
    - Disabled specifically on landing page
  - **No external audio processing** — web browser handles all transcription locally (Chrome uses Google Cloud, other browsers vary)
- **TTS (Text-to-Speech)** — dual system:
  - Client-side: Web Speech API with serial playback queue, beep tones, voice priority (Microsoft Zira/David preferred)
  - Server-side fallback: espeak-ng WAV synthesis (`/api/ai/tts-speak`) if browser API fails
- **LLM Answer Formatting** — Ollama + Llama 3 at `localhost:11434` (temperature 0.2)
  - **Applied to**: MCQ review-mode dictations only (for grammar correction of spoken answers)
  - **NOT applied to**: Written/descriptive answers (preserves student's original text as-is)

### Voice Command System (3-Layer Architecture)
1. **VoiceContext** — global state machine: `IDLE → FACE_AUTH → EXAM_BRIEFING → COMMAND_MODE ⟷ DICTATION_MODE → SUBMISSION_GATE → FINALIZE`
2. **useVoiceEngine** — 13+ exam commands with exact → contains → fuzzy matching
3. **useVoiceNavigation** — regex-based page navigation (dashboard, exams, results, settings, select exam N, go back, help)

### Student Experience (Phase 2: Hybrid Exams)
- **Face login** with TTS guidance & automatic retry (hands-free)
- **Password fallback** login page (manual option)
- **Voice-enabled exam selector** — "select exam 1" or manual selection
- **Pre-exam checklist** — mic, camera, internet, fullscreen, speakers, storage (voice or manual)
- **Exam briefing** — audio walkthrough of exam rules
- **Dynamic exam interface** based on question type:
  - **MCQ questions**: Voice commands ("option 1", "option 2") or manual selection; optional AI-formatted review
  - **Descriptive/written questions**: 
    - Start with "start answer" → voice dictation records directly into answer box
    - 10-second silence auto-stops dictation
    - Say "continue dictation" to append more text
    - Say "edit answer" to clear and restart from scratch
    - Say "confirm answer" to save, or manually type/edit the text box
  - **Numerical questions**: Same as descriptive (voice or manual numeric entry)
- **Full hybrid workflow**:
  - Pause/resume with persisted timer (voice or manual)
  - Question flagging & navigation (voice commands or buttons)
  - 20-second submission confirmation gate (voice or manual)
  - Auto-save every 15 seconds
- **Submission confirmation** page with auto-redirect
- **Results page** with voice readout of scores
- **Settings page** — language, speech rate, accessibility options

### Admin Experience
- Admin portal with dashboard stats & recent activity
- 3-step exam creation wizard (metadata → PDF/JSON/CSV upload or manual entry → preview & publish)
- PDF parser extracting MCQ + descriptive questions (multiple formats)
- Student face enrollment via webcam (LiveFaceRegistration component)
- Submission management with grading interface
- Backend health monitoring

### Security
- **Kiosk mode** — Electron fullscreen, blocked keyboard shortcuts (Alt+Tab, F12, Ctrl+Shift+I, Ctrl+W), disabled right-click & copy/paste
- **JWT auth** — 8-hour expiry, role-based access (`super-admin`, `exam-admin`)
- **bcrypt** password hashing (cost factor 10)
- **Pydantic request validation** — strict schemas on all 22+ API endpoints preventing NoSQL injection & type confusion
- **Rate limiting** — `slowapi` per-route limits (5/min login, 30/min face recognition, 100/min general)
- **Nginx hardening** — CSP, Referrer-Policy, Permissions-Policy, X-Frame-Options, 10MB body limit
- **Non-root containers** — Docker images run as `appuser:1000`
- **MongoDB authentication** — credential-based access (`authSource=admin`)
- **Context isolation** — Electron `contextIsolation: true`, `nodeIntegration: false`
- **Audit logging** — every student action recorded with timestamp & metadata
- **Activity tracking** — suspicious flags, navigation history, environment data

---

## Tech Stack

### Frontend (`frontend/`)
| Technology | Version | Purpose |
|-----------|---------|---------|
| React | 18.3.1 | Component-based exam UI |
| TypeScript | 5.7 | Type safety |
| Vite | 6.0 | Dev server + production build |
| Tailwind CSS | 3.4 | Utility-first dark theme styling |
| Framer Motion | 12.4 | Page transitions & micro-animations |
| face-api.js | 0.22 | Client-side face detection & 128D embedding extraction |
| React Router DOM | 6.30 | Multi-page routing with protected routes |
| Web Speech API | Native | Client-side TTS + browser STT fallback |

### Backend (`backend/`)
| Technology | Version | Purpose |
|-----------|---------|---------|
| Python | 3.11 | Runtime |
| FastAPI | 0.116 | REST API server |
| Uvicorn | 0.35 | ASGI server |
| PyMongo | 4.12 | MongoDB data access |
| Pydantic | 2.x | Request/response validation & NoSQL injection prevention |
| slowapi | 0.1.9 | Per-route rate limiting |
| bcrypt | 4.3 | Password hashing |
| PyJWT | 2.10 | JWT authentication |
| python-multipart | 0.0.20 | Audio/file upload handling |
| pypdf | 5.9 | PDF question extraction |
| httpx | 0.28 | Ollama HTTP client |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Docker + Docker Compose | Container orchestration (frontend, backend, mongo, nginx) |
| Nginx | Reverse proxy, static file serving, security headers |
| MongoDB 7.x | Document database with authentication enabled |

### External AI Binaries (Optional, Local)
| Binary | Purpose | Used For |
|--------|---------|----------|
| espeak-ng | Text-to-speech WAV synthesis | Server-side TTS fallback (`/api/ai/tts-speak`) |
| Ollama + Llama 3 | Grammar correction & answer formatting | **MCQ review mode only** (not for written descriptive answers) |

---

## Project Structure

```
mindkraft/
├── README.md                          ← This file
├── docker-compose.yml                 ← Full-stack orchestration
│
├── frontend/                          ← React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── api/client.ts              ← Unified API client (relative /api paths)
│   │   ├── components/                ← Shared UI components
│   │   │   └── student/               ← Student-specific components (LiveFaceRegistration, etc.)
│   │   ├── context/                   ← AuthContext, ExamContext, VoiceContext
│   │   ├── hooks/                     ← Custom hooks (useAutoSpeak, useKiosk, etc.)
│   │   │   └── student/               ← Student hooks (voice, face, timer, etc.)
│   │   ├── pages/                     ← Page components
│   │   │   └── student/               ← Student pages (login, exam, results, etc.)
│   │   ├── services/student/          ← API service re-exports
│   │   ├── types/student/             ← TypeScript type definitions
│   │   └── utils/                     ← faceApiLoader, exam utilities
│   ├── public/models/                 ← face-api.js model weights
│   ├── Dockerfile                     ← Multi-stage build (non-root)
│   └── .env                           ← VITE_API_BASE_URL (empty for proxy)
│
├── backend/                           ← Python FastAPI backend
│   ├── app/
│   │   ├── main.py                    ← FastAPI app + rate limiter + CORS
│   │   ├── schemas.py                 ← Pydantic validation models (all endpoints)
│   │   ├── config.py                  ← Environment config
│   │   ├── database.py                ← MongoDB repository + initialization
│   │   ├── security.py                ← JWT + bcrypt password security
│   │   ├── routers/                   ← Modular route handlers
│   │   │   ├── admin.py               ← Admin endpoints (exams, PDF upload, publishing)
│   │   │   ├── auth.py                ← Authentication (login, face-recognize)
│   │   │   ├── face.py                ← Face registration & verification
│   │   │   ├── student.py             ← Student exam flow
│   │   │   └── v1.py                  ← V1 JWT-protected routes
│   │   └── services/                  ← AI, face, PDF parser services
│   ├── requirements.txt               ← Python dependencies
│   └── Dockerfile                     ← Python container (non-root)
│
├── nginx/                             ← Reverse proxy & security headers
│   ├── nginx.conf                     ← Routing, CSP, rate limiting
│   └── Dockerfile                     ← Nginx container
│
└── docs/                              ← Project documentation
    ├── QUICKSTART.md                  ← 5-minute setup guide
    ├── RESTRUCTURING.md               ← Migration changelog
    ├── SECURITY_HARDENING.md          ← Security audit report
    ├── PHASE4_ARCHITECTURE.md         ← Modular router/schema architecture
    ├── DOCKER_DEPLOYMENT.md           ← Container deployment guide
    └── ...                            ← Additional docs
```

---

## Run Locally

### Option A: Docker Compose (Recommended)

**Prerequisites:** Docker Desktop

```bash
# First time (or after schema/security changes)
docker compose down -v
docker compose build --no-cache
docker compose up -d
```

- **App URL:** `http://localhost` (via Nginx)
- **Health check:** `GET http://localhost/health`
- Auto-seeds the default super-admin on first run
- MongoDB authentication is enabled automatically

### Option B: Manual (Development)

**Prerequisites:** Node.js (v18+), Python 3.11+, MongoDB 7.x, npm (v9+)

#### 1) Start Backend
```bash
cd backend
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 4000 --reload
```
- URL: `http://localhost:4000`
- Health check: `GET http://localhost:4000/health`

#### 2) Start Frontend
```bash
cd frontend
npm install
npm run dev
```
- URL: `http://localhost:4100`

> **Note:** When running without Docker/Nginx, set `VITE_API_BASE_URL=http://localhost:4000` in `frontend/.env`.
> With Docker, leave it empty so all requests use relative `/api` paths through Nginx.

---

## Environment Variables

### Backend (`backend/.env`)
```env
# Database (Docker uses authenticated URI)
VOX_MONGODB_URI=mongodb://localhost:4200/vox
MONGODB_DB_NAME=vox
PORT=4000

# JWT
JWT_SECRET=vox-local-dev-secret-change-this

# AI / Speech binaries
ESPEAK_BIN="C:\Program Files\eSpeak NG\espeak-ng.exe"

# LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest

# Vox super-admin (auto-created on first run)
VOX_SUPERADMIN_EMAIL=admin@vox.edu
VOX_SUPERADMIN_PASSWORD=ChangeMe@123

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:4100
```

### Frontend (`frontend/.env`)
```env
# Leave empty for Docker/Nginx (relative /api paths)
# Set to http://localhost:4000 for local dev without proxy
VITE_API_BASE_URL=
```

### Voice/AI System Dependencies

Install these external binaries for full AI functionality:

```powershell
# Windows (via Chocolatey, admin PowerShell)
choco install espeak-ng
```

The backend preserves the existing `/health`, `/api/*`, and `/api/v1/*` HTTP surface. Phase 2 dictation uses browser-native STT and no longer depends on backend audio transcription.

---

## API Routes

### Core Routes
| Group | Prefix | Key Endpoints |
|-------|--------|---------------|
| Health | `/health` | `GET /health` |
| Auth | `/api/auth` | `POST /login`, `POST /face-recognize` |
| Face | `/api/face` | `POST /register`, `POST /verify`, `POST /verify-by-id`, `GET /students`, `GET /embedding/:id`, `DELETE /embedding/:id`, `GET /attempts/:id` |
| AI/Voice | `/api/ai` | `POST /tts-speak`, `POST /format-answer` |
| Admin | `/api/admin` | `POST /login`, `GET /exams`, `POST /create-exam`, `POST /upload-exam-pdf`, `POST /publish-exam` |
| Student | `/api/student` | `GET /exams`, `POST /verify-face`, `GET /exam/:code`, `POST /start-exam`, `POST /submit-answer`, `POST /end-exam` |
| Students | `/api/students` | `GET /dashboard`, `GET /profile` |
| Results | `/api/results` | `GET /`, `GET /:sessionId` |
| Exam Sessions | `/api/exam-sessions` | `POST /start`, `POST /autosave`, `POST /submit` |
| DB | `/api/db` | `POST /save-response`, `POST /log-audit`, `POST /submit-exam` |

### Vox V1 Routes (JWT-protected)
| Group | Prefix | Key Endpoints |
|-------|--------|---------------|
| V1 Auth | `/api/v1/auth` | `POST /admin-login`, `POST /admins` |
| V1 Students | `/api/v1/students` | `POST /`, `PATCH /:id/face-embedding` |
| V1 Exams | `/api/v1/exams` | `POST /`, `GET /:examId` |
| V1 Sessions | `/api/v1/exam-sessions` | `POST /start`, `POST /:id/submit`, `GET /:id` |
| V1 Answers | `/api/v1/answers` | `PUT /autosave` |
| V1 Activity | `/api/v1/activity-logs` | `POST /` |
| V1 Config | `/api/v1/config` | `GET /ai`, `PUT /ai`, `POST /system-logs` |

---

## Frontend Routes

### Public
| Path | Page | Description |
|------|------|-------------|
| `/` | LandingPage | Admin/Student choice |
| `/admin-login` | AdminLogin | Admin credential login |
| `/splash` | SplashScreen | Loading animation → redirect |
| `/student/login` | FaceRecognitionLogin | Hands-free face auth |
| `/student/login-fallback` | PasswordFallbackLogin | Email/password fallback |

### Protected — Admin
| Path | Page | Description |
|------|------|-------------|
| `/admin` | AdminPortal | Dashboard, exam management, face enrollment, submissions |

### Protected — Student
| Path | Page | Description |
|------|------|-------------|
| `/student/exams` | ExamSelector | Voice-enabled exam list |
| `/student/exam/:examId/checklist` | PreExamChecklist | System verification checks |
| `/student/exam-briefing` | ExamBriefing | Audio briefing before exam |
| `/student/exam/:examId/interface` | ExamInterface | Main exam (13 voice commands) |
| `/student/submission-confirmation` | SubmissionConfirmation | Post-exam summary |
| `/student/results` | ResultsPage | Exam results with voice readout |
| `/student/settings` | SettingsPage | Accessibility & language settings |

---

## Database

**Engine:** MongoDB 7.x (database: `vox`)
**Dual driver:** MongoDB Native Driver (legacy routes) + Mongoose 9.2 (Vox models)

### Legacy Collections (Native Driver)
| Collection | Key Fields |
|-----------|-----------|
| admins | `username`, `passwordHash` |
| students | `studentId`, `name`, `examCode`, `faceDescriptor[]` |
| exams | `code`, `title`, `questions[]`, `durationMinutes`, `status` |
| face_embeddings | `studentId`, `facialEmbedding[]` (128D), `normalizedEmbedding[]`, `qualityScore` |
| responses | `studentId`, `examCode`, `rawAnswer`, `formattedAnswer`, `confidence` |
| audit_logs | `studentId`, `action`, `metadata`, `timestamp` |

### Vox Mongoose Schemas
| Model | Key Fields |
|-------|-----------|
| Admin | `name`, `email`, `passwordHash`, `role` (super-admin/exam-admin), `mfaEnabled` |
| Student | `registerNumber`, `fullName`, `email`, `department`, `year`, `faceEmbedding[]` (max 2048D), `languagePreference` |
| Exam | `title`, `subject`, `durationMinutes`, `totalMarks`, `questions[]` (mcq/short/long, max 300), `scheduledDate`, `isActive` |
| ExamSession | `studentId`, `examId`, `status` (not-started/in-progress/submitted/terminated), `suspiciousFlags[]`, `autoSaveCount`, `isLocked` |
| Answer | `examSessionId`, `questionNumber`, `rawSpeechText`, `formattedAnswer`, `wordCount`, `revisionHistory[]` (max 20) |
| ActivityLog | `examSessionId`, `eventType`, `metadata`, `timestamp` |
| AIConfiguration | Singleton — `sttEngine`, `llmModel`, `grammarCorrection`, `autoSaveInterval`, `ttsSpeed` |
| SystemLog | `level` (error/critical), `message`, `source`, `examSessionId` |

---

## Default Credentials

**Admin (seeded on first run):**
- Username: `admin` / Password: `admin123`

**Vox Super-Admin (auto-created):**
- Email: `admin@vox.edu` / Password: `ChangeMe@123`

---

## Notes

- **No mock DB mode** — application always uses real MongoDB (mock mode removed)
- Backend seeds a default admin and a sample exam (`TECH101 — Introduction to AI`) on startup
- Backend checks and logs AI dependency readiness (espeak-ng, Ollama connection) on startup
- For full API reference and data flow details, see `docs/INTEGRATION_GUIDE.md`
- For detailed tech stack rationale and architecture, see `docs/TECH_STACK.md`

---

## 📚 Documentation (in `/docs`)

| Document | Purpose |
|----------|---------|
| **[QUICKSTART.md](docs/QUICKSTART.md)** | 5-minute setup guide — fastest way to get running |
| **[SETUP.md](docs/SETUP.md)** | Complete development environment setup with IDE configuration |
| **[PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)** | Detailed file organization and directory layout |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** | System architecture, data flows, component interactions |
| **[TECH_STACK.md](docs/TECH_STACK.md)** | Technology stack components and detailed architecture |
| **[INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md)** | Complete API reference and backend integration details |
| **[RESTRUCTURING.md](docs/RESTRUCTURING.md)** | Project layout migration changelog |
| **[SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md)** | Security audit — injection prevention, rate limiting, container hardening |
| **[PHASE4_ARCHITECTURE.md](docs/PHASE4_ARCHITECTURE.md)** | Modular router/schema architecture breakdown |
| **[DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md)** | Container deployment guide |
| **[PHASE_2_WRITTEN_EXAMS.md](docs/PHASE_2_WRITTEN_EXAMS.md)** | Phase 2 — written exam support with voice dictation |
| **[ADMIN_SETTINGS_REDESIGN.md](docs/ADMIN_SETTINGS_REDESIGN.md)** | Admin portal UI redesign with glassmorphism theme |

**Getting Started:**
1. Start with [docs/QUICKSTART.md](docs/QUICKSTART.md) to get running in 5 minutes
2. Read [docs/DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md) for Docker deployment
3. Check [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md) to understand the codebase
4. Review [docs/SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md) for security documentation
5. See [docs/INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) for API documentation
6. Read [docs/PHASE_2_WRITTEN_EXAMS.md](docs/PHASE_2_WRITTEN_EXAMS.md) for Phase 2 features

---

*Built by Team A — Vox Exam Platform*
