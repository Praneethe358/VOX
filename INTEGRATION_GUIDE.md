# Vox — Integration Guide

## Overview

Complete API reference and frontend↔backend integration details for the Vox exam platform.

- **Frontend:** React 18 + TypeScript + Vite (`http://localhost:5173`)
- **Backend:** Python + FastAPI (`http://localhost:3000`)
- **Database:** MongoDB 7.x (database: `vox`, dual driver: native + Mongoose)
- **Face Recognition:** face-api.js client-side embeddings + backend cosine similarity
- **Voice Stack:** Whisper STT + espeak-ng TTS + Web Speech API + Ollama Llama 3

---

## Table of Contents

- [Run Locally](#run-locally)
- [Environment Configuration](#environment-configuration)
- [API Surface — Legacy Routes](#api-surface--legacy-routes)
- [API Surface — Vox V1 Routes](#api-surface--vox-v1-routes)
- [Frontend Route Map](#frontend-route-map)
- [Face Recognition Integration](#face-recognition-integration)
- [Voice Integration](#voice-integration)
- [Exam Lifecycle](#exam-lifecycle)
- [Electron IPC Bridge](#electron-ipc-bridge)
- [Frontend API Client](#frontend-api-client)
- [Context Providers](#context-providers)
- [Data Types](#data-types)
- [Session & Token Storage](#session--token-storage)
- [Seed Data](#seed-data)

---

## Run Locally

### 1) Backend (Port 3000)
```bash
cd Team-A-Backend/Team-A-Backend
python -m venv ../../.venv
../../.venv/Scripts/pip install -r requirements.txt
../../.venv/Scripts/python -m uvicorn app.main:app --host 0.0.0.0 --port 3000 --reload
```

### 2) Frontend (Port 5173)
```bash
cd Team-A-Frontend
npm install
npm run dev
```

### 3) Legacy Electron Desktop
The Electron desktop shell remains in the repo as legacy code. The active API backend exposed to the frontend is now the Python FastAPI service.

### 4) URLs
| Service | URL |
|---------|-----|
| Frontend | `http://localhost:5173` |
| Backend health | `GET http://localhost:3000/health` |
| Backend API | `http://localhost:3000/api/*` |
| Vox V1 API | `http://localhost:3000/api/v1/*` |

---

## Environment Configuration

### Backend (`Team-A-Backend/Team-A-Backend/.env`)
```env
# Database
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=vox
PORT=3000
NODE_ENV=production

# Frontend CORS
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=vox-local-dev-secret-change-this

# Speech-to-Text
WHISPER_BIN=whisper                    # or full path to whisper.exe
WHISPER_MODEL_PATH=small
FFMPEG_BIN=ffmpeg                      # or full path to ffmpeg.exe

# Text-to-Speech
ESPEAK_BIN="C:\Program Files\eSpeak NG\espeak-ng.exe"
ESPEAK_NG_BIN=espeak-ng

# LLM
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest

# Vox super-admin (auto-created on first run)
VOX_SUPERADMIN_EMAIL=admin@vox.edu
VOX_SUPERADMIN_PASSWORD=ChangeMe@123
```

### Frontend (`Team-A-Frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3000
```

### External Binary Dependencies
| Binary | Install Command | Purpose |
|--------|----------------|---------|
| espeak-ng | `choco install espeak-ng` | Server-side TTS WAV synthesis |
| ffmpeg | `choco install ffmpeg` | Audio conversion (WebM → 16kHz WAV) |
| OpenAI Whisper | `pip install -U openai-whisper` | Speech-to-text transcription |
| Ollama | `https://ollama.ai` | Local LLM server (Llama 3) |

The Python backend keeps the same `/health`, `/api/*`, and `/api/v1/*` contract the frontend already uses. Without Whisper, ffmpeg, espeak-ng, or Ollama installed, `/api/ai/*` endpoints can fail while the rest of the app still works.

---

## API Surface — Legacy Routes

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | `{ status: "ok", service: "vox-backend", timestamp }` |

---

### Auth (`/api/auth`)
| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/auth/login` | — | `{ email, password }` | `{ token, student: { studentId, name, email } }` | Student password login → JWT |
| POST | `/api/auth/face-recognize` | — | `{ examCode, descriptor: number[] }` | `{ token, student: { studentId, name } }` | Face-based student login → JWT |

---

### Face (`/api/face`)
| Method | Path | Auth | Body/Params | Response | Description |
|--------|------|------|------------|----------|-------------|
| POST | `/api/face/register` | — | `{ studentId, studentName, examCode, email, descriptors: number[][] }` | `{ success, message, studentId }` | Register face (multi-frame averaged, L2-normalized) |
| POST | `/api/face/verify` | — | `{ examCode, liveDescriptor: number[] }` | `{ matched, studentId?, confidence, studentName? }` | Verify face against all students in exam |
| POST | `/api/face/verify-by-id` | — | `{ studentId, liveDescriptor: number[] }` | `{ matched, confidence, error? }` | Verify face against specific student (rate-limited: 5/15min) |
| GET | `/api/face/students` | — | — | `StudentInfo[]` (without raw embeddings) | List all registered students |
| GET | `/api/face/embedding/:studentId` | — | `:studentId` | `{ studentId, frameCount, qualityScore, ... }` (metadata only) | Get embedding metadata |
| DELETE | `/api/face/embedding/:studentId` | — | `:studentId` | `{ success }` | Delete student face data |
| GET | `/api/face/attempts/:studentId` | — | `:studentId`, `?limit=N` | `Attempt[]` | Face auth attempt history |

---

### AI / Voice (`/api/ai`)
| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/ai/stt-command` | — | `multipart: audio (file)` | `{ text, confidence }` | Short command STT via Whisper |
| POST | `/api/ai/stt-answer` | — | `multipart: audio (file)` | `{ text, confidence }` | Long-form answer STT via Whisper (with hallucination filtering) |
| POST | `/api/ai/tts-speak` | — | `{ text, speed?, voice?, pitch? }` | `audio/wav` buffer | Text-to-speech via espeak-ng |
| POST | `/api/ai/format-answer` | — | `{ rawText, questionContext? }` | `{ formattedText }` | Grammar correction via Ollama Llama 3 |

---

### Admin (`/api/admin`)
| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/admin/login` | — | `{ username, password }` | `boolean` | Admin credential check |
| GET | `/api/admin/exams` | — | — | `Exam[]` | List all exams |
| POST | `/api/admin/create-exam` | — | `{ code, title, durationMinutes, questions[] }` | `{ success }` | Create exam from JSON |
| POST | `/api/admin/upload-exam-pdf` | — | `multipart: file (PDF/JSON/CSV)`, `code, title, durationMinutes` | `{ success, questionCount?, error? }` | Parse file → extract questions → create exam |
| POST | `/api/admin/publish-exam` | — | `{ code }` | `{ success }` | Set exam status to active |

---

### Student (`/api/student`)
| Method | Path | Auth | Body/Params | Response | Description |
|--------|------|------|------------|----------|-------------|
| GET | `/api/student/exams` | — | — | `Exam[]` (active only) | List available exams |
| POST | `/api/student/verify-face` | — | `{ examCode, descriptor: number[] }` | `{ matched, studentId?, confidence }` | Verify student face for exam |
| GET | `/api/student/exam/:code` | — | `:code` | `Exam` | Get exam details by code |
| POST | `/api/student/get-exam` | — | `{ code }` | `Exam` | Get exam (body-based) |
| POST | `/api/student/start-exam` | — | `{ examCode, studentId }` | `{ success, sessionId? }` | Begin exam session |
| POST | `/api/student/submit-answer` | — | `{ studentId, examCode, questionId, rawAnswer, formattedAnswer, confidence }` | `{ success }` | Auto-save a question answer |
| POST | `/api/student/end-exam` | — | `{ studentId, examCode }` | `{ success }` | Complete & submit exam |

---

### Students (`/api/students`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/students/dashboard` | — | Dashboard stats: completed exams, average score |
| GET | `/api/students/profile` | — | Student profile details |

---

### Results (`/api/results`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/results` | — | All exam submissions/results |
| GET | `/api/results/:sessionId` | — | Specific session result |

---

### Exam Sessions (`/api/exam-sessions`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/exam-sessions/start` | — | `{ studentId, examCode }` | Initialize exam session |
| POST | `/api/exam-sessions/autosave` | — | `{ sessionId, answers[], ... }` | Auto-save session state |
| POST | `/api/exam-sessions/submit` | — | `{ sessionId, ... }` | Submit & finalize exam |

---

### DB Operations (`/api/db`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/db/save-response` | — | Response document | Save answer response |
| POST | `/api/db/log-audit` | — | `{ studentId, examCode, action, metadata? }` | Log audit event |
| POST | `/api/db/submit-exam` | — | `{ studentId, examCode }` | Mark exam as submitted |

---

## API Surface — Vox V1 Routes

All V1 routes require JWT authentication via `Authorization: Bearer <token>` header (except admin login).

### V1 Auth (`/api/v1/auth`)
| Method | Path | Auth | Body | Response | Description |
|--------|------|------|------|----------|-------------|
| POST | `/api/v1/auth/admin-login` | — | `{ email, password }` | `{ token }` | Admin JWT login |
| POST | `/api/v1/auth/admins` | Bearer + `super-admin` | `{ name, email, password, role }` | `Admin` | Create new admin |

---

### V1 Students (`/api/v1/students`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/v1/students` | Bearer + admin | `{ registerNumber, fullName, email, department, year, languagePreference? }` | Create student |
| PATCH | `/api/v1/students/:studentId/face-embedding` | Bearer + admin | `{ faceEmbedding: number[] }` | Update face embedding |

---

### V1 Exams (`/api/v1/exams`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/v1/exams` | Bearer + admin | `{ title, subject, durationMinutes, totalMarks, instructions, questions[], scheduledDate }` | Create exam |
| GET | `/api/v1/exams/:examId` | Bearer + admin | — | Get exam details |

---

### V1 Exam Sessions (`/api/v1/exam-sessions`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/v1/exam-sessions/start` | Bearer + admin | `{ studentId, examId }` | Start exam session |
| POST | `/api/v1/exam-sessions/:sessionId/submit` | Bearer + admin | — | Finalize submission |
| GET | `/api/v1/exam-sessions/:sessionId` | Bearer + admin | — | Get session + answers |

---

### V1 Answers (`/api/v1/answers`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| PUT | `/api/v1/answers/autosave` | Bearer + admin | `{ examSessionId, questionNumber, rawSpeechText, formattedAnswer, wordCount }` | Auto-save answer (creates revision history entry) |

---

### V1 Activity Logs (`/api/v1/activity-logs`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| POST | `/api/v1/activity-logs` | Bearer + admin | `{ examSessionId, eventType, metadata? }` | Log activity event |

---

### V1 Config (`/api/v1/config`)
| Method | Path | Auth | Body | Description |
|--------|------|------|------|-------------|
| GET | `/api/v1/config/ai` | Bearer + admin | — | Get AI configuration (singleton) |
| PUT | `/api/v1/config/ai` | Bearer + `super-admin` | `{ sttEngine?, llmModel?, grammarCorrection?, autoSaveInterval?, ttsSpeed?, multilingualMode? }` | Update AI config |
| POST | `/api/v1/config/system-logs` | Bearer + admin | `{ level, message, source, examSessionId? }` | Log system error/critical event |

---

## Frontend Route Map

### Public Routes
| Path | Component | Purpose |
|------|-----------|---------|
| `/` | `LandingPage` | Admin/Student choice cards |
| `/admin-login` | `AdminLogin` | Admin credential login (V1 JWT + legacy fallback) |
| `/splash` | `SplashScreen` | Loading animation → auto-redirect to `/` |
| `/student/login` | `FaceRecognitionLogin` | 100% hands-free face auth (auto-capture every 2s) |
| `/student/login-fallback` | `PasswordFallbackLogin` | Email/password form fallback |

### Legacy Redirects
| Old Path | New Path |
|----------|----------|
| `/student-login` | `/student/login` |
| `/student-portal` | `/student/exams` |
| `/dashboard` | `/student/exams` |
| `/exam` | `/student/exams` |

### Protected — Admin
| Path | Component | Purpose |
|------|-----------|---------|
| `/admin` | `AdminPortal` | Dashboard, exam wizard, face enrollment, submissions, health |

### Protected — Student
| Path | Component | Purpose |
|------|-----------|---------|
| `/student/exams` | `ExamSelector` | Voice-enabled exam list |
| `/student/exam/:examId/checklist` | `PreExamChecklist` | System verification (mic, camera, internet, fullscreen, speakers, storage) |
| `/student/exam/:examId/briefing` | `ExamBriefing` | Audio briefing before starting exam |
| `/student/exam/:examId/interface` | `ExamInterface` | Main exam UI with 13 voice commands |
| `/student/submission-confirmation` | `SubmissionConfirmation` | Post-exam summary |
| `/student/results` | `ResultsPage` | Exam results with voice readout |
| `/student/settings` | `SettingsPage` | Language, speech rate, accessibility |

### Route Protection
- **`<ProtectedRoute>`** — checks `auth_token` in localStorage + `adminAuth` in sessionStorage → redirects to `/admin-login`
- **`<StudentProtectedRoute>`** — checks `studentAuth` + `studentId` in sessionStorage → redirects to `/student/login`

---

## Face Recognition Integration

### Registration Flow (Admin)
1. Admin opens **AdminPortal** → Student Registration tab
2. `LiveFaceRegistration` component captures webcam
3. Loads face-api.js models via `loadFaceApiModels()` (singleton pattern)
4. Auto-detects single face using `TinyFaceDetector`
5. Rejects: no face, multiple faces, low quality
6. Captures **5 frames** of 128D embeddings
7. Sends to `POST /api/face/register`:
   ```json
   {
     "studentId": "STU001",
     "studentName": "John Doe",
     "examCode": "TECH101",
     "email": "john@example.com",
     "descriptors": [[0.12, -0.34, ...], [...], [...], [...], [...]]
   }
   ```
8. Backend averages all descriptors → L2-normalizes → stores in `face_embeddings` collection

### Login Flow (Student)
1. Student navigates to `/student/login` (FaceRecognitionLogin)
2. TTS: "Welcome. Please look at the camera."
3. Webcam opens, `useFaceRecognition` hook captures embeddings every 2 seconds
4. Liveness detection: tracks landmark position movement across frames
5. Sends to `POST /api/face/verify` (exam-wide) or `POST /api/face/verify-by-id` (student-specific)
6. Backend:
   - L2-normalizes the live descriptor
   - Computes cosine similarity against stored normalized embeddings
   - **Primary threshold:** cosine similarity ≥ 0.85
   - **Fallback:** Euclidean distance < 0.55
   - **Rate limit:** max 5 attempts per student per 15-minute window
7. On match → JWT issued → TTS: "Authentication successful" → redirect to `/student/exams`
8. On fail → TTS: "Face not recognized, please try again"
9. After 5 failures → `LOCKED` state

### Face Data Schema
```typescript
// face_embeddings collection
{
  studentId: string,
  studentName: string,
  examCode?: string,
  facialEmbedding: number[],       // 128D (raw average)
  normalizedEmbedding: number[],   // 128D (L2-normalized)
  frameCount: number,
  qualityScore: number,
  timestamps: { registeredAt, updatedAt }
}
```

---

## Voice Integration

### Speech-to-Text (STT)

**Backend Pipeline:**
1. Frontend records audio via `MediaRecorder` API (WebM/Opus)
2. Sends as multipart `audio` field to `/api/ai/stt-command` or `/api/ai/stt-answer`
3. Backend (speech.service.ts):
   - Saves temp file via `multer`
   - Converts to 16kHz mono WAV using `ffmpeg`
   - Runs Whisper CLI: `whisper <file> --model small --output_format json --no_speech_threshold 0.5`
   - Parses JSON output, applies hallucination filters:
     - `no_speech_prob > 0.5` → discard segment
     - `avg_logprob < -1.0` → discard segment
     - `compression_ratio > 2.4` → discard segment
   - Returns `{ text, confidence }`

**Frontend STT Paths:**
1. **useDictation hook** — continuous recording in ~4s chunks → Whisper (`/api/ai/stt-answer`), 3-second silence auto-stop
2. **useVoiceEngine hook** — Web Speech API (`webkitSpeechRecognition`) for command detection (browser-native, no backend call)
3. **useVoiceNavigation hook** — Web Speech API for non-exam page navigation
4. **useSpeech hook** — legacy backend-based STT via `/api/ai/stt-command`

### Text-to-Speech (TTS)

**Dual TTS System:**

| Layer | Technology | Usage | Endpoint |
|-------|-----------|-------|----------|
| Client-side (primary) | Web Speech API (`speechSynthesis`) | All UI narration: questions, status, confirmations, navigation | — (browser native) |
| Server-side (fallback) | espeak-ng | WAV audio generation when browser TTS unavailable | `POST /api/ai/tts-speak` |

**Client-side TTS (VoiceContext):**
- `speak(text, options)` — queues utterance with serial playback
- Voice priority: Microsoft Zira → Microsoft David → Google US English → any English
- `playBeep(type)` — Web AudioContext oscillator: command (2 beeps), dictation (rising tone), error (low buzz), success (high ding), warning (pulse)
- Languages: en, hi, mr
- Rate: configurable (0.5–2.0×)

**Server-side TTS:**
- `POST /api/ai/tts-speak` with `{ text, speed?, voice?, pitch? }`
- Returns `audio/wav` buffer
- Config: speed 150 WPM, voice en-us, pitch 50

### Answer Formatting (LLM)

1. Student finishes dictation → raw transcript captured
2. Frontend calls `POST /api/ai/format-answer` with `{ rawText, questionContext? }`
3. Backend (llama.service.ts):
   - Sends to Ollama at `http://localhost:11434/api/generate`
   - Model: `llama3:latest`, temperature 0.2
   - Prompt: clean grammar/punctuation without altering meaning
   - Timeout: 30s
   - Fallback: return raw text unchanged
4. Frontend displays side-by-side: raw speech text | AI-formatted answer
5. Student voice commands: "Confirm answer", "Edit answer", "Continue dictation"

---

## Exam Lifecycle

### 1. Exam Creation (Admin)

```
AdminPortal → Exam Management → 3-Step Wizard
  Step 1: Name, code, duration, instructions
  Step 2: Upload PDF/JSON/CSV OR manual question entry
  Step 3: Preview questions → Publish

Backend endpoints:
  POST /api/admin/upload-exam-pdf (file → parse → questions)
  POST /api/admin/create-exam (JSON body → exam record)
  POST /api/admin/publish-exam ({ code } → status: "active")
```

**PDF Question Extraction** (pdf.service.ts):
- Supports formats: "1. Text", "Q1. Text", "(1) Text"
- MCQ options: "A) ...", "a. ...", "(A) ...", "*A)" (asterisk = correct)
- Answer lines: "Answer: A", "Correct: B"
- Returns: `Question[] { id, text, type: 'mcq'|'descriptive', options?, correctAnswer? }`

### 2. Student Login

```
/student/login → FaceRecognitionLogin
  Auto-capture → POST /api/face/verify or /api/face/verify-by-id
  Success → JWT → sessionStorage → /student/exams

/student/login-fallback → PasswordFallbackLogin
  POST /api/auth/login → JWT → /student/exams
```

### 3. Exam Selection

```
/student/exams → ExamSelector
  GET /api/student/exams → active exam list
  Voice: "select exam 1" → navigate to checklist
```

### 4. Pre-Exam

```
/student/exam/:id/checklist → PreExamChecklist
  Auto-checks: mic, camera, internet, fullscreen, speakers, storage
  Voice: "begin exam" → /student/exam/:id/briefing

/student/exam/:id/briefing → ExamBriefing
  TTS: exam title, duration, question count, instructions
  Voice: "start exam" → /student/exam/:id/interface
```

### 5. Exam in Progress

```
/student/exam/:id/interface → ExamInterface

State Machine (VoiceContext):
  COMMAND_MODE → "start answering" → DICTATION_MODE
  DICTATION_MODE → "stop dictating" → ANSWER_REVIEW
  ANSWER_REVIEW → "confirm answer" → COMMAND_MODE (next Q)
  ANSWER_REVIEW → "edit answer" → DICTATION_MODE
  COMMAND_MODE → "pause exam" → PAUSE_MODE
  PAUSE_MODE → "resume exam" → COMMAND_MODE
  COMMAND_MODE → "submit exam" → SUBMISSION_GATE (20s)
  SUBMISSION_GATE → "confirm submission" → FINALIZE

Auto-save: Every 15 seconds → PUT /api/v1/answers/autosave
Answer save: POST /api/student/submit-answer (per question)
Activity log: POST /api/v1/activity-logs (per event)
```

### 6. Submission

```
FINALIZE → POST /api/student/end-exam
  → /student/submission-confirmation
  → TTS: summary (title, answered count, total count)
  → 30s auto-redirect to /student/exams
```

### 7. Results

```
/student/results → ResultsPage
  GET /api/results → all submissions
  TTS: reads top 3 results aloud
```

---

## Electron IPC Bridge

When running in Electron mode (`npm run dev`), the renderer process gets two API surfaces via the preload script:

### `window.examAPI` (IPC-based, local)
| Channel | Input | Output |
|---------|-------|--------|
| `admin-login` | `{ username, password }` | `boolean` |
| `upload-exam-pdf` | `{ filePath, code, title, durationMinutes }` | `{ success, questionCount?, error? }` |
| `publish-exam` | `{ code }` | `{ success }` |
| `register-student-face` | Student document | `{ success }` |
| `verify-student-face` | `{ examCode, liveDescriptor[] }` | `{ matched, studentId?, confidence }` |
| `get-exam-by-code` | `{ code }` | `Exam \| null` |
| `stt-command` | `Buffer` (audio) | `{ text, confidence }` |
| `stt-answer` | `Buffer` (audio) | `{ text, confidence }` |
| `tts-speak` | `string` (text) | `void` |
| `format-answer` | `string` (rawText) | `string` (formatted) |
| `save-response` | Response document | `{ success }` |
| `log-audit` | `{ studentId, examCode, action, metadata? }` | `{ success }` |
| `submit-exam` | `{ studentId, examCode }` | `{ success }` |

### `window.examHTTP` (fetch-based, remote)
Same API as above but uses HTTP `fetch()` to `http://localhost:3000`. Used when:
- Running in browser (no Electron)
- Multi-machine deployments (frontend on student PC, backend on server)

### Browser Bridge (`src/api/bridge.ts`)
| Method | Maps To |
|--------|---------|
| `bridge.startStt()` | `window.api.sttStart()` |
| `bridge.stopStt()` | `window.api.sttStop()` → transcript |
| `bridge.speak(text)` | `window.api.ttsSpeak()` |
| `bridge.getKioskStatus()` | `window.api.kioskStatus()` → boolean |

---

## Frontend API Client

### UnifiedApiClient (`src/api/client.ts`)

Central API client class providing all backend calls. Falls back through multiple base URLs:
1. `VITE_API_URL` env var
2. `VITE_API_BASE_URL` env var
3. `http://localhost:3000/api` (default)

**Exported Instances:**
- `unifiedApiClient` — default instance
- `adminApi` — alias for admin operations
- `studentApi` — alias for student operations
- `dbApi` — alias for DB operations

### Key Method Categories

**Admin:**
- `loginAdmin(username, password)` — tries V1 JWT (3s timeout), falls back to legacy
- `uploadExamPdf(file)`, `publishExam(code)`, `unpublishExam(code)`, `deleteExam(code)`
- `registerStudent(student)` — face registration
- `getDashboardStats()`, `getRecentActivity()`
- `getExams()`, `createExam()`, `updateExam()`
- `getSubmissions()`, `getStudentsForScoring()`

**Student:**
- `getAvailableExams()`, `verifyStudentFace(examCode, descriptor)`
- `startExam(examCode, rollNumber)`, `endExam()`

**Auth:**
- `authenticateWithFace(faceData)` — `POST /auth/face-recognize`
- `loginWithPassword(email, password)` — `POST /auth/login`

**AI:**
- `convertSpeechToText(audioBlob, lang)` — Whisper STT
- `convertCommandToText(audioBlob)` — command STT
- `synthesizeSpeech(text, lang, rate)` — espeak-ng TTS
- `formatAnswer(rawText, questionContext)` — Llama formatting

**Vox V1 (JWT-protected):**
- `v1AdminLogin(email, password)` — JWT login
- `v1CreateStudent(student)`, `v1UpdateFaceEmbedding(id, embedding)`
- `v1CreateExam(exam)`, `v1GetExam(id)`
- `v1StartExamSession(data)`, `v1SubmitExamSession(id)`
- `v1AutosaveAnswer(data)` — `PUT /v1/answers/autosave`
- `v1CreateActivityLog(data)` — `POST /v1/activity-logs`
- `v1GetAIConfig()`, `v1UpdateAIConfig(config)`
- `v1CreateSystemLog(log)` — `POST /v1/config/system-logs`

**Face:**
- `faceRegister(data)` — `POST /face/register`
- `faceVerify(examCode, descriptor)` — `POST /face/verify`
- `faceVerifyById(studentId, descriptor)` — `POST /face/verify-by-id`

**Token Management:**
- `getStoredToken()` / `setStoredToken()` / `clearStoredToken()`
- Keys: `auth_token`, `admin_user` in `localStorage`

---

## Context Providers

### AuthContext (`src/context/AuthContext.tsx`)
**Scope:** Admin authentication state

| State | Type | Description |
|-------|------|-------------|
| `isAuthenticated` | `boolean` | Auth status |
| `isLoading` | `boolean` | Loading flag |
| `admin` | `AdminUser \| null` | `{ id, name, email, role, mfaEnabled }` |
| `token` | `string \| null` | JWT token |

| Method | Description |
|--------|-------------|
| `onLoginSuccess(token, admin)` | Set auth state |
| `logout()` | Clear session |

**Storage:** `localStorage` — keys `auth_token`, `admin_user`

---

### ExamContext (`src/context/ExamContext.tsx`)
**Scope:** Exam session state for student

| State | Type | Description |
|-------|------|-------------|
| `exam` | `ExamData \| null` | Current exam |
| `session` | `ExamSession \| null` | Active session |
| `student` | `StudentProfile \| null` | Student info |
| `authState` | `StudentAuthState` | `{ isAuthenticated, faceVerified }` |
| `activityLogs` | `ActivityLog[]` | Session activity log |
| `navigationState` | `ExamNavigationState` | `{ currentIndex, flagged, answered }` (Sets) |

| Method | Description |
|--------|-------------|
| `setExam()`, `setSession()`, `setStudent()` | Set context data |
| `submitAnswer()` | Saves to V1 + legacy APIs |
| `submitExam()` | Calls `apiService.submitExam()` |
| `updateAuthState()` | Update auth flags |
| `addActivityLog()` | Append activity |
| `updateNavigationState()` | Update question navigation |
| `logout()` | Clear all exam state |

---

### VoiceContext (`src/context/VoiceContext.tsx`)
**Scope:** Voice state machine + TTS + beep tones

**State Machine:**
```
IDLE → FACE_AUTH → EXAM_BRIEFING → COMMAND_MODE
COMMAND_MODE ⟷ DICTATION_MODE
COMMAND_MODE → PAUSE_MODE → COMMAND_MODE
COMMAND_MODE → ANSWER_REVIEW → COMMAND_MODE / DICTATION_MODE
COMMAND_MODE → SUBMISSION_GATE → FINALIZE
FACE_AUTH → LOCKED (after 5 failures)
```

| State | Type | Description |
|-------|------|-------------|
| `rawTranscript` | `string` | Live speech accumulator |
| `formattedAnswer` | `string` | AI-formatted answer |
| `currentQuestionText` | `string` | For TTS context |
| `faceAttempts` | `number` | Face auth attempt count |

| Method | Description |
|--------|-------------|
| `speak(text, options?)` | Queue TTS utterance (Web Speech API) |
| `stopSpeaking()` | Cancel current utterance |
| `playBeep(type)` | Audio feedback: command, dictation, error, success, warning |
| `transition(state)` | State machine transition |

---

## Data Types

### Exam Types (`src/types/student/exam.types.ts`)
```typescript
Question {
  questionId, sectionId, text, marks,
  difficulty: 'easy' | 'medium' | 'hard',
  type: 'descriptive' | 'numerical' | 'boolean',
  expectedAnswerLength, order, hints?
}

ExamData {
  examCode, title, description, subject, durationMinutes, totalMarks,
  sections: ExamSection[],
  voiceNavigationEnabled, voiceLanguage, questionReadingEnabled,
  multilingualEnabled, supportedLanguages[],
  aiConfig: { sttEngine, sttLanguage, llmModel, grammarCorrectionEnabled,
              answerFormatting, autoSaveInterval }
}

ExamSession {
  sessionId, studentId, examCode,
  status: 'in_progress' | 'submitted' | 'evaluated' | 'paused',
  startTime, endTime?, totalDuration?, currentQuestionId,
  answers: StudentAnswer[], totalScore?, percentage?, lastSavedAt,
  environmentData: { deviceInfo, screenResolution, isFullscreen, browserTabs }
}

StudentAnswer {
  questionId, sectionId, rawTranscript, formattedAnswer,
  confidence, audioFile?, attemptedAt, submittedAt,
  timeSpent, wordCount, suspiciousFlags[]
}

ExamNavigationState {
  currentQuestionIndex, currentSectionIndex,
  visitedQuestions: Set, flaggedQuestions: Set, answeredQuestions: Set
}
```

### Student Types (`src/types/student/student.types.ts`)
```typescript
StudentProfile {
  studentId, name, email, phoneNumber, enrollmentDate,
  disabilityType: 'temporary_fracture' | 'permanent_motor' | 'visual' | 'hearing' | 'other',
  faceDescriptor[],
  accessibilityProfile: { requiresVoiceNavigation, preferredLanguage,
                          speechRate, fontSize, highContrast, textToSpeech }
}

StudentAuthState {
  isAuthenticated, student?, faceVerified, sessionToken?, loginTimestamp?
}

FaceMatchResult {
  matched, studentId, confidence, matchedStudent?, timestamp
}
```

### Voice Types (`src/types/student/voice.types.ts`)
```typescript
VoiceCommand {
  command: '1'-'6', action, confidence, rawText, timestamp
}

VoiceConfig {
  language, speechRate, volume,
  engine: 'vosk' | 'whisper',
  ttsEngine: 'espeak'
}

SpeechToTextResult {
  text, confidence, isFinal, language?, duration?
}
```

### Activity Types (`src/types/student/activity.types.ts`)
```typescript
ActivityAction =
  'exam_start' | 'exam_end' | 'question_viewed' | 'answer_started' |
  'answer_submitted' | 'answer_reviewed' | 'navigation_previous' |
  'navigation_next' | 'voice_command' | 'auto_save' | 'microphone_toggled' |
  'camera_toggled' | 'inactivity_detected' | 'anomaly_detected'

ActivityLog {
  logId, sessionId, studentId, examCode, action, questionId?,
  metadata: { timestamp, duration?, details? },
  suspiciousFlag?, flagReason?
}

SessionState {
  sessionId, studentId, examCode, status, startTime, endTime?,
  pausedAt?, resumedAt?, totalPausedDuration, lastActivityTime,
  isFullscreenEnabled, isKioskModeEnabled, microphoneActive,
  cameraActive, backgroundChanges, navigationHistory[]
}

SubmissionData {
  sessionId, studentId, examCode, submittedAt, finalAnswers[],
  totalDuration, totalScore?, totalMarks, percentage?,
  activityLog[], metadata
}

ExamStatistics {
  totalQuestions, answeredQuestions, unattemptedQuestions,
  flaggedQuestions, totalTimeSpent, averageTimePerQuestion,
  totalWordCount, suspiciousActivityCount
}
```

---

## Session & Token Storage

### localStorage
| Key | Value | Set By |
|-----|-------|--------|
| `auth_token` | JWT string | Login success (admin or student) |
| `admin_user` | JSON `{ id, name, email, role }` | Admin login |

### sessionStorage
| Key | Value | Set By |
|-----|-------|--------|
| `adminAuth` | `'true'` | Admin login (legacy) |
| `adminUsername` | Username string | Admin login |
| `studentAuth` | `'true'` | Student login |
| `studentId` | Student ID string | Student login |
| `studentData` | JSON `StudentProfile` | Student login |
| `pendingStudentId` | Student ID string | ID-based face verification flow |

---

## Seed Data

On first startup (via `database/seed.ts`):

### Default Admin
- Username: `admin`
- Password: `admin123` (bcrypt hashed, cost 10)

### Vox Super-Admin
- Email: `admin@vox.edu` (or `VOX_SUPERADMIN_EMAIL`)
- Password: `ChangeMe@123` (or `VOX_SUPERADMIN_PASSWORD`)
- Role: `super-admin`

### Sample Exam (TECH101)
- Code: `TECH101`
- Title: `Introduction to AI`
- Duration: 30 minutes
- Status: `active`
- Questions (3 descriptive):
  1. "What is the full form of AI?"
  2. "Define Machine Learning in one sentence."
  3. "Who is known as the father of Artificial Intelligence?"

### Default AI Configuration (singleton)
- STT Engine: `whisper`
- LLM Model: `llama3.2`
- Grammar Correction: `true`
- Auto-Save Interval: `15` seconds
- Multilingual Mode: `true`
- TTS Speed: `1.0`

---

## Notes

- **No mock DB mode** — the application always uses real MongoDB (mock mode has been removed)
- Backend CORS allows all origins in development; tighten via `FRONTEND_URL` for production
- Body size limit is 50MB to accommodate audio file uploads
- The server binds to `0.0.0.0` for network accessibility
- Whisper, ffmpeg, and espeak-ng binary paths are auto-detected from PATH; override via env vars if needed
- Face service internally uses both MongoDB native driver (for `face_embeddings` collection) and mongoose (for Vox Student model)
- The frontend `UnifiedApiClient` automatically appends `/api` to the base URL, so V1 calls go to `/api/v1/*`

---

*Built by Team A — Vox Exam Platform*
