# Vox - Presentation Guide (Updated)

## Slide 1 - Title

Vox
Voice-First Accessible Examination Platform

Tagline:
Your AI-powered scribe partner: Face Login -> Voice Navigation -> Mixed Question Exams -> Effortless Submission

## Slide 2 - Problem and Goal

Problem:
- Typing-heavy exam systems exclude many students with motor limitations.
- Cloud-only AI dependencies can be expensive and unreliable in controlled exam labs.

Goal:
- Provide a voice-first but hybrid-capable exam system.
- Keep core exam operations resilient and locally controllable.

## Slide 3 - What Vox Delivers

- Password-free Face Login (Accessible & Seamless).
- Voice-assisted end-to-end exam journey.
- Dynamic support for MCQ, descriptive, and numerical questions.
- Hybrid answer model: dictation and manual typing.
- Secure exam lifecycle with autosave and audit logs.

## Slide 4 - Architecture Snapshot

Frontend:
- React + TypeScript + Vite
- Voice state machine and command engine
- Browser SpeechRecognition for STT

Backend:
- Python FastAPI
- MongoDB persistence
- AI endpoints for TTS fallback and LLM formatting

## Slide 5 - Voice Architecture

Layers:
1. VoiceContext: global state and transitions
2. useVoiceEngine: in-exam command detection
3. useVoiceNavigation: page-level voice navigation
4. useDictation: written answer dictation

Landing onboarding:
- On opening `/`, system says: "Welcome to Vox. Say Student or Admin to continue."
- Landing page uses role-command routing and intentionally skips inactivity reminder.

Command examples:
- start answer
- continue dictation
- edit answer
- confirm answer
- next question
- submit exam

## Slide 6 - Phase 2 Written Exam Flow

- Student opens written question.
- Says "start answer" or types directly.
- Dictation streams into answer box in real time.
- 5-second silence auto-stop.
- Student can append (`continue dictation`) or restart (`edit answer`).
- `confirm answer` stores response.

## Slide 7 - AI Pipeline Clarification

STT:
- Browser-native Web Speech API for commands and written dictation.

TTS:
- Client speech synthesis by default.
- Server fallback through `/api/ai/tts-speak` using espeak-ng.

LLM formatting:
- `/api/ai/format-answer` via Ollama/Llama3.
- Applied to MCQ review flows.
- Not applied to descriptive/numerical written answers.

## Slide 8 - Security Model

- Face verification and attempt controls.
- JWT-protected APIs.
- Session and activity logging.
- Autosave/revision trail for exam integrity.
- Legacy kiosk shell exists but is not default runtime.

## Slide 9 - Data and API

Data:
- Exams, sessions, answers, face embeddings, activity logs.

API groups:
- /api/auth, /api/face, /api/ai, /api/student, /api/admin
- /api/v1/* for protected workflows and structured entities

## Slide 10 - Demo Script

1. Face login.
2. Select exam by voice.
3. Complete checklist.
4. Answer one MCQ by voice option.
5. Answer one descriptive question by dictation + manual edit.
6. Confirm and submit.
7. Show submission confirmation and result retrieval.

## Slide 11 - Key Outcomes

- Faster dictation UX via browser-native STT.
- Cleaner written-answer experience (direct input box flow).
- Better command consistency across exam states.
- Reliable landing entry guidance with one-time welcome narration.
- Unified Phase 2 documentation and operational flow.

## Slide 12 - Closing

Vox enables accessible, secure, and practical assessment with a modern hybrid voice-first architecture.

