# MindKraft (VoiceSecure)

Accessible AI-powered examination platform with:
- face-based student authentication,
- voice-assisted exam flow (STT/TTS),
- admin exam management,
- student exam lifecycle (dashboard, checklist, exam, submission, results).

## Current Features

### Authentication
- Admin login flow.
- Student password login (`/api/auth/login`).
- Student face login (`/api/auth/face-recognize`).
- Face verification by exam and by student ID.

### Face Recognition
- Multi-frame face registration for students.
- Backend embedding normalization and cosine similarity matching.
- Anti-false-positive tuning with stricter similarity thresholds.
- Login attempt tracking endpoints.

### Voice & AI
- Speech-to-text command endpoint (`/api/ai/stt-command`).
- Speech-to-text answer endpoint (`/api/ai/stt-answer`).
- Backend text-to-speech WAV generation via `espeak-ng` (`/api/ai/tts-speak`).
- Answer formatting endpoint (`/api/ai/format-answer`).

### Student Experience
- Face login page with fallback password login.
- Student dashboard and exam selector.
- Pre-exam checklist.
- Exam interface.
- Submission confirmation and results pages.
- Student settings page.

### Admin Experience
- Admin portal with student face registration integration.
- Exam/pipeline endpoints available under `/api/admin`.

---

## Tech Stack

### Frontend (`Team-A-Frontend`)
- React 18
- TypeScript
- Vite
- TailwindCSS
- face-api.js
- framer-motion
- react-router-dom

### Backend (`Team-A-Backend/Team-A-Backend`)
- Node.js
- Express 5
- TypeScript
- Multer (audio upload handling)
- bcrypt + jsonwebtoken
- MongoDB/Mongoose support + in-memory mock database mode

---

## Project Structure

- `Team-A-Frontend/` — React app
- `Team-A-Backend/Team-A-Backend/` — Express backend + services
- `INTEGRATION_GUIDE.md` — detailed integration reference

---

## Run Locally

### 1) Backend (persistent MongoDB required)
```bash
cd Team-A-Backend/Team-A-Backend
npm install
npm run server
```

Backend URL: `http://localhost:3000`
Health check: `http://localhost:3000/health`

### 2) Frontend
```bash
cd Team-A-Frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

---

## Environment Variables

### Environment Variables

The backend requires a running MongoDB instance and reads configuration from `.env`:
```env
USE_MOCK_DB=false    # forcing real database mode
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017
OLLAMA_URL=http://localhost:11434
```

### Voice/AI Dependencies

To enable speech-to-text and text-to-speech features the server needs external binaries:

* **espeak-ng** (Windows installer or build) – used by `ttsService` to generate WAV audio. Set `ESPEAK_BIN` or `ESPEAK_NG_BIN` in your `.env` if the executable is not on your `PATH`.
* **OpenAI Whisper** (Python package or standalone binary) – used for STT. Install via `pip install -U openai-whisper` or use `git clone`/build; set `WHISPER_BIN` if the `whisper` command isn't available.
* **ffmpeg** – whisper relies on ffmpeg for audio conversion. Install from https://ffmpeg.org/ or via `choco install ffmpeg` on Windows; set `FFMPEG_BIN` if necessary.

When the backend starts it will log the presence/absence of these binaries and warn if any are missing.  Without them the `/api/ai/*` endpoints will respond with errors.

For a Windows development setup you can run something like:

```powershell
# install via chocolatey (requires admin PowerShell)
choco install espeak-ng ffmpeg
pip install -U openai-whisper
```

Then add to `.env` if the executables aren't found automatically:
```env
ESPEAK_BIN="C:\Program Files\eSpeak NG\espeak-ng.exe"
WHISPER_BIN=whisper            # or full path
FFMPEG_BIN=C:\ffmpeg\bin\ffmpeg.exe
```

See `src/services/tts.service.ts` and `src/services/speech.service.ts` for more details and startup warnings.

Frontend `.env` remains the same:
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## Key API Routes (Current)

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
- `GET /api/face/attempts/:studentId`

### AI / Voice
- `POST /api/ai/stt-command`
- `POST /api/ai/stt-answer`
- `POST /api/ai/tts-speak`
- `POST /api/ai/format-answer`

---

## Default Mock Credentials

Admin (mock seed):
- Username: `admin`
- Password: `admin123`

---

## Notes

- Mock DB mode is ideal for development; in-memory data resets when backend restarts.
- For full route mapping and integration details, see `INTEGRATION_GUIDE.md`.
Updated project documentation.