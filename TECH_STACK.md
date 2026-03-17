# Vox — Tech Stack & Components

> **Vox** is a voice-first, AI-powered exam platform that enables completely hands-free examination for students — from face-recognition login to voice-dictated answers and spoken submission confirmation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Frontend Stack](#frontend-stack)
- [Backend Stack](#backend-stack)
- [AI / ML Pipeline](#ai--ml-pipeline)
- [Voice Command System](#voice-command-system)
- [Security Layer](#security-layer)
- [Database](#database)
- [DevOps & Build Tools](#devops--build-tools)
- [Complete Exam Flow](#complete-exam-flow)
- [Component Inventory](#component-inventory)
- [Why This Stack?](#why-this-stack)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React 18 + Vite 6)                     │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ face-api.js│  │ VoiceContext  │  │ ExamContext   │  │ AuthContext  │ │
│  │ (128D CNN) │  │ State Machine │  │ Session Mgmt  │  │ JWT + Admin │ │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│        │                │                  │                  │         │
│  ┌─────┴────────────────┴──────────────────┴──────────────────┘       │ │
│  │   13 Student Components · 10 Student Pages · 10 Student Hooks      │ │
│  │   Toast System · ErrorBoundary · ProtectedRoute · MicWaveform      │ │
│  └────────────────────────────┬────────────────────────────────────────┘ │
│                               │                                         │
│  ┌────────────────────────────▼────────────────────────────────────────┐ │
│  │  UnifiedApiClient — REST (fetch) + IPC bridge (Electron)           │ │
│  │  Endpoints: /api/* (legacy) + /api/v1/* (Vox V1 JWT)          │ │
│  └────────────────────────────┬────────────────────────────────────────┘ │
│                               │   Tailwind CSS 3.4 · Framer Motion 12  │
└───────────────────────────────┼─────────────────────────────────────────┘
                                │ HTTP (port 5173 → 3000) or Electron IPC
┌───────────────────────────────▼─────────────────────────────────────────┐
│                    BACKEND (Express 5 + Node.js + Electron 40)          │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  9 Legacy Route Modules (/api/*)                                │   │
│  │  auth · face · ai · admin · student · students ·                │   │
│  │  results · exam-sessions · db                                   │   │
│  ├──────────────────────────────────────────────────────────────────┤   │
│  │  7 Vox V1 Route Modules (/api/v1/*)                    │   │
│  │  auth · students · exams · exam-sessions · answers ·            │   │
│  │  activity-logs · config                                         │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │ Whisper   │  │ espeak-ng │  │ Ollama   │  │ MongoDB Native     │   │
│  │ (STT)     │  │ (TTS)     │  │ Llama 3  │  │ Driver + Mongoose  │   │
│  └───────────┘  └───────────┘  └──────────┘  └────────────────────┘   │
│  ┌───────────┐  ┌───────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │ JWT Auth  │  │ bcrypt    │  │ PDFKit   │  │ Multer (uploads)   │   │
│  │ + Roles   │  │ (hashing) │  │ pdf-parse│  │ ffmpeg (audio)     │   │
│  └───────────┘  └───────────┘  └──────────┘  └────────────────────┘   │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  Electron IPC Bridge (13 channels) — kiosk lockdown optional    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                     ┌──────────▼──────────┐
                     │   MongoDB 7.x       │
                     │   DB: vox      │
                     │   Port: 27017        │
                     │                      │
                     │  Legacy collections  │
                     │  + 8 Mongoose schemas│
                     └─────────────────────┘
```

---

## Frontend Stack

### React 18.3 + TypeScript

| Item | Details |
|------|---------|
| **Library** | React 18.3.1 with TypeScript 5.7 |
| **Routing** | React Router DOM v6.30 — 16 routes (5 public, 1 admin, 7 student, 3 legacy redirects) |
| **State Management** | React Context API — `AuthContext` (admin JWT) + `ExamContext` (exam/session/answers/navigation) + `VoiceContext` (voice state machine + TTS queue) |
| **Components** | 6 shared + 13 student-specific = 19 total components |
| **Pages** | 4 root + 10 student = 14 page components |
| **Hooks** | 4 root + 10 student = 14 custom hooks |
| **Type Definitions** | 4 type files (exam, student, voice, activity) |

**Why React?**
- Component-based architecture is ideal for our modular exam UI (question cards, answer recorders, status badges)
- React 18's concurrent features allow smooth voice interaction without UI jank
- Huge ecosystem with TypeScript support for type-safe development
- React Context provides lightweight global state management without Redux overhead

---

### Vite 6.0 (Build Tool)

| Item | Details |
|------|---------|
| **Dev Server** | Lightning-fast HMR with native ES modules |
| **Build** | Rollup-based production bundling |
| **Plugin** | `@vitejs/plugin-react` for JSX/Fast Refresh |
| **Path Alias** | `@/` maps to `./src` for clean imports |

**Why Vite over Webpack?**
- **10-100× faster** cold starts than CRA/Webpack (native ESM, no bundling during dev)
- Instant Hot Module Replacement — critical during voice-feature development when rapid iteration is needed
- Zero-config TypeScript support out of the box
- Smaller production bundles with Rollup tree-shaking

---

### Tailwind CSS 3.4

| Item | Details |
|------|---------|
| **Styling** | Utility-first CSS with custom dark theme |
| **Theme** | Custom `surface` colors (dark blues/slate-950), `accent` colors (indigo with glow: `rgba(99, 102, 241, 0.15)`) |
| **Fonts** | Inter + system-ui (UI), JetBrains Mono + Fira Code (monospace) |
| **Animations** | Custom keyframes: `fade-in` (0.5s), `slide-up` (0.5s), `scale-in` (0.3s) |
| **Border Radius** | Extended: `2xl: 1rem`, `3xl: 1.5rem` |
| **PostCSS** | Autoprefixer for cross-browser support |

**Why Tailwind?**
- Utility-first approach means **zero CSS context switching** — styles live right in JSX
- Custom dark theme with glassmorphism effects creates a modern exam UI
- Purging unused CSS results in **tiny production bundle (~10KB)**
- Responsive design utilities make the exam interface work on lab PCs and laptops alike

---

### Framer Motion 12.4

| Item | Details |
|------|---------|
| **Usage** | Page transitions, component animations, loading states, gesture support |
| **Features** | `AnimatePresence` for exit animations, `whileHover`/`whileTap` gestures |

**Why Framer Motion?**
- Declarative animation API integrates naturally with React's component model
- `AnimatePresence` enables smooth page transitions in our multi-step exam flow
- Hardware-accelerated animations keep voice interaction UI responsive
- Micro-interactions (button presses, status changes) improve the hands-free UX by providing visual confirmation of voice commands

---

### face-api.js 0.22 (Client-Side Face Recognition)

| Item | Details |
|------|---------|
| **Models** | TinyFaceDetector + FaceLandmark68Net + FaceRecognitionNet |
| **Output** | 128-dimensional face embedding vector |
| **Model Loading** | Lazy-loaded once, cached via singleton pattern (`loadFaceApiModels()`) |
| **Model Files** | Served from `public/models/` — 7 files (shard weights + manifests) |
| **Liveness** | Landmark movement tracking across frames to detect photos |
| **Multi-Face** | Only single-face frames accepted; multiple faces = rejected |

**Why face-api.js?**
- Runs **entirely in the browser** — no server round-trip for face detection (only verification is server-side)
- TinyFaceDetector is optimized for **real-time webcam processing** (< 50ms per frame)
- 128D embeddings provide state-of-the-art face discrimination with compact storage
- Works without GPU — uses TensorFlow.js (WebGL backend) for hardware acceleration where available

---

## Backend Stack

### Node.js + Express 5.2

| Item | Details |
|------|---------|
| **Runtime** | Node.js with TypeScript 5.7 |
| **Framework** | Express v5.2.1 (latest major release) |
| **API Pattern** | RESTful with 16 route modules (9 legacy + 7 Vox V1) |
| **File Uploads** | Multer v2 for audio/image multipart handling |
| **CORS** | All origins in dev (configurable via `FRONTEND_URL`) |
| **Body Limit** | 50MB (for audio/file uploads) |
| **Bind** | `0.0.0.0` (accessible from any machine on the network) |

**Legacy Route Modules (9):**
| Route | Purpose |
|-------|---------|
| `/api/auth/*` | JWT login (password + face recognition) |
| `/api/face/*` | Face embedding CRUD + verification (7 endpoints) |
| `/api/ai/*` | STT, TTS, LLM formatting (4 endpoints) |
| `/api/admin/*` | Admin login, exam CRUD, PDF upload (5 endpoints) |
| `/api/student/*` | Exam lifecycle — list, verify-face, start, answer, end (7 endpoints) |
| `/api/students/*` | Dashboard stats + profile (2 endpoints) |
| `/api/results/*` | Results retrieval (2 endpoints) |
| `/api/exam-sessions/*` | Session start, autosave, submit (3 endpoints) |
| `/api/db/*` | Direct DB ops — save response, log audit, submit (3 endpoints) |

**Vox V1 Route Modules (7, JWT-protected):**
| Route | Purpose |
|-------|---------|
| `/api/v1/auth/*` | Admin JWT login + admin creation (2 endpoints) |
| `/api/v1/students/*` | Student creation + face embedding update (2 endpoints) |
| `/api/v1/exams/*` | Exam creation + retrieval (2 endpoints) |
| `/api/v1/exam-sessions/*` | Session lifecycle (3 endpoints) |
| `/api/v1/answers/*` | Answer autosave with revision history (1 endpoint) |
| `/api/v1/activity-logs/*` | Activity event logging (1 endpoint) |
| `/api/v1/config/*` | AI configuration + system logs (3 endpoints) |

**Why Express?**
- Industry standard with the **largest middleware ecosystem** in Node.js
- Express 5 brings native async error handling — crucial for our Whisper/LLM pipelines that involve child processes
- Minimal overhead for our REST API pattern
- Seamless integration with Multer for audio blob uploads from voice dictation

---

### Electron 40.6 (Desktop Kiosk Mode)

| Item | Details |
|------|---------|
| **Mode** | Kiosk mode (`kiosk: true, fullscreen: true`) |
| **Security** | `contextIsolation: true`, `nodeIntegration: false` |
| **IPC Bridge** | Preload script with `contextBridge` — 13 channels (adminLogin, uploadExamPDF, publishExam, registerStudentFace, verifyStudentFace, getExamByCode, sttCommand, sttAnswer, ttsSpeak, formatAnswer, saveResponse, logAudit, submitExam) |
| **Window Control** | Blocked popups, hidden menu bar, prevented new windows |
| **Dual API** | Renderer gets both `window.examAPI` (IPC) and `window.examHTTP` (fetch) |

**Why Electron?**
- Enables **hardware-level kiosk lockdown** that web browsers alone cannot achieve
- Prevents students from switching tabs, opening Task Manager, or accessing OS during exams
- IPC bridge allows secure access to system resources (Whisper, espeak-ng, filesystem) from the renderer
- Same codebase runs in standalone mode (`npm run server` — Express-only, no Electron) for multi-machine lab deployments

---

### Backend Services (6 Core Services)

| Service | Key Methods | Purpose |
|---------|-------------|---------|
| **Face Service** (365+ lines) | `normalize()`, `cosineSimilarity()`, `euclideanDistance()`, `averageDescriptors()`, `registerFaceEmbedding()`, `verifyFace()`, `verifyFaceByStudentId()`, `getRegisteredStudents()`, `getFaceEmbedding()`, `deleteFaceEmbedding()`, `getLoginAttempts()` | Biometric face authentication pipeline |
| **Speech Service** (300+ lines) | `ensureFfmpegOnPath()`, `transcribeWithWhisper()`, `recognizeCommand()`, `transcribeAnswer()`, `checkBins()` | Whisper STT with hallucination filtering |
| **TTS Service** | `checkBinExists()`, `speak()`, `synthesizeToWav()` | espeak-ng text-to-speech (speed: 150wpm, voice: en-us, pitch: 50) |
| **Llama Service** | `formatExamAnswer()` | Ollama Llama 3 grammar correction (temp: 0.2, timeout: 30s) |
| **PDF Service** (350+ lines) | `parsePDF()`, `extractQuestions()` | Multi-format question extraction (MCQ + descriptive, multiple numbering styles) |
| **Mongo Service** | 40+ methods | Full CRUD for exams, students, responses, submissions, audit logs, face embeddings, dashboard stats |

---

## AI / ML Pipeline

### OpenAI Whisper (Speech-to-Text)

| Item | Details |
|------|---------|
| **Model** | `whisper small` (local, offline) |
| **Binary** | OpenAI Whisper CLI installed via pip |
| **Audio Pipeline** | Browser WebM → ffmpeg (16kHz mono WAV) → Whisper → JSON output |
| **Hallucination Filtering** | Server-side: `no_speech_prob > 0.5`, `avg_logprob < -1.0`, `compression_ratio > 2.4`; Client-side: phantom phrase list ("thank you", "subscribe", etc.) |
| **Confidence Scoring** | Based on `no_speech_prob` and `avg_logprob` per segment |
| **Whisper CLI Flags** | `--no_speech_threshold 0.5`, `--condition_on_previous_text False` |

**Two STT Modes:**
1. **Command STT** (`/api/ai/stt-command`) — Short commands like "begin exam", "next question"
2. **Answer STT** (`/api/ai/stt-answer`) — Long-form dictated answers with stricter filtering

**Why Whisper?**
- **Runs 100% offline** — no cloud API calls, no internet dependency, no per-request costs
- State-of-the-art accuracy for English speech recognition
- Handles diverse accents and speaking styles (critical for student populations)
- `small` model balances accuracy vs. latency on CPU-only machines
- JSON output with per-segment confidence enables intelligent hallucination filtering

---

### Ollama + Llama 3 (Answer Formatting)

| Item | Details |
|------|---------|
| **Runtime** | Ollama (local LLM server) at `localhost:11434` |
| **Model** | `llama3:latest` (configurable via `OLLAMA_MODEL` env var) |
| **Purpose** | Clean up raw speech transcripts — fix grammar/punctuation without altering content |
| **Temperature** | `0.2` (deterministic, minimal creativity) |
| **Timeout** | 30 seconds |
| **Fallback** | Returns raw text if LLM is unavailable |
| **AI Config Default** | `llama3.2` in AIConfiguration model (global singleton) |

**Why Local Llama over Cloud GPT?**
- **Zero latency dependency** on external services — exam continues even without internet
- **No per-token costs** — unlimited formatting requests across all student sessions
- **Data privacy** — student answers never leave the exam machine
- Low temperature ensures the LLM only cleans formatting, never changes meaning
- Graceful degradation — if Ollama is down, raw speech text is preserved as-is

---

### espeak-ng (Server-Side TTS)

| Item | Details |
|------|---------|
| **Binary** | Local `espeak-ng.exe` installation |
| **Output** | WAV audio buffer returned to client |
| **Config** | Speed: 150 WPM, Voice: en-us, Pitch: 50 (all configurable) |

### Web Speech API (Client-Side TTS)

| Item | Details |
|------|---------|
| **API** | `window.speechSynthesis` (`SpeechSynthesisUtterance`) |
| **Voice Selection** | Priority: Microsoft Zira → Microsoft David → Google US English → any English |
| **Features** | Serial queue with interrupt mode, rate/pitch/lang control |
| **Beep System** | Web AudioContext oscillator tones — 5 types: command, dictation, error, success, warning |
| **Languages** | English (en), Hindi (hi), Marathi (mr) |

**Why Dual TTS?**
- **Web Speech API** for instant, zero-latency UI narration (questions, instructions, confirmations)
- **espeak-ng** as a server-side backend and for WAV audio generation (predictable, offline)
- Dual system ensures TTS **never fails** regardless of browser support

---

## Voice Command System

### Four-Layer Voice Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Layer 1: VoiceContext (Global State Machine)                    │
│  States: IDLE → FACE_AUTH → EXAM_BRIEFING →                      │
│          COMMAND_MODE ⟷ DICTATION_MODE →                         │
│          PAUSE_MODE → ANSWER_REVIEW →                            │
│          SUBMISSION_GATE → FINALIZE                              │
│  Also: FACE_AUTH → LOCKED (after 5 failed attempts)             │
│  Manages: TTS queue, raw transcript, formatted answer, beeps    │
├──────────────────────────────────────────────────────────────────┤
│  Layer 2: useVoiceEngine (Exam Commands — 21+ actions)          │
│  Actions: start_answering, stop_dictating, repeat_question,     │
│    next_question, previous_question, read_my_answer,            │
│    clear_answer, confirm_clear, confirm_answer, edit_answer,    │
│    continue_dictation, pause_exam, resume_exam, submit_exam,    │
│    confirm_submission, im_ready, start_exam, option_1-4         │
│  Matching: Exact → Contains → Fuzzy (Levenshtein ≥ 0.78)       │
├──────────────────────────────────────────────────────────────────┤
│  Layer 3: useVoiceNavigation (Non-Exam Page Navigation)         │
│  Regex-based pattern matching for non-exam pages                 │
│  Commands: dashboard, exams, results, settings,                  │
│            select exam N, go back, logout, help                  │
│  STT: Web Speech API (continuous=false, auto-restart pattern)   │
│  Fallback: Backend Whisper STT when Web Speech API fails        │
├──────────────────────────────────────────────────────────────────┤
│  Layer 4: useDictation (Answer Recording)                       │
│  Continuous speech-to-text during answer dictation               │
│  Records ~4s audio chunks → sends to Whisper /api/ai/stt-answer │
│  3-second silence timeout → auto-stop dictation                  │
│  Callback: onDictationEnd(finalTranscript)                      │
└──────────────────────────────────────────────────────────────────┘
```

### 13 In-Exam Voice Commands

| # | Command | Action |
|---|---------|--------|
| 1 | "Start answering" | Enter DICTATION_MODE |
| 2 | "Stop dictating" | Process answer → ANSWER_REVIEW |
| 3 | "Repeat question" | Re-read current question via TTS |
| 4 | "Next question" / "Previous question" | Navigate between questions |
| 5 | "Read my answer" | TTS reads formatted answer aloud |
| 6 | "Clear answer" | Prompt confirmation |
| 7 | "Confirm answer" | Save answer, move to next question |
| 8 | "Edit answer" | Re-enter DICTATION_MODE |
| 9 | "Continue dictation" | Append to existing answer |
| 10 | "Pause exam" | Freeze timer |
| 11 | "Resume exam" | Resume timer |
| 12 | "Submit exam" | Enter 20-second SUBMISSION_GATE |
| 13 | "Confirm submission" | Finalize exam |

**MCQ Support:** "Option 1" through "Option 4" for multiple-choice questions.

**Why Custom Voice Engine over Third-Party Libraries?**
- Complete control over the command recognition pipeline (exact → contains → fuzzy)
- Built-in hallucination filtering tuned for exam context
- State machine prevents command interference (e.g., "next" during dictation mode doesn't skip the question)
- Dual STT path (browser Web Speech API + backend Whisper) ensures 100% device compatibility

---

## Security Layer

| Feature | Technology | Details |
|---------|-----------|---------|
| **Authentication** | JWT (jsonwebtoken) | 8-hour token expiry, role-based (`super-admin`, `exam-admin`) |
| **Password Hashing** | bcrypt v6 | Cost factor 10, salted hashes |
| **Face Verification** | Cosine similarity | Primary: threshold ≥ 0.85; Fallback: Euclidean distance < 0.55 |
| **Embedding Normalization** | L2 normalization | Applied before all similarity comparisons |
| **Rate Limiting** | Custom per-student | 5 face login attempts per 15-minute window |
| **Liveness Detection** | Landmark movement tracking | Checks face position movement across frames to detect photos |
| **Multi-Face Rejection** | face-api.js | Only single-face frames accepted; multiple faces = rejected |
| **Kiosk Lockdown** | Electron + browser hooks | Fullscreen, no menu bar, blocked popups, no tab switching |
| **Keyboard Blocking** | `useKioskMode` hook | Alt+Tab, F12, Ctrl+Shift+I/C, Ctrl+W, Escape — all blocked |
| **Copy/Paste/Right-Click** | `useKioskMode` hook | Disabled during exam |
| **Context Isolation** | Electron | `contextIsolation: true`, `nodeIntegration: false` |
| **Audit Logging** | MongoDB | Every student action with timestamp, metadata, suspicious flags |
| **Activity Tracking** | ActivityLog model | Navigation history, anomaly detection, environment data |
| **Session Protection** | Route guards | `StudentProtectedRoute` checks JWT + sessionStorage auth |

**Why This Security Model?**
- **Face recognition login** eliminates password sharing between students
- **Client-side detection + server-side verification** splits the compute (browser detects, server matches)
- **Liveness detection** prevents holding up a photo to the camera
- **Kiosk mode** prevents accessing external resources during the exam
- JWT is stateless — no server-side session storage needed

---

## Database

### MongoDB 7.x (Dual Driver Architecture)

| Item | Details |
|------|---------|
| **Primary Driver** | MongoDB Native Driver v7.1 (`mongodb` package) — used by legacy routes |
| **Secondary ORM** | Mongoose v9.2.3 — 8 schemas for Vox V1 subsystem |
| **Connection (Native)** | `mongodb://127.0.0.1:27017` via `MONGODB_URI` |
| **Connection (Mongoose)** | Atlas-compatible, pool: min 5, max 20, selection timeout 10s, socket timeout 45s |
| **Database** | `vox` |

### Legacy Collections (Native Driver)

| Collection | Key Fields | Purpose |
|-----------|-----------|---------|
| **admins** | `username`, `passwordHash` | Admin portal authentication |
| **students** | `studentId`, `name`, `examCode`, `faceDescriptor[]` | Student registry |
| **exams** | `code`, `title`, `questions[]` (MCQ options + correct answer), `durationMinutes`, `status` | Exam definitions |
| **face_embeddings** | `studentId`, `studentName`, `examCode`, 128D `facialEmbedding[]`, `normalizedEmbedding[]`, `qualityScore`, `frameCount`, `timestamps` | Face biometric data |
| **responses** | `studentId`, `examCode`, `questionId`, `rawAnswer`, `formattedAnswer`, `confidence`, `timestamp` | Student answers |
| **audit_logs** | `studentId`, `examCode`, `action`, `metadata`, `timestamp` | Security audit trail |

### Vox Mongoose Models (8 Schemas)

| Model | Key Fields | Indexes |
|-------|-----------|---------|
| **Admin** | `name`, `email` (unique), `passwordHash`, `role` (`super-admin`/`exam-admin`), `mfaEnabled` | email |
| **Student** | `registerNumber` (unique), `fullName`, `email` (unique), `department`, `year` (1-8), `faceEmbedding[]` (max 2048D), `languagePreference`, `faceAuthEnabled`, `isActive` | registerNumber, email, (department+year) |
| **Exam** | `title`, `subject`, `durationMinutes` (1-600), `totalMarks` (1-1000), `instructions`, `language`, `questions[]` (1-300, type: mcq/short/long, marks: 0.5-100), `pdfURL`, `scheduledDate`, `createdBy` (→ Admin), `isActive` | (subject+scheduledDate), (isActive+scheduledDate) |
| **ExamSession** | `studentId` (→ Student), `examId` (→ Exam), `status` (not-started/in-progress/submitted/terminated), `currentQuestionNumber`, `faceAuthConfidence`, `kioskVerified`, `suspiciousFlags[]` (max 100), `autoSaveCount`, `finalPdfURL`, `isLocked` | (studentId+examId+status), (status+createdAt) |
| **Answer** | `examSessionId` (→ ExamSession), `questionNumber`, `rawSpeechText` (max 8000 chars), `formattedAnswer` (max 10000 chars), `wordCount` (0-5000), `revisionHistory[]` (max 20 revisions) | (examSessionId+questionNumber) [unique] |
| **ActivityLog** | `examSessionId`, `eventType`, `metadata`, `timestamp` | (eventType+timestamp) |
| **AIConfiguration** | Singleton (`singletonKey: "global"`), `sttEngine` (vosk/whisper), `llmModel` (default: `llama3.2`), `grammarCorrection`, `autoSaveInterval` (5-300s, default: 15), `multilingualMode`, `ttsSpeed` (0.5-2.5x), `updatedBy` (→ Admin) | singletonKey |
| **SystemLog** | `level` (error/critical), `message`, `source`, `examSessionId`, `timestamp` | level, (level+timestamp) |

**Why MongoDB?**
- **Flexible schema** — exam questions have varying structures (MCQ with options vs. descriptive vs. short)
- **128D face embedding arrays** are natively stored as BSON arrays — no serialization needed
- **Document model** maps naturally to our API responses (no ORM translation layer)
- Horizontal scaling supports growing student populations
- Dual driver approach: Native driver for maximum performance on legacy routes, Mongoose for schema validation on Vox models

---

## DevOps & Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **TypeScript** | 5.7 | Type safety across frontend and backend |
| **Vite** | 6.0 | Frontend dev server + production build (Rollup-based) |
| **tsc** | 5.7 | Backend compilation (`tsc -p tsconfig.json → dist/`) |
| **PostCSS** | 8.5 | CSS processing pipeline (Tailwind + Autoprefixer) |
| **Multer** | 2.0 | Multipart file upload handling (audio blobs, PDFs, images) |
| **ffmpeg** | System | Audio format conversion (WebM → 16kHz WAV for Whisper) |
| **PDFKit** | 0.17 | Server-side PDF report generation |
| **pdf-parse** | 2.4.5 | PDF question extraction |
| **csv-parser** | 3.2.0 | CSV exam file parsing |

### Startup Flow

**`npm run server` (Standalone Express — no Electron):**
1. Connect MongoDB native driver
2. Connect Mongoose (Atlas/local)
3. Initialize Vox defaults (super-admin + AI config)
4. Seed database (default admin + sample exam TECH101)
5. Check STT/TTS binaries (Whisper, ffmpeg, espeak-ng) — log warnings if missing
6. Start Express on port 3000, bind 0.0.0.0

**`npm run dev` (Electron + Express):**
1. Steps 1-6 above
2. Create Electron BrowserWindow (kiosk mode, fullscreen)
3. Load frontend from Vite dev server or dist
4. Register 13 IPC handlers

**Graceful Shutdown:**
- Disconnect Mongoose → MongoDB native driver
- Close HTTP server
- Handle SIGINT/SIGTERM

---

## Complete Exam Flow

```
Student                          Frontend                         Backend
  │                                │                                │
  │  1. Opens app                  │                                │
  │ ──────────────────────────────►│  Landing Page (/)               │
  │                                │  TTS: "Welcome"                │
  │                                │                                │
  │  2. Face appears on webcam     │                                │
  │ ──────────────────────────────►│  face-api.js extracts 128D     │
  │                                │  embedding (auto every 2s)     │
  │                                │ ──────────────────────────────►│
  │                                │  POST /api/face/verify         │
  │                                │  or /api/face/verify-by-id     │
  │                                │                                │  L2 normalize
  │                                │                                │  Cosine similarity
  │                                │                                │  ≥ 0.85 = match
  │                                │◄────────────────────────────── │  JWT token issued
  │                                │  TTS: "Authenticated"          │
  │                                │                                │
  │  3. "Select exam 1" (voice)   │                                │
  │ ──────────────────────────────►│  useVoiceNavigation            │
  │                                │  regex matches → navigates     │
  │                                │ ──────────────────────────────►│
  │                                │  GET /api/student/exams        │
  │                                │                                │
  │  4. System checks auto-run    │  PreExamChecklist               │
  │                                │  Mic ✓ Camera ✓ Internet ✓    │
  │                                │  Fullscreen ✓ Speakers ✓      │
  │                                │  Storage ✓                     │
  │                                │  TTS: "Say begin exam"         │
  │                                │                                │
  │  5. Exam briefing             │  ExamBriefing                   │
  │                                │  TTS: title, duration, #Q,     │
  │                                │  instructions                  │
  │                                │                                │
  │  6. "Start exam" (voice)      │                                │
  │ ──────────────────────────────►│  useVoiceEngine matches        │
  │                                │  → ExamInterface               │
  │                                │  TTS reads Q1 aloud            │
  │                                │                                │
  │  7. "Start answering" (voice) │                                │
  │ ──────────────────────────────►│  → DICTATION_MODE              │
  │                                │  useDictation: 4s chunks →     │
  │                                │ ──────────────────────────────►│
  │                                │  POST /api/ai/stt-answer       │
  │                                │                                │  Whisper STT
  │                                │◄────────────────────────────── │  transcript
  │                                │                                │
  │  8. "Stop dictating" (voice)  │                                │
  │ ──────────────────────────────►│  → ANSWER_REVIEW               │
  │                                │ ──────────────────────────────►│
  │                                │  POST /api/ai/format-answer    │
  │                                │                                │  Llama 3 formatting
  │                                │◄────────────────────────────── │
  │                                │  Side-by-side raw vs formatted │
  │                                │                                │
  │  9. "Confirm answer" (voice)  │  Answer saved + next question  │
  │ ──────────────────────────────►│ ──────────────────────────────►│
  │                                │  PUT /api/v1/answers/autosave  │
  │                                │  (also: auto-save every 15s)   │
  │                                │                                │
  │  10. "Submit exam" (voice)    │                                │
  │ ──────────────────────────────►│  Submission gate (20s timeout) │
  │                                │  TTS: "Are you sure?"          │
  │                                │                                │
  │  11. "Confirm submission"     │                                │
  │ ──────────────────────────────►│  POST /api/student/end-exam    │
  │                                │ ──────────────────────────────►│  Save all responses
  │                                │◄────────────────────────────── │  Mark session submitted
  │                                │  SubmissionConfirmation page   │
  │                                │  TTS: summary + auto-redirect  │
  │◄──────────────────────────────│                                │
```

---

## Component Inventory

### Frontend Components (19 total)

**Shared Components (6):**
| Component | Purpose |
|-----------|---------|
| `ErrorBoundary` | Class-based error boundary with retry/reload buttons |
| `ProtectedRoute` / `StudentProtectedRoute` | JWT-based route guards for admin & student |
| `MicWaveform` | 14-bar animated waveform (active pulse / idle static) |
| `QuestionCard` | Single question text display in bordered card |
| `StatusBadge` | Color-coded status indicator (offline/recording/idle) |
| `Toast` + `ToastProvider` + `useToast` | Context-based notifications (success/error/info/warning) with auto-dismiss (max 5, fixed top-right) |

**Student Components (13):**
| Component | Purpose |
|-----------|---------|
| `AnswerRecorder` | Mic recording with timer + playback + save/clear |
| `FormattedAnswerReview` | Side-by-side raw vs AI-formatted answer with AI status spinner |
| `LiveFaceRegistration` | Webcam face enrollment: captures 5 frames of 128D embeddings (admin portal) |
| `LiveTranscript` | Real-time speech display: confirmed + interim text + word counter |
| `ModeIndicator` | Voice mode label + 12-bar color-coded waveform |
| `QuestionDisplay` | Question with marks, read-aloud button, flag for review |
| `StatusBar` | Top bar: exam title, Q progress, timer, auto-save dot, state indicator |
| `SubmissionGate` | 20-second confirmation modal with countdown bar (silence=cancel) |
| `TimerDisplay` | Large HH:MM:SS countdown (green → yellow → red states, pulsing when low) |
| `VoiceCommandEngine` | Command feedback toast + confidence bar + available hints panel |
| `VoiceListener` | Compact mic indicator + mode label + 8-bar waveform (top-right widget) |
| `VoiceNavigationOverlay` | Flash overlay showing detected command + confidence (auto-hides 1s) |
| `VoiceSpeaker` | Bottom TTS feedback widget: 5-bar waveform + current spoken text |

### Frontend Hooks (14 total)

**Root Hooks (4):**
| Hook | Purpose |
|------|---------|
| `useAutoSpeak` | Auto-TTS on mount/deps change with `reSpeakNow()` |
| `useSpeech` | Legacy backend-based STT/TTS |
| `useVoiceNavigation` | Regex pattern voice nav for non-exam pages |
| `useKiosk` | Bridge-based kiosk status check |

**Student Hooks (10):**
| Hook | Purpose |
|------|---------|
| `useExamSession` | Session state, question navigation, answer management |
| `useExamTimer` | Pause-aware countdown (persisted across page refresh via startedAt + totalPausedMs) |
| `useFaceRecognition` | face-api.js extraction + matching + liveness detection |
| `useVoiceCommand` | Simple 1-6 command detection with exact + fuzzy keyword matching |
| `useVoiceEngine` | Core 21+ command processor (exact → contains → Levenshtein ≥ 0.78) |
| `useDictation` | Continuous STT recording: 4s chunks → Whisper, 3s silence auto-stop |
| `useVoiceProcessing` | TTS + STT wrapper (`useTextToSpeech`, `useSpeechToText`) |
| `useAutoSave` | 20-second interval auto-save with manual trigger |
| `useKioskMode` | Fullscreen enforcement + keyboard (Alt+Tab, F12, Ctrl+Shift+I) + UI (right-click, copy/paste) blocking |
| `useBackendHealth` | 30-second polling of `/health` endpoint |

### Frontend Pages (14 total)

**Root Pages (4):**
| Page | Route | Purpose |
|------|-------|---------|
| `LandingPage` | `/` | Two-column admin/student choice with gradient hero |
| `SplashScreen` | `/splash` | Pulsing logo + 3 dots, auto-redirect after 2.8s |
| `AdminLogin` | `/admin-login` | Mountain SVG background, V1 JWT + legacy session fallback |
| `AdminPortal` | `/admin` | Dashboard, exam wizard, face enrollment, submissions, health monitoring |

**Student Pages (10):**
| Page | Route | Purpose |
|------|-------|---------|
| `FaceRecognitionLogin` | `/student/login` | 100% hands-free face auth (auto-capture every 2s, TTS guidance, 5-attempt limit → LOCKED) |
| `PasswordFallbackLogin` | `/student/login-fallback` | Email/password form with TTS welcome |
| `ExamSelector` | `/student/exams` | Voice-enabled exam list (auto-speaks up to 5 exams, "select exam N") |
| `PreExamChecklist` | `/student/exam/:examId/checklist` | 6 system checks (mic, camera, internet, fullscreen, speakers, storage) |
| `ExamBriefing` | `/student/exam/:examId/briefing` | Audio briefing: title, duration, #Q, instructions; 30s re-read countdown |
| `ExamInterface` | `/student/exam/:examId/interface` | Main exam: 13 voice commands, dictation, auto-save, AI formatting, timer |
| `SubmissionConfirmation` | `/student/submission-confirmation` | Post-exam TTS summary + 30s auto-redirect |
| `ResultsPage` | `/student/results` | All results with voice readout of top 3 |
| `SettingsPage` | `/student/settings` | Language (en/hi/mr), speech rate (0.5-2.0), accessibility options |
| `StudentDashboard` | *(legacy, unused in routing)* | Dashboard stub |

---

## Why This Stack?

### Offline-First Philosophy

Every AI component runs locally:
- **Whisper** (STT) — no cloud transcription API
- **Ollama/Llama** (LLM) — no OpenAI API keys needed
- **espeak-ng** (TTS) — no Google Cloud TTS
- **face-api.js** (detection) — runs in browser, no cloud CV

This means exams work in **computer labs with no internet** after initial setup.

### Zero Per-Request Costs

Unlike platforms using OpenAI Whisper API ($0.006/min) + GPT-4 ($0.03/1K tokens):
- Our Whisper runs locally = **$0** for unlimited STT
- Our Llama runs locally = **$0** for unlimited formatting
- Total API cost per exam session = **$0**

### Complete Accessibility

The entire student journey is **hands-free**:
- Face login (no typing passwords)
- Voice navigation ("select exam 1", "go back")
- Voice commands ("begin exam", "next question", "option 2")
- Voice dictation (speak answers naturally)
- Voice submission ("submit exam" → "confirm submission")
- Audio feedback (TTS reads questions, confirms actions, beep tones)
- Multilingual support (English, Hindi, Marathi)
- Configurable speech rate (0.5–2.0×)

### Production-Ready Security

- Biometric authentication prevents impersonation
- Kiosk lockdown prevents cheating via tab switching
- Keyboard shortcut blocking (Alt+Tab, F12, Ctrl+Shift+I, Ctrl+W)
- Copy/paste and right-click disabled during exam
- Audit logging tracks every student action
- JWT + bcrypt for admin access
- Rate limiting prevents brute-force face login attacks
- Activity logging with suspicious flag detection

---

## Summary Table

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| UI Framework | React | 18.3.1 | Component-based exam interface |
| Language | TypeScript | 5.7 | Type safety across full stack |
| Build Tool | Vite | 6.0 | Lightning-fast dev/build |
| Styling | Tailwind CSS | 3.4 | Utility-first dark theme |
| Animations | Framer Motion | 12.4 | Smooth UI transitions |
| Routing | React Router | 6.30 | Multi-page exam flow |
| Face Detection | face-api.js | 0.22 | Client-side 128D embedding extraction |
| Server | Express | 5.2.1 | REST API (16 route modules) |
| Runtime | Node.js | Latest | Backend execution |
| Desktop | Electron | 40.6 | Kiosk mode lockdown |
| STT | OpenAI Whisper | small | Offline speech recognition |
| TTS (Server) | espeak-ng | Latest | WAV audio synthesis |
| TTS (Client) | Web Speech API | Native | Browser-native speech |
| LLM | Ollama + Llama 3 | Latest | Answer formatting |
| Database (Driver) | MongoDB | 7.1 | Document storage (legacy) |
| Database (ORM) | Mongoose | 9.2.3 | Schema validation (8 models) |
| Auth | JWT | 9.0.3 | Stateless authentication |
| Hashing | bcrypt | 6.0 | Password security |
| PDF Parse | pdf-parse | 2.4.5 | Question extraction |
| PDF Generate | PDFKit | 0.17 | Report generation |
| CSV | csv-parser | 3.2.0 | CSV exam import |
| File Upload | Multer | 2.0 | Audio/image handling |
| Audio | ffmpeg | System | Audio format conversion |
| HTTP Client | Axios | 1.13.5 | Ollama API calls |
| WebSocket | Socket.IO | 4.8.3 | Real-time communication |

---

*Built by Team A — Vox Exam Platform*
