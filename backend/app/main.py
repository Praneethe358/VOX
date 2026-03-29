"""MindKraft (Vox) backend — FastAPI application entry point."""
from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from fastapi import FastAPI, File, Header, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from .config import get_settings
from .database import MongoRepository
from .schemas import AuditLogRequest, FormatAnswerRequest, SubmitExamRequest, TTSRequest
from .security import create_token, decode_token, require_admin_jwt, require_roles, verify_password
from .services.ai import AIService
from .services.face import FaceService

# ─── Singletons (imported by routers via `from ..main import repo`) ───────────
settings = get_settings()
repo = MongoRepository(settings)
face_service = FaceService(repo)
ai_service = AIService(settings)


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    # SECURITY: validate JWT secret on startup
    secret = settings.jwt_secret
    if secret in ("vox-local-dev-secret-change-this", "vox-docker-dev-secret-change-this", "change-this"):
        import warnings
        warnings.warn("\n⚠️  SECURITY WARNING: Using default JWT secret! Set JWT_SECRET env var to a random ≥32-char string.", stacklevel=1)
    elif len(secret) < 32:
        import warnings
        warnings.warn(f"\n⚠️  SECURITY WARNING: JWT_SECRET is only {len(secret)} chars. Use ≥32 chars for production.", stacklevel=1)
    repo.initialize()
    yield


# ─── Rate limiter ─────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["100/minute"])

# ─── FastAPI app ──────────────────────────────────────────────────────────────
app = FastAPI(title="vox-backend", version="3.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS: support comma-separated FRONTEND_URL values and common local dev origins.
configured_origins = [
    origin.strip().rstrip("/")
    for origin in (settings.frontend_url or "").split(",")
    if origin.strip()
]
local_dev_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4100",
    "http://127.0.0.1:4100",
]
allowed_origins = list(dict.fromkeys([*configured_origins, *local_dev_origins]))
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Register routers ────────────────────────────────────────────────────────
from .routers import admin, auth, face, student, v1  # noqa: E402

app.include_router(admin.router)
app.include_router(auth.router)
app.include_router(face.router)
app.include_router(student.router)
app.include_router(v1.router)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def ok(data: Any = None, message: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    return payload


# ─── Exception handlers ──────────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "error": str(exc.detail), "message": str(exc.detail)},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"success": False, "error": str(exc), "message": "Invalid request"})


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    import traceback
    traceback.print_exc()  # Log full trace server-side only
    return JSONResponse(status_code=500, content={"success": False, "error": "Internal server error", "message": "An unexpected error occurred"})


# ─── Shared endpoints (not tied to a specific domain) ────────────────────────

@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "vox-backend", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/")
def root() -> dict[str, Any]:
    return ok({"service": "vox-backend", "health": "/health", "docs": "/docs"}, "Backend is running")


@app.get("/api/exams/{exam_id}")
def get_exam_by_id_compat(exam_id: str) -> dict[str, Any]:
    exam = repo.get_exam_by_code(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok(exam)


@app.post("/api/exam-sessions/start")
async def exam_sessions_start(body: dict[str, Any]) -> dict[str, Any]:
    exam_code = str(body.get("examCode") or body.get("examId") or "")
    roll_number = str(body.get("rollNumber") or body.get("studentId") or "")
    if not exam_code or not roll_number:
        raise HTTPException(status_code=400, detail="examCode/examId and rollNumber/studentId required")
    session_id = repo.start_exam_session(exam_code, roll_number, str(body.get("studentId") or ""))
    return ok({"sessionId": session_id})


@app.post("/api/exam-sessions/autosave")
async def exam_sessions_autosave(body: dict[str, Any]) -> dict[str, Any]:
    return ok(repo.auto_save_session(body))


@app.post("/api/exam-sessions/submit")
async def exam_sessions_submit(body: dict[str, Any]) -> dict[str, Any]:
    return ok(repo.submit_full_exam(body))


@app.post("/api/db/save-response")
async def db_save_response(body: dict[str, Any]) -> dict[str, Any]:
    repo.save_response(body)
    return ok({"saved": True})


@app.post("/api/db/log-audit")
async def db_log_audit(body: AuditLogRequest) -> dict[str, Any]:
    repo.log_audit(body.studentId, body.examCode, body.action, body.metadata)
    return ok({"logged": True})


@app.post("/api/db/submit-exam")
async def db_submit_exam(body: SubmitExamRequest) -> dict[str, Any]:
    repo.submit_exam(body.studentId, body.examCode)
    return ok({"submitted": True})


@app.get("/api/students/dashboard")
def students_dashboard(x_student_id: str | None = Header(default=None, alias="X-Student-Id")) -> dict[str, Any]:
    return ok(repo.get_student_dashboard_stats(x_student_id or ""))


@app.get("/api/students/profile")
def students_profile(x_student_id: str | None = Header(default=None, alias="X-Student-Id")) -> dict[str, Any]:
    return ok({"student": repo.get_student_profile(x_student_id or "")})


@app.get("/api/results")
def results() -> dict[str, Any]:
    return ok(repo.get_all_results())


@app.get("/api/results/{session_id}")
def result_by_session(session_id: str) -> dict[str, Any]:
    result = repo.get_result_by_session(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return ok(result)


# ─── AI Endpoints ─────────────────────────────────────────────────────────────

@app.post("/api/ai/stt-command")
async def stt_command(audio: UploadFile = File(...)) -> dict[str, Any]:
    return ok(await ai_service.transcribe(audio))


@app.post("/api/ai/stt-answer")
async def stt_answer(audio: UploadFile = File(...)) -> dict[str, Any]:
    return ok(await ai_service.transcribe(audio))


@app.post("/api/ai/tts-speak")
async def tts_speak(body: TTSRequest) -> Response:
    wav_bytes = ai_service.synthesize(body.text, body.speed, body.voice, body.pitch)
    return Response(content=wav_bytes, media_type="audio/wav", headers={"Cache-Control": "no-cache"})


@app.post("/api/ai/format-answer")
async def format_answer(body: FormatAnswerRequest) -> dict[str, Any]:
    return ok({"formatted": ai_service.format_answer(body.rawText, body.questionContext)})


# ─── Catch-all 404 ────────────────────────────────────────────────────────────

@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def not_found(path_name: str) -> JSONResponse:
    return JSONResponse(status_code=404, content={"error": "Route not found"})
