# MindKraft — Tech Stack & Components

> **MindKraft** is a voice-first, AI-powered exam platform that enables completely hands-free examination for students — from face-recognition login to voice-dictated answers and spoken submission confirmation.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Frontend Stack](#frontend-stack)
- [Backend Stack](#backend-stack)
- [AI / ML Pipeline](#ai--ml-pipeline)
- [Security Layer](#security-layer)
- [Database](#database)
- [DevOps & Build Tools](#devops--build-tools)
- [Complete Exam Flow](#complete-exam-flow)
- [Why This Stack?](#why-this-stack)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                      │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ face-api.js│  │ VoiceContext  │  │ ExamContext   │  │ Tailwind │ │
│  │ (128D CNN) │  │ State Machine │  │ Session Mgmt  │  │  CSS     │ │
│  └─────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────────┘ │
│        │                │                  │                        │
│        ▼                ▼                  ▼                        │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               REST API (fetch / axios)                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP (port 5173 → 3000)
┌──────────────────────────────▼──────────────────────────────────────┐
│                       BACKEND (Express + Node.js)                   │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ Whisper  │  │ espeak-ng │  │ Ollama   │  │ MongoDB Driver    │  │
│  │ (STT)    │  │ (TTS)     │  │ (LLM)   │  │ + Mongoose        │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────────┘  │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │ JWT Auth │  │ bcrypt    │  │ PDFKit   │  │ Electron (Kiosk)  │  │
│  └──────────┘  └───────────┘  └──────────┘  └───────────────────┘  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   MongoDB (27017)   │
                    │   Database: mindkraft│
                    └─────────────────────┘
```

---

## Frontend Stack

### React 18.3 + TypeScript

| Item | Details |
|------|---------|
| **Library** | React 18.3.1 with TypeScript 5.7 |
| **Routing** | React Router DOM v6.30 (nested routes, protected routes) |
| **State Management** | React Context API — `ExamContext` (exam/session/answers) + `VoiceContext` (voice state machine) |

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
| **Theme** | Custom `surface` colors (dark blues), `accent` colors (indigo/purple with glow) |
| **Fonts** | Inter (UI) + JetBrains Mono (code/stats) |
| **Animations** | Custom keyframes: `fade-in`, `slide-up`, `scale-in` |
| **PostCSS** | Autoprefixer for cross-browser support |

**Why Tailwind?**
- Utility-first approach means **zero CSS context switching** — styles live right in JSX
- Custom dark theme with glassmorphism effects (`glass-card`) creates a modern exam UI
- Purging unused CSS results in **tiny production bundle (~10KB)**
- Responsive design utilities make the exam interface work on lab PCs and laptops alike

---

### Framer Motion 12.4

| Item | Details |
|------|---------|
| **Usage** | Page transitions, component animations, loading states |
| **Features** | `AnimatePresence` for exit animations, gesture support (`whileHover`, `whileTap`) |

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
| **Model Loading** | Lazy-loaded once, cached via singleton pattern |
| **Model Files** | Served from `public/models/` (shard files + weight manifests) |

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
| **API Pattern** | RESTful with 9 route modules |
| **File Uploads** | Multer v2 for audio/image multipart handling |
| **CORS** | Configured for cross-origin Vite dev server |

**Route Modules:**
| Route | Purpose |
|-------|---------|
| `/api/auth/*` | JWT login (password + face recognition) |
| `/api/face/*` | Face embedding storage & verification |
| `/api/ai/*` | STT (Whisper), TTS (espeak-ng), LLM (Llama) |
| `/api/admin/*` | Admin panel operations |
| `/api/student/*` | Student data & exam management |
| `/api/results/*` | Exam results & scoring |
| `/api/exam-sessions/*` | Active session management |
| `/api/db/*` | Database seeding & management |
| `/api/v1/*` | VoiceSecure subsystem routes |

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
| **IPC** | Preload script with `contextBridge` for secure main↔renderer communication |
| **Window Control** | Blocked popups, hidden menu bar, prevented new windows |

**Why Electron?**
- Enables **hardware-level kiosk lockdown** that web browsers alone cannot achieve
- Prevents students from switching tabs, opening Task Manager, or accessing OS during exams
- IPC bridge allows secure access to system resources (Whisper, espeak-ng, filesystem) from the renderer
- Same codebase runs in standalone mode (Express-only, no Electron) for multi-machine lab deployments

---

## AI / ML Pipeline

### OpenAI Whisper (Speech-to-Text)

| Item | Details |
|------|---------|
| **Model** | `whisper small` (local, offline) |
| **Binary** | OpenAI Whisper CLI installed via pip |
| **Audio Pipeline** | Browser WebM → ffmpeg (16kHz mono WAV) → Whisper → JSON output |
| **Hallucination Filtering** | `--no_speech_threshold 0.5`, `--condition_on_previous_text False` |
| **Client-Side Filter** | Discards phantom phrases ("thank you for watching", "subscribe", etc.) |
| **Confidence Scoring** | Based on `no_speech_prob` and `avg_logprob` per segment |

**Two STT Modes:**
1. **Command STT** (`/api/ai/stt-command`) — Short commands like "begin exam", "next question"
2. **Answer STT** (`/api/ai/stt-answer`) — Long-form dictated answers

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
| **Model** | `llama3:latest` |
| **Purpose** | Clean up raw speech transcripts — fix grammar/punctuation without altering content |
| **Temperature** | `0.2` (deterministic, minimal creativity) |
| **Timeout** | 30 seconds |
| **Fallback** | Returns raw text if LLM is unavailable |

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
| **Output** | WAV audio streamed to client |
| **Config** | Adjustable speed (WPM), pitch, and voice |

### Web Speech API (Client-Side TTS)

| Item | Details |
|------|---------|
| **API** | `window.speechSynthesis` (SpeechSynthesisUtterance) |
| **Voice Selection** | Priority: Microsoft Zira → Microsoft David → Google US English → any English |
| **Features** | Serial queue, interrupt mode, rate/pitch/lang control |
| **Beep System** | Web AudioContext oscillator tones for command/dictation/success/error feedback |

**Why Dual TTS?**
- **Web Speech API** for instant, zero-latency UI narration (questions, instructions, confirmations)
- **espeak-ng** as a server-side fallback and for WAV audio generation (predictable, offline)
- Dual system ensures TTS **never fails** regardless of browser support

---

## Voice Command System

### Three-Layer Voice Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Layer 1: VoiceContext (Global State Machine)            │
│  States: IDLE → FACE_AUTH → EXAM_BRIEFING →              │
│          COMMAND_MODE ⟷ DICTATION_MODE →                 │
│          SUBMISSION_GATE → FINALIZE                      │
│  Manages: TTS queue, raw transcript, beep tones          │
├──────────────────────────────────────────────────────────┤
│  Layer 2: useVoiceEngine (Exam Commands)                 │
│  21 command actions with fuzzy matching (Levenshtein)     │
│  Commands: start exam, next/previous question,           │
│            option 1-4, submit exam, confirm submission    │
│  Matching: Exact → Contains → Fuzzy (≥ 0.65 ratio)      │
├──────────────────────────────────────────────────────────┤
│  Layer 3: useVoiceNavigation (Page Navigation)           │
│  Regex-based pattern matching for non-exam pages          │
│  Commands: dashboard, exams, results, settings,          │
│            select exam N, go back, logout, help           │
│  Fallback: Backend Whisper STT when Web Speech API fails │
└──────────────────────────────────────────────────────────┘
```

**Why Custom Voice Engine over Third-Party Libraries?**
- Complete control over the command recognition pipeline (exact → contains → fuzzy)
- Built-in hallucination filtering tuned for exam context
- State machine prevents command interference (e.g., "next" during dictation mode doesn't skip the question)
- Dual STT path (browser Web Speech API + backend Whisper) ensures 100% device compatibility

---

## Security Layer

| Feature | Technology | Details |
|---------|-----------|---------|
| **Authentication** | JWT (jsonwebtoken) | 8-hour token expiry, issued on password or face login |
| **Password Hashing** | bcrypt v6 | Salted hashes for admin credentials |
| **Face Verification** | Cosine similarity | Threshold ≥ 0.85, Euclidean distance fallback (< 0.55) |
| **Rate Limiting** | Custom middleware | 5 face login attempts per 15-minute window per student/IP |
| **Liveness Detection** | Movement tracking | Checks face position movement across frames to detect photos |
| **Multi-Face Rejection** | face-api.js | Only single-face frames accepted; multiple faces = rejected |
| **Kiosk Lockdown** | Electron | Fullscreen, no menu bar, blocked popups, no tab switching |
| **Context Isolation** | Electron | `contextIsolation: true`, `nodeIntegration: false` |

**Why This Security Model?**
- **Face recognition login** eliminates password sharing between students
- **Client-side detection + server-side verification** splits the compute (browser detects, server matches)
- **Liveness detection** prevents holding up a photo to the camera
- **Kiosk mode** prevents accessing external resources during the exam
- JWT is stateless — no server-side session storage needed

---

## Database

### MongoDB 7.x (via Native Driver + Mongoose)

| Item | Details |
|------|---------|
| **Primary Driver** | MongoDB Native Driver v7.1 (`mongodb` package) |
| **Secondary ORM** | Mongoose v9.2 (for VoiceSecure subsystem) |
| **Connection** | `mongodb://127.0.0.1:27017` |
| **Database** | `mindkraft` |

**Data Models:**

| Collection | Key Fields | Purpose |
|-----------|-----------|---------|
| **admins** | `username`, `passwordHash` | Admin portal authentication |
| **students** | `studentId`, `name`, `examCode`, `faceDescriptor` | Student registry |
| **exams** | `code`, `title`, `questions[]`, `durationMinutes`, `status` | Exam definitions (MCQ + descriptive) |
| **face_embeddings** | `studentId`, 128D `facialEmbedding`, `qualityScore` | Face recognition data |
| **responses** | `studentId`, `examCode`, `rawAnswer`, `formattedAnswer`, `confidence` | Student exam responses |
| **audit_logs** | `studentId`, `action`, `metadata`, `timestamp` | Security audit trail |

**Why MongoDB?**
- **Flexible schema** — exam questions have varying structures (MCQ with options vs. descriptive)
- **128D face embedding arrays** are natively stored as BSON arrays — no serialization needed
- **Document model** maps naturally to our API responses (no ORM translation layer)
- Horizontal scaling supports growing student populations
- Native driver gives **maximum performance** for high-throughput exam sessions

---

## DevOps & Build Tools

| Tool | Version | Purpose |
|------|---------|---------|
| **TypeScript** | 5.7 | Type safety across frontend and backend |
| **Vite** | 6.0 | Frontend dev server + production build |
| **tsc** | 5.7 | Backend compilation (`tsc -p tsconfig.json → dist/`) |
| **PostCSS** | 8.5 | CSS processing pipeline (Tailwind + Autoprefixer) |
| **Multer** | 2.0 | Multipart file upload handling (audio blobs, images) |
| **ffmpeg** | System | Audio format conversion (WebM → 16kHz WAV for Whisper) |
| **Git** | Latest | Version control with `final` branch on two remotes |
| **PDFKit** | 0.17 | Server-side PDF report generation |

---

## Complete Exam Flow

```
Student                          Frontend                         Backend
  │                                │                                │
  │  1. Opens app                  │                                │
  │ ──────────────────────────────►│  Landing Page                  │
  │                                │                                │
  │  2. Face appears on webcam     │                                │
  │ ──────────────────────────────►│  face-api.js extracts 128D     │
  │                                │  embedding from webcam frame   │
  │                                │ ──────────────────────────────►│
  │                                │  POST /api/auth/face-recognize │
  │                                │                                │  Cosine similarity
  │                                │                                │  ≥ 0.85 = match
  │                                │◄────────────────────────────── │  JWT token issued
  │                                │                                │
  │  3. "Select exam 1" (voice)   │                                │
  │ ──────────────────────────────►│  useVoiceNavigation            │
  │                                │  matches → navigates           │
  │                                │                                │
  │  4. System checks auto-run    │  PreExamChecklist               │
  │                                │  Mic ✓ Camera ✓ Internet ✓    │
  │                                │  TTS: "Say begin exam"         │
  │                                │                                │
  │  5. "Begin exam" (voice)      │                                │
  │ ──────────────────────────────►│  useVoiceEngine matches        │
  │                                │  → navigates to exam interface │
  │                                │                                │
  │  6. TTS reads question aloud  │                                │
  │◄──────────────────────────────│  Web Speech API                │
  │                                │                                │
  │  7. "Option 2" or dictation   │                                │
  │ ──────────────────────────────►│  Audio blob recorded           │
  │                                │ ──────────────────────────────►│
  │                                │  POST /api/ai/stt-answer       │
  │                                │                                │  Whisper STT
  │                                │                                │  → Llama formatting
  │                                │◄────────────────────────────── │
  │                                │  Answer displayed + saved      │
  │                                │                                │
  │  8. "Submit exam" (voice)     │                                │
  │ ──────────────────────────────►│  Submission confirmation gate  │
  │                                │  TTS: "Are you sure?"          │
  │                                │                                │
  │  9. "Confirm submission"      │                                │
  │ ──────────────────────────────►│  POST /api/student/submit      │
  │                                │ ──────────────────────────────►│  Save all responses
  │                                │◄────────────────────────────── │
  │                                │  Results page                  │
  │◄──────────────────────────────│                                │
```

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

### Production-Ready Security

- Biometric authentication prevents impersonation
- Kiosk lockdown prevents cheating via tab switching
- Audit logging tracks every student action
- JWT + bcrypt for admin access
- Rate limiting prevents brute-force face login attacks

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
| Server | Express | 5.2 | REST API |
| Runtime | Node.js | Latest | Backend execution |
| Desktop | Electron | 40.6 | Kiosk mode lockdown |
| STT | OpenAI Whisper | small | Offline speech recognition |
| TTS (Server) | espeak-ng | Latest | WAV audio synthesis |
| TTS (Client) | Web Speech API | Native | Browser-native speech |
| LLM | Ollama + Llama 3 | Latest | Answer formatting |
| Database | MongoDB | 7.x | Document storage |
| ORM | Mongoose | 9.2 | Schema validation (VoiceSecure) |
| Auth | JWT | 9.0 | Stateless authentication |
| Hashing | bcrypt | 6.0 | Password security |
| PDF | PDFKit | 0.17 | Report generation |
| File Upload | Multer | 2.0 | Audio/image handling |
| Audio | ffmpeg | System | Audio format conversion |

---

*Built by Team A — MindKraft Voice-Secure Exam Platform*
