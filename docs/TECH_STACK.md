# Vox — Tech Stack

Vox is a voice-first, accessible exam platform built as a Progressive Web App (PWA). It supports hybrid exam flows where students answer via voice dictation or manual typing across MCQ, descriptive, and numerical question types. The platform uses browser-native speech recognition and a modular FastAPI backend.

---

## Core Architecture

- **Frontend**: React 18 + TypeScript + Vite (PWA-enabled)
- **Backend**: Python 3.11 + FastAPI + Uvicorn (modular router architecture)
- **Database**: MongoDB 7.0 (PyMongo + authenticated access)
- **STT**: Browser Web Speech API (SpeechRecognition / webkitSpeechRecognition)
- **TTS**: Web Speech API (primary) + espeak-ng fallback endpoint
- **LLM**: Ollama + Llama 3 for MCQ review-mode formatting
- **Auth**: JWT (HS256) with role-based access control + bcrypt password hashing
- **Proxy**: Nginx reverse proxy with security headers

---

## Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI rendering and stateful components |
| TypeScript | 5.x | Type safety across all frontend code |
| Vite | 6.x | Dev server (HMR) and production bundling |
| React Router DOM | 6.x | Route protection and page flow |
| Tailwind CSS | 3.x | Utility-first styling (dark indigo/blue/slate theme) |
| Framer Motion | 12.x | Transitions, micro-animations, and interaction feedback |
| face-api.js | 0.22.x | Client-side face embedding extraction for biometric login |
| vite-plugin-pwa | 1.1.x | Service worker, offline support, installability |
| concurrently | 9.x | Parallel dev server startup (frontend + backend) |

### Frontend Architecture Highlights

- **PWA**: Service worker for offline support, web manifest for installability, standalone display mode
- **Voice State Machine**: `VoiceContext` manages global voice state transitions:
  `IDLE → FACE_AUTH → EXAM_BRIEFING → COMMAND_MODE ↔ DICTATION_MODE → SUBMISSION_GATE → FINALIZE`
- **Voice Hooks**: `useVoiceEngine` (commands), `useDictation` (written STT), `useVoiceNavigation` (page nav)
- **Kiosk Mode**: HTML5 Fullscreen API replaces deprecated Electron kiosk mode
- **Admin UI**: Professional `ap-*` CSS class system with gradient backgrounds, stat cards, animated toggles

---

## Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.116+ | Async API framework with auto-generated Swagger docs |
| Uvicorn | 0.35+ | High-performance ASGI server |
| PyMongo | 4.12+ | MongoDB driver |
| Pydantic | 2.x | Strict schema validation (22 request models) |
| pydantic-settings | 2.x | Configuration management |
| PyJWT | 2.x | JWT-based authentication |
| bcrypt | 4.x | Password hashing (plaintext fallback removed) |
| pypdf | 5.x | PDF question extraction (MCQ + descriptive + numerical) |
| httpx | 0.28+ | Async HTTP client for Ollama LLM calls |
| slowapi | 0.1.9 | Rate limiting (authentication endpoints) |
| python-multipart | 0.0.20 | Form data and file upload parsing |

### Backend Architecture (Phase 4 — Modular Routers)

The monolithic `main.py` (770 lines) was refactored into 5 domain-specific router modules:

```
backend/app/
├── main.py              # App setup, CORS, error handlers (185 lines)
├── schemas.py           # 22 Pydantic request models with validation
├── routers/
│   ├── admin.py         # 15 admin endpoints (JWT-protected)
│   ├── auth.py          # Student login + face recognize
│   ├── face.py          # Face registration, verification, management
│   ├── student.py       # Exam access, answer submission
│   └── v1.py            # V1 API (admin management, sessions, config)
├── security.py          # JWT middleware, bcrypt, role-based auth
├── config.py            # Pydantic Settings
├── database.py          # MongoDB repository & initialization
├── services/            # Business logic (AI, face, PDF)
└── utils/               # Sanitization (safe_str, sanitize_value)
```

| Router | Prefix | Endpoints | Auth |
|--------|--------|-----------|------|
| `admin.py` | `/api/admin` | 15 | JWT (admin/superadmin) |
| `auth.py` | `/api/auth` | 2 | Public (rate limited) |
| `face.py` | `/api/face` | 6 | Public |
| `student.py` | `/api/student` | 6 | Public |
| `v1.py` | `/api/v1` | 13 | JWT (role-based) |
| `main.py` | `/api/*` | 12 | Mixed |

---

## AI and Voice Stack

### Speech-to-Text (Active)

- Command recognition and written dictation run **in browser** via Web Speech API.
- Landing page voice onboarding is browser-native and supports "student"/"admin" role routing.
- On page load of `/`, TTS says: *"Welcome to Vox. Say Student or Admin to continue."*
- Dictation streams directly into the answer box (no floating overlay).
- 5-second silence auto-stop is enforced for written dictation.
- Continue mode appends to existing text; edit mode clears and restarts.

Navigation reminder behavior:
- `useVoiceNavigation` can announce after 15 seconds of inactivity.
- Landing page disables that reminder and uses only the welcome onboarding prompt.

### Text-to-Speech

- **Primary**: Browser speech synthesis for low-latency prompts and status narration.
- **Fallback**: FastAPI endpoint `/api/ai/tts-speak` using espeak-ng.

### LLM Formatting

- Endpoint: `/api/ai/format-answer`
- Engine: Ollama (`llama3:latest`)
- Applied to MCQ review-mode cleanup.
- **Not applied** to descriptive/numerical written answers to preserve original student text.

---

## Security and Proctoring

