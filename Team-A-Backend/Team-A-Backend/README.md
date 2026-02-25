# MindKraft Backend

Backend for the MindKraft offline voice-based exam platform.
Runs as an **Electron** application with a **hybrid communication model** — both IPC (local) and Express HTTP (network) are active simultaneously from the moment the app starts.

---

## Table of Contents

1. [Hybrid Architecture](#hybrid-architecture)
2. [Project Structure](#project-structure)
3. [IPC Channels](#ipc-channels)
4. [Express HTTP API](#express-http-api)
5. [Frontend API Contract (Detailed)](#frontend-api-contract-detailed)
6. [Frontend UI Mapping](#frontend-ui-mapping)
7. [How It Works — End to End](#how-it-works--end-to-end)
8. [Setup & Running](#setup--running)
9. [Seed Data](#seed-data-auto)
10. [Environment Variables](#environment-variables)
11. [GitHub Push Notes](#github-push-notes)

---

## Hybrid Architecture

MindKraft uses a **hybrid communication model** that solves a key limitation: Electron IPC only works between the main process and the renderer running *inside the same Electron window*. It cannot be reached from a browser on another machine.

To support both the **local admin machine** (Electron window) and **multiple remote student machines** (browsers on different PCs), the backend now runs two communication layers at the same time:

```
┌──────────────────────────────────────────────────────────────────┐
│                      MindKraft Backend PC                        │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Electron Main Process (main.ts)                          │  │
│  │                                                           │  │
│  │  1. Connects to MongoDB                                   │  │
│  │  2. Seeds demo data                                       │  │
│  │  3. Starts Express HTTP server on :3000   ◄───────────────┼──┼─── Remote student PCs
│  │  4. Opens kiosk BrowserWindow                             │  │        (any browser)
│  │  5. Loads frontend HTML into window                       │  │
│  │  6. Registers IPC handlers                                │  │
│  └───────────────────────────────────────────────────────────┘  │
│           │                         │                            │
│    IPC channel                  Express HTTP                     │
│    (preload.ts)                 (port 3000)                      │
│           │                         │                            │
│  ┌────────▼────────┐      ┌─────────▼─────────┐                 │
│  │  Local Electron │      │  Remote Browser   │                 │
│  │  window.examAPI │      │  fetch(...) or    │                 │
│  │  (IPC calls)    │      │  window.examHTTP  │                 │
│  └─────────────────┘      └───────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

### Layer 1 — IPC (Electron only, same machine)

**What it is:** Electron's built-in inter-process communication (IPC) is a direct message channel between the Electron main process and the renderer (the HTML page loaded inside the kiosk window). It uses `ipcMain.handle` on the backend and `ipcRenderer.invoke` on the frontend, bridged securely through `contextBridge` in `preload.ts`.

**Why it exists:** IPC is fast and secure for the local kiosk machine. No network stack, no ports, no HTTP overhead. The admin machine's Electron window uses this.

**How the frontend uses it:**
```js
// Available as window.examAPI inside the Electron window
const result = await window.examAPI.adminLogin({ username: "admin", password: "admin123" });
```

**Limitation:** IPC is 100% local. A browser tab on a different PC has no access to IPC. If you try to call `ipcRenderer` from a plain browser, it will crash because the Electron runtime is not present.

---

### Layer 2 — Express HTTP (any machine on the network)

**What it is:** A standard Node.js `http` server powered by Express, started alongside Electron. It listens on `0.0.0.0:3000`, meaning every network interface on the backend machine — including the LAN IP. Any device on the same network can reach it.

**Why it exists:** Student machines (other PCs, tablets) need to send exam responses, audio for STT, and receive questions. They have a plain browser — no Electron. They use `fetch()` over the LAN to reach the Express API.

**How the frontend uses it (remote browser):**
```js
// Direct fetch from a remote machine
const res  = await fetch("http://192.168.1.10:3000/api/student/get-exam", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: "TECH101" })
});
const exam = await res.json();
```

**Or using the preloaded helper (inside Electron window, HTTP path):**
```js
// Available as window.examHTTP inside the Electron window
const exam = await window.examHTTP.getExamByCode({ code: "TECH101" });
```

---

### Choosing which layer to use in the frontend

| Scenario | Use |
|---|---|
| Admin machine (Electron kiosk window) | `window.examAPI` (IPC) — fastest, no network |
| Admin machine but HTTP preferred | `window.examHTTP` (Express via localhost) |
| Student machine (remote browser) | `fetch("http://<server-ip>:3000/api/...")` |
| Running Express headlessly (no GUI) | `npm run server` — no Electron started at all |

The frontend can detect which mode it is in:
```js
// window.examAPI is only defined inside an Electron renderer (local kiosk)
const api = typeof window.examAPI !== "undefined"
  ? window.examAPI    // IPC — running in local Electron window
  : window.examHTTP;  // HTTP — running in remote browser
```

---

### Standalone Express (no Electron)

For scenarios where no screen is attached to the backend PC, or when running the server on a headless machine/server, you can skip Electron entirely:

```bash
npm run server
```

This runs `src/server/standalone.ts` directly with Node — no GUI, no kiosk window — just the Express HTTP API on port 3000.

---

## Project Structure

```text
mindkraft-backend/
├── src/
│   ├── main.ts                  # Bootstrap: DB → Express → Electron window → IPC
│   ├── preload.ts               # window.examAPI (IPC) + window.examHTTP (HTTP fetch)
│   │
│   ├── bridge/
│   │   └── ipc-handlers.ts      # All 13 IPC channels (admin + student + AI + DB)
│   │
│   ├── server/                  # Express HTTP layer
│   │   ├── express-app.ts       # Express app factory: CORS, JSON, route mounts
│   │   ├── server.ts            # startExpressServer / stopExpressServer helpers
│   │   ├── standalone.ts        # Entry point for headless Express (npm run server)
│   │   └── routes/
│   │       ├── admin.routes.ts  # POST /api/admin/*
│   │       ├── student.routes.ts# GET|POST /api/student/*
│   │       ├── ai.routes.ts     # POST /api/ai/* (audio via multipart)
│   │       └── db.routes.ts     # POST /api/db/*
│   │
│   ├── database/
│   │   ├── mongo-client.ts      # MongoService: all CRUD operations
│   │   ├── seed.ts              # Idempotent seeding (admin + demo exam)
│   │   ├── connection.ts        # Legacy stub
│   │   └── models/
│   │       ├── Admin.ts         # { username, passwordHash }
│   │       ├── Student.ts       # { studentId, name, examCode, faceDescriptor, registeredAt }
│   │       ├── Exam.ts          # { code, title, questions[], durationMinutes, status }
│   │       ├── Response.ts      # { studentId, examCode, questionId, rawAnswer, formattedAnswer, confidence, timestamp }
│   │       └── Audit.ts         # { studentId, examCode, action, metadata, timestamp }
│   │
│   ├── services/
│   │   ├── speech.service.ts    # Whisper CLI STT: recognizeCommand + transcribeAnswer
│   │   ├── tts.service.ts       # eSpeak TTS via child_process spawn
│   │   ├── llama.service.ts     # Ollama REST (llama3.2) grammar/punctuation formatting
│   │   ├── face.service.ts      # Euclidean distance face match (threshold 0.6)
│   │   ├── pdf.service.ts       # pdf-parse → regex → Question[]
│   │   └── ai.service.ts        # Legacy wrapper (kept for compatibility)
│   │
│   ├── security/
│   │   └── kiosk.service.ts     # Kiosk/fullscreen lock for Electron window
│   │
│   └── utils/
│       ├── encryptor.ts         # AES encryption helpers
│       └── packager.ts          # Zip exam response bundles
│
├── bin/                         # Local binaries/models — ignored by Git
├── .env                         # Environment variables (not committed)
├── package.json
└── tsconfig.json
```

---

## IPC Channels

Used exclusively by the local Electron kiosk window via `window.examAPI`.

| Channel | Payload | Response | Description |
|---|---|---|---|
| `admin-login` | `{ username, password }` | `boolean` | Validate admin credentials (bcrypt) |
| `upload-exam-pdf` | `{ filePath, code, title, durationMinutes }` | `{ success, questionCount }` | Parse PDF → save exam to MongoDB |
| `publish-exam` | `{ code }` | `{ success }` | Set exam status → `active` |
| `register-student-face` | `StudentDocument` | `{ success }` | Save student + face descriptor |
| `verify-student-face` | `{ examCode, liveDescriptor }` | `{ match, studentId? }` | Match live face against stored descriptor |
| `get-exam-by-code` | `{ code }` | `ExamDocument \| null` | Fetch + locally cache exam |
| `stt-command` | `Buffer` (WAV) | `{ text, confidence }` | Whisper: short voice command transcription |
| `stt-answer` | `Buffer` (WAV) | `{ text, confidence }` | Whisper: full answer transcription |
| `tts-speak` | `string` | `void` | eSpeak: speak text aloud |
| `format-answer` | `string` | `string` | Ollama: fix grammar/punctuation |
| `save-response` | `ResponseDocument` | `{ success }` | Persist student answer to MongoDB |
| `log-audit` | `{ studentId, examCode, action, metadata? }` | `{ success }` | Write to audits collection |
| `submit-exam` | `{ studentId, examCode }` | `{ success }` | Mark exam as submitted |

---

## Express HTTP API

Used by remote student machines and any HTTP client. All routes accept and return JSON.
Base URL: `http://<backend-ip>:3000`

### Admin Routes — `/api/admin`

| Method | Path | Body / Form | Description |
|---|---|---|---|
| `POST` | `/api/admin/login` | `{ username, password }` | Validate admin credentials |
| `POST` | `/api/admin/upload-exam-pdf` | `multipart/form-data`: field `pdf` + `code`, `title`, `durationMinutes` | Upload and parse exam PDF |
| `POST` | `/api/admin/publish-exam` | `{ code }` | Publish exam (set status → active) |
| `POST` | `/api/admin/register-student-face` | `StudentDocument` body | Register student with face descriptor |

### Student Routes — `/api/student`

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/student/verify-face` | `{ examCode, liveDescriptor: number[] }` | Verify student face via Euclidean match |
| `GET` | `/api/student/exam/:code` | — | Get exam by code (URL param) |
| `POST` | `/api/student/get-exam` | `{ code }` | Get exam by code (body, for fetch convenience) |

### AI Routes — `/api/ai`

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/ai/stt-command` | `multipart/form-data`: field `audio` (WAV blob) | Whisper: short command transcription |
| `POST` | `/api/ai/stt-answer` | `multipart/form-data`: field `audio` (WAV blob) | Whisper: full answer transcription |
| `POST` | `/api/ai/tts-speak` | `{ text }` | eSpeak: play audio on backend machine |
| `POST` | `/api/ai/format-answer` | `{ rawText }` | Ollama: return `{ formatted }` |

### Database Routes — `/api/db`

| Method | Path | Body | Description |
|---|---|---|---|
| `POST` | `/api/db/save-response` | `ResponseDocument` | Save student answer |
| `POST` | `/api/db/log-audit` | `{ studentId, examCode, action, metadata? }` | Log audit event |
| `POST` | `/api/db/submit-exam` | `{ studentId, examCode }` | Mark exam as submitted |

### Health Check

```
GET /health
→ { "status": "ok", "service": "mindkraft-backend", "timestamp": "..." }
```

---

## Frontend API Contract (Detailed)

This section is the **single source of truth** for frontend integration.

### Base URL

Use:

```text
http://<backend-host>:<PORT>
```

Examples:

- Local same machine: `http://localhost:3001`
- LAN student machine: `http://192.168.1.10:3001`

### Common Rules

1. JSON endpoints: send header `Content-Type: application/json`.
2. File upload endpoints: use `multipart/form-data` via `FormData`; do not manually set `Content-Type`.
3. All success responses are JSON.
4. Validation failures return HTTP `400`.
5. Server/runtime failures return HTTP `500`.

### Health Endpoint

#### `GET /health`

Purpose: Verify backend connectivity before login or exam operations.

Success (`200`):

```json
{
  "status": "ok",
  "service": "mindkraft-backend",
  "timestamp": "2026-02-24T10:00:00.000Z"
}
```

---

### Admin Endpoints

#### `POST /api/admin/login`

Purpose: Admin authentication.

Request body:

```json
{
  "username": "admin",
  "password": "admin123"
}
```

Success (`200`):

```json
{
  "success": true
}
```

Failure (`400`):

```json
{
  "success": false,
  "error": "username and password required"
}
```

#### `POST /api/admin/upload-exam-pdf`

Purpose: Upload exam PDF, parse questions, create draft exam.

Request: `multipart/form-data`

Fields:

- `pdf` (File, required, mime type `application/pdf`)
- `code` (string, required)
- `title` (string, required)
- `durationMinutes` (number/string, required)

Success (`200`):

```json
{
  "success": true,
  "questionCount": 5
}
```

Failure (`400`):

```json
{
  "success": false,
  "error": "No PDF file uploaded"
}
```

Failure (`500`):

```json
{
  "success": false,
  "error": "<error-message>"
}
```

#### `POST /api/admin/publish-exam`

Purpose: Set an existing exam status to `active`.

Request body:

```json
{
  "code": "TECH101"
}
```

Success (`200`):

```json
{
  "success": true
}
```

Failure (`400`):

```json
{
  "success": false,
  "error": "code required"
}
```

#### `POST /api/admin/register-student-face`

Purpose: Register student profile + face descriptor for exam verification.

Request body:

```json
{
  "studentId": "STU001",
  "name": "John Doe",
  "examCode": "TECH101",
  "faceDescriptor": [0.123, -0.456, 0.789]
}
```

Success (`200`):

```json
{
  "success": true
}
```

Failure (`500`):

```json
{
  "success": false,
  "error": "<error-message>"
}
```

---

### Student Endpoints

#### `POST /api/student/verify-face`

Purpose: Verify live descriptor against registered students for the exam.

Request body:

```json
{
  "examCode": "TECH101",
  "liveDescriptor": [0.101, -0.222, 0.333]
}
```

Success (`200`):

```json
{
  "match": true,
  "studentId": "STU001"
}
```

or

```json
{
  "match": false
}
```

Failure (`400`):

```json
{
  "success": false,
  "error": "examCode and liveDescriptor required"
}
```

#### `GET /api/student/exam/:code`

Purpose: Fetch exam by code (URL parameter style).

Success (`200`):

```json
{
  "code": "TECH101",
  "title": "Introduction to AI (Demo)",
  "questions": [
    { "id": 1, "text": "What is Artificial Intelligence?" }
  ],
  "durationMinutes": 30,
  "status": "active"
}
```

Failure (`404`):

```json
{
  "success": false,
  "error": "Exam not found"
}
```

#### `POST /api/student/get-exam`

Purpose: Fetch exam by code (body style, easy for generic POST helpers).

Request body:

```json
{
  "code": "TECH101"
}
```

Success/Failure: same as `GET /api/student/exam/:code`.

---

### AI Endpoints

#### `POST /api/ai/stt-command`

Purpose: Convert short command audio to text.

Request: `multipart/form-data`

Fields:

- `audio` (File/Blob, required)

Success (`200`):

```json
{
  "text": "next question",
  "confidence": 0.92
}
```

Failure (`400`):

```json
{
  "error": "No audio file uploaded"
}
```

Failure (`500`):

```json
{
  "text": "",
  "confidence": 0,
  "error": "<error-message>"
}
```

#### `POST /api/ai/stt-answer`

Purpose: Convert long answer audio to text.

Request: `multipart/form-data`

Fields:

- `audio` (File/Blob, required)

Success/Failure schema: same as `stt-command`.

#### `POST /api/ai/tts-speak`

Purpose: Speak text aloud on backend machine.

Request body:

```json
{
  "text": "Please answer question number one"
}
```

Success (`200`):

```json
{
  "success": true
}
```

Failure (`400`):

```json
{
  "error": "text required"
}
```

#### `POST /api/ai/format-answer`

Purpose: Clean grammar/punctuation of raw transcription using Ollama.

Request body:

```json
{
  "rawText": "artifical inteligance is ..."
}
```

Success (`200`):

```json
{
  "formatted": "Artificial intelligence is ..."
}
```

Failure (`400`):

```json
{
  "error": "rawText required"
}
```

Failure (`500`):

```json
{
  "formatted": "",
  "error": "<error-message>"
}
```

---

### Database Endpoints

#### `POST /api/db/save-response`

Purpose: Persist answer per question.

Request body:

```json
{
  "studentId": "STU001",
  "examCode": "TECH101",
  "questionId": 1,
  "rawAnswer": "raw text",
  "formattedAnswer": "Formatted text.",
  "confidence": 0.91,
  "timestamp": "2026-02-24T10:05:00.000Z"
}
```

Success (`200`):

```json
{
  "success": true
}
```

Failure (`500`):

```json
{
  "success": false,
  "error": "<error-message>"
}
```

#### `POST /api/db/log-audit`

Purpose: Store audit/proctoring events.

Request body:

```json
{
  "studentId": "STU001",
  "examCode": "TECH101",
  "action": "question_viewed",
  "metadata": {
    "questionId": 1
  }
}
```

Success (`200`):

```json
{
  "success": true
}
```

#### `POST /api/db/submit-exam`

Purpose: Mark exam submission complete for student.

Request body:

```json
{
  "studentId": "STU001",
  "examCode": "TECH101"
}
```

Success (`200`):

```json
{
  "success": true
}
```

---

### Frontend Fetch Snippets

#### Health check

```ts
const api = import.meta.env.VITE_API_BASE_URL;
const health = await fetch(`${api}/health`).then((r) => r.json());
```

#### Admin login

```ts
const api = import.meta.env.VITE_API_BASE_URL;
const login = await fetch(`${api}/api/admin/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: "admin", password: "admin123" }),
}).then((r) => r.json());
```

#### Upload PDF

```ts
const form = new FormData();
form.append("pdf", file);
form.append("code", "TECH101");
form.append("title", "Introduction to AI");
form.append("durationMinutes", "30");

const result = await fetch(`${api}/api/admin/upload-exam-pdf`, {
  method: "POST",
  body: form,
}).then((r) => r.json());
```

#### STT answer

```ts
const form = new FormData();
form.append("audio", audioBlob, "answer.wav");

const stt = await fetch(`${api}/api/ai/stt-answer`, {
  method: "POST",
  body: form,
}).then((r) => r.json());
```

---

## Frontend UI Mapping

Recommended screen-to-endpoint mapping:

1. **Connection Gate / App Init**
   - `GET /health`
   - UI: backend status badge, retry button, offline banner.

2. **Admin Login Screen**
   - `POST /api/admin/login`
   - UI: username/password form, invalid credentials message.

3. **Exam Management Screen (Admin)**
   - `POST /api/admin/upload-exam-pdf`
   - `POST /api/admin/publish-exam`
   - UI: PDF upload, parsed question count preview, publish confirmation.

4. **Student Registration Screen (Admin)**
   - `POST /api/admin/register-student-face`
   - UI: face capture/descriptor generation, student form, registration success state.

5. **Student Verification Screen**
   - `POST /api/student/verify-face`
   - UI: webcam capture, verification spinner, match/no-match routing.

6. **Exam Player Screen**
   - `GET /api/student/exam/:code` or `POST /api/student/get-exam`
   - `POST /api/ai/tts-speak`
   - `POST /api/ai/stt-answer`
   - `POST /api/ai/format-answer`
   - `POST /api/db/save-response`
   - `POST /api/db/log-audit`
   - UI: question navigation, record/stop controls, transcript and formatted preview, save state.

7. **Submission Screen**
   - `POST /api/db/submit-exam`
   - UI: final confirmation modal, submitted receipt view.

### Frontend Validation Recommendations

- Do not call `publish-exam` without a non-empty `code`.
- Do not call `verify-face` without `examCode` and `liveDescriptor[]`.
- Do not call `tts-speak` with empty text.
- Do not call `format-answer` with empty `rawText`.
- For upload/audio endpoints, check file/blob existence before request.

### Frontend Error Handling Pattern

```ts
async function apiCall<T>(promise: Promise<T>) {
  try {
    return { ok: true, data: await promise };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}
```

---

## How It Works — End to End

### Bootstrap sequence (`main.ts`)

```
1. mongoService.connect()         — Connect to local MongoDB
2. seedDatabase()                 — Insert defaults if collections empty
3. startExpressServer()           — Bind Express to 0.0.0.0:3000
4. new BrowserWindow(kiosk)       — Create fullscreen Electron window
5. win.loadFile(frontend/index.html) — Load the frontend UI
6. registerIPCHandlers()          — Wire up all 13 IPC channels
```

### Admin flow

```
Admin machine (Electron)
  → window.examAPI.adminLogin(...)
  → window.examAPI.uploadExamPDF(...)
  → window.examAPI.publishExam(...)
  → window.examAPI.registerStudentFace(...)
```

### Student flow (remote machine)

```
Student machine (browser)
  → fetch POST /api/student/verify-face        — face auth
  → fetch GET  /api/student/exam/TECH101       — load questions
  → per question:
      fetch POST /api/ai/tts-speak             — hear question read aloud (on backend PC)
      fetch POST /api/ai/stt-answer (+ audio)  — submit WAV, receive transcript
      fetch POST /api/ai/format-answer         — clean up grammar
      fetch POST /api/db/save-response         — persist answer
      fetch POST /api/db/log-audit             — log event
  → fetch POST /api/db/submit-exam             — finish
```

### Error handling

- All AI services (Whisper, Ollama, eSpeak) return graceful fallbacks — empty strings or raw text — and never crash the process.
- All Express route errors are caught and returned as `{ success: false, error: "..." }` with appropriate HTTP status codes.

---

## Setup & Running

### Prerequisites

| Tool | Purpose | Install |
|---|---|---|
| Node.js ≥ 18 | Runtime | https://nodejs.org |
| MongoDB | Database | https://www.mongodb.com/try/download/community |
| Ollama | LLM answer formatter | https://ollama.com — then `ollama pull llama3.2` |
| eSpeak | Text-to-speech | https://espeak.sourceforge.net |
| Whisper | Speech-to-text | `pip install openai-whisper` |

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env   # then edit .env with your local paths

# 3a. Run with Electron (kiosk window + Express)
npm run dev

# 3b. Run Express only (no GUI — for headless/server use)
npm run server

# 4. Build only (no run)
npm run build
```

### Connecting remote student machines

1. Find the backend PC's LAN IP address:
   ```powershell
   ipconfig    # look for IPv4 Address, e.g. 192.168.1.10
   ```
2. Ensure all student machines are on the same network.
3. In the student frontend, point API calls to:
   ```
   http://192.168.1.10:3000
   ```
4. Test connectivity:
   ```
   GET http://192.168.1.10:3000/health
   ```

---

## Seed Data (Auto)

On every startup, `seedDatabase()` runs automatically after MongoDB connects.
It is **idempotent** — it only inserts if the collection is empty.

| Collection | Seeded value |
|---|---|
| `admins` | username: `admin`, password: `admin123` (bcrypt hashed) |
| `exams` | code: `TECH101`, title: `Introduction to AI (Demo)`, 3 questions, 30 min |

---

## Environment Variables

Stored in `.env` (never committed to Git).

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment |
| `PORT` | `3000` | Express HTTP server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/mindkraft` | MongoDB connection string |
| `OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama REST endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Ollama model name |
| `ESPEAK_BIN` | `C:\Program Files (x86)\eSpeak\command_line\espeak.exe` | Path to eSpeak executable |
| `WHISPER_BIN` | `whisper` | Whisper CLI command (must be on PATH) |
| `WHISPER_MODEL_PATH` | `base` | Whisper model size or path |
| `MODELS_PATH` | `./bin/models` | Local models directory |

---

## GitHub Push Notes

- Commit only: `src/`, `package.json`, `tsconfig.json`, `README.md`, `.gitignore`
- Never commit: `node_modules/`, `dist/`, `.env`, `bin/`, `data/`, `tmp-uploads/`
