# Vox — Project Structure

> Complete file organization and directory layout

---

## Directory Tree

```
mindkraft/                                    # Workspace root
├── .venv/                                    # Python virtual environment (git-ignored)
├── Team-A-Frontend/                          # Project root
│   ├── .git/                                 # Version control
│   ├── Team-A-Backend/
│   │   └── Team-A-Backend/                   # Python FastAPI Backend
│   │       ├── app/                          # Core application (Main entry point)
│   │       │   ├── __init__.py               # Package initialization
│   │       │   ├── config.py                 # Configuration & settings
│   │       │   ├── database.py               # MongoDB repository & initialization
│   │       │   ├── main.py                   # FastAPI app definition & routes
│   │       │   ├── security.py               # JWT auth & password hashing
│   │       │   └── services/                 # Business logic
│   │       │       ├── ai.py                 # STT, TTS, LLM orchestration
│   │       │       ├── face.py               # Face recognition & embeddings
│   │       │       └── pdf_parser.py         # PDF exam parsing
│   │       ├── scripts/                      # Utility scripts
│   │       │   └── smoke_test.py             # Integration test suite
│   │       ├── .env                          # Environment variables (dev)
│   │       ├── .env.example                  # Environment template
│   │       ├── .gitignore                    # Git exclusions
│   │       ├── requirements.txt              # Python dependencies
│   │       ├── start-python-backend.ps1      # Windows startup script
│   │       └── README.md                     # Backend documentation
│   │
│   ├── Team-A-Frontend/                      # React + Vite Frontend (Main UI)
│   │   ├── src/
│   │   │   ├── main.tsx                      # React entry point
│   │   │   ├── App.tsx                       # Root component
│   │   │   ├── index.css                     # Global styles
│   │   │   ├── api/                          # API integration
│   │   │   │   ├── apiService.ts             # Core HTTP client
│   │   │   │   ├── bridge.ts                 # IPC bridge (unused in Python mode)
│   │   │   │   └── client.ts                 # Unified API client for V1 routes
│   │   │   ├── components/                   # Reusable UI components
│   │   │   │   ├── ErrorBoundary.tsx         # Error fallback
│   │   │   │   ├── MicWaveform.tsx            # Audio visualization
│   │   │   │   ├── ProtectedRoute.tsx        # Private route guard
│   │   │   │   ├── StatusBadge.tsx           # Status indicator
│   │   │   │   ├── Toast.tsx                 # Notifications
│   │   │   │   └── student/                  # Student-specific components
│   │   │   │       ├── AnswerRecorder.tsx    # Voice recording UI
│   │   │   │       ├── FormattedAnswerReview.tsx
│   │   │   │       └── [10+ more components]
│   │   │   ├── context/                      # Global state management
│   │   │   │   ├── AuthContext.tsx           # User authentication state
│   │   │   │   ├── ExamContext.tsx           # Exam session state
│   │   │   │   └── VoiceContext.tsx          # Voice state machine
│   │   │   ├── hooks/                        # Custom React hooks
│   │   │   │   ├── useAutoSpeak.ts           # Auto-speak on action
│   │   │   │   ├── useKiosk.ts               # Kiosk mode detection
│   │   │   │   ├── useSpeech.ts              # Speech recognition
│   │   │   │   ├── useVoiceNavigation.ts     # Voice-based navigation
│   │   │   │   └── student/                  # Student-specific hooks
│   │   │   │       ├── useFaceRecognition.ts # Face auth hook
│   │   │   │       ├── useExamSession.ts     # Exam state hook
│   │   │   │       └── [6+ more hooks]
│   │   │   ├── pages/                        # Page components
│   │   │   │   ├── LandingPage.tsx           # Public landing (/)
│   │   │   │   ├── StudentLogin.tsx          # Student login (/student-login)
│   │   │   │   ├── StudentPortal.tsx         # Student dashboard (/student)
│   │   │   │   ├── AdminPortal.tsx           # Admin dashboard (/admin)
│   │   │   │   ├── adminlogin.tsx            # Admin login (/admin-login)
│   │   │   │   ├── Dashboard.tsx             # General dashboard (/dashboard)
│   │   │   │   ├── ExamInterface.tsx         # Exam exam interface (/exam)
│   │   │   │   ├── SplashScreen.tsx          # Splash screen (/splash)
│   │   │   │   └── student/                  # Student sub-pages
│   │   │   │       ├── FaceRecognitionLogin.tsx      # Face auth page
│   │   │   │       ├── PasswordFallbackLogin.tsx     # Password login
│   │   │   │       ├── QuestionDisplay.tsx           # Question viewer
│   │   │   │       └── [8+ more pages]
│   │   │   ├── services/                     # Utility services
│   │   │   │   └── student/                  # Student-specific services
│   │   │   ├── types/                        # TypeScript type definitions
│   │   │   │   └── student/                  # Student-specific types
│   │   │   ├── utils/                        # Utility functions
│   │   │   │   ├── faceApiLoader.ts          # Face-api.js loader
│   │   │   │   └── student/                  # Student utilities
│   │   │   └── vite-env.d.ts                 # Vite type definitions
│   │   ├── public/                           # Static assets
│   │   │   └── models/                       # ML model files
│   │   │       ├── face_landmark_68_model-*  # Face landmark detector
│   │   │       ├── face_recognition_model-*  # Face recognition model
│   │   │       └── tiny_face_detector_model-* # Face detector
│   │   ├── index.html                        # HTML entry point
│   │   ├── package.json                      # npm dependencies & scripts
│   │   ├── package-lock.json                 # Dependency lock file
│   │   ├── tsconfig.json                     # TypeScript configuration
│   │   ├── vite.config.ts                    # Vite build configuration
│   │   ├── tailwind.config.js                # Tailwind CSS configuration
│   │   ├── postcss.config.js                 # PostCSS configuration
│   │   ├── .stylelintrc.json                 # CSS linting rules
│   │   ├── .env                              # Environment variables
│   │   ├── .gitignore                        # Git exclusions
│   │   └── dist/                             # Built output (git-ignored)
│   │
│   ├── QUICKSTART.md                         # Quick start guide (NEW)
│   ├── README.md                             # Main documentation
│   ├── TECH_STACK.md                         # Architecture & tech details
│   ├── INTEGRATION_GUIDE.md                  # API reference
│   ├── PRESENTATION.md                       # Project presentation outline
│   └── PROJECT_STRUCTURE.md                  # This file (NEW)
│
└── (end)
```

