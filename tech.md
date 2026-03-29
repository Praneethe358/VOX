# VOX Tech Stack

This document lists the current technology stack used in this repository, why each technology is used, and its purpose in the system.

## 1) Frontend Stack

| Technology | Version | Why it is used | Purpose in VOX |
|---|---|---|---|
| React | 18.3.1 | Component-driven UI for complex interactive flows | Builds student/admin interfaces and reusable UI components |
| TypeScript | 5.7.2 | Strong typing reduces runtime bugs in large codebases | Improves reliability of API contracts, state, and component props |
| Vite | 6.x | Fast dev server and modern production bundling | Runs local dev UI and builds production frontend assets |
| React Router DOM | 6.30.1 | Declarative client-side routing | Handles navigation flows like landing, login, dashboard, exam interfaces |
| Tailwind CSS | 3.4.19 | Utility-first styling for rapid and consistent UI development | Implements the app visual system and responsive layouts |
| PostCSS + Autoprefixer | 8.5.6 / 10.4.24 | Standard CSS processing and browser compatibility | Processes CSS pipeline and auto-adds vendor prefixes |
| Framer Motion | 12.4.7 | Smooth state transitions and UI feedback | Provides animations for interaction states and page transitions |
| face-api.js | 0.22.2 | Browser-side face detection/embedding without server-heavy vision stack | Enables face registration and face-based authentication UX |
| vite-plugin-pwa | 1.1.0 | PWA generation support in Vite | Adds service worker + manifest for installable/offline-ready app behavior |

## 2) Backend Stack

| Technology | Version | Why it is used | Purpose in VOX |
|---|---|---|---|
| Python | 3.11+ runtime target | Productive backend development with strong ecosystem | Runtime for API, business logic, AI integration, and data handling |
| FastAPI | 0.116.1 | High-performance async API framework with validation | Implements HTTP APIs for auth, exams, face, student/admin flows |
| Uvicorn (standard) | 0.35.0 | Production-grade ASGI server for FastAPI | Serves backend application and supports reload/dev workflows |
| PyMongo | 4.12.1 | Direct MongoDB integration | Reads/writes exams, users, responses, submissions, logs |
| pydantic-settings | 2.10.1 | Typed environment configuration management | Loads and validates config such as Mongo URI, CORS, JWT settings |
| PyJWT | 2.10.1 | JWT creation/verification support | Powers admin and protected route authentication |
| bcrypt | 4.3.0 | Secure password hashing | Hashes and verifies admin/student credentials |
| python-multipart | 0.0.20 | Multipart form-data parsing for uploads | Supports PDF upload and other form-based API requests |
| pypdf | 5.9.0 | PDF text extraction/parsing | Converts uploaded exam PDFs into structured question payloads |
| httpx | 0.28.1 | Modern HTTP client for Python services | Calls external/local AI services (for formatting integrations) |
| slowapi | 0.1.9 | Request rate-limiting middleware for FastAPI | Adds abuse protection on sensitive endpoints |

## 3) Database and Persistence

| Technology | Version | Why it is used | Purpose in VOX |
|---|---|---|---|
| MongoDB | 7.x (Docker image) | Flexible document schema for evolving exam and activity data | Stores admins, students, exams, submissions, autosaves, audits |
| BSON/ObjectId model | Native Mongo model | Efficient identity and document references | Tracks entities and preserves Mongo-native identifiers |

## 4) AI, Speech, and Accessibility Stack

| Technology | Version | Why it is used | Purpose in VOX |
|---|---|---|---|
| Web Speech API (Browser STT/TTS) | Browser-native | Low-latency speech capabilities without extra local services | Voice commands, dictation flow, spoken prompts |
| espeak-ng (backend fallback) | System binary | Reliable server-side fallback when browser TTS is unavailable | `/api/ai/tts-speak` endpoint speech synthesis |
| Ollama | Service dependency | Local/private LLM hosting option | Hosts LLM for answer formatting pipeline |
| Llama 3 model | Configurable (default `llama3:latest`) | Natural-language cleanup and formatting | Formats spoken/raw text where enabled by backend logic |

## 5) Infrastructure and Deployment

| Technology | Version | Why it is used | Purpose in VOX |
|---|---|---|---|
| Docker Compose | Compose spec | Multi-service orchestration with predictable local setup | Runs frontend, backend, MongoDB, and optional Ollama together |
| Nginx (frontend runtime image/config) | Container-based | Efficient static asset serving and reverse proxy support | Serves built frontend and routes/proxies in containerized deployments |
| Docker volumes | Compose-managed | Persistent data across container restarts | Persists MongoDB data/config |

## 6) Developer Tooling

| Technology | Version | Why it is used | Purpose in VOX |
|---|---|---|---|
| npm | Node ecosystem standard | Dependency and script management for frontend | Installs packages and runs `dev`, `build`, `preview` workflows |
| concurrently | 9.2.1 | Run multiple local dev commands together | Supports full-stack local dev script combinations |
| PowerShell scripts | Repo scripts | Windows-friendly startup automation | Backend launch helpers and local setup convenience |

## 7) Security-Related Technologies

| Technology | Why it is used | Purpose in VOX |
|---|---|---|
| JWT auth | Stateless secure session propagation | Protects admin/v1 APIs and role-based access |
| bcrypt password hashing | Prevent plaintext password storage | Secures credential verification |
| slowapi rate-limiting | Mitigates brute-force and abuse | Protects authentication/sensitive routes |
| CORS controls (FastAPI middleware) | Restricts cross-origin access to trusted UI origins | Allows browser frontend while reducing cross-site misuse |

## 8) Runtime Ports and Service Mapping

| Service | Local URL / Port | Purpose |
|---|---|---|
| Frontend (Vite dev) | http://localhost:4100 | Main web UI for students/admins |
| Backend (FastAPI) | http://localhost:4000 | API server, auth, exam, AI endpoints |
| Backend docs | http://localhost:4000/docs | Interactive API documentation |
| MongoDB (local service) | mongodb://127.0.0.1:27017 | Local persistent data store |
| MongoDB (Docker mapping in compose) | localhost:4200 -> container 27017 | Containerized database access |

## 9) Summary

VOX uses a modern browser-first architecture:
- React + TypeScript frontend for accessible, voice-guided UX
- FastAPI + MongoDB backend for secure and scalable exam workflows
- Native/browser speech and optional local LLM services for AI-assisted accessibility
- Docker Compose for reproducible multi-service deployment
