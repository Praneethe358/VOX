# VoiceSecure – How to Run the Full System

## Quick Start (2 terminals)

### Terminal 1 — Backend (Mock DB mode)
```powershell
cd "Team-A-Backend\Team-A-Backend"
npm run server:mock
# Server starts at http://localhost:3000
# Seeded: admin/admin123  |  student demo@student.local / student123  |  exam TECH101
```

### Terminal 2 — Frontend
```powershell
cd "Team-A-Frontend"
npm run dev
# Opens at http://localhost:5173
```

---

## Login Credentials (Mock DB)

| Role    | URL                         | Credentials                              |
|---------|-----------------------------|------------------------------------------|
| Admin   | /admin-login                | username: `admin`  password: `admin123`  |
| Student | /student/login-fallback     | email: `demo@student.local`  pw: `student123` |
| Student | /student/login (face auth)  | Position face in camera; Demo Skip button also available |

---

## Full Exam Flow (Voice-only)

1. Go to `/student/login-fallback` → log in with demo credentials  
2. You are taken to `/student/exams` — microphone indicator appears top-right  
3. Say **"select exam 1"** (or click "Start Exam →")  
4. Pre-exam checklist verifies mic / network / fullscreen → auto-advances  
5. Exam interface loads → question is read aloud  
6. Say **"start answering"** → dictate your answer  
7. Say **"confirm answer"** → saves and moves on  
8. Say **"next question"** / **"previous question"** / **"submit exam"**  

### All 13 Voice Commands (exam interface)
| Say                   | Action                    |
|-----------------------|---------------------------|
| start answering       | Begin dictation           |
| stop dictating        | End dictation             |
| confirm answer        | Save dictated answer      |
| edit answer           | Re-dictate from scratch   |
| continue dictation    | Append to current answer  |
| next question         | Go to next question       |
| previous question     | Go to previous question   |
| repeat question       | Re-read current question  |
| read my answer        | Hear saved answer         |
| clear answer          | Delete saved answer       |
| pause exam            | Freeze timer              |
| resume exam           | Resume from pause         |
| submit exam           | Finish the exam           |

### Navigation Commands (dashboard / exam list)
| Say                   | Action                    |
|-----------------------|---------------------------|
| dashboard / home      | Go to dashboard           |
| exams / take an exam  | Go to exam list           |
| select exam N         | Select exam by number     |
| results / scores      | View results              |
| settings              | Open settings             |
| go back / back        | Browser back              |
| logout / sign out     | Sign out                  |
| help                  | Read all commands aloud   |

---

## Rebuild After Code Changes

```powershell
# Backend
cd "Team-A-Backend\Team-A-Backend"
npm run build
node dist/server/standalone-mock.js

# Frontend — hot reload is automatic with npm run dev
```

---

## Environment Variables (`.env` in Team-A-Backend/Team-A-Backend/)
| Variable         | Value                        | Notes                          |
|-----------------|------------------------------|--------------------------------|
| USE_MOCK_DB     | true                         | Use in-memory DB (no MongoDB)  |
| PORT            | 3000                         | Backend port                   |
| JWT_SECRET      | voicesecure-local-dev-...    | Change in production           |
| MONGODB_URI     | mongodb+srv://...            | Only used when USE_MOCK_DB=false|
| WHISPER_BIN     | path to whisper.exe          | Backend STT fallback           |
| FFMPEG_BIN      | path to ffmpeg.exe           | Required for Whisper           |

---

## Troubleshooting

| Issue                              | Fix                                                     |
|------------------------------------|---------------------------------------------------------|
| "Invalid credentials" on login     | Use exact `demo@student.local` / `student123`           |
| Mic indicator red                  | Click lock icon in Chrome address bar → allow mic       |
| Exam list empty                    | Backend not running; start `npm run server:mock`        |
| Voice commands not recognized      | Speak clearly, wait for mic indicator to pulse green    |
| Port 3000 in use                   | `Stop-Process (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force` |
| Frontend not updating              | `npm run dev` in Team-A-Frontend folder                 |
