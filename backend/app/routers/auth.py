"""Authentication routes (student login, face recognize)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from ..schemas import FaceRecognizeRequest, StudentLoginRequest
from ..security import create_token

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _get_repo():
    from ..main import repo
    return repo


def _get_face_service():
    from ..main import face_service
    return face_service


def _get_limiter():
    from ..main import limiter
    return limiter


def _ok(data: Any = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    return payload


@router.post("/login")
async def auth_login(request: Request, body: StudentLoginRequest) -> dict[str, Any]:
    repo = _get_repo()
    student = repo.find_student_by_credentials(body.email, body.password)
    if not student:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    student_id = student.get("studentId") or student.get("rollNumber") or "unknown"
    token = create_token({"studentId": student_id, "email": student.get("email"), "rollNumber": student.get("rollNumber")})
    return _ok({
        "authenticated": True,
        "token": token,
        "student": {
            "studentId": student_id,
            "name": student.get("name") or student.get("fullName"),
            "email": student.get("email"),
            "rollNumber": student.get("rollNumber"),
            "examCode": student.get("examCode"),
        },
    })


@router.post("/face-recognize")
async def auth_face_recognize(request: Request, body: FaceRecognizeRequest) -> dict[str, Any]:
    descriptor = body.liveDescriptor or body.faceDescriptor
    if not descriptor:
        raise HTTPException(status_code=400, detail="examCode and face descriptor required")
    repo = _get_repo()
    face_service = _get_face_service()
    result = face_service.verify_face(body.examCode, descriptor)
    if not result["success"]:
        raise HTTPException(status_code=401, detail="Face not recognized")
    student = repo.find_student_by_id(str(result.get("studentId") or ""))
    student_id = result.get("studentId") or (student.get("studentId") if student else "unknown")
    token = create_token({
        "studentId": student_id,
        "email": student.get("email") if student else None,
        "rollNumber": student.get("rollNumber") if student else None,
    })
    return _ok({
        "matched": True,
        "studentId": student_id,
        "token": token,
        "student": {
            "studentId": student_id,
            "name": student.get("name") if student else None,
            "email": student.get("email") if student else None,
            "rollNumber": student.get("rollNumber") if student else None,
            "examCode": student.get("examCode") if student else None,
        } if student else None,
    })
