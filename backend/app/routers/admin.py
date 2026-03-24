"""Admin API routes — all require JWT with admin role."""
from __future__ import annotations

import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import PlainTextResponse

from ..database import MongoRepository
from ..schemas import (
    AdminLoginRequest, CreateExamRequest, ExamCodeRequest, ScoreRequest,
)
from ..security import create_token, require_admin_jwt
from ..services.pdf_parser import parse_pdf_file, parse_uploaded_exam

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _get_repo() -> MongoRepository:
    from ..main import repo
    return repo


def _get_limiter():
    from ..main import limiter
    return limiter


@router.post("/login")
async def admin_login(request: Request, body: AdminLoginRequest) -> dict[str, Any]:
    from ..main import limiter
    # Rate limit applied via middleware
    username = body.username
    password = body.password
    repo = _get_repo()
    if not repo.admin_login(username, password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
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
    return _ok({
        "authenticated": True,
        "token": token,
        "admin": {
            "id": str(admin.get("_id", "")),
            "name": admin.get("name", ""),
            "email": admin.get("email", ""),
            "role": admin.get("role", "admin"),
        },
    })


@router.get("/exams")
def admin_exams(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return _ok(_get_repo().get_all_exams())


@router.post("/create-exam")
async def create_exam(body: CreateExamRequest, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    title = body.title.strip()
    code = (body.code or title).strip().upper().replace(" ", "_")
    code = "".join(c for c in code if c.isalnum() or c == "_")
    questions = []
    for i, q in enumerate(body.questions):
        has_options = q.options is not None and len(q.options) >= 2
        questions.append({
            "id": q.id or (i + 1),
            "text": q.text,
            "type": q.type or ("mcq" if has_options else "descriptive"),
            **({"options": q.options} if has_options else {}),
            **({"correctAnswer": q.correctAnswer} if has_options and q.correctAnswer else {}),
        })
    _get_repo().save_exam({
        "code": code, "title": title, "questions": questions,
        "durationMinutes": body.durationMinutes, "status": "draft",
        "instructions": body.instructions,
    })
    mcq_count = len([q for q in questions if q["type"] == "mcq"])
    return _ok({"code": code, "questionCount": len(questions), "mcqCount": mcq_count})


@router.post("/upload-exam-pdf")
async def upload_exam_pdf(
    pdf: UploadFile | None = File(default=None),
    code: str | None = Form(default=None),
    title: str = Form(...),
    durationMinutes: str = Form(default="30"),
    instructions: str | None = Form(default=None),
    _auth: dict[str, Any] = Depends(require_admin_jwt),
) -> dict[str, Any]:
    exam_code = (code or title).strip().upper().replace(" ", "_")
    exam_code = "".join(c for c in exam_code if c.isalnum() or c == "_")
    questions: list[dict[str, Any]] = []
    if pdf:
        content = await pdf.read()
        if (pdf.filename or "").lower().endswith(".pdf"):
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                tmp.write(content)
                tmp_path = Path(tmp.name)
            try:
                questions = parse_pdf_file(tmp_path)
            finally:
                tmp_path.unlink(missing_ok=True)
        else:
            questions = parse_uploaded_exam(pdf.filename or "upload.txt", content)
    _get_repo().save_exam({
        "code": exam_code, "title": title.strip(), "questions": questions,
        "durationMinutes": int(durationMinutes or 30), "status": "draft",
        "instructions": (instructions or "").strip(),
    })
    mcq_count = len([q for q in questions if q.get("type") == "mcq"])
    return _ok({"code": exam_code, "questionCount": len(questions), "mcqCount": mcq_count})


@router.post("/publish-exam")
async def publish_exam(body: ExamCodeRequest, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    _get_repo().publish_exam(body.code, "active")
    return _ok({"published": True, "code": body.code})


@router.post("/unpublish-exam")
async def unpublish_exam(body: ExamCodeRequest, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    _get_repo().publish_exam(body.code, "draft")
    return _ok({"unpublished": True, "code": body.code})


@router.delete("/exam/{code}")
def delete_exam(code: str, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    if not _get_repo().delete_exam(code):
        raise HTTPException(status_code=404, detail="Exam not found")
    return _ok({"deleted": True, "code": code})


@router.put("/exam/{code}")
async def update_exam(code: str, body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    if not _get_repo().update_exam(code, body):
        raise HTTPException(status_code=404, detail="Exam not found")
    return _ok({"updated": True, "code": code})


@router.post("/register-student-face")
async def register_student_face(body: dict[str, Any], _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    _get_repo().register_student({**body, "registeredAt": body.get("registeredAt") or datetime.now(timezone.utc).isoformat()})
    return _ok({"registered": True})


@router.get("/dashboard/stats")
def admin_dashboard_stats(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return _ok(_get_repo().get_dashboard_stats())


@router.get("/activity")
def admin_activity(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return _ok(_get_repo().get_recent_activity())


@router.get("/submissions")
def admin_submissions(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return _ok(_get_repo().get_submissions())


@router.get("/students-for-scoring")
def students_for_scoring(_auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return _ok(_get_repo().get_students_for_scoring())


@router.post("/score")
async def admin_score(body: ScoreRequest, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    _get_repo().set_student_score(body.studentId, body.score)
    return _ok({"scored": True})


@router.get("/answers/{student_id}/download")
def download_answers(student_id: str, examCode: str | None = None, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> PlainTextResponse:
    answers = _get_repo().get_student_answers(student_id, examCode)
    lines = []
    for i, a in enumerate(answers):
        lines.append(
            f"{i + 1}. [{a.get('examTitle') or a.get('examCode')}] Q{int(a.get('questionIndex', 0)) + 1}: {a.get('question', '')}\n"
            f"   Answer: {a.get('answer', '')}\n"
            f"   Time: {a.get('timestamp', '')}"
        )
    text = f"Student Answers - {student_id}\n{'=' * 60}\n\n" + "\n\n".join(lines)
    return PlainTextResponse(text, headers={"Content-Disposition": f'attachment; filename="answers-{student_id}.txt"'})


@router.get("/answers/{student_id}")
def admin_answers(student_id: str, examCode: str | None = None, _auth: dict[str, Any] = Depends(require_admin_jwt)) -> dict[str, Any]:
    return _ok(_get_repo().get_student_answers(student_id, examCode))


def _ok(data: Any = None, message: str | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    return payload
