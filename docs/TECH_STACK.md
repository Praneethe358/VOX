# Vox - Tech Stack

Vox is a voice-first exam platform with a Phase 2 hybrid exam flow: students can answer via voice dictation or manual typing, with browser-native speech recognition and FastAPI backend services.

## Core Architecture

- Frontend: React 18 + TypeScript + Vite
- Backend: Python 3.11 + FastAPI + Uvicorn
- Database: MongoDB (PyMongo + legacy-compatible schemas)
- STT: Browser Web Speech API (SpeechRecognition/webkitSpeechRecognition)
- TTS: Web Speech API (primary) + espeak-ng fallback endpoint
- LLM: Ollama + Llama 3 for MCQ review-mode formatting

## Frontend Stack

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI rendering and stateful components |
| TypeScript | 5.x | Type safety |
| Vite | 6.x | Dev server and production bundling |
| React Router DOM | 6.x | Route protection and page flow |
| Tailwind CSS | 3.x | Utility-first styling |
| Framer Motion | 12.x | Transitions and interaction feedback |
| face-api.js | 0.22.x | Client-side face embedding extraction |

## Backend Stack

| Technology | Version | Purpose |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.116+ | API framework |
| Uvicorn | 0.35+ | ASGI server |
| PyMongo | 4.x | MongoDB access |
| PyJWT | 2.x | Token-based auth |
| bcrypt | 4.x | Password hashing |
| pypdf | 5.x | PDF question extraction |
| httpx | 0.28+ | Ollama client calls |

## AI and Voice Stack

### Speech-to-Text (Current)

- Command recognition and written dictation run in browser via Web Speech API.
- Landing page voice onboarding is browser-native and supports "student"/"admin" role routing.
- Dictation streams directly into the answer box.
- 10-second silence auto-stop is enforced for written dictation.
- Continue mode appends to existing text; edit mode clears and restarts.

Navigation reminder behavior:
- `useVoiceNavigation` can announce after 15 seconds of inactivity.
- Landing page disables that reminder and uses only the welcome onboarding prompt.

### Text-to-Speech

- Primary: browser speech synthesis for low-latency prompts and status narration.
- Fallback: FastAPI endpoint `/api/ai/tts-speak` using espeak-ng.

### LLM Formatting

- Endpoint: `/api/ai/format-answer`
- Engine: Ollama (`llama3:latest`)
- Applied to MCQ review-mode cleanup.
- Not applied to descriptive/numerical written answers to preserve original student text.

## Security and Proctoring

- Face authentication with cosine similarity thresholds.
- Face attempt rate limiting.
- Voice-driven exam control with command-state machine.
- Audit logging and autosave trails.
- Legacy Electron kiosk code exists but is not the active default runtime.

## Data and Session Model

- Exam supports mixed question types: `mcq`, `descriptive`, `numerical`.
- Written answers are stored alongside MCQ answers in unified submission flow.
- Autosave interval: every 15 seconds.
- Submission includes response payloads and activity metadata.

## Runtime Modes

### Default (Current)

- Frontend in browser at `http://localhost:4100`
- FastAPI backend at `http://localhost:4000`
- MongoDB local instance

### Legacy (Deprecated)

- Node/Electron kiosk shell and IPC bridge retained only for transition reference.

## Notes for Contributors

- Prefer documenting Web Speech API paths for STT behavior.
- Do not document Whisper/ffmpeg command transcription pipeline as active.
- Keep command examples aligned with current exam flows (`start answer`, `continue dictation`, `edit answer`, `confirm answer`).
