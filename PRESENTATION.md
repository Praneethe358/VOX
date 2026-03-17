# Vox — Project Presentation Guide

> **Voice-First, AI-Powered, Fully Hands-Free Examination Platform**
> Built by Team A

---

## Slide 1: Title & Tagline
**Vox**
*"100% Hands-Free Examination — From Face Login to Voice Submission"*
- AI-powered exam platform for students with motor disabilities
- Zero cloud dependency — runs entirely offline
- Dual deployment: Desktop kiosk app OR multi-machine lab server

---

## Slide 2: Problem Statement
### The Problem
- Students with **temporary fractures, permanent motor disabilities, or visual impairments** cannot type exam answers
- Traditional exam platforms require keyboard + mouse interaction
- Cloud-based AI solutions are **expensive** ($0.006/min STT + $0.03/1K tokens LLM) and **unreliable** without internet
- Existing proctoring tools lack **biometric authentication** and are easy to cheat
### Our Solution
- **Voice-first exam interface** — no keyboard, no mouse, no typing
- **Face recognition login** — no passwords to remember or type
- **13 voice commands** control the entire exam lifecycle
- **Offline AI stack** — Whisper STT + Llama 3 LLM + espeak-ng TTS
- **Kiosk lockdown** — prevents tab switching, DevTools, copy/paste

---

## Slide 3: Key Features at a Glance
| Feature | Description |
|---------|-------------|
| Face Login | Webcam → 128D embedding → cosine similarity ≥ 0.85 → JWT |
| 13 Voice Commands | "Start answering", "Next question", "Submit exam", etc. |
| Voice Dictation | Speak answers → Whisper STT → AI formatting → auto-save |
| AI Answer Formatting | Llama 3 fixes grammar/punctuation without changing meaning |
| Dual TTS | Web Speech API (client) + espeak-ng (server) — TTS never fails |
| Kiosk Lockdown | Fullscreen + blocked Alt+Tab/F12/Ctrl+W + no right-click/copy |
| Auto-Save | Every 15 seconds with revision history (max 20 revisions) |
| Offline-First | Zero cloud API calls — all AI runs locally |
| $0 Per Exam | No per-request costs for STT, TTS, or LLM |

---

## Slide 4: Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                   FRONTEND (React 18 + Vite 6 + TypeScript)         │
│                                                                     │
│   face-api.js ──── VoiceContext ──── ExamContext ──── AuthContext   │
│   (128D CNN)       (State Machine)   (Session Mgmt)   (JWT+Admin)  │
│                                                                     │
│   19 Components · 14 Pages · 14 Hooks · 4 Type Files               │
│   Tailwind CSS 3.4 · Framer Motion 12 · React Router 6             │
│                                                                     │
│   UnifiedApiClient — REST (fetch) + IPC bridge (Electron)          │
└───────────────────────────┬─────────────────────────────────────────┘
                            │ HTTP (5173 → 3000) or Electron IPC
