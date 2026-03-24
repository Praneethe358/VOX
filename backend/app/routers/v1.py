"""V1 API routes (admin management, exam sessions, config)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import JSONResponse

from ..schemas import (
    V1ActivityLogRequest, V1AdminLoginRequest, V1AutosaveAnswerRequest,
    V1CreateAdminRequest, V1ExamSessionStartRequest,
)
from ..security import create_token, decode_token, verify_password

router = APIRouter(prefix="/api/v1", tags=["v1"])


def _get_repo():
    from ..main import repo
    return repo


def _ok(data: Any = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    return payload


def _get_v1_payload(authorization: str = Header(..., alias="Authorization")) -> dict[str, Any]:
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization header required")
    return decode_token(authorization.split(" ", 1)[1].strip())


def _ensure_roles(payload: dict[str, Any], *roles: str) -> dict[str, Any]:
    if roles and payload.get("role") not in roles:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return payload


@router.post("/auth/admin-login")
async def v1_admin_login(request: Request, body: V1AdminLoginRequest) -> dict[str, Any]:
    repo = _get_repo()
    admin = repo.get_admin_by_email(body.email.lower().strip())
    if not admin or not verify_password(body.password, admin.get("passwordHash")):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"adminId": str(admin.get("_id")), "email": admin.get("email"), "role": admin.get("role")})
    return _ok({
        "token": token,
        "admin": {
            "id": str(admin.get("_id")),
            "name": admin.get("name"),
            "email": admin.get("email"),
            "role": admin.get("role"),
            "mfaEnabled": admin.get("mfaEnabled", False),
        },
    })


@router.post("/auth/admins")
async def v1_create_admin(body: V1CreateAdminRequest, payload: dict[str, Any] = Depends(_get_v1_payload)) -> JSONResponse:
    _ensure_roles(payload, "super-admin")
    try:
        admin = _get_repo().create_admin(body.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return JSONResponse(status_code=201, content=_ok(admin))


@router.post("/students")
async def v1_create_student(body: dict[str, Any], payload: dict[str, Any] = Depends(_get_v1_payload)) -> JSONResponse:
    _ensure_roles(payload, "super-admin", "exam-admin")
    student = _get_repo().create_v1_student(body)
    return JSONResponse(status_code=201, content=_ok(student))


@router.patch("/students/{student_id}/face-embedding")
async def v1_update_face_embedding(student_id: str, body: dict[str, Any], payload: dict[str, Any] = Depends(_get_v1_payload)) -> dict[str, Any]:
    _ensure_roles(payload, "super-admin", "exam-admin")
    face_embedding = body.get("faceEmbedding")
    if not isinstance(face_embedding, list) or not face_embedding:
        raise HTTPException(status_code=400, detail="faceEmbedding must be a non-empty numeric array")
    student = _get_repo().update_v1_face_embedding(student_id, face_embedding)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return _ok(student)


@router.post("/exams")
async def v1_create_exam(body: dict[str, Any], payload: dict[str, Any] = Depends(_get_v1_payload)) -> JSONResponse:
    payload = _ensure_roles(payload, "super-admin", "exam-admin")
    exam = _get_repo().create_v1_exam(body, str(payload.get("adminId")))
    return JSONResponse(status_code=201, content=_ok(exam))


@router.get("/exams/{exam_id}")
def v1_get_exam(exam_id: str, payload: dict[str, Any] = Depends(_get_v1_payload)) -> dict[str, Any]:
    _ensure_roles(payload, "super-admin", "exam-admin")
    exam = _get_repo().get_v1_exam(exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return _ok(exam)


@router.post("/exam-sessions/start")
async def v1_start_exam_session(body: V1ExamSessionStartRequest, payload: dict[str, Any] = Depends(_get_v1_payload)) -> JSONResponse:
    _ensure_roles(payload, "super-admin", "exam-admin")
    session = _get_repo().start_v1_exam_session(body.model_dump())
    return JSONResponse(status_code=201, content=_ok(session))


@router.post("/exam-sessions/{session_id}/submit")
async def v1_submit_exam_session(session_id: str, body: dict[str, Any], payload: dict[str, Any] = Depends(_get_v1_payload)) -> dict[str, Any]:
    _ensure_roles(payload, "super-admin", "exam-admin")
    session = _get_repo().submit_v1_exam_session(session_id, body.get("finalPdfURL"))
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return _ok(session)


@router.get("/exam-sessions/{session_id}")
def v1_get_exam_session(session_id: str, payload: dict[str, Any] = Depends(_get_v1_payload)) -> dict[str, Any]:
    _ensure_roles(payload, "super-admin", "exam-admin")
    session = _get_repo().get_v1_exam_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Exam session not found")
    return _ok(session)


@router.put("/answers/autosave")
async def v1_autosave_answer(body: V1AutosaveAnswerRequest, payload: dict[str, Any] = Depends(_get_v1_payload)) -> dict[str, Any]:
    _ensure_roles(payload, "super-admin", "exam-admin")
    return _ok(_get_repo().autosave_v1_answer(body.model_dump()))


@router.post("/activity-logs")
async def v1_activity_logs(body: V1ActivityLogRequest, payload: dict[str, Any] = Depends(_get_v1_payload)) -> JSONResponse:
    _ensure_roles(payload, "super-admin", "exam-admin")
    return JSONResponse(status_code=201, content=_ok(_get_repo().create_activity_log(body.model_dump())))


@router.get("/config/ai")
def v1_get_ai_config(payload: dict[str, Any] = Depends(_get_v1_payload)) -> dict[str, Any]:
    _ensure_roles(payload, "super-admin", "exam-admin")
    return _ok(_get_repo().get_ai_config())


@router.put("/config/ai")
async def v1_update_ai_config(body: dict[str, Any], payload: dict[str, Any] = Depends(_get_v1_payload)) -> dict[str, Any]:
    payload = _ensure_roles(payload, "super-admin")
    return _ok(_get_repo().update_ai_config(body, str(payload.get("adminId"))))


@router.post("/config/system-logs")
async def v1_create_system_log(body: dict[str, Any], payload: dict[str, Any] = Depends(_get_v1_payload)) -> JSONResponse:
    _ensure_roles(payload, "super-admin", "exam-admin")
    return JSONResponse(status_code=201, content=_ok(_get_repo().create_system_log(body)))
