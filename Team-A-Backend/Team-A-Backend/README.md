# Team-A Backend

This backend now runs on Python FastAPI.

## Default runtime

- Entry: app/main.py
- Start script: start-python-backend.ps1
- Port: 3000
- Frontend target: Team-A-Frontend/.env -> VITE_API_BASE_URL=http://localhost:3000
- STT note: command and dictation STT are browser-native in the frontend flow
- Backend AI scope: TTS fallback (`/api/ai/tts-speak`) and LLM formatting (`/api/ai/format-answer`)

## Legacy runtime isolation

The old Node/Electron backend has been isolated under:

- legacy-node-electron/

It is retained only for reference and transition support. It is not part of the default development path.

## Voice flow boundary (current)

- Landing page onboarding prompt is emitted by frontend TTS when `/` opens.
- The 15-second inactivity reminder is managed in frontend `useVoiceNavigation` and is disabled specifically for landing page.

## Smoke test

Run the backend smoke test after starting FastAPI:

- `python scripts/smoke_test.py` (or `.venv/Scripts/python.exe scripts/smoke_test.py` on Windows)

This validates login, exams, submissions, and face registration endpoints.
