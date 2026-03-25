# Vox: Your AI-Powered Scribe Partner

> **Empowering inclusive education with an AI-driven, 100% voice-navigated examination platform.**<br>
> Vox eliminates the need for human scribes by providing a seamless, fully speech-to-text hybrid testing environment.

---

## 🌟 Vision & Mission
Traditional examinations present significant barriers for students with accessibility needs or physical limitations. Often, they must rely on human scribes—which can cause scheduling issues, misinterpretations, and a loss of personal independence. 

**Vox represents the future of accessible testing as your personal AI scribe.** From login to submission, a student never has to touch the keyboard. Our system combines frictionless biometric access, advanced voice navigation, and intelligent speech-to-text formatting to create an equitable, human-equivalent scribe experience. Security (like face recognition) is utilized primarily to make the experience *password-free and seamless*, rather than restrictive.

---

## 🚀 Key Accessibility Features

### 🎙️ 100% Hands-Free Journey
- **Password-Free Login:** Face authentication allows students to log in and confirm their identity simply by looking at the camera. Say goodbye to typing complex passwords.
- **Voice Navigation:** Complete platform traversal via voice ("Select exam 1", "Go to Dashboard", "Start Exam").
- **Smart Briefing:** Exams begin with an automated, natural-sounding audio walkthrough of rules.

### 📝 The AI Scribe Experience
- **Direct Voice Dictation:** For descriptive questions, speech is instantly transcribed directly into the answer box with zero latency via the Web Speech API. 
- **Voice-Controlled MCQ:** Speak your option ("Option A", "Submit") to navigate multiple-choice seamlessly.
- **Smart Pacing & Silence Detection:** 
  - The system respects your thinking time but knows when you are done. The dictation agent automatically stops after 5 seconds of silence.
  - Optional Llama-3 AI formatting corrects the syntax and grammar of spoken responses to ensure spoken thoughts are translated into professional academic writing.
- **Full Vocal Control:** Change your mind entirely via voice. Say "edit answer" to redo, "continue dictation" to append, or "confirm answer" to save.

### 🛡️ Safe, Secure & Worry-Free
- **Kiosk-Mode Lockdown:** A secure environment prevents accidental navigations or distractions without compromising voice interactions.
- **Continuous Auto-Save:** Exam progress is implicitly saved every 15 seconds, completely removing the anxiety of "forgetting to save".
- **Auto-Submission:** Exams auto-submit upon timer expiration, followed by an automated 15-second redirect. No manual clicks required.

---

## 💻 Tech Stack

### Frontend (`frontend/`)
| Technology | Purpose |
|-----------|---------|
| **React 18 & TypeScript** | Robust UI Architecture |
| **Web Speech API** | Client-side Native Speech-to-Text & Text-to-Speech |
| **face-api.js** | Client-side face detection for frictionless login |
| **Tailwind CSS** | Accessible dark-theme UI designed for clarity |
| **Framer Motion** | Visual feedback and micro-animations |

### Backend (`backend/`)
| Technology | Purpose |
|-----------|---------|
| **Python FastAPI** | Asynchronous, fast, and documented API engine |
| **PyMongo & Mongoose**| MongoDB integration and Data Modeling |
| **Pydantic** | Strict schema validation |
| **pypdf** | Intelligent PDF parsing for exam creation |
| **espeak-ng** | Robust server-side Text-to-Speech fallback |
| **Ollama & Llama 3** | Scribe grammar correction and spoken text formatting |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| **Docker Compose** | Streamlined multi-container orchestration |
| **Nginx** | Security headers and reverse proxying |
| **MongoDB 7.0** | Scalable document data storage |

---

## ⚙️ Running Vox Locally (Docker)

The fastest and most reliable way to run Vox is through our orchestrated Docker setup.

### Prerequisites
- Docker & Docker Compose
- (Optional but recommended) Locally running `Ollama` on port `11434` for grammar features.

### Start the Platform
1. **Clone & Build:**
   ```bash
   git clone <repository_url>
   cd mindkraft
   # Make sure the frontend, backend, and mongo services are spun up
   docker compose up -d --build
   ```

2. **Access Points & Ports:**
   - **Frontend (Student & Admin UI):** `http://localhost:4100`
   - **Backend API & Docs:** `http://localhost:4000/docs`
   - **MongoDB Database:** `mongodb://localhost:4200`
   
3. **Database Access (Docker):**
   *See [docs/MONGODB_DOCKER_GUIDE.md](docs/MONGODB_DOCKER_GUIDE.md) for full query documentation.*
   ```bash
   docker exec -it mindkraft-mongo-1 mongosh --username voxadmin --password VoxSecure2026! --authenticationDatabase admin vox
   ```

### Default Credentials
- **Super Admin Panel:** Username: `admin` | Password: `admin123` 

---

## 📂 Project Structure Overview

```text
mindkraft/
├── README.md                          ← This file
├── docker-compose.yml                 ← Container orchestration
├── frontend/                          ← React + Vite Web App
│   ├── src/
│   │   ├── components/student/        ← Scribe layout, VoiceSpeaker, MicWaveform
│   │   ├── hooks/student/             ← Core Scribe hooks: useDictation, useVoiceEngine
│   │   ├── context/                   ← VoiceContext (Global Voice State Machine)
│   │   └── pages/                     ← Hands-free exam interfaces
├── backend/                           ← Python FastAPI Engine
│   ├── app/
│   │   ├── routers/                   ← Modular endpoints (auth, face, student, admin) 
│   │   └── services/                  ← AI Scribe handlers, PDF parsers
├── nginx/                             ← Proxy and Web security configs
└── docs/                              ← Comprehensive documentation
```

---

## 📖 Deep Dive Documentation

If you are a developer or admin looking to configure the platform, see our dedicated `/docs`:

- **[MONGODB DOCKER GUIDE](docs/MONGODB_DOCKER_GUIDE.md)** - Database access cheatsheet
- **[QUICKSTART](docs/QUICKSTART.md)** - Rapid development setup
- **[ARCHITECTURE](docs/ARCHITECTURE.md)** - System design and data flows
- **[INTEGRATION GUIDE](docs/INTEGRATION_GUIDE.md)** - API Endpoints Reference
- **[DOCKER DEPLOYMENT](docs/DOCKER_DEPLOYMENT.md)** - Container ops

---
*Vox Platform — Redefining accessibility, engineering independence.*
