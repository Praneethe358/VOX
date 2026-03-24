"""Student API routes."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ..schemas import (
    EndExamRequest, StartExamRequest, SubmitAnswerRequest, VerifyFaceRequest,
)

router = APIRouter(prefix="/api/student", tags=["student"])


def _get_repo():
    from ..main import repo
    return repo


def _get_face_service():
    from ..main import face_service
    return face_service


def _ok(data: Any = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    return payload


@router.get("/exams")
def student_exams() -> dict[str, Any]:
    return _ok(_get_repo().get_active_exams())


@router.post("/verify-face")
async def student_verify_face(body: VerifyFaceRequest) -> dict[str, Any]:
    try:
        result = _get_face_service().verify_face(body.examCode, body.liveDescriptor)
        return _ok({
            "matched": result["success"],
            "studentId": result.get("studentId"),
            "confidence": result.get("confidence", 0),
            "distance": result.get("distance", 999),
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Face verification error: {str(exc)}")


@router.get("/exam/{code}")
def student_exam(code: str) -> dict[str, Any]:
    exam = _get_repo().get_exam_by_code(code)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return _ok(exam)


@router.post("/get-exam")
async def student_get_exam(body: dict[str, Any]) -> dict[str, Any]:
    code = str(body.get("code") or "")
    exam = _get_repo().get_exam_by_code(code)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return _ok(exam)


@router.post("/start-exam")
async def start_exam(body: StartExamRequest) -> dict[str, Any]:
    repo = _get_repo()
    exam = repo.get_exam_by_code(body.examCode)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    session_id = repo.start_exam_session(body.examCode, body.rollNumber, body.studentId)
    return _ok({"sessionId": session_id, "examCode": body.examCode, "rollNumber": body.rollNumber, "exam": exam})


@router.post("/submit-answer")
async def submit_answer(body: SubmitAnswerRequest) -> dict[str, Any]:
    _get_repo().save_session_answer(body.rollNumber, body.examCode, body.questionIndex, body.answer)
    return _ok({"saved": True})


@router.post("/end-exam")
async def end_exam(body: EndExamRequest) -> dict[str, Any]:
    return _ok(_get_repo().end_exam_session(body.rollNumber, body.examCode))
