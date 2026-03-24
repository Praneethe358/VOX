# 🏗️ Phase 4 — Architecture Refactoring

**Date:** 2026-03-25  
**Commit:** `3959006`  

---

## Summary

Refactored the monolithic `backend/app/main.py` (760 lines) into 5 domain-specific router modules + a centralized Pydantic schema file.

## Before vs After

| Metric | Before (v2) | After (v3) |
|--------|-------------|------------|
| `main.py` lines | 770 | 185 |
| Router modules | 0 | 5 |
| Pydantic models | 0 | 22 |
| Input validation | Manual `str(body.get(...))` | Automatic via Pydantic |
| NoSQL injection defense | `safe_str()` on login only | Built into all schema validators |

## New File Structure

```
backend/app/
├── main.py              # App setup, CORS, error handlers, shared endpoints (185 lines)
├── schemas.py           # 22 Pydantic request models with validation
├── routers/
│   ├── __init__.py
│   ├── admin.py         # 15 admin endpoints (JWT-protected)
│   ├── auth.py          # Student login + face recognize
│   ├── face.py          # Face registration, verification, management
│   ├── student.py       # Exam access, answer submission
│   └── v1.py            # V1 API (admin management, sessions, config)
├── security.py          # JWT middleware, bcrypt
├── config.py            # Settings
├── database.py          # MongoDB repository
├── services/            # Business logic (AI, face, PDF)
└── utils/               # Sanitization
```

## Pydantic Models Added

| Schema | Validates | Protects Against |
|--------|-----------|-----------------|
| `AdminLoginRequest` | username, password (string, 1-200 chars) | NoSQL injection (rejects dict/list) |
| `StudentLoginRequest` | email, password | NoSQL injection |
| `FaceRecognizeRequest` | examCode, descriptor | Type confusion |
| `CreateExamRequest` | title (1-300), duration (1-600 min) | Over-sized input, invalid types |
| `VerifyFaceRequest` | examCode, descriptor (min 64 dims) | Truncated/empty descriptors |
| `StartExamRequest` | examCode, rollNumber | Missing fields |
| `SubmitAnswerRequest` | rollNumber, examCode, questionIndex (≥0) | Negative indices |
| `ScoreRequest` | studentId, score (≥0) | Negative scores |
| `FaceRegisterRequest` | studentId, studentName, descriptors (≥1) | Empty registrations |
| `TTSRequest` | text (1-5000 chars), speed, voice, pitch | Oversized TTS input |
| `AuditLogRequest` | studentId, examCode, action | Missing audit fields |
| `V1AdminLoginRequest` | email, password | NoSQL injection |
| `V1CreateAdminRequest` | name, email, password (≥8), role | Weak passwords |
| `V1ExamSessionStartRequest` | studentId, examId | Missing fields |
| `V1AutosaveAnswerRequest` | examSessionId, questionNumber (≥1) | Invalid question numbers |
| `V1ActivityLogRequest` | examSessionId, eventType | Missing fields |

## Router Breakdown

| Router | Prefix | Endpoints | Auth |
|--------|--------|-----------|------|
| `admin.py` | `/api/admin` | 15 | JWT (admin/superadmin) |
| `auth.py` | `/api/auth` | 2 | Public (rate limited) |
| `face.py` | `/api/face` | 6 | Public |
| `student.py` | `/api/student` | 6 | Public |
| `v1.py` | `/api/v1` | 13 | JWT (role-based) |
| `main.py` | `/api/*` | 12 | Mixed |
