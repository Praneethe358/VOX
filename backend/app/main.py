from __future__ import annotations

import tempfile
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Request, Response, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .database import MongoRepository
from .security import create_token, decode_token, require_admin_jwt, require_roles, verify_password
from .utils.sanitize import safe_str, sanitize_value
from .services.ai import AIService
from .services.face import FaceService
from .services.pdf_parser import extract_questions, parse_pdf_file, parse_uploaded_exam

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


app = FastAPI(title="vox-backend", version="2.0.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — use FRONTEND_URL for production, fall back to * for local dev
allowed_origins = [settings.frontend_url] if settings.frontend_url else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ok(data: Any = None, message: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    return payload



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


def require_admin_or_401(username: str, password: str) -> None:
    if not repo.admin_login(username, password):
        raise HTTPException(status_code=401, detail="Invalid username or password")


def get_v1_payload(authorization: str = Header(..., alias="Authorization")) -> dict[str, Any]:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    return decode_token(authorization.split(" ", 1)[1].strip())


def ensure_roles(payload: dict[str, Any], *roles: str) -> dict[str, Any]:
    if roles and payload.get("role") not in roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return payload


@app.get("/health")
def health() -> dict[str, Any]:
    return {"status": "ok", "service": "vox-backend", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/exams/{exam_id}")
def get_exam_by_id_compat(exam_id: str) -> dict[str, Any]:
    exam = repo.get_exam_by_code(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok(exam)


@app.post("/api/admin/login")
@limiter.limit("5/minute")
async def admin_login(request: Request, body: dict[str, Any]) -> dict[str, Any]:
    username = safe_str(body.get("username") or "")
    password = safe_str(body.get("password") or "")
    if not username or not password:
        raise HTTPException(status_code=400, detail="username and password required")
    # Verify credentials via existing method
    if not repo.admin_login(username, password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    # Fetch admin record for JWT payload
    admin = repo.collection("admins").find_one(
        {"$or": [{"username": username}, {"email": username.lower().strip()}]}
    )
    if not admin:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({
        "sub": str(admin.get("_id", "")),
        "email": admin.get("email", ""),
        "name": admin.get("name", ""),
        "role": admin.get("role", "admin"),
    })
    return ok({
        "authenticated": True,
        "token": token,
        "admin": {
            "id": str(admin.get("_id", "")),
            "name": admin.get("name", ""),
            "email": admin.get("email", ""),
            "role": admin.get("role", "admin"),
        },
    })


@app.get("/api/admin/exams")
def admin_exams(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return ok(repo.get_all_exams())


@app.post("/api/admin/create-exam")
async def create_exam(body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    title = str(body.get("title") or "").strip()
    if not title:
        raise HTTPException(status_code=400, detail="title is required")
    code = str(body.get("code") or title).strip().upper().replace(" ", "_")
    code = "".join(char for char in code if char.isalnum() or char == "_")
    raw_questions = list(body.get("questions") or [])
    questions = []
    for index, question in enumerate(raw_questions):
        options = question.get("options") if isinstance(question, dict) else None
        has_options = isinstance(options, list) and len(options) >= 2
        questions.append(
            {
                "id": question.get("id", index + 1),
                "text": question.get("text", ""),
                "type": question.get("type") or ("mcq" if has_options else "descriptive"),
                **({"options": options} if has_options else {}),
                **({"correctAnswer": question.get("correctAnswer")} if has_options and question.get("correctAnswer") is not None else {}),
            }
        )
    repo.save_exam(
        {
            "code": code,
            "title": title,
            "questions": questions,
            "durationMinutes": int(body.get("durationMinutes") or 30),
            "status": "draft",
            "instructions": str(body.get("instructions") or ""),
        }
    )
    mcq_count = len([question for question in questions if question["type"] == "mcq"])
    return ok({"code": code, "questionCount": len(questions), "mcqCount": mcq_count})


@app.post("/api/admin/upload-exam-pdf")
async def upload_exam_pdf(
    pdf: UploadFile | None = File(default=None),
    code: str | None = Form(default=None),
    title: str = Form(...),
    durationMinutes: str = Form(default="30"),
    instructions: str | None = Form(default=None),
    _auth: dict[str, Any] = Depends(require_admin_jwt),
) -> dict[str, Any]:
    exam_code = (code or title).strip().upper().replace(" ", "_")
    exam_code = "".join(char for char in exam_code if char.isalnum() or char == "_")
    questions: list[dict[str, Any]] = []
    if pdf:
        content = await pdf.read()
        if (pdf.filename or "").lower().endswith(".pdf"):
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
                temp_pdf.write(content)
                temp_path = Path(temp_pdf.name)
            try:
                questions = parse_pdf_file(temp_path)
            finally:
                temp_path.unlink(missing_ok=True)
        else:
            questions = parse_uploaded_exam(pdf.filename or "upload.txt", content)
    repo.save_exam(
        {
            "code": exam_code,
            "title": title.strip(),
            "questions": questions,
            "durationMinutes": int(durationMinutes or 30),
            "status": "draft",
            "instructions": (instructions or "").strip(),
        }
    )
    mcq_count = len([question for question in questions if question.get("type") == "mcq"])
    return ok({"code": exam_code, "questionCount": len(questions), "mcqCount": mcq_count})


@app.post("/api/admin/publish-exam")
async def publish_exam(body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    code = str(body.get("code") or "")
    if not code:
        raise HTTPException(status_code=400, detail="code required")
    repo.publish_exam(code, "active")
    return ok({"published": True, "code": code})


@app.post("/api/admin/unpublish-exam")
async def unpublish_exam(body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    code = str(body.get("code") or "")
    if not code:
        raise HTTPException(status_code=400, detail="code required")
    repo.publish_exam(code, "draft")
    return ok({"unpublished": True, "code": code})


@app.delete("/api/admin/exam/{code}")
def delete_exam(code: str, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    if not repo.delete_exam(code):
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok({"deleted": True, "code": code})


@app.put("/api/admin/exam/{code}")
async def update_exam(code: str, body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    if not repo.update_exam(code, body):
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok({"updated": True, "code": code})


@app.post("/api/admin/register-student-face")
async def register_student_face(body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    repo.register_student({**body, "registeredAt": body.get("registeredAt") or datetime.now(timezone.utc).isoformat()})
    return ok({"registered": True})


@app.get("/api/admin/dashboard/stats")
def admin_dashboard_stats(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return ok(repo.get_dashboard_stats())


@app.get("/api/admin/activity")
def admin_activity(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return ok(repo.get_recent_activity())


@app.get("/api/admin/submissions")
def admin_submissions(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return ok(repo.get_submissions())


@app.get("/api/admin/students-for-scoring")
def students_for_scoring(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return ok(repo.get_students_for_scoring())


@app.post("/api/admin/score")
async def admin_score(body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    student_id = body.get("studentId")
    score = body.get("score")
    if student_id is None or score is None:
        raise HTTPException(status_code=400, detail="studentId and score required")
    repo.set_student_score(str(student_id), int(score))
    return ok({"scored": True})


@app.get("/api/admin/answers/{student_id}/download")
def download_answers(student_id: str, examCode: str | None = None, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> PlainTextResponse:
    answers = repo.get_student_answers(student_id, examCode)
    lines = []
    for index, answer in enumerate(answers):
        lines.append(
            f"{index + 1}. [{answer.get('examTitle') or answer.get('examCode')}] Q{int(answer.get('questionIndex', 0)) + 1}: {answer.get('question', '')}\n"
            f"   Answer: {answer.get('answer', '')}\n"
            f"   Time: {answer.get('timestamp', '')}"
        )
    text = f"Student Answers - {student_id}\n{'=' * 60}\n\n" + "\n\n".join(lines)
    headers = {"Content-Disposition": f'attachment; filename="answers-{student_id}.txt"'}
    return PlainTextResponse(text, headers=headers)


@app.get("/api/admin/answers/{student_id}")
def admin_answers(student_id: str, examCode: str | None = None, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return ok(repo.get_student_answers(student_id, examCode))


@app.get("/api/student/exams")
def student_exams() -> dict[str, Any]:
    return ok(repo.get_active_exams())


@app.post("/api/student/verify-face")
async def student_verify_face(body: dict[str, Any]) -> dict[str, Any]:
    try:
        exam_code = str(body.get("examCode") or "")
        live_descriptor = body.get("liveDescriptor")
        if not exam_code or not isinstance(live_descriptor, list):
            raise HTTPException(status_code=400, detail="examCode and liveDescriptor required")
        if len(live_descriptor) < 64:
            raise HTTPException(status_code=400, detail=f"Invalid descriptor: must have at least 64 dimensions, got {len(live_descriptor)}")
        result = face_service.verify_face(exam_code, live_descriptor)
        return ok({"matched": result["success"], "studentId": result.get("studentId"), "confidence": result.get("confidence", 0), "distance": result.get("distance", 999)})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Face verification error: {str(exc)}")


@app.get("/api/student/exam/{code}")
def student_exam(code: str) -> dict[str, Any]:
    exam = repo.get_exam_by_code(code)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok(exam)


@app.post("/api/student/get-exam")
async def student_get_exam(body: dict[str, Any]) -> dict[str, Any]:
    code = str(body.get("code") or "")
    exam = repo.get_exam_by_code(code)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok(exam)


@app.post("/api/student/start-exam")
async def start_exam(body: dict[str, Any]) -> dict[str, Any]:
    exam_code = str(body.get("examCode") or "")
    roll_number = str(body.get("rollNumber") or "")
    student_id = body.get("studentId")
    if not exam_code or not roll_number:
        raise HTTPException(status_code=400, detail="examCode and rollNumber required")
    exam = repo.get_exam_by_code(exam_code)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    session_id = repo.start_exam_session(exam_code, roll_number, str(student_id) if student_id else None)
    return ok({"sessionId": session_id, "examCode": exam_code, "rollNumber": roll_number, "exam": exam})


@app.post("/api/student/submit-answer")
async def submit_answer(body: dict[str, Any]) -> dict[str, Any]:
    roll_number = body.get("rollNumber")
    exam_code = body.get("examCode")
    question_index = body.get("questionIndex")
    if roll_number is None or exam_code is None or question_index is None:
        raise HTTPException(status_code=400, detail="rollNumber, examCode, questionIndex, answer required")
    repo.save_session_answer(str(roll_number), str(exam_code), int(question_index), str(body.get("answer") or ""))
    return ok({"saved": True})


@app.post("/api/student/end-exam")
async def end_exam(body: dict[str, Any]) -> dict[str, Any]:
    roll_number = str(body.get("rollNumber") or "")
    exam_code = str(body.get("examCode") or "")
    if not roll_number or not exam_code:
        raise HTTPException(status_code=400, detail="rollNumber and examCode required")
    return ok(repo.end_exam_session(roll_number, exam_code))


@app.post("/api/auth/login")
@limiter.limit("5/minute")
async def auth_login(request: Request, body: dict[str, Any]) -> dict[str, Any]:
    email = safe_str(body.get("email") or "")
    password = safe_str(body.get("password") or "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password required")
    student = repo.find_student_by_credentials(email, password)
    if not student:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    student_id = student.get("studentId") or student.get("rollNumber") or "unknown"
    token = create_token({"studentId": student_id, "email": student.get("email"), "rollNumber": student.get("rollNumber")})
    return ok(
        {
            "authenticated": True,
            "token": token,
            "student": {
                "studentId": student_id,
                "name": student.get("name") or student.get("fullName"),
                "email": student.get("email"),
                "rollNumber": student.get("rollNumber"),
                "examCode": student.get("examCode"),
            },
        }
    )


@app.post("/api/auth/face-recognize")
@limiter.limit("30/minute")
async def auth_face_recognize(request: Request, body: dict[str, Any]) -> dict[str, Any]:
    exam_code = str(body.get("examCode") or "")
    descriptor = body.get("liveDescriptor") or body.get("faceDescriptor")
    if not exam_code or not isinstance(descriptor, list):
        raise HTTPException(status_code=400, detail="examCode and face descriptor required")
    result = face_service.verify_face(exam_code, descriptor)
    if not result["success"]:
        raise HTTPException(status_code=401, detail="Face not recognized")
    student = repo.find_student_by_id(str(result.get("studentId") or ""))
    student_id = result.get("studentId") or student.get("studentId") if student else "unknown"
    token = create_token({"studentId": student_id, "email": student.get("email") if student else None, "rollNumber": student.get("rollNumber") if student else None})
    return ok(
        {
            "matched": True,
            "studentId": student_id,
            "token": token,
            "student": {
                "studentId": student_id,
                "name": student.get("name") if student else None,
                "email": student.get("email") if student else None,
                "rollNumber": student.get("rollNumber") if student else None,
                "examCode": student.get("examCode") if student else None,
            }
            if student
            else None,
        }
    )


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
async def db_log_audit(body: dict[str, Any]) -> dict[str, Any]:
    if not body.get("studentId") or not body.get("examCode") or not body.get("action"):
        raise HTTPException(status_code=400, detail="studentId, examCode and action required")
    repo.log_audit(str(body["studentId"]), str(body["examCode"]), str(body["action"]), body.get("metadata"))
    return ok({"logged": True})


@app.post("/api/db/submit-exam")
async def db_submit_exam(body: dict[str, Any]) -> dict[str, Any]:
    student_id = str(body.get("studentId") or "")
    exam_code = str(body.get("examCode") or "")
    if not student_id or not exam_code:
        raise HTTPException(status_code=400, detail="studentId and examCode required")
    repo.submit_exam(student_id, exam_code)
    return ok({"submitted": True})


@app.get("/api/students/dashboard")
def students_dashboard(x_student_id: str | None = Header(default=None, alias="X-Student-Id")) -> dict[str, Any]:
    student_id = x_student_id or ""
    return ok(repo.get_student_dashboard_stats(student_id))


@app.get("/api/students/profile")
def students_profile(x_student_id: str | None = Header(default=None, alias="X-Student-Id")) -> dict[str, Any]:
    student_id = x_student_id or ""
    return ok({"student": repo.get_student_profile(student_id)})


@app.get("/api/results")
def results() -> dict[str, Any]:
    return ok(repo.get_all_results())


@app.get("/api/results/{session_id}")
def result_by_session(session_id: str) -> dict[str, Any]:
    result = repo.get_result_by_session(session_id)
    if not result:
        raise HTTPException(status_code=404, detail="Result not found")
    return ok(result)


@app.post("/api/ai/stt-command")
async def stt_command(audio: UploadFile = File(...)) -> dict[str, Any]:
    return ok(await ai_service.transcribe(audio))


@app.post("/api/ai/stt-answer")
async def stt_answer(audio: UploadFile = File(...)) -> dict[str, Any]:
    return ok(await ai_service.transcribe(audio))


@app.post("/api/ai/tts-speak")
async def tts_speak(body: dict[str, Any]) -> Response:
    text = str(body.get("text") or "")
    if not text:
        raise HTTPException(status_code=400, detail="text required")
    wav_bytes = ai_service.synthesize(text, int(body.get("speed") or 150), str(body.get("voice") or "en-us"), int(body.get("pitch") or 50))
    return Response(content=wav_bytes, media_type="audio/wav", headers={"Cache-Control": "no-cache"})


@app.post("/api/ai/format-answer")
async def format_answer(body: dict[str, Any]) -> dict[str, Any]:
    raw_text = str(body.get("rawText") or "")
    if not raw_text:
        raise HTTPException(status_code=400, detail="rawText required")
    return ok({"formatted": ai_service.format_answer(raw_text, body.get("questionContext"))})


@app.post("/api/face/register")
async def face_register(body: dict[str, Any]) -> dict[str, Any]:
    student_id = body.get("studentId")
    student_name = body.get("studentName")
    descriptors = body.get("descriptors")
    if not student_id or not student_name:
        raise HTTPException(status_code=400, detail="studentId and studentName are required")
    if not isinstance(descriptors, list) or not descriptors:
        raise HTTPException(status_code=400, detail="descriptors array is required (capture at least 1 frame)")
    for index, descriptor in enumerate(descriptors):
        if not isinstance(descriptor, list) or len(descriptor) < 64:
            raise HTTPException(status_code=400, detail=f"Invalid descriptor at index {index}: must be a number array of length >= 64")
    return ok(face_service.register_face_embedding(body))


@app.post("/api/face/verify")
async def face_verify(body: dict[str, Any]) -> dict[str, Any]:
    try:
        live_descriptor = body.get("liveDescriptor")
        if not isinstance(live_descriptor, list) or not live_descriptor:
            raise HTTPException(status_code=400, detail="liveDescriptor array is required")
        if len(live_descriptor) < 64:
            raise HTTPException(status_code=400, detail=f"Invalid descriptor: must have at least 64 dimensions, got {len(live_descriptor)}")
        result = face_service.verify_face(str(body.get("examCode") or ""), live_descriptor)
        return ok(
            {
                "matched": result["success"],
                "studentId": result.get("studentId"),
                "confidence": result.get("confidence", 0),
                "distance": result.get("distance", 0),
                "method": "cosine",
                "student": result.get("student"),
            }
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Face verification error: {str(exc)}")


@app.post("/api/face/verify-by-id")
async def face_verify_by_id(body: dict[str, Any]) -> dict[str, Any]:
    try:
        student_id = str(body.get("studentId") or "")
        live_descriptor = body.get("liveDescriptor")
        if not student_id:
            raise HTTPException(status_code=400, detail="studentId is required")
        if not isinstance(live_descriptor, list) or not live_descriptor:
            raise HTTPException(status_code=400, detail="liveDescriptor array is required")
        if len(live_descriptor) < 64:
            raise HTTPException(status_code=400, detail=f"Invalid descriptor: must have at least 64 dimensions, got {len(live_descriptor)}")
        return ok(face_service.verify_face_by_student_id(student_id, live_descriptor))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Face verification error: {str(exc)}")


@app.get("/api/face/students")
def face_students() -> dict[str, Any]:
    return ok(face_service.get_registered_students())


@app.get("/api/face/embedding/{student_id}")
def face_embedding(student_id: str) -> dict[str, Any]:
    embedding = face_service.get_face_embedding(student_id)
    if not embedding:
        raise HTTPException(status_code=404, detail="No face embedding found for this student")
    return ok(
        {
            "studentId": embedding.get("studentId"),
            "studentName": embedding.get("studentName"),
            "embeddingSize": len(embedding.get("normalizedEmbedding") or []),
            "frameCount": embedding.get("frameCount"),
            "qualityScore": embedding.get("qualityScore"),
            "createdAt": embedding.get("createdAt"),
            "updatedAt": embedding.get("updatedAt"),
        }
    )


@app.delete("/api/face/embedding/{student_id}")
def delete_face_embedding(student_id: str) -> dict[str, Any]:
    return ok({"deleted": face_service.delete_face_embedding(student_id), "studentId": student_id})


@app.get("/api/face/attempts/{student_id}")
def face_attempts(student_id: str) -> dict[str, Any]:
    return ok(face_service.get_login_attempts(student_id))


@app.post("/api/v1/auth/admin-login")
@limiter.limit("5/minute")
async def v1_admin_login(request: Request, body: dict[str, Any]) -> dict[str, Any]:
    email = str(body.get("email") or "").lower().strip()
    password = str(body.get("password") or "")
    if not email or not password:
        raise HTTPException(status_code=400, detail="email and password are required")
    admin = repo.get_admin_by_email(email)
    if not admin or not verify_password(password, admin.get("passwordHash")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"adminId": str(admin.get("_id")), "email": admin.get("email"), "role": admin.get("role")})
    return ok(
        {
            "token": token,
            "admin": {
                "id": str(admin.get("_id")),
                "name": admin.get("name"),
                "email": admin.get("email"),
                "role": admin.get("role"),
                "mfaEnabled": admin.get("mfaEnabled", False),
            },
        }
    )


@app.post("/api/v1/auth/admins")
async def v1_create_admin(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    ensure_roles(payload, "super-admin")
    for field in ("name", "email", "password", "role"):
        if not body.get(field):
            raise HTTPException(status_code=400, detail="name, email, password and role are required")
    try:
        admin = repo.create_admin(body)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return JSONResponse(status_code=201, content=ok(admin))


@app.post("/api/v1/students")
async def v1_create_student(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> JSONResponse:
    ensure_roles(payload, "super-admin", "exam-admin")
    student = repo.create_v1_student(body)
    return JSONResponse(status_code=201, content=ok(student))


@app.patch("/api/v1/students/{student_id}/face-embedding")
async def v1_update_face_embedding(student_id: str, body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    ensure_roles(payload, "super-admin", "exam-admin")
    face_embedding = body.get("faceEmbedding")
    if not isinstance(face_embedding, list) or not face_embedding:
        raise HTTPException(status_code=400, detail="faceEmbedding must be a non-empty numeric array")
    student = repo.update_v1_face_embedding(student_id, face_embedding)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return ok(student)


@app.post("/api/v1/exams")
async def v1_create_exam(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> JSONResponse:
    payload = ensure_roles(payload, "super-admin", "exam-admin")
    exam = repo.create_v1_exam(body, str(payload.get("adminId")))
    return JSONResponse(status_code=201, content=ok(exam))


@app.get("/api/v1/exams/{exam_id}")
def v1_get_exam(exam_id: str, payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    ensure_roles(payload, "super-admin", "exam-admin")
    exam = repo.get_v1_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return ok(exam)


@app.post("/api/v1/exam-sessions/start")
async def v1_start_exam_session(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> JSONResponse:
    ensure_roles(payload, "super-admin", "exam-admin")
    if not body.get("studentId") or not body.get("examId"):
        raise HTTPException(status_code=400, detail="studentId and examId are required")
    session = repo.start_v1_exam_session({**body, "kioskVerified": bool(body.get("kioskVerified", False))})
    return JSONResponse(status_code=201, content=ok(session))


@app.post("/api/v1/exam-sessions/{session_id}/submit")
async def v1_submit_exam_session(session_id: str, body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    ensure_roles(payload, "super-admin", "exam-admin")
    session = repo.submit_v1_exam_session(session_id, body.get("finalPdfURL"))
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return ok(session)


@app.get("/api/v1/exam-sessions/{session_id}")
def v1_get_exam_session(session_id: str, payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    ensure_roles(payload, "super-admin", "exam-admin")
    session = repo.get_v1_exam_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return ok(session)


@app.put("/api/v1/answers/autosave")
async def v1_autosave_answer(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    ensure_roles(payload, "super-admin", "exam-admin")
    for field in ("examSessionId", "questionNumber", "rawSpeechText", "formattedAnswer"):
        if not body.get(field):
            raise HTTPException(status_code=400, detail="examSessionId, questionNumber, rawSpeechText and formattedAnswer are required")
    return ok(repo.autosave_v1_answer(body))


@app.post("/api/v1/activity-logs")
async def v1_activity_logs(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> JSONResponse:
    ensure_roles(payload, "super-admin", "exam-admin")
    if not body.get("examSessionId") or not body.get("eventType"):
        raise HTTPException(status_code=400, detail="examSessionId and eventType are required")
    return JSONResponse(status_code=201, content=ok(repo.create_activity_log(body)))


@app.get("/api/v1/config/ai")
def v1_get_ai_config(payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    ensure_roles(payload, "super-admin", "exam-admin")
    return ok(repo.get_ai_config())


@app.put("/api/v1/config/ai")
async def v1_update_ai_config(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> dict[str, Any]:
    payload = ensure_roles(payload, "super-admin")
    return ok(repo.update_ai_config(body, str(payload.get("adminId"))))


@app.post("/api/v1/config/system-logs")
async def v1_create_system_log(body: dict[str, Any], payload: dict[str, Any] = Depends(get_v1_payload)) -> JSONResponse:
    ensure_roles(payload, "super-admin", "exam-admin")
    return JSONResponse(status_code=201, content=ok(repo.create_system_log(body)))


@app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
def not_found(path_name: str) -> JSONResponse:
    return JSONResponse(status_code=404, content={"error": "Route not found"})