---

## File Descriptions

### Backend Core (`app/`)

| File | Purpose |
|------|---------|
| `main.py` | FastAPI app, routes, middleware, error handlers |
| `config.py` | Pydantic Settings for all configuration |
| `database.py` | MongoDB connection & repository pattern |
| `security.py` | JWT creation/verification, password hashing |

### Backend Services (`app/services/`)

| File | Purpose |
|------|---------|
| `ai.py` | Speech-to-text, text-to-speech, LLM integration |
| `face.py` | Face embedding storage, similarity matching |
| `pdf_parser.py` | PDF exam parsing & question extraction |

### Frontend Contexts (`src/context/`)

| File | Purpose |
|------|---------|
| `AuthContext.tsx` | User auth state & JWT token management |
| `ExamContext.tsx` | Current exam session & answer data |
| `VoiceContext.tsx` | Voice state machine & command routing |

### Frontend Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useSpeech.ts` | Speech recognition wrapper |
| `useVoiceNavigation.ts` | Voice command handler |
| `useKiosk.ts` | Kiosk mode detection |
| `useAutoSpeak.ts` | Auto-narration on component change |
| `student/useFaceRecognition.ts` | Face auth workflow |
| `student/useExamSession.ts` | Exam state management |

### Frontend Pages (`src/pages/`)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `LandingPage.tsx` | Public landing page |
| `/student/login` | `FaceRecognitionLogin.tsx` | Student face login |
| `/student/exams` | `StudentPortal.tsx` | Student exam dashboard |
| `/admin-login` | `adminlogin.tsx` | Admin login |
| `/admin` | `AdminPortal.tsx` | Admin dashboard |
| `/student/exam/:examId/interface` | `ExamInterface.tsx` | Active exam interface |
| `/splash` | `SplashScreen.tsx` | Splash screen |
| `/student/login` | `FaceRecognitionLogin.tsx` | Face authentication |
| `/student/login-fallback` | `PasswordFallbackLogin.tsx` | Password fallback |

---

## Key Directories

### `app/` — Core Backend Logic
- FastAPI routes & middleware
- MongoDB repository & schemas
- AI/ML service integration
- Security & authentication

### `app/services/` — Pluggable Business Logic
- AI orchestration (STT, TTS, LLM)
- Face recognition pipeline
- PDF examination parsing

### `src/` — React Application
- UI components & pages
- Global state (contexts)
- Custom hooks
- API integration layer
- Static assets & models

### `public/models/` — ML Models
- `face-api.js` face detection models
- Pre-trained face recognition
- Face landmark detector

---

## File Sizes & Complexity

### Largest Backend Files
- `main.py` (~500 lines) — Route definitions
- `database.py` (~400 lines) — Repository & initialization
- `ai.py` (~300 lines) — AI service orchestration

### Largest Frontend Files
- `ExamInterface.tsx` (~800 lines) — Main exam page
- `useExamSession.ts` (~400 lines) — Session management
- `useFaceRecognition.ts` (~300 lines) — Face auth workflow

---

## Entry Points

### Backend
- **Startup**: `app/main.py`
- **Configuration**: `app/config.py`
- **Database**: `app/database.py`

### Frontend
- **Startup**: `src/main.tsx`
- **App Root**: `src/App.tsx`
- **Styles**: `src/index.css` + `tailwind.config.js`

---

## Configuration Files

| File | Purpose |
|------|---------|
| `.env` | Environment variables (dev) |
| `.env.example` | Environment template |
| `package.json` | npm scripts & dependencies |
| `tsconfig.json` | TypeScript compiler options |
| `vite.config.ts` | Vite build & dev server config |
| `tailwind.config.js` | Tailwind CSS theme & plugins |
| `requirements.txt` | Python dependencies |

---

## Ignored Directories

```
.venv/                  # Python virtual environment
node_modules/           # npm packages
dist/                   # Frontend build output
__pycache__/           # Python bytecode
.git/                   # Version control (internal)
```

---

## Dependencies

### Backend (`requirements.txt`)
- FastAPI — Web framework
- Uvicorn — ASGI server
- Pydantic — Data validation
- PyMongo — MongoDB driver
- PyJWT — JWT authentication
- bcrypt — Password hashing
- python-multipart — Form data parsing

### Frontend (`package.json`)
- React 18 — UI library
- Vite 6 — Build tool
- TypeScript — Type safety
- Tailwind CSS — Styling
- face-api.js — Face recognition
- framer-motion — Animations

---

## Total Project Statistics

| Metric | Count |
|--------|-------|
| Python files | 6 (core) + 1 (test) |
| React components | 20+ |
| Custom hooks | 15+ |
| Pages | 12+ |
| API endpoints | 40+ |
| Models (ML) | 3 |
| Documentation files | 5 |
