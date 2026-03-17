# Team-A Backend

This backend now runs on Python FastAPI.

## Default runtime

- Entry: app/main.py
- Start script: start-python-backend.ps1
- Port: 3000
- Frontend target: Team-A-Frontend/.env -> VITE_API_BASE_URL=http://localhost:3000

## Legacy runtime isolation

The old Node/Electron backend has been isolated under:

- legacy-node-electron/

It is retained only for reference and transition support. It is not part of the default development path.

## Smoke test

Run the backend smoke test after starting FastAPI:

- `python scripts/smoke_test.py` (or `.venv/Scripts/python.exe scripts/smoke_test.py` on Windows)

This validates login, exams, submissions, and face registration endpoints.
