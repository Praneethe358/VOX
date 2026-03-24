"""Pydantic request/response schemas for input validation."""
from __future__ import annotations

from pydantic import BaseModel, Field, field_validator
import re


# ─── Auth Schemas ─────────────────────────────────────────────────────────────

class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=1, max_length=200)

    @field_validator("username", "password", mode="before")
    @classmethod
    def reject_injection(cls, v: object) -> str:
        if isinstance(v, (dict, list)):
            raise ValueError("Invalid input: expected string")
        return str(v).strip()


class StudentLoginRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=1, max_length=200)

    @field_validator("email", "password", mode="before")
    @classmethod
    def reject_injection(cls, v: object) -> str:
        if isinstance(v, (dict, list)):
            raise ValueError("Invalid input: expected string")
        return str(v).strip()


class FaceRecognizeRequest(BaseModel):
    examCode: str = Field(..., min_length=1, max_length=50)
    liveDescriptor: list[float] | None = None
    faceDescriptor: list[float] | None = None

    @field_validator("examCode", mode="before")
    @classmethod
    def reject_injection(cls, v: object) -> str:
        if isinstance(v, (dict, list)):
            raise ValueError("Invalid input: expected string")
        return str(v).strip()


# ─── Exam Schemas ─────────────────────────────────────────────────────────────

class QuestionInput(BaseModel):
    id: int | None = None
    text: str = ""
    type: str | None = None
    options: list[str] | None = None
    correctAnswer: str | None = None


class CreateExamRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    code: str | None = None
    questions: list[QuestionInput] = []
    durationMinutes: int = Field(default=30, ge=1, le=600)
    instructions: str = ""


class ExamCodeRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)


class UpdateExamRequest(BaseModel):
    title: str | None = None
    questions: list[QuestionInput] | None = None
    durationMinutes: int | None = Field(default=None, ge=1, le=600)
    instructions: str | None = None
    status: str | None = None


# ─── Student Schemas ──────────────────────────────────────────────────────────

class VerifyFaceRequest(BaseModel):
    examCode: str = Field(..., min_length=1, max_length=50)
    liveDescriptor: list[float] = Field(..., min_length=64)


class StartExamRequest(BaseModel):
    examCode: str = Field(..., min_length=1, max_length=50)
    rollNumber: str = Field(..., min_length=1, max_length=50)
    studentId: str | None = None


class SubmitAnswerRequest(BaseModel):
    rollNumber: str = Field(..., min_length=1)
    examCode: str = Field(..., min_length=1)
    questionIndex: int = Field(..., ge=0)
    answer: str = ""


class EndExamRequest(BaseModel):
    rollNumber: str = Field(..., min_length=1)
    examCode: str = Field(..., min_length=1)


# ─── Score Schemas ────────────────────────────────────────────────────────────

class ScoreRequest(BaseModel):
    studentId: str = Field(..., min_length=1)
    score: int = Field(..., ge=0)


# ─── Face Registration ───────────────────────────────────────────────────────

class FaceRegisterRequest(BaseModel):
    studentId: str = Field(..., min_length=1, max_length=100)
    studentName: str = Field(..., min_length=1, max_length=200)
    descriptors: list[list[float]] = Field(..., min_length=1)
    examCode: str | None = None
    email: str | None = None
    qualityScore: float | None = None


class FaceVerifyRequest(BaseModel):
    liveDescriptor: list[float] = Field(..., min_length=64)
    examCode: str | None = ""


class FaceVerifyByIdRequest(BaseModel):
    studentId: str = Field(..., min_length=1)
    liveDescriptor: list[float] = Field(..., min_length=64)


# ─── Audit / DB Schemas ──────────────────────────────────────────────────────

class AuditLogRequest(BaseModel):
    studentId: str = Field(..., min_length=1)
    examCode: str = Field(..., min_length=1)
    action: str = Field(..., min_length=1)
    metadata: dict | None = None


class SubmitExamRequest(BaseModel):
    studentId: str = Field(..., min_length=1)
    examCode: str = Field(..., min_length=1)


# ─── AI Schemas ───────────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000)
    speed: int = 150
    voice: str = "en-us"
    pitch: int = 50


class FormatAnswerRequest(BaseModel):
    rawText: str = Field(..., min_length=1)
    questionContext: str | None = None


# ─── V1 Schemas ───────────────────────────────────────────────────────────────

class V1AdminLoginRequest(BaseModel):
    email: str = Field(..., min_length=1, max_length=200)
    password: str = Field(..., min_length=1, max_length=200)

    @field_validator("email", "password", mode="before")
    @classmethod
    def reject_injection(cls, v: object) -> str:
        if isinstance(v, (dict, list)):
            raise ValueError("Invalid input: expected string")
        return str(v).strip()


class V1CreateAdminRequest(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=8)
    role: str = Field(..., min_length=1)


class V1CreateStudentRequest(BaseModel):
    registerNumber: str = Field(..., min_length=1)
    fullName: str = Field(..., min_length=1)
    email: str = Field(..., min_length=1)
    department: str = Field(..., min_length=1)
    year: int = Field(..., ge=1, le=6)


class V1ExamSessionStartRequest(BaseModel):
    studentId: str = Field(..., min_length=1)
    examId: str = Field(..., min_length=1)
    kioskVerified: bool = False


class V1AutosaveAnswerRequest(BaseModel):
    examSessionId: str = Field(..., min_length=1)
    questionNumber: int = Field(..., ge=1)
    rawSpeechText: str = Field(..., min_length=1)
    formattedAnswer: str = Field(..., min_length=1)


class V1ActivityLogRequest(BaseModel):
    examSessionId: str = Field(..., min_length=1)
    eventType: str = Field(..., min_length=1)
    metadata: dict | None = None
