"""Face recognition routes (registration, verification, management)."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ..schemas import FaceRegisterRequest, FaceVerifyByIdRequest, FaceVerifyRequest

router = APIRouter(prefix="/api/face", tags=["face"])


def _get_face_service():
    from ..main import face_service
    return face_service


def _ok(data: Any = None) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    return payload


@router.post("/register")
async def face_register(body: FaceRegisterRequest) -> dict[str, Any]:
    for i, desc in enumerate(body.descriptors):
        if len(desc) < 64:
            raise HTTPException(status_code=400, detail=f"Invalid descriptor at index {i}: must be a number array of length >= 64")
    return _ok(_get_face_service().register_face_embedding(body.model_dump()))


@router.post("/verify")
async def face_verify(body: FaceVerifyRequest) -> dict[str, Any]:
    try:
        result = _get_face_service().verify_face(body.examCode or "", body.liveDescriptor)
        return _ok({
            "matched": result["success"],
            "studentId": result.get("studentId"),
            "confidence": result.get("confidence", 0),
            "distance": result.get("distance", 0),
            "method": "cosine",
            "student": result.get("student"),
        })
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Face verification error: {str(exc)}")


@router.post("/verify-by-id")
async def face_verify_by_id(body: FaceVerifyByIdRequest) -> dict[str, Any]:
    try:
        return _ok(_get_face_service().verify_face_by_student_id(body.studentId, body.liveDescriptor))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Face verification error: {str(exc)}")


@router.get("/students")
def face_students() -> dict[str, Any]:
    return _ok(_get_face_service().get_registered_students())


@router.get("/embedding/{student_id}")
def face_embedding(student_id: str) -> dict[str, Any]:
    embedding = _get_face_service().get_face_embedding(student_id)
    if not embedding:
        raise HTTPException(status_code=404, detail="No face embedding found for this student")
    return _ok({
        "studentId": embedding.get("studentId"),
        "studentName": embedding.get("studentName"),
        "embeddingSize": len(embedding.get("normalizedEmbedding") or []),
        "frameCount": embedding.get("frameCount"),
        "qualityScore": embedding.get("qualityScore"),
        "createdAt": embedding.get("createdAt"),
        "updatedAt": embedding.get("updatedAt"),
    })


@router.delete("/embedding/{student_id}")
def delete_face_embedding(student_id: str) -> dict[str, Any]:
    return _ok({"deleted": _get_face_service().delete_face_embedding(student_id), "studentId": student_id})


@router.get("/attempts/{student_id}")
def face_attempts(student_id: str) -> dict[str, Any]:
    return _ok(_get_face_service().get_login_attempts(student_id))
