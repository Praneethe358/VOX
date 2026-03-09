# MindKraft Integration Guide (Current)

## Overview
This document reflects the **currently implemented** frontend/backend integration and tech stack in this repository.

- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- Backend: Node.js + Express 5 + TypeScript
- Database mode: Persistent MongoDB (mock mode removed)
- Face recognition: `face-api.js` descriptors + backend cosine matching
- Voice stack: STT endpoints + `espeak-ng` TTS endpoint

---

## Tech Stack

### Frontend (`Team-A-Frontend`)
- `react`, `react-dom`
- `react-router-dom`
- `typescript`
- `vite`
- `tailwindcss`
- `face-api.js`
- `framer-motion`

### Backend (`Team-A-Backend/Team-A-Backend`)
- `express`
- `typescript`
- `mongodb` + `mongoose` (real DB option)
- `bcrypt`, `jsonwebtoken`
- `multer`, `pdf-parse`, `pdfkit`
- `axios`, `cors`, `dotenv`

---

## Run Locally

### 1) Backend (Port 3000)
```bash
cd Team-A-Backend/Team-A-Backend
npm run server
```

### 2) Frontend (Port 5173)
```bash
cd Team-A-Frontend
npm run dev
```

### 3) URLs
- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/health`

---

## Environment

### Frontend
Set in `Team-A-Frontend/.env`:
```env
VITE_API_BASE_URL=http://localhost:3000
```

### Backend
Ensure MongoDB is running and configure `Team-A-Backend/Team-A-Backend/.env` appropriately:
```env
USE_MOCK_DB=false
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017
OLLAMA_URL=http://localhost:11434
```

---

## Current API Surface

### Health
- `GET /health`

### Auth (`/api/auth`)
- `POST /login` (student password login)
- `POST /face-recognize` (student face login route)

### Face (`/api/face`)
- `POST /register`
- `POST /verify`
- `POST /verify-by-id`
- `GET /students`
- `GET /embedding/:studentId`
- `DELETE /embedding/:studentId`
- `GET /attempts/:studentId`

### AI / Voice (`/api/ai`)
- `POST /stt-command`
- `POST /stt-answer`
- `POST /tts-speak`
- `POST /format-answer`

### Other active route groups
- `/api/admin`
- `/api/student`
- `/api/students`
- `/api/results`
- `/api/exam-sessions`
- `/api/db`
- `/api/v1` (VoiceSecure route group)

---

## Frontend Route Integration (Current)

From `Team-A-Frontend/src/App.tsx`:

### Public
- `/`
- `/admin-login`
- `/splash`
- `/student/login`
- `/student/login-fallback`

### Protected (Admin)
- `/admin`

### Protected (Student)
- `/student/dashboard`
- `/student/exams`
- `/student/exam/:examId/checklist`
- `/student/exam/:examId/interface`
- `/student/submission-confirmation`
- `/student/results`
- `/student/settings`
- `/student/exam-briefing`

---

## Face Recognition Flow (Implemented)

1. Admin registers student face using multi-frame capture.
2. Frontend sends descriptors to `POST /api/face/register`.
3. Backend stores normalized embeddings (mock DB in local mode).
4. Student login calls:
   - `POST /api/face/verify-by-id` when student ID is known, or
   - `POST /api/face/verify` for exam-based matching.
5. Backend returns match status, confidence, and student metadata.

Current matching hardening:
- Backend cosine threshold set to stricter matching (`0.85`) to reduce false positives.
- Frontend login confidence gate aligned to stricter acceptance.

---

## Voice Integration (Implemented)

- STT upload endpoints accept recorded audio blobs (`multer` temp upload).
- TTS endpoint `POST /api/ai/tts-speak` returns WAV audio generated via `espeak-ng`.
- Frontend uses backend TTS/STT endpoints for exam voice interactions.

---

## Notes

- Application now always uses real MongoDB; mock mode has been removed.
