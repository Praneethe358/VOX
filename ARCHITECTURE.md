# Vox - Architecture

This document describes the current production architecture after Phase 2 integration.

## System Overview

Vox uses a browser-first client with FastAPI backend services and MongoDB persistence.

1. Student authenticates through face verification or password fallback.
2. Student enters exam flow with voice-assisted navigation.
3. Question UI switches dynamically by question type.
4. Answers are captured via MCQ selection or written dictation/manual typing.
5. Responses autosave every 15 seconds and submit through unified APIs.

## High-Level Architecture

```text
Browser Client (React + TS + Vite)
  - face-api.js
  - VoiceContext state machine
  - useVoiceEngine (commands)
  - useDictation (written STT)
  - useVoiceNavigation (page nav)
          |
          | HTTP
          v
FastAPI Backend (Python 3.11)
  - /api/* legacy-compatible routes
  - /api/v1/* JWT-protected routes
  - AI services (TTS fallback, LLM formatting)
          |
          v
MongoDB (vox)
```

## Frontend Voice Model

### State Model

`IDLE -> FACE_AUTH -> EXAM_BRIEFING -> COMMAND_MODE <-> DICTATION_MODE -> SUBMISSION_GATE -> FINALIZE`

Additional branch:
- `COMMAND_MODE -> PAUSE_MODE -> COMMAND_MODE`
- `FACE_AUTH -> LOCKED` after repeated failed attempts

### Command Processing

- Command parsing uses exact, contains, and fuzzy matching.
- Supports 13+ in-exam commands.
- Written-flow commands include:
  - `start answer`
  - `continue dictation`
  - `edit answer`
  - `confirm answer`

### Dictation Processing

- STT source: browser SpeechRecognition/webkitSpeechRecognition.
- Transcript streams directly into answer input.
- 10-second silence timeout stops dictation.
- Continue dictation preserves existing text and appends new speech.

## Authentication Architecture

### Face Login

- Client extracts face embeddings with face-api.js.
- Backend compares against stored embeddings via cosine similarity.
- On success, JWT/session data are issued for protected routes.

### Password Fallback

- Standard email/password path with JWT response.

## Exam Data Architecture

### Question Types

- `mcq`
- `descriptive`
- `numerical`

### Answer Behavior

- MCQ answers are selected and stored as options/value pairs.
- Written/numerical answers are stored as typed or dictated text.
- Written answers bypass LLM formatting to preserve exact student text.

## Backend Service Architecture

### Core Services

- `face` service for enrollment, verification, and attempt controls
- `ai` service for:
  - `tts-speak` fallback synthesis via espeak-ng
  - `format-answer` via Ollama/Llama 3
- `pdf_parser` service for exam ingestion and typed-question extraction

### API Groups

- `health`
- `auth`
- `face`
- `ai`
- `admin`
- `student`
- `results`
- `exam-sessions`
- `db`
- `v1` protected APIs

## Storage and Audit

- MongoDB stores exams, sessions, answers, embeddings, and logs.
- Autosave persists answer drafts and revisions.
- Audit logs capture key exam actions and suspicious activity metadata.

## Deployment Notes

### Current Default Runtime

- Browser frontend + FastAPI backend + MongoDB.

### Legacy Runtime

- Electron/IPC code paths remain for transition support but are not active default architecture.

## Deprecations

The following are not active in current Phase 2 flow and should be treated as legacy references only:

- Backend Whisper STT pipelines
- ffmpeg-based STT conversion flow
- STT upload endpoints for command/answer transcription
- Electron-first IPC command pipelines

## Design Principles

1. Accessibility-first exam interaction.
2. Low-latency browser-native voice control.
3. Hybrid input for written questions (voice + typing).
4. Security and auditability across full exam lifecycle.
5. Backward-compatible API evolution during migration.
