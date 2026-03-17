# Vox — Architecture & System Design

> Deep dive into Vox's system architecture, data flows, and component interactions

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Data Flow Diagrams](#data-flow-diagrams)
- [Component Architecture](#component-architecture)
- [State Management](#state-management)
- [Authentication & Security](#authentication--security)
- [Voice Processing Pipeline](#voice-processing-pipeline)
- [Face Recognition Pipeline](#face-recognition-pipeline)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER (Browser)                             │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  React 18 + Vite 6 (TypeScript)                                 │ │
│  │  - Student Portal (face login, exams, voice commands)           │ │
│  │  - Admin Portal (user management, exam setup)                   │ │
│  │  - Face-api.js (128D CNN embeddings on client)                 │ │
│  │  - Web Speech API (voice commands)                              │ │
│  │  - Framer Motion (animations)                                   │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │ HTTP(S) REST API
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SERVER LAYER (Python)                              │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │  FastAPI 0.116.1 + Uvicorn (Python 3.11+)                       │ │
│  │  ┌─────────────────────────────────────────────────────────┐    │ │
│  │  │  API Routes (/api/v1/*)                                 │    │ │
│  │  │  - Auth: login, logout, token refresh                  │    │ │
│  │  │  - Students: CRUD, face registration                   │    │ │
│  │  │  - Exams: creation, listing, updates                   │    │ │
│  │  │  - Sessions: exam state management                     │    │ │
│  │  │  - Answers: storage & formatting                       │    │ │
│  │  │  - Face: verification, embedding storage              │    │ │
│  │  │  - AI: STT, TTS, LLM formatting                        │    │ │
│  │  └─────────────────────────────────────────────────────────┘    │ │
│  │                          │                                       │ │
│  │  ┌────────────────────────▼───────────────────────────────┐    │ │
│  │  │  Services Layer (Business Logic)                      │    │ │
│  │  │  - AIService: Whisper STT, espeak-ng TTS, Ollama LLM │    │ │
│  │  │  - FaceService: Embedding storage, similarity match   │    │ │
│  │  │  - DatabaseService: MongoDB operations                │    │ │
│  │  └────────────────────────┬───────────────────────────────┘    │ │
│  │                           │                                     │ │
│  │  ┌────────────────────────▼───────────────────────────────┐    │ │
│  │  │  External Services                                    │    │ │
│  │  │  - MongoDB: Data persistence                         │    │ │
│  │  │  - Whisper: OpenAI model (local)                     │    │ │
│  │  │  - Ollama: LLM inference (local)                     │    │ │
│  │  │  - espeak-ng: TTS synthesis                          │    │ │
│  │  └────────────────────────────────────────────────────────┘    │ │
│  └───────────────────────────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────────────────────────────┘
                     │ MongoDB Driver
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DATA LAYER (MongoDB)                               │
│  Database: vox                                                          │
│  Collections:                                                           │
│  - students (16 fields, 1M+ docs)                                      │
│  - exams (8 fields, 10K+ docs)                                         │
│  - face_embeddings (student face vectors, 128D)                        │
│  - face_login_attempts (audit trail)                                   │
│  - exam_sessions (exam state snapshots)                                │
│  - responses (student answers)                                         │
│  - audits (compliance logs)                                            │
│  - admins (admin accounts)                                             │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend Stack
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 18.x | UI library |
| **Build** | Vite | 6.4+ | Fast build & dev server |
| **Language** | TypeScript | 5.7+ | Type safety |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **Animation** | Framer Motion | 12.x | Smooth animations |
| **Face Detection** | face-api.js | 0.22.2 | Client-side face recognition |
| **Voice I/O** | Web Speech API | Browser native | Voice input/output |

### Backend Stack
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | FastAPI | 0.116+ | Async web framework |
| **Server** | Uvicorn | 0.29+ | ASGI server |
| **Database** | MongoDB | 4.x | Document store |
| **ORM** | PyMongo | 4.x | MongoDB driver |
| **Auth** | PyJWT | 2.10+ | JWT tokens |
| **Security** | bcrypt | 4.3+ | Password hashing |
| **STT** | Whisper | small model | Speech-to-text |
| **TTS** | espeak-ng | latest | Text-to-speech |
| **LLM** | Ollama + Llama3 | latest | Local LLM inference |

### Infrastructure
| Component | Purpose |
|-----------|---------|
| **MongoDB 4.x+** | Document database |
| **Whisper API** | Speech recognition |
| **Ollama** | Local LLM inference |
| **espeak-ng** | Text-to-speech synthesis |

---

## Data Flow Diagrams

### 1. Student Login Flow (Face Authentication)

```
┌─────────────────────────────────────────────────────────────────┐
│                      FACE LOGIN FLOW                             │
└─────────────────────────────────────────────────────────────────┘

STUDENT                          FRONTEND              BACKEND
   │                                │                    │
   │ 1. Click "Face Login"         │                    │
   ├─────────────────────────────►│                    │
   │                                │ 2. Load face-api.js
   │                                ├──────────────────►│
   │                                │◄──────────────────┤
   │                                │
   │ 3. Access camera (face-api)   │                    │
   ├─────────────────────────────►│                    │
   │ (Webcam stream)                │                    │
   │                                │ 4. Capture frames
   │                                │ (5 frames @ 1 sec)
   │                                │
   │ 5. Compute embedding (128D)    │                    │
   │ (face-api CNN on client)       │                    │
   │                                │                    │
   │ 6. POST /api/v1/face-verify   │                    │
   │    {studentId, embedding}      ├─────────────────►│
   │ (over HTTPS)                    │                  │ 7. Query DB
   │                                │                  │ face_embeddings
   │                                │                  │
   │                                │                  │ 8. Cosine similarity
   │                                │                  │ (>= 0.85 threshold)
   │                                │
   │ 9. Response: {jwt, student}    │◄─────────────────┤
   │◄────────────────────────────────┤
   │                                │
   │ 10. Store JWT in sessionStorage │
   │─────────────────────────────────►
   │ 11. Redirect to exam dashboard │
   │─────────────────────────────────►
   │
```

### 2. Exam Submission Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EXAM SUBMISSION FLOW                          │
└─────────────────────────────────────────────────────────────────┘

STUDENT                      FRONTEND              BACKEND
   │                            │                    │
   │ 1. Answer Q1 (voice)       │                    │
   ├───────────────────────────►│                    │
   │                            │ 2. STT (Whisper)  │
   │                            ├───────────────────►│
   │                            │◄───────────────────┤ (raw text)
   │                            │
   │                            │ 3. Format & clean  │
   │                            │ (regex, filters)    │
   │                            │
   │ 4. Review auto-formatted   │◄────────────────────
   │    answer                   │
   │                            │
   │ 5. Click "Submit Exam"     │                    │
   ├───────────────────────────►│                    │
   │                            │ 6. POST /api/v1/responses
   │                            │    {examId, answers, metadata}
   │                            ├───────────────────►│
   │                            │                   │ 7. Store in DB
   │                            │                   │    responses collection
   │                            │                   │
   │                            │ 8. Calculate score │
   │                            │ (LLM evaluation)   │
   │                            │◄───────────────────┤
   │                            │
   │ 9. Show confirmation       │                    │
   │    (TTS: "Exam submitted")  │                    │
   │◄────────────────────────────┤                    │
   │
```

### 3. Face Registration Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                  FACE REGISTRATION PIPELINE                      │
└─────────────────────────────────────────────────────────────────┘

STUDENT                    FRONTEND         BACKEND
   │                          │                │
   │ 1. Click "Register Face" │                │
   ├─────────────────────────►│                │
   │                          │                │
   │ 2. Capture 5 frames      │                │
   │    (over 5 seconds)       │                │
   │ ├─ Frame 1 (1 sec)       │                │
   │ ├─ Frame 2 (2 sec)       │                │
   │ ├─ Frame 3 (3 sec)       │                │
   │ ├─ Frame 4 (4 sec)       │                │
   │ └─ Frame 5 (5 sec)       │                │
   │                          │                │
   │ 3. Compute 5 embeddings  │                │
   │    (face-api CNN)         │                │
   │    [128D, 128D, 128D,     │                │
   │     128D, 128D]           │                │
   │                          │                │
   │ 4. POST /api/v1/register-face │           │
   │    {studentId, embeddings}  ├───────────►│
   │                              │            │ 5. L2 normalize
   │                              │            │    each embedding
   │                              │            │
   │                              │            │ 6. Average embeddings
   │                              │            │    final_emb = mean([e1..e5])
   │                              │            │
   │                              │            │ 7. Store in DB
   │                              │            │    face_embeddings collection
   │                              │            │
   │ 8. OK: "Face registered"    │            │
   │◄──────────────────────────────────────────┤
   │
```

### 4. Voice Command Processing

```
┌─────────────────────────────────────────────────────────────────┐
│                   VOICE COMMAND FLOW                             │
└─────────────────────────────────────────────────────────────────┘

STUDENT          WEB SPEECH API      FRONTEND         BACKEND
   │                 │                  │                │
   │ 1. Say "Next"   │                  │                │
   ├────────────────►│                  │                │
   │                 │ 2. Record audio  │                │
   │                 │ (until silence)  │                │
   │                 │ 3. Send text     │                │
   │                 ├─────────────────►│                │
   │                 │ ("next")         │                │
   │                 │                  │ 4. Match
   │                 │                  │    1. Exact match: "next"
   │                 │                  │       → 100% confidence
   │                 │                  │    2. Contains match
   │                 │                  │    3. Fuzzy match (Levenshtein)
   │                 │                  │       → >= 0.78 confidence
   │                 │                  │
   │                 │                  │ 5. Trigger action
   │                 │                  │    → VoiceContext.dispatch()
   │                 │                  │    → Navigate to next question
   │                 │                  │
   │ 6. Question 2 displayed          │                │
   │◄──┬───────────────────────────────┤                │
   │   │ 7. TTS: "Question 2 of 10"    │                │
   │   └──────────────────────────────►│                │
   │
```

---

## Component Architecture

### Frontend Component Hierarchy

```
App.tsx (Root)
├── AuthContext.Provider
│   ├── ExamContext.Provider
│   │   └── VoiceContext.Provider
│   │
│   ├── Routes
│   │   ├── LandingPage /
│   │   ├── StudentLogin /student-login
│   │   ├── ProtectedRoute /student
│   │   │   ├── StudentPortal
│   │   │   │   ├── ExamSelector
│   │   │   │   └── Dashboard
│   │   │   └── ExamInterface /exam
│   │   │       ├── VoiceContainer
│   │   │       ├── QuestionDisplay
│   │   │       ├── AnswerRecorder
│   │   │       ├── MicWaveform
│   │   │       └── CommandHints
│   │   ├── AdminPortal /admin
│   │   │   ├── Navigation
│   │   │   ├── UserManagement
│   │   │   └── ExamManagement
│   │   └── SplashScreen /splash
│   │
│   └── Shared Components
│       ├── Toast (Notifications)
│       ├── StatusBadge
│       ├── ErrorBoundary
│       └── MicWaveform
```

### Backend Route Structure

```
FastAPI Application (app.main)
├── CORS Middleware
├── Exception Handlers
├── Startup Event (initialize DB)
│
├── /health (GET)
│   └── Health check endpoint
│
├── /api/v1/auth/
│   ├── POST /admin-login
│   ├── POST /student-login
│   └── POST /logout
│
├── /api/v1/students/
│   ├── GET / (list)
│   ├── POST / (create)
│   ├── GET /{id}
│   ├── PUT /{id}
│   └── DELETE /{id}
│
├── /api/v1/exams/
│   ├── GET / (list)
│   ├── POST / (create)
│   ├── GET /{id}
│   └── PUT /{id}
│
├── /api/v1/face/
│   ├── POST /register
│   ├── POST /verify
│   └── GET /attempts
│
├── /api/v1/ai/
│   ├── POST /stt-command
│   ├── POST /stt-answer
│   ├── POST /tts-speak
│   └── POST /format-answer
│
├── /api/v1/sessions/
│   ├── GET / (current)
│   ├── POST / (start)
│   └── PUT / (update)
│
└── /api/v1/responses/
    ├── POST / (submit)
    ├── GET /{id}
    └── GET /exam/{examId}
```

---

## State Management

### Frontend State Layers

#### 1. Authentication Context
```typescript
AuthContext {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login(email, password): Promise<void>
  logout(): void
  refreshToken(): Promise<void>
}
```

#### 2. Exam Context
```typescript
ExamContext {
  currentExam: Exam | null
  currentSession: ExamSession | null
  answers: Map<string, Answer>
  startExam(examId): Promise<void>
  recordAnswer(questionId, answer): void
  submitExam(): Promise<void>
}
```

#### 3. Voice Context (State Machine)
```typescript
VoiceContext {
  state: 'IDLE' | 'FACE_AUTH' | 'EXAM_BRIEFING' | 
         'COMMAND_MODE' | 'DICTATION_MODE' | 'SUBMISSION_GATE' | 'FINALIZE'
  isListening: boolean
  lastCommand: string | null
  dispatch(action): void
  setState(newState): void
}

// State transitions:
IDLE → FACE_AUTH → EXAM_BRIEFING → COMMAND_MODE ⟷ DICTATION_MODE → SUBMISSION_GATE → FINALIZE
```

### Backend State
- **Request-scoped**: HTTP request context, JWT payload
- **Session-scoped**: Exam session (temporary)
- **Persistent**: MongoDB collections

---

## Authentication & Security

### JWT Authentication Flow

```
┌──────────────────────────────────────────────────────┐
│             JWT AUTHENTICATION FLOW                   │
└──────────────────────────────────────────────────────┘

1. LOGIN REQUEST
   Client: POST /api/v1/auth/login
   { email: "student@example.com", password: "..." }

2. SERVER VERIFICATION
   - Hash password with bcrypt
   - Compare with stored hash
   - Check rate limiting (5 fails/15 min)

3. TOKEN GENERATION
   payload = {
     sub: student_id,
     email: email,
     role: "student",
     iat: <issue_time>,
     exp: <exp_time> (8 hours)
   }
   token = JWT.sign(payload, JWT_SECRET)

4. RESPONSE
   { jwt: token, student: {...} }

5. CLIENT STORAGE
   localStorage.setItem('token', token)

6. SUBSEQUENT REQUESTS
   Authorization: Bearer <token>

7. SERVER VERIFICATION
   - Extract token from header
   - Verify signature with JWT_SECRET
   - Check expiration
   - Extract user from payload
```

### Security Measures

| Layer | Measure |
|-------|---------|
| **Transport** | HTTPS/TLS (production) |
| **Authentication** | JWT with HS256 |
| **Passwords** | bcrypt with salt rounds 10 |
| **CORS** | Restricted origins (production) |
| **Rate Limiting** | 5 failed face-auth attempts per 15 min |
| **Rate Limiting** | 5 failed login attempts per 15 min |
| **Input Validation** | Pydantic for all endpoints |
| **Database** | MongoDB credentials (env vars) |

---

## Voice Processing Pipeline

### Speech-to-Text (Whisper)

```
AUDIO INPUT (WAV)
      │
      ▼
┌─────────────────┐
│ Whisper Model   │  model=small
│ (CPU/GPU)       │  temperature=0
│                 │  language=en
└────────┬────────┘
         │
         ▼
   TEXT OUTPUT
  (with confidence)
```

### Text-to-Speech (espeak-ng)

```
TEXT INPUT
    │
    ▼
┌─────────────────┐
│ espeak-ng       │  rate=150
│ (WAV Generator) │  pitch=50
│                 │  voice=en
└────────┬────────┘
         │
         ▼
   AUDIO OUTPUT (WAV)
     │
     ├─► Play on server (return to client)
     └─► Or return file URL
```

### LLM Answer Formatting (Ollama/Llama3)

```
RAW STUDENT ANSWER
       │
       ▼
   PROMPT ENGINEERING
   "Format this exam answer..."
       │
       ▼
┌─────────────────────┐
│ Ollama/Llama3       │  model=llama3:latest
│ (on localhost:11434)│  temperature=0.2
│                     │  max_tokens=500
└────────┬────────────┘
         │
         ▼
   FORMATTED ANSWER
   (or fallback to raw)
```

---

## Face Recognition Pipeline

### 1. Registration (One-Time)

```
┌─────────────────────────────────────────────────┐
│          FACE REGISTRATION PIPELINE             │
└─────────────────────────────────────────────────┘

STEP 1: Capture 5 Frames
   Frame 1, Frame 2, Frame 3, Frame 4, Frame 5

STEP 2: Extract Embeddings (face-api.js CNN)
   Each frame → 128D vector
   [e1: [0.1, -0.5, 0.8, ...],
    e2: [0.2, -0.4, 0.9, ...],
    e3: [0.1, -0.5, 0.7, ...],
    e4: [0.15, -0.45, 0.85, ...],
    e5: [0.12, -0.48, 0.82, ...]]

STEP 3: L2 Normalization (unit vector)
   e1_norm = e1 / ||e1||

STEP 4: Average (robust to variations)
   final_embedding = (e1_norm + e2_norm + e3_norm + e4_norm + e5_norm) / 5

STEP 5: Store in MongoDB
   db.face_embeddings.insertOne({
     studentId: "...",
     embedding: final_embedding,  # 128D
     registeredAt: ISODate(),
     confidence: 0.95
   })
```

### 2. Verification (Auth)

```
┌─────────────────────────────────────────────────┐
│         FACE VERIFICATION FOR LOGIN            │
└─────────────────────────────────────────────────┘

STEP 1: Capture Live Frame
   live_frame → face-api.js

STEP 2: Extract Embedding
   live_embedding = CNN(live_frame)

STEP 3: L2 Normalize
   live_embedding_norm = live_embedding / ||live_embedding||

STEP 4: Query DB
   stored_embedding = db.face_embeddings.findOne({studentId})

STEP 5: Calculate Similarity
   cosine_similarity = dot(live_embedding_norm, stored_embedding_norm)

STEP 6: Compare with Threshold
   if cosine_similarity >= 0.85:
       ✓ VERIFIED → Issue JWT
   else:
       ✗ REJECTED → Retry or fallback
```

### Thresholds

| Metric | Threshold | Reasoning |
|--------|-----------|-----------|
| Cosine Similarity | >= 0.85 | Balances specificity with false negatives |
| Euclidean Distance | < 0.55 | Fallback measure (secondary) |
| Frame distance (registration) | < 0.3sec | Avoid blur/motion artifacts |

---

## Database Schema

### Collections

#### `students`
```javascript
{
  _id: ObjectId,
  studentId: string,
  registerNumber: string,
  email: string,
  name: string,
  passwordHash: string,
  faceRegistered: boolean,
  createdAt: ISODate,
  updatedAt: ISODate,
  isActive: boolean,
  metadata: {
    lastLogin: ISODate,
    loginCount: number
  }
}
```

#### `face_embeddings`
```javascript
{
  _id: ObjectId,
  studentId: string,
  embedding: [128 floats],  # 128D CNN output
  registeredAt: ISODate,
  confidence: float,
  modelVersion: string
}
```

#### `exams`
```javascript
{
  _id: ObjectId,
  examId: string,
  title: string,
  description: string,
  duration: number,  # minutes
  questions: [{
    questionId: string,
    text: string,
    type: string,  # short, long, mcq
    marks: number
  }],
  createdBy: string,  # admin id
  createdAt: ISODate,
  updatedAt: ISODate
}
```

#### `exam_sessions`
```javascript
{
  _id: ObjectId,
  sessionId: string,
  examId: string,
  studentId: string,
  startedAt: ISODate,
  endedAt: ISODate,
  status: string,  # in-progress, submitted, timed-out
  answers: Map<questionId, answer>,
  duration: number  # seconds
}
```

#### `responses`
```javascript
{
  _id: ObjectId,
  sessionId: string,
  examId: string,
  studentId: string,
  answers: [{
    questionId: string,
    rawAnswer: string,
    formattedAnswer: string,
    recordedAt: ISODate
  }],
  submittedAt: ISODate,
  score: number
}
```

#### `face_login_attempts`
```javascript
{
  _id: ObjectId,
  studentId: string,
  success: boolean,
  similarity: float,
  attemptedAt: ISODate,
  ipAddress: string
}
```

#### `admins`
```javascript
{
  _id: ObjectId,
  email: string,
  passwordHash: string,
  name: string,
  role: string,  # admin, super-admin
  createdAt: ISODate,
  createdBy: string  # parent admin
}
```

---

## API Design

### REST Conventions

```
Resource → HTTP Method → Action

/api/v1/students
  GET    - List all students
  POST   - Create student

/api/v1/students/{id}
  GET    - Get specific student
  PUT    - Update student
  DELETE - Delete student

/api/v1/students/{id}/face-verify
  POST   - Verify face
```

### Request/Response Format

```json
/* Success Response (200) */
{
  "success": true,
  "data": { /* resource */ },
  "message": "Operation successful"
}

/* Error Response (4xx/5xx) */
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2026-03-17T..."
}
```

### Authentication Header

```
Authorization: Bearer <JWT_TOKEN>

Example:
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Deployment Architecture

### Development
- **Backend**: Uvicorn (`--reload` enabled)
- **Frontend**: Vite dev server (HMR)
- **Database**: Local MongoDB
- **AI Services**: Local Whisper, Ollama, espeak-ng

### Production
```
┌─────────────────────────────────────────────┐
│          PRODUCTION ARCHITECTURE            │
└─────────────────────────────────────────────┘

┌─────────────────────┐
│   Load Balancer     │
│  (NGINX/ALB)        │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
┌─────────┐   ┌─────────┐
│ Backend │   │ Backend │  (Horizontal scaling)
│  Pod 1  │   │  Pod 2  │
└────┬────┘   └────┬────┘
     │             │
     └──────┬──────┘
            ▼
    ┌───────────────┐
    │   MongoDB     │
    │  Replica Set  │  (HA)
    └───────────────┘

CDN for Frontend (S3 + CloudFront)
```

---

## Performance Considerations

### Caching Strategy
- **Client**: JWT in localStorage, face embeddings in sessionStorage
- **Server**: MongoDB indexes on frequently queried fields
- **Response**: Cache-Control headers for static assets

### Optimization
- **Face Registration**: Process 5 frames in parallel (async)
- **STT**: Stream audio chunks for low-latency
- **TTS**: Pre-generate common phrases
- **LLM**: Cache prompts and temperature settings

---

## Error Handling

### Client-Side
- ErrorBoundary component for React errors
- Toast notifications for API errors
- Fallback UI on network failure

### Server-Side
- FastAPI exception handlers
- Structured error responses
- Audit logging for security events
- Rate limiting on sensitive endpoints
