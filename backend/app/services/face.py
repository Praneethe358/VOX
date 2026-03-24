from __future__ import annotations

import math
from typing import Any

from ..database import MongoRepository, serialize, utc_now


def _normalize(vector: list[float]) -> list[float]:
    norm = math.sqrt(sum(value * value for value in vector))
    if norm == 0:
        return vector
    return [value / norm for value in vector]


def _average(vectors: list[list[float]]) -> list[float]:
    length = len(vectors[0])
    averaged = []
    for index in range(length):
        averaged.append(sum(vector[index] for vector in vectors) / len(vectors))
    return averaged


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    return sum(left * right for left, right in zip(a, b))


def _euclidean_distance(a: list[float], b: list[float]) -> float:
    return math.sqrt(sum((left - right) ** 2 for left, right in zip(a, b)))


class FaceService:
    def __init__(self, repo: MongoRepository) -> None:
        self._repo = repo

    def register_face_embedding(self, payload: dict[str, Any]) -> dict[str, Any]:
        descriptors = payload["descriptors"]
        averaged = _average(descriptors)
        normalized = _normalize(averaged)
        document = {
            "studentId": payload["studentId"],
            "studentName": payload["studentName"],
            "examCode": payload.get("examCode"),
            "email": payload.get("email"),
            "normalizedEmbedding": normalized,
            "frameCount": len(descriptors),
            "qualityScore": payload.get("qualityScore"),
            "createdAt": utc_now(),
            "updatedAt": utc_now(),
        }
        self._repo.collection("face_embeddings").replace_one({"studentId": payload["studentId"]}, document, upsert=True)
        self._repo.register_student(
            {
                "studentId": payload["studentId"],
                "name": payload["studentName"],
                "email": payload.get("email"),
                "examCode": payload.get("examCode"),
            }
        )
        return {
            "registered": True,
            "studentId": payload["studentId"],
            "embeddingSize": len(normalized),
            "frameCount": len(descriptors),
        }

    def verify_face(self, exam_code: str, live_descriptor: list[float]) -> dict[str, Any]:
        normalized_live = _normalize(live_descriptor)
        query: dict[str, Any] = {}
        if exam_code:
            query = {"$or": [{"examCode": exam_code}, {"examCode": None}, {"examCode": {"$exists": False}}]}
        candidates = list(self._repo.collection("face_embeddings").find(query))
        best_match = None
        best_confidence = -1.0
        best_distance = 999.0
        for candidate in candidates:
            embedding = candidate.get("normalizedEmbedding") or []
            if not embedding:
                continue
            confidence = _cosine_similarity(normalized_live, embedding)
            distance = _euclidean_distance(normalized_live, embedding)
            if confidence > best_confidence:
                best_match = candidate
                best_confidence = confidence
                best_distance = distance
        # SECURITY: strict thresholds — both cosine AND euclidean must pass
        matched = best_match is not None and (best_confidence >= 0.85 and best_distance < 0.55)
        student = self._repo.find_student_by_id(str(best_match.get("studentId"))) if best_match else None
        self._repo.collection("face_login_attempts").insert_one(
            {
                "studentId": str(best_match.get("studentId") if best_match else "unknown"),
                "examCode": exam_code,
                "matched": matched,
                "confidence": best_confidence if best_confidence >= 0 else 0,
                "distance": best_distance if best_match else None,
                "timestamp": utc_now(),
            }
        )
        return {
            "success": matched,
            "studentId": str(best_match.get("studentId")) if matched and best_match else None,
            "confidence": best_confidence if best_confidence >= 0 else 0,
            "distance": best_distance if best_match else 0,
            "student": student,
        }

    def verify_face_by_student_id(self, student_id: str, live_descriptor: list[float]) -> dict[str, Any]:
        normalized_live = _normalize(live_descriptor)
        candidate = self._repo.collection("face_embeddings").find_one({"studentId": student_id})
        if not candidate:
            return {"matched": False, "confidence": 0, "distance": 1, "method": "cosine"}
        embedding = candidate.get("normalizedEmbedding") or []
        confidence = _cosine_similarity(normalized_live, embedding)
        distance = _euclidean_distance(normalized_live, embedding)
        # SECURITY: strict thresholds — both cosine AND euclidean must pass
        matched = confidence >= 0.85 and distance < 0.55
        student = self._repo.find_student_by_id(student_id)
        self._repo.collection("face_login_attempts").insert_one(
            {
                "studentId": student_id,
                "matched": matched,
                "confidence": confidence,
                "distance": distance,
                "timestamp": utc_now(),
            }
        )
        return {
            "matched": matched,
            "studentId": student_id if matched else None,
            "studentName": candidate.get("studentName") if matched else None,
            "confidence": confidence,
            "distance": distance,
            "method": "cosine",
            "student": student,
        }

    def get_registered_students(self) -> list[dict[str, Any]]:
        docs = list(self._repo.collection("face_embeddings").find({}, {"normalizedEmbedding": 0}))
        return serialize(docs)

    def get_face_embedding(self, student_id: str) -> dict[str, Any] | None:
        doc = self._repo.collection("face_embeddings").find_one({"studentId": student_id})
        return serialize(doc) if doc else None

    def delete_face_embedding(self, student_id: str) -> bool:
        result = self._repo.collection("face_embeddings").delete_one({"studentId": student_id})
        return bool(result.deleted_count)

    def get_login_attempts(self, student_id: str) -> list[dict[str, Any]]:
        docs = list(self._repo.collection("face_login_attempts").find({"studentId": student_id}).sort("timestamp", -1).limit(50))
        return serialize(docs)