┌───────────────────────────▼─────────────────────────────────────────┐
│                   BACKEND (Express 5 + Node.js + Electron 40)       │
│                                                                     │
│   9 Legacy Route Modules (/api/*)                                   │
│   7 Vox V1 Route Modules (/api/v1/*)                       │
│                                                                     │
│   Whisper STT · espeak-ng TTS · Ollama Llama 3 · MongoDB           │
│   JWT Auth · bcrypt · PDFKit · Multer · ffmpeg                      │
│   Electron IPC Bridge (13 channels) — kiosk lockdown               │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                 ┌──────────▼────────── ┐
                 │    MongoDB 7.x       │
                 │    DB: vox     │
                 │    6 Legacy + 8      │
                 │    Mongoose Schemas  │
                 └──────────────────────┘
```
---
## Slide 5: Tech Stack
### Frontend
| Technology | Version | Why We Chose It |
|-----------|---------|-----------------|
| React | 18.3.1 | Component-based UI, concurrent mode for smooth voice interaction |
| TypeScript | 5.7 | Type safety across 60+ files |
| Vite | 6.0 | 10-100x faster than Webpack, instant HMR |
| Tailwind CSS | 3.4 | Utility-first dark theme, ~10KB production CSS |
| Framer Motion | 12.4 | Smooth page transitions in multi-step exam flow |
| face-api.js | 0.22 | Browser-side face detection, no server round-trip |
| React Router | 6.30 | 16 routes with protected guards |
| Web Speech API | Native | Zero-latency client-side TTS |

### Backend
| Technology | Version | Why We Chose It |
|-----------|---------|-----------------|
| Node.js | Latest | JavaScript runtime |
| Express | 5.2.1 | Native async error handling for AI pipelines |
| Electron | 40.6 | Hardware-level kiosk lockdown |
| MongoDB Native | 7.1 | Document storage with 40+ query methods |
| Mongoose | 9.2.3 | Schema validation for 8 Vox models |
| bcrypt | 6.0 | Password hashing (cost factor 10-12) |
| JWT | 9.0.3 | Stateless auth, 8-hour expiry |
| Multer | 2.0 | Audio/file multipart uploads |

### AI Stack (All Local & Offline)
| Technology | Purpose | Key Detail |
|-----------|---------|------------|
| OpenAI Whisper (small) | Speech-to-Text | Hallucination filtering (no_speech_prob, avg_logprob, compression_ratio) |
| Ollama + Llama 3 | Answer Formatting | Temperature 0.2, 30s timeout, graceful fallback |
| espeak-ng | Server TTS | 150 WPM, en-us voice, WAV output |
| ffmpeg | Audio Conversion | WebM → 16kHz mono WAV for Whisper |
| face-api.js | Face Detection | TinyFaceDetector + 128D FaceRecognitionNet |
--- 

## Slide 6: Complete Student Journey (Demo Flow)

```
Step 1: FACE LOGIN
   Student opens app → Camera activates automatically
   → TTS: "Welcome. Please look at the camera."
   → Auto-captures face every 2 seconds
   → 128D embedding → backend cosine similarity ≥ 0.85
   → JWT issued → TTS: "Authentication successful"
   → Max 5 attempts, then LOCKED

Step 2: EXAM SELECTION
   → TTS: "You have 2 exams available. Exam 1: Introduction to AI..."
   → Student says: "Select exam 1"
   → Voice navigation routes to exam

Step 3: PRE-EXAM CHECKLIST
   → Auto-checks: Microphone ✓ Camera ✓ Internet ✓
     Fullscreen ✓ Speakers ✓ Storage ✓
   → TTS: "All checks passed. Say begin exam."

Step 4: EXAM BRIEFING
   → TTS reads: exam title, duration, question count, instructions
   → Student says: "Start exam"

Step 5: EXAM IN PROGRESS (13 Voice Commands)
   → TTS reads Question 1 aloud
   → "Start answering" → DICTATION MODE (continuous recording)
   → Student speaks answer naturally
   → "Stop dictating" → Whisper transcribes → Llama 3 formats
   → Side-by-side: raw speech vs AI-formatted answer
   → "Confirm answer" → saved, moves to next question
   → Auto-save every 15 seconds

Step 6: SUBMISSION
   → "Submit exam" → 20-second confirmation gate
   → TTS: "Are you sure? Say confirm submission."
   → "Confirm submission" → exam finalized
   → Submission confirmation page with voice summary
   → 30-second auto-redirect to exam list
```

---

## Slide 7: Voice Command System (4-Layer Architecture)

### Layer 1: VoiceContext — Global State Machine
```
IDLE → FACE_AUTH → EXAM_BRIEFING → COMMAND_MODE ⟷ DICTATION_MODE
                                  → PAUSE_MODE → ANSWER_REVIEW
                                  → SUBMISSION_GATE → FINALIZE
FACE_AUTH → LOCKED (after 5 failures)
```
- Manages TTS queue, raw/formatted transcripts, beep tones
- 14+ state transitions

### Layer 2: useVoiceEngine — 21+ Exam Commands
| Command | Action |
|---------|--------|
| "Start answering" | Enter dictation mode |
| "Stop dictating" | Process answer → review |
| "Next question" / "Previous" | Navigate questions |
| "Repeat question" | TTS re-reads question |
| "Read my answer" | TTS reads formatted answer |
| "Clear answer" | Prompt confirmation |
| "Confirm answer" | Save + next question |
| "Edit answer" | Re-enter dictation |
| "Continue dictation" | Append to answer |
| "Pause exam" / "Resume" | Freeze/unfreeze timer |
| "Submit exam" | Enter 20s submission gate |
| "Confirm submission" | Finalize exam |
| "Option 1-4" | MCQ selection |

**Matching:** Exact → Contains → Fuzzy (Levenshtein similarity ≥ 0.78)

### Layer 3: useVoiceNavigation — Page Navigation
- Regex-based: "go to dashboard", "select exam 2", "go back", "help"
- Works outside exam on all student pages

### Layer 4: useDictation — Answer Recording
- Continuous ~4-second audio chunks → Whisper STT
- 3-second silence auto-stop
- Accumulates transcript incrementally

---

## Slide 8: Face Recognition Pipeline

### Registration (Admin Side)
1. Admin opens Student Registration in Admin Portal
2. `LiveFaceRegistration` component activates webcam
3. face-api.js loads: TinyFaceDetector + FaceLandmark68Net + FaceRecognitionNet
4. Captures **5 frames** of 128D face embeddings
5. Rejects: no face, multiple faces, low quality
6. Backend **averages all 5 descriptors** → **L2-normalizes** → stores in MongoDB

### Login (Student Side)
1. Camera auto-opens at `/student/login`
2. Auto-captures embedding every 2 seconds
3. **Liveness detection**: tracks landmark movement across frames (rejects photos)
4. Sends to backend for verification:
   - **Primary:** Cosine similarity ≥ **0.85** → match
   - **Fallback:** Euclidean distance < **0.55** → match
5. **Rate limiting:** max 5 attempts per student per 15-minute window
6. On match → JWT → session → redirect to exams

### Why This Approach?
- Client-side detection (fast, no network) + Server-side verification (secure)
- L2 normalization ensures consistent similarity scores
- Dual metric (cosine + euclidean) reduces false negatives
- Photo attack prevention via liveness detection

---

## Slide 9: AI Pipeline Deep Dive

### Speech-to-Text (Whisper)
```
Browser MediaRecorder (WebM/Opus)
    → POST /api/ai/stt-answer (multipart)
    → ffmpeg converts to 16kHz mono WAV
    → Whisper CLI: --model small --output_format json
    → Hallucination filters:
        no_speech_prob > 0.5  → discard
        avg_logprob < -1.0    → discard
        compression_ratio > 2.4 → discard
    → Return { text, confidence }
```

### Answer Formatting (Llama 3)
```
Raw speech transcript
    → POST /api/ai/format-answer
    → Ollama at localhost:11434
    → Model: llama3:latest, temperature: 0.2
    → Prompt: "Fix grammar/punctuation. Don't alter meaning."
    → Timeout: 30 seconds
    → Fallback: return raw text unchanged
    → Return { formattedText }
```

### Text-to-Speech (Dual System)
```
Client-Side (Primary):
    Web Speech API → speechSynthesis
    Voice priority: Microsoft Zira → David → Google US English
    Serial queue with interrupt mode
    Beep system: command, dictation, error, success, warning

Server-Side (Fallback):
    POST /api/ai/tts-speak → espeak-ng
    Speed: 150 WPM, Voice: en-us, Pitch: 50
    Returns: audio/wav buffer
```

---

## Slide 10: Security Features

| Layer | Feature | Implementation |
|-------|---------|---------------|
| **Authentication** | Face recognition | 128D embeddings + cosine similarity ≥ 0.85 |
| **Authentication** | Password fallback | bcrypt hashed (cost 10), JWT 8h expiry |
| **Authentication** | Rate limiting | 5 face attempts / 15 min per student |
| **Anti-Spoofing** | Liveness detection | Landmark movement tracking across frames |
| **Anti-Spoofing** | Multi-face rejection | Only single-face frames accepted |
| **Anti-Cheating** | Kiosk fullscreen | Electron kiosk mode, no menu bar |
| **Anti-Cheating** | Keyboard blocking | Alt+Tab, F12, Ctrl+Shift+I, Ctrl+W, Escape |
| **Anti-Cheating** | UI blocking | Right-click, copy, paste, cut all disabled |
| **Anti-Cheating** | Tab prevention | Window open handler blocks all popups |
| **Audit** | Activity logging | Every action recorded with timestamp + metadata |
| **Audit** | Suspicious flags | Anomaly detection with flag reasons |
| **Session** | Route guards | JWT + sessionStorage checks on every navigation |
| **Data** | Context isolation | Electron: contextIsolation=true, nodeIntegration=false |

---

## Slide 11: Database Design

### Dual-Driver Architecture
- **MongoDB Native Driver 7.1** — 40+ methods for legacy routes (high performance)
- **Mongoose 9.2.3** — 8 schemas for Vox V1 (schema validation)

### Legacy Collections (Native Driver)
| Collection | Key Fields | Purpose |
|-----------|-----------|---------|
| admins | username, passwordHash | Admin auth |
| students | studentId, name, faceDescriptor[] | Student registry |
| exams | code, title, questions[], status | Exam definitions |
| face_embeddings | 128D facialEmbedding[], normalizedEmbedding[], qualityScore | Biometric data |
| responses | studentId, examCode, rawAnswer, formattedAnswer, confidence | Student answers |
| audit_logs | studentId, action, metadata, timestamp | Security trail |

### Mongoose Schemas (Vox V1)
| Model | Key Fields | Notable |
|-------|-----------|---------|
| Admin | email, passwordHash, role (super-admin/exam-admin), mfaEnabled | Role-based access |
| Student | registerNumber, fullName, faceEmbedding[] (max 2048D), languagePreference | Multilingual support |
| Exam | title, questions[] (1-300, mcq/short/long), durationMinutes (1-600) | PDF/JSON/CSV import |
| ExamSession | status (not-started/in-progress/submitted/terminated), suspiciousFlags[] (max 100) | Proctoring data |
| Answer | rawSpeechText (8000 chars), formattedAnswer (10000 chars), revisionHistory[] (max 20) | Full audit trail |
| ActivityLog | eventType, metadata, timestamp | Indexes on eventType+timestamp |
| AIConfiguration | Singleton — sttEngine, llmModel, autoSaveInterval, ttsSpeed | Global config |
| SystemLog | level (error/critical), message, source | Error monitoring |

---

## Slide 12: API Architecture

### 16 Route Modules — 38+ Endpoints

**Legacy Routes (9 modules, /api/\*):**
| Module | Endpoints | Key Operations |
|--------|-----------|----------------|
| auth | 2 | Password login, face-based login |
| face | 7 | Register, verify, verify-by-id, list students, CRUD embeddings |
| ai | 4 | STT command, STT answer, TTS speak, format answer |
| admin | 8 | Login, CRUD exams, upload PDF, publish/unpublish |
| student | 7 | List exams, verify face, start/end exam, submit answer |
| students | 2 | Dashboard stats, profile |
| results | 2 | All results, session result |
| exam-sessions | 3 | Start, autosave, submit |
| db | 3 | Save response, log audit, submit exam |

**Vox V1 Routes (7 modules, /api/v1/*, JWT-protected):**
| Module | Endpoints | Key Operations |
|--------|-----------|----------------|
| auth | 2 | Admin JWT login, create admin |
| students | 2 | Create student, update face embedding |
| exams | 2 | Create exam, get exam details |
| exam-sessions | 3 | Start, submit, get session+answers |
| answers | 1 | Autosave with revision history |
| activity-logs | 1 | Log activity event |
| config | 3 | Get/update AI config, create system log |

---

## Slide 13: Frontend Component Breakdown

### 19 UI Components

**6 Shared Components:**
| Component | Purpose |
|-----------|---------|
| ErrorBoundary | Catches React errors, logs to backend, retry/reload buttons |
| ProtectedRoute / StudentProtectedRoute | JWT + session route guards |
| MicWaveform | 14-bar animated microphone indicator |
| QuestionCard | Single question text display |
| StatusBadge | Color-coded status (offline/recording/idle) |
| Toast + ToastProvider | Notification system (success/error/info/warning, max 5, auto-dismiss) |

**13 Student Components:**
| Component | Purpose |
|-----------|---------|
| AnswerRecorder | Mic recording with timer + playback + save/clear |
| FormattedAnswerReview | Side-by-side raw vs AI-formatted answer |
| LiveFaceRegistration | 5-frame webcam face enrollment (admin portal) |
| LiveTranscript | Real-time speech: confirmed + interim text + word count |
| ModeIndicator | Voice mode label + 12-bar color waveform |
| QuestionDisplay | Question with marks, difficulty, flag, read-aloud button |
| StatusBar | Top bar: progress, timer, auto-save dot, state indicator |
| SubmissionGate | 20-second double-confirm modal with countdown bar |
| TimerDisplay | HH:MM:SS countdown (green → yellow → red, pulses when low) |
| VoiceCommandEngine | Command feedback toast + confidence bar + hints panel |
| VoiceListener | Compact mic indicator + mode label + waveform (top-right) |
| VoiceNavigationOverlay | Flash overlay: detected command + confidence (auto-hides 1s) |
| VoiceSpeaker | TTS feedback widget: waveform + current spoken text |

---

## Slide 14: Frontend Pages & Navigation

### 14 Page Components

**4 Public Pages:**
| Page | Route | Description |
|------|-------|-------------|
| LandingPage | `/` | Admin/Student choice cards with gradient hero |
| SplashScreen | `/splash` | Pulsing logo, 3 dots, auto-redirect after 2.8s |
| AdminLogin | `/admin-login` | Mountain SVG, V1 JWT + legacy fallback |
| AdminPortal | `/admin` | Dashboard, exam wizard, face enrollment, grading |

**10 Student Pages (Voice-Enabled):**
| Page | Route | Voice Feature |
|------|-------|---------------|
| FaceRecognitionLogin | `/student/login` | Auto-capture every 2s, TTS guidance, 5-attempt lockout |
| PasswordFallbackLogin | `/student/login-fallback` | TTS welcome, email/password form |
| ExamSelector | `/student/exams` | "Select exam N" voice command |
| PreExamChecklist | `/student/exam/:id/checklist` | 6 auto-checks, "Begin exam" voice start |
| ExamBriefing | `/student/exam/:id/briefing` | Full TTS briefing, "Start exam" command |
| ExamInterface | `/student/exam/:id/interface` | 13 voice commands, dictation, AI format |
| SubmissionConfirmation | `/student/submission-confirmation` | TTS summary, 30s auto-redirect |
| ResultsPage | `/student/results` | TTS reads top 3 results |
| SettingsPage | `/student/settings` | Language (en/hi/mr), speech rate |
| StudentDashboard | `/student/dashboard` | Welcome TTS, exam selection |

---

## Slide 15: Custom React Hooks (14 Total)

### 4 Root Hooks
| Hook | Purpose |
|------|---------|
| useAutoSpeak | Auto-TTS on mount/deps change with reSpeakNow() |
| useSpeech | Legacy backend-based STT/TTS via MediaRecorder |
| useVoiceNavigation | Regex voice nav for non-exam pages (13 patterns) |
| useKiosk | Bridge-based kiosk status check |

### 10 Student Hooks
| Hook | Purpose | Key Detail |
|------|---------|------------|
| useExamSession | Session state, Q navigation, answer management | Tracks progress via Sets |
| useExamTimer | Pause-aware countdown | Survives page refresh, 5-min warning |
| useFaceRecognition | 128D extraction + matching + liveness | Multi-face rejection |
| useVoiceCommand | Simple 1-6 command detection | Hindi/Marathi keyword support |
| useVoiceEngine | Core 21+ command processor | Levenshtein ≥ 0.78 fuzzy match |
| useDictation | Continuous STT (4s chunks → Whisper) | 3s silence auto-stop |
| useVoiceProcessing | TTS + STT integration wrapper | Speed mapping 0.5-2.0 → 80-300 WPM |
| useAutoSave | 20s interval auto-save | Manual trigger available |
| useKioskMode | Fullscreen + keyboard/UI blocking | Alt+Tab, F12, Ctrl+W blocked |
| useBackendHealth | 30s polling of /health endpoint | isOnline, checkNow() |

---

## Slide 16: Backend Services (6 Core)

| Service | Lines | Key Methods | What It Does |
|---------|-------|-------------|-------------|
| Face Service | 365+ | normalize(), cosineSimilarity(), euclideanDistance(), averageDescriptors(), registerFaceEmbedding(), verifyFace(), verifyFaceByStudentId() | Full biometric authentication pipeline with L2 normalization, dual-metric matching, rate limiting |
| Speech Service | 300+ | recognizeCommand(), transcribeAnswer(), checkBins() | Whisper STT with ffmpeg conversion, hallucination filtering, confidence scoring |
| TTS Service | ~100 | synthesizeToWav(), speak(), checkBinExists() | espeak-ng WAV synthesis (150 WPM, en-us, pitch 50) |
| Llama Service | ~80 | formatExamAnswer() | Ollama Llama 3 grammar correction (temp 0.2, 30s timeout) |
| PDF Service | 350+ | parsePDF(), extractQuestions() | Multi-format question extraction (MCQ + descriptive, 4 numbering styles) |
| Mongo Service | 800+ | 40+ CRUD methods | Full data access: exams, students, responses, audit, dashboard, results |

---

## Slide 17: Electron Desktop Mode

### IPC Bridge — 13 Secure Channels
| Channel | Purpose |
|---------|---------|
| admin-login | Admin authentication |
| upload-exam-pdf | PDF → question extraction |
| publish-exam | Activate draft exam |
| register-student-face | Face enrollment |
| verify-student-face | Face login verification |
| get-exam-by-code | Exam retrieval |
| stt-command | Voice command transcription |
| stt-answer | Answer dictation transcription |
| tts-speak | Text-to-speech audio |
| format-answer | AI answer formatting |
| save-response | Save student answer |
| log-audit | Record audit event |
| submit-exam | Finalize exam submission |

### Kiosk Security
- `kiosk: true`, `fullscreen: true`
- `contextIsolation: true`, `nodeIntegration: false`
- Hidden menu bar, blocked popups
- Preload script with `contextBridge` for secure API exposure

### Dual Deployment
- **Desktop mode** (`npm run dev`): Electron window + Express server + kiosk lockdown
- **Standalone mode** (`npm run server`): Express-only for multi-machine labs

---

## Slide 18: Exam Lifecycle Sequence

```
┌─────────┐     ┌──────────┐     ┌──────────┐
│  ADMIN   │     │ STUDENT  │     │ BACKEND  │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     │ Create Exam    │                │
     │ (PDF/JSON/CSV) │                │
     ├───────────────────────────────►│ Parse + Store
     │                │                │
     │ Enroll Face    │                │
     │ (5 webcam frames)              │
     ├───────────────────────────────►│ Average + L2 Normalize + Store
     │                │                │
     │ Publish Exam   │                │
     ├───────────────────────────────►│ status: "active"
     │                │                │
     │                │ Face Login     │
     │                ├───────────────►│ Cosine ≥ 0.85 → JWT
     │                │                │
     │                │ Select Exam    │
     │                │ (voice: "select exam 1")
     │                ├───────────────►│ GET /student/exams
     │                │                │
     │                │ Pre-Exam Check │
     │                │ (mic,cam,net,  │
     │                │  screen,audio, │
     │                │  storage)      │
     │                │                │
     │                │ Briefing       │
     │                │ (TTS reads     │
     │                │  all details)  │
     │                │                │
     │                │ "Start exam"   │
     │                ├───────────────►│ Start session
     │                │                │
     │                │ EXAM LOOP:     │
     │                │ TTS reads Q    │
     │                │ "Start answering" → Dictation
     │                │ "Stop dictating" → Whisper STT
     │                │                ├──► Llama 3 formats
     │                │ "Confirm answer" → Save
     │                │ "Next question"  │
     │                │ (auto-save 15s)  │
     │                │                │
     │                │ "Submit exam"  │
     │                │ (20s gate)     │
     │                │ "Confirm"      │
     │                ├───────────────►│ Finalize + store
     │                │                │
     │                │ Results page   │
     │                │ (TTS summary)  │
```

---

## Slide 19: Admin Portal Features

### Dashboard
- Total exams, active exams, total students, total submissions
- Recent activity feed with timestamps
- Backend health monitor (polling every 30s)

### Exam Management (3-Step Wizard)
1. **Step 1:** Exam name, code, duration, instructions
2. **Step 2:** Upload PDF/JSON/CSV **OR** manually add questions
   - PDF parser handles: "Q1. Text", "1) Text", "(1) Text"
   - MCQ options: "A) ...", "(A) ...", "*A)" (asterisk = correct answer)
   - Auto-detects MCQ vs descriptive
3. **Step 3:** Preview questions → Publish

### Student Face Enrollment
- LiveFaceRegistration component with live webcam
- 5-frame capture → averaged 128D embeddings
- Visual feedback: LOADING → DETECTING → CAPTURING → SUCCESS

### Submission Management
- View all submissions with student details
- Grading interface for descriptive answers
- Download student answer sheets

---

## Slide 20: State Management Architecture

### 3 React Context Providers

**AuthContext** (Admin Authentication)
```
State: isAuthenticated, admin { id, name, email, role }, token
Storage: localStorage (auth_token, admin_user)
Events: Listens for auth:expired (401 from API)
```

**ExamContext** (Student Exam Session)
```
State: exam, session, student, authState, activityLogs, navigationState
Dual-sync: V1 API + legacy API for backward compatibility
Navigation: currentIndex, visitedQuestions (Set), flaggedQuestions (Set),
            answeredQuestions (Set)
```

**VoiceContext** (Voice State Machine)
```
States: IDLE → FACE_AUTH → EXAM_BRIEFING → COMMAND_MODE ⟷ DICTATION_MODE
        → PAUSE_MODE → ANSWER_REVIEW → SUBMISSION_GATE → FINALIZE
TTS: Serial queue with interrupt, voice priority selection
Beeps: command (880Hz), dictation (660Hz), error (330Hz),
       success (1046Hz), warning (550Hz)
```

---

## Slide 21: Project File Structure

```
FINAL-VOX/
├── README.md                    ← Project overview
├── TECH_STACK.md                ← Detailed tech rationale
├── INTEGRATION_GUIDE.md         ← Full API reference
├── PRESENTATION.md              ← This file
│
├── Team-A-Frontend/             ← React 18 + Vite
│   └── src/
│       ├── api/                 3 files — Unified API client + IPC bridge
│       ├── components/          6 shared + 13 student = 19 components
│       ├── context/             3 providers (Auth, Exam, Voice)
│       ├── hooks/               4 root + 10 student = 14 hooks
│       ├── pages/               4 root + 10 student = 14 pages
│       ├── services/            1 re-export wrapper
│       ├── types/               4 type definition files
│       └── utils/               2 utility files
│
├── Team-A-Backend/Team-A-Backend/   ← Express 5 + Electron
│   └── src/
│       ├── bridge/              1 file — 13 IPC handlers
│       ├── database/            4 files + 6 model interfaces
│       ├── security/            3 files — kiosk, face-verify, lockdown
│       ├── server/              4 files + 9 route modules
│       ├── services/            6 services (AI, Face, Speech, TTS, LLM, PDF)
│       ├── utils/               2 placeholder utilities
│       └── voicesecure/         V1 subsystem (routes, models, services) [Legacy folder name]
│           ├── core/            5 files (middleware, DB, types, errors)
│           ├── models/          8 Mongoose schemas
│           └── routes/          8 route modules (index + 7 domain)
```

---

## Slide 22: Startup & Initialization Flow

### Backend Startup (`npm run server`)
```
1. Load environment variables (.env)
2. Connect MongoDB Native Driver (mongodb://127.0.0.1:27017)
3. Connect Mongoose (same URI, pool: 5–20 connections)
4. Initialize Vox defaults:
   → Create super-admin (admin@vox.edu) if not exists
   → Create AI config singleton (whisper, llama3.2, 15s autosave)
5. Seed database:
   → Create admin (admin/admin123) if empty
   → Create sample exam TECH101 if empty
6. Check binary availability:
   → Whisper: log path or ⚠ warning
   → ffmpeg: log path or ⚠ warning
   → espeak-ng: log path or ⚠ warning
7. Start Express on port 3000, bind 0.0.0.0
8. Log: "Server ready at http://localhost:3000"
```

### Frontend Startup (`npm run dev`)
```
1. Vite dev server starts on port 5173
2. React mounts App with ErrorBoundary wrapper
3. Context providers initialize: Auth → Toast → Exam → Voice
4. face-api.js models preloaded from /public/models/
5. Router renders initial route (/ → LandingPage)
```

---

## Slide 23: Why Offline-First?

### Zero Cloud Dependency
| Component | Cloud Alternative | Our Approach | Savings |
|-----------|------------------|--------------|---------|
| STT | OpenAI Whisper API ($0.006/min) | Local Whisper binary | $0/exam |
| LLM | GPT-4 ($0.03/1K tokens) | Local Ollama Llama 3 | $0/exam |
| TTS | Google Cloud TTS ($4/1M chars) | espeak-ng + Web Speech API | $0/exam |
| Face | AWS Rekognition ($1/1K images) | face-api.js in browser | $0/exam |

### Cost Comparison (100 students, 30-min exam)
| Item | Cloud Platform | Vox |
|------|---------------|-----------|
| STT (30 min × 100) | $180 | $0 |
| LLM (5 answers × 100) | $15 | $0 |
| TTS (all narration) | $4 | $0 |
| Face Recognition | $10 | $0 |
| **Total** | **$209/exam** | **$0** |

### Works in Computer Labs Without Internet
- Once binaries are installed locally, **no internet needed during exams**
- All AI processing happens on the exam machine
- Student data **never leaves** the local network

---

## Slide 24: Accessibility Features

| Feature | How It Works |
|---------|-------------|
| **100% Hands-Free** | Face login → voice navigation → voice dictation → voice submission |
| **Multilingual TTS** | English, Hindi, Marathi support |
| **Configurable Speech Rate** | 0.5× to 2.0× (mapped to 80–300 WPM) |
| **Audio Feedback** | 5 distinct beep tones for different actions |
| **Voice Welcome** | TTS greets student and guides through every step |
| **Question Read-Aloud** | TTS automatically reads each question |
| **Answer Read-Back** | "Read my answer" command plays formatted answer |
| **Visual Indicators** | MicWaveform, ModeIndicator, StatusBar, TimerDisplay |
| **Disability Types** | Supports: temporary fracture, permanent motor, visual, hearing |
| **Fallback Modes** | Password login if face fails, keyboard if voice fails |

---

## Slide 25: Testing & Demo Setup

### Quick Start (3 Commands)
```bash
# Terminal 1: Start MongoDB
mongod --dbpath ./data

# Terminal 2: Start Backend
cd Team-A-Backend/Team-A-Backend
npm install && npm run server

# Terminal 3: Start Frontend
cd Team-A-Frontend
npm install && npm run dev
```

### Demo Credentials
| Role | Credentials |
|------|------------|
| Admin (Legacy) | Username: `admin`, Password: `admin123` |
| Admin (V1 JWT) | Email: `admin@vox.edu`, Password: `ChangeMe@123` |

### Demo Walkthrough
1. Open `http://localhost:5173` → Landing Page
2. **Admin flow:** Login → Create exam → Upload PDF → Enroll student face → Publish
3. **Student flow:** Face login → Select exam → Checklist → Briefing → Voice exam → Submit
4. Show voice commands: "Start answering" → speak → "Stop dictating" → "Confirm answer"
5. Show AI formatting: raw speech vs formatted answer side-by-side
6. Show security: try Alt+Tab, right-click, Ctrl+Shift+I — all blocked

### URLs for Demo
| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend Health | http://localhost:3000/health |
| API Base | http://localhost:3000/api |
| Vox V1 | http://localhost:3000/api/v1 |

---

## Slide 26: Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Whisper hallucinations ("thank you", "subscribe") | Triple filter: no_speech_prob, avg_logprob, compression_ratio + client-side phantom phrase list |
| False-positive face matches | Strict threshold (≥ 0.85 cosine), L2 normalization, multi-frame averaging |
| Voice commands during TTS playback | VoiceContext pauses STT recognition while TTS is speaking |
| Browser differences for Web Speech API | Fallback to backend Whisper STT when browser API unavailable |
| TTS voice quality varies by browser | Priority selection (Zira → David → Google) + server espeak-ng fallback |
| Page refresh losing exam state | Timer persisted via timestamp math (startedAt + totalPausedMs) |
| Auto-save conflicts | Dual-sync to V1 + legacy APIs, best-effort non-blocking |
| Exam answer size limits | rawSpeechText: 8000 chars, formattedAnswer: 10000 chars, revisionHistory: 20 max |

---

## Slide 27: Future Enhancements

| Enhancement | Description |
|------------|-------------|
| Proctoring Video Recording | Record exam session video for later review |
| AI-Powered Grading | Auto-grade descriptive answers using LLM |
| Multi-Language Whisper | Support Hindi/Marathi STT (Whisper supports 99 languages) |
| Real-Time Monitoring | Admin live dashboard showing all active exam sessions |
| PDF Report Generation | Auto-generate student answer PDFs (PDFKit already integrated) |
| WebSocket Notifications | Socket.IO already in package.json for real-time alerts |
| MFA for Admins | TOTP via speakeasy (already in dependencies) |
| QR Code Exam Entry | qrcode package already in dependencies |

---

## Slide 28: Summary Stats

| Metric | Count |
|--------|-------|
| Total Source Files | 80+ |
| Frontend Components | 19 |
| Frontend Pages | 14 |
| Custom React Hooks | 14 |
| Backend Route Modules | 16 (9 legacy + 7 V1) |
| API Endpoints | 38+ |
| Mongoose Schemas | 8 |
| Legacy DB Interfaces | 6 |
| IPC Channels | 13 |
| Voice Commands | 21+ (13 exam + 8 navigation) |
| Context Providers | 3 |
| Backend Services | 6 |
| MongoService Methods | 40+ |
| UnifiedApiClient Methods | 80+ |
| Voice State Transitions | 14+ |
| Supported Languages | 3 (English, Hindi, Marathi) |
| External AI Binaries | 4 (Whisper, ffmpeg, espeak-ng, Ollama) |
| Cloud API Cost | $0 |
---
## Slide 29: Thank You
**Vox — Making Exams Accessible for Everyone**
- GitHub Repository: *[your-repo-url]*
- Built with: React 18 · Express 5 · MongoDB · Whisper · Llama 3 · face-api.js · Electron
- Team A

*"Every student deserves to be evaluated by their knowledge, not by their ability to type."*

---

*End of Presentation Guide*