### Authentication
- Face authentication with cosine similarity thresholds (0.85 cosine, 0.55 euclidean).
- Face attempt rate limiting.
- JWT-based auth with role checks (`require_admin_jwt`, `require_student_jwt`).
- Legacy sessionStorage auth bypass **removed** — JWT-only authentication.
- Plaintext password comparison **removed** — bcrypt-only verification.

### Input Validation
- 22 Pydantic request models validate all API inputs (Phase 4).
- `safe_str()` blocks dict/list injection payloads on login fields.
- `sanitize_value()` recursively blocks `$` MongoDB operators.

### Infrastructure Security
- MongoDB authenticated access (username/password in docker-compose).
- Nginx security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`.
- Stack trace leakage **fixed** — generic error messages returned to clients.
- Error details logged server-side via `traceback.print_exc()`.

### Audit & Monitoring
- Voice-driven exam control with command-state machine.
- Audit logging with IP timestamps for all auth attempts.
- Autosave trails for exam integrity.
- Activity event logging (exam start, answer submit, submission).

---

## Data and Session Model

- Exam supports mixed question types: `mcq`, `descriptive`, `numerical`.
- Written answers stored alongside MCQ answers in unified submission flow.
- Written answers bypass AI formatting to preserve original student text.
- Autosave interval: every 15 seconds (configurable via admin settings).
- Submission includes response payloads and activity metadata.
- Word count advisory system: real-time word/character counts with color-coded feedback.

### Question Data Shape
```typescript
{
  id: string | number,
  text: string,
  type: 'mcq' | 'descriptive' | 'numerical',
  options?: string[],              // MCQ only
  correctAnswer?: number,          // MCQ only
  marks?: number,
  expectedAnswerLength?: 'short' | 'medium' | 'long',
  difficulty?: 'easy' | 'medium' | 'hard'
}
```

---

## Runtime Modes

### Default (Current — PWA)

- Frontend in browser at `http://localhost:4100` (served via Nginx)
- FastAPI backend at `http://localhost:4000`
- MongoDB at `mongodb://localhost:4200` (authenticated)
- Web Speech API for STT (browser-native, zero-latency)
- HTML5 Fullscreen API for kiosk mode
- Service worker for offline support

### Docker (Production)

- `docker compose up -d --build` spins up frontend, backend, and MongoDB
- Nginx reverse proxy on port 4100
- MongoDB with authentication (`voxadmin` / `VoxSecure2026!`)
- Optional Ollama service for LLM features (uncomment in docker-compose.yml)

### Legacy (Deprecated)

- Node/Electron kiosk shell and IPC bridge retained only for transition reference.
- Backend Whisper STT pipelines — deprecated, not active.
- ffmpeg-based STT conversion flow — deprecated.
- Electron IPC command pipelines — deprecated.

---

## Development Environment

### Prerequisites
- Python 3.11+, Node.js 18+, MongoDB 7.x+
- Docker & Docker Compose (for containerized deployment)
- (Optional) Ollama on port 11434 for LLM features

### Admin Credentials
| Account | Email | Password |
|---------|-------|----------|
| Super Admin | `admin@vox.edu` | `ChangeMe@123` |

### Environment Variables

**Backend** (`.env`):
```env
MONGODB_URI=mongodb://127.0.0.1:4200
MONGODB_DB_NAME=vox
PORT=4000
FRONTEND_URL=http://localhost:4100
JWT_SECRET=vox-local-dev-secret-change-this
ESPEAK_BIN=C:\Program Files\eSpeak NG\espeak-ng.exe
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
VOX_SUPERADMIN_EMAIL=admin@vox.edu
VOX_SUPERADMIN_PASSWORD=ChangeMe@123
```

**Frontend** (`.env`):
```env
VITE_API_BASE_URL=http://localhost:4000
```

---

## Browser Compatibility

| Browser | Web Speech API | Fullscreen API | Service Worker |
|---------|---|---|---|
| Chrome 90+ | ✅ | ✅ | ✅ |
| Edge 90+ | ✅ | ✅ | ✅ |
| Firefox 88+ | ✅ | ✅ | ✅ |
| Safari 14+ | ✅ (limited) | ✅ | ✅ |

---

## Notes for Contributors

- Prefer documenting Web Speech API paths for STT behavior.
- Do not document Whisper/ffmpeg command transcription pipeline as active.
- Keep command examples aligned with current exam flows (`start answer`, `continue dictation`, `edit answer`, `confirm answer`).
- All admin endpoints must include `Depends(require_admin_jwt)`.
- New API endpoints should use Pydantic request models from `schemas.py`.
- Follow the marker format `► [Type] (Date):` for inline code documentation.
- Use Code Documentation Guide (`docs/CODE_DOCUMENTATION.md`) for documentation standards.

---

## Related Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and data flows |
| [PHASE_2_WRITTEN_EXAMS.md](docs/PHASE_2_WRITTEN_EXAMS.md) | Written exam support with STT |
| [PHASE4_ARCHITECTURE.md](docs/PHASE4_ARCHITECTURE.md) | Modular router refactoring |
| [MIGRATION.md](docs/MIGRATION.md) | Electron → PWA migration |
| [SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md) | Full security audit report |
| [SECURITY_HARDENING.md](docs/SECURITY_HARDENING.md) | Security fixes applied |
| [INTEGRATION_GUIDE.md](docs/INTEGRATION_GUIDE.md) | API endpoints reference |
| [DOCKER_DEPLOYMENT.md](docs/DOCKER_DEPLOYMENT.md) | Container operations |
| [MONGODB_DOCKER_GUIDE.md](docs/MONGODB_DOCKER_GUIDE.md) | Database access cheatsheet |
