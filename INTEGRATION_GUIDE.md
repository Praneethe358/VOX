# Vox - Integration Guide

This guide documents the active frontend-backend integration after Phase 2 rollout.

## Runtime Endpoints

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health: `GET /health`
- API base: `/api/*`
- Protected API base: `/api/v1/*`

## Current Integration Model

- Browser-first client communicates with FastAPI over HTTP.
- Voice STT is browser-native (Web Speech API).
- Backend no longer performs command/answer audio transcription in active flow.
- Backend still handles TTS fallback, LLM formatting, auth, exam/session persistence, and face verification.

## Environment Configuration

### Backend `.env`

```env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB_NAME=vox
PORT=3000
FRONTEND_URL=http://localhost:5173
JWT_SECRET=vox-local-dev-secret-change-this
ESPEAK_BIN=C:\Program Files\eSpeak NG\espeak-ng.exe
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3:latest
VOX_SUPERADMIN_EMAIL=admin@vox.edu
VOX_SUPERADMIN_PASSWORD=ChangeMe@123
```

### Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:3000
```

## API Surface (Active)

### Health

- `GET /health`

### Auth

- `POST /api/auth/login`
- `POST /api/auth/face-recognize`

### Face

- `POST /api/face/register`
- `POST /api/face/verify`
- `POST /api/face/verify-by-id`
- `GET /api/face/students`
- `GET /api/face/embedding/:studentId`
- `DELETE /api/face/embedding/:studentId`

### AI

- `POST /api/ai/tts-speak`
- `POST /api/ai/format-answer`

### Student/Admin/Session

- `GET /api/student/exams`
- `POST /api/student/start-exam`
- `POST /api/student/submit-answer`
- `POST /api/student/end-exam`
- `POST /api/exam-sessions/start`
- `POST /api/exam-sessions/autosave`
- `POST /api/exam-sessions/submit`
- `POST /api/admin/login`
- `POST /api/admin/create-exam`
- `POST /api/admin/upload-exam-pdf`
- `POST /api/admin/publish-exam`

### V1 Protected APIs

- `/api/v1/auth/*`
- `/api/v1/students/*`
- `/api/v1/exams/*`
- `/api/v1/exam-sessions/*`
- `/api/v1/answers/*`
- `/api/v1/activity-logs/*`
- `/api/v1/config/*`

## Frontend Route Integration

### Student Flow

1. `/student/login` (face login)
2. `/student/exams` (exam selection)
3. `/student/exam/:examId/checklist`
4. `/student/exam/:examId/briefing`
5. `/student/exam/:examId/interface`
6. `/student/submission-confirmation`
7. `/student/results`

### Admin Flow

1. `/admin-login`
2. `/admin`

## Voice Integration Details

### STT (Active)

- `useVoiceEngine`: in-exam command detection.
- `useVoiceNavigation`: page navigation commands.
- `useDictation`: written answer dictation.

Behavior:
- Real-time transcript streaming into answer input.
- 10-second silence timeout.
- Continue dictation appends text.
- Edit answer clears and restarts.

### TTS (Active)

- Client-side speech synthesis is primary for prompts and navigation feedback.
- Server-side fallback uses `/api/ai/tts-speak` with espeak-ng.

### LLM Formatting

- Endpoint: `/api/ai/format-answer`
- Engine: Ollama + Llama 3
- Scope: MCQ review-mode formatting
- Not applied to descriptive/numerical written answers

## Data Contracts

### Question Shape

```ts
{
  id: string | number,
  text: string,
  type: 'mcq' | 'descriptive' | 'numerical',
  options?: string[],
  correctAnswer?: number,
  marks?: number,
  expectedAnswerLength?: 'short' | 'medium' | 'long'
}
```

### Answer Shape

```ts
{
  questionId: string | number,
  rawText: string,
  formattedText: string,
  selectedOption?: number
}
```

## PDF Ingestion Expectations

Parser should support:
- MCQ with options
- Descriptive prompts
- Numerical prompts

Type inference should return one of:
- `mcq`
- `descriptive`
- `numerical`

## Autosave and Submission

- Autosave interval: 15 seconds.
- Written and MCQ answers are merged for final submission.
- Activity events are logged for review/audit.

## Deprecated Integration Paths

The following are legacy and not active in current model:

- Whisper command transcription endpoint references
- Whisper answer transcription endpoint references
- ffmpeg STT conversion pipeline
- Electron IPC-first integration as primary runtime

## Verification Checklist

- Build frontend successfully.
- Verify voice commands on exam interface.
- Verify written dictation text appears directly in answer box.
- Verify continue/edit commands work as expected.
- Verify API calls reach FastAPI routes and persist in MongoDB.
