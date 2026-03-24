from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bson import ObjectId
from pymongo import MongoClient, ReturnDocument
from pymongo.collection import Collection
from pymongo.database import Database

from .config import Settings
from .security import hash_password, verify_password


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def serialize(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [serialize(item) for item in value]
    if isinstance(value, dict):
        return {key: serialize(item) for key, item in value.items()}
    return value


class MongoRepository:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = MongoClient(settings.mongodb_uri)
        self._db = self._client[settings.mongodb_db_name]

    @property
    def db(self) -> Database:
        return self._db

    def collection(self, name: str) -> Collection:
        return self._db[name]

    def initialize(self) -> None:
        self._drop_stale_exam_index()
        self.ensure_default_admin()

    def _drop_stale_exam_index(self) -> None:
        try:
            indexes = self.collection("exams").index_information()
            if "examId_1" in indexes:
                self.collection("exams").drop_index("examId_1")
        except Exception:
            return

    def ensure_default_admin(self) -> None:
        email = self._settings.vox_superadmin_email.strip().lower()
        existing = self.collection("admins").find_one({"email": email})
        if existing:
            return
        username = email.split("@", 1)[0]
        self.collection("admins").insert_one(
            {
                "name": "Super Admin",
                "username": username,
                "email": email,
                "passwordHash": hash_password(self._settings.vox_superadmin_password),
                "role": "super-admin",
                "mfaEnabled": False,
                "createdAt": utc_now(),
                "updatedAt": utc_now(),
            }
        )

    def admin_login(self, username: str, password: str) -> bool:
        admin = self.collection("admins").find_one(
            {
                "$or": [
                    {"username": username},
                    {"email": username.lower().strip()},
                ]
            }
        )
        if not admin:
            return False
        return verify_password(password, admin.get("passwordHash"))

    def get_admin_by_email(self, email: str) -> dict[str, Any] | None:
        return self.collection("admins").find_one({"email": email.lower().strip()})

    def create_admin(self, payload: dict[str, Any]) -> dict[str, Any]:
        email = str(payload["email"]).lower().strip()
        if self.get_admin_by_email(email):
            raise ValueError("Admin email already exists")
        username = email.split("@", 1)[0]
        admin = {
            "name": payload["name"],
            "username": username,
            "email": email,
            "passwordHash": hash_password(payload["password"]),
            "role": payload["role"],
            "mfaEnabled": bool(payload.get("mfaEnabled", False)),
            "createdAt": utc_now(),
            "updatedAt": utc_now(),
        }
        result = self.collection("admins").insert_one(admin)
        admin["_id"] = result.inserted_id
        return serialize(admin)

    def save_exam(self, exam: dict[str, Any]) -> None:
        payload = {
            **exam,
            "createdAt": exam.get("createdAt") or utc_now(),
            "updatedAt": utc_now(),
        }
        self.collection("exams").replace_one({"code": payload["code"]}, payload, upsert=True)

    def publish_exam(self, code: str, status: str) -> None:
        self.collection("exams").update_one(
            {"code": code},
            {"$set": {"status": status, "published": status == "active", "updatedAt": utc_now()}},
        )

    def delete_exam(self, code: str) -> bool:
        result = self.collection("exams").delete_one({"code": code})
        return bool(result.deleted_count)

    def update_exam(self, code: str, update: dict[str, Any]) -> bool:
        update = {key: value for key, value in update.items() if key != "code"}
        result = self.collection("exams").update_one({"code": code}, {"$set": {**update, "updatedAt": utc_now()}})
        return bool(result.matched_count)

    def get_exam_by_code(self, code: str) -> dict[str, Any] | None:
        exam = self.collection("exams").find_one({"code": code})
        if exam:
            self.collection("localExams").replace_one({"code": code}, exam, upsert=True)
        return serialize(exam) if exam else None

    def get_all_exams(self) -> list[dict[str, Any]]:
        return serialize(list(self.collection("exams").find({}).sort("createdAt", -1)))

    def get_active_exams(self) -> list[dict[str, Any]]:
        return serialize(list(self.collection("exams").find({"$or": [{"status": "active"}, {"published": True}]}).sort("createdAt", -1)))

    def register_student(self, student: dict[str, Any]) -> dict[str, Any]:
        register_number = str(student.get("registerNumber") or student.get("studentId") or student.get("rollNumber") or "").strip()
        if not register_number:
            raise ValueError("registerStudent requires studentId/registerNumber")
        full_name = str(student.get("fullName") or student.get("name") or register_number).strip()
        email = str(student.get("email") or f"{register_number}@vox.local").strip().lower()
        payload = {
            **student,
            "registerNumber": register_number,
            "studentId": str(student.get("studentId") or register_number),
            "rollNumber": str(student.get("rollNumber") or register_number),
            "fullName": full_name,
            "name": full_name,
            "email": email,
            "updatedAt": utc_now(),
        }
        self.collection("students").replace_one(
            {"$or": [{"studentId": payload["studentId"]}, {"registerNumber": register_number}, {"email": email}]},
            payload,
            upsert=True,
        )
        return serialize(payload)

    def save_response(self, response: dict[str, Any]) -> None:
        self.collection("responses").insert_one({**response, "timestamp": response.get("timestamp") or utc_now()})

    def log_audit(self, student_id: str, exam_code: str, action: str, metadata: Any = None) -> None:
        self.collection("audits").insert_one(
            {
                "studentId": student_id,
                "examCode": exam_code,
                "action": action,
                "metadata": metadata,
                "timestamp": utc_now(),
            }
        )

    def submit_exam(self, student_id: str, exam_code: str) -> None:
        self.log_audit(student_id, exam_code, "EXAM_SUBMITTED")

    def start_exam_session(self, exam_code: str, roll_number: str, student_id: str | None = None) -> str:
        self.log_audit(student_id or roll_number, exam_code, "EXAM_START")
        return student_id or roll_number

    def save_session_answer(self, roll_number: str, exam_code: str, question_index: int, answer: str) -> None:
        self.save_response(
            {
                "rollNumber": roll_number,
                "studentId": roll_number,
                "examCode": exam_code,
                "questionIndex": question_index,
                "questionId": question_index,
                "answer": answer,
            }
        )

    def end_exam_session(self, roll_number: str, exam_code: str) -> dict[str, Any]:
        self.submit_exam(roll_number, exam_code)
        return {"sessionId": roll_number, "estimatedScore": 0}

    def auto_save_session(self, session_data: dict[str, Any]) -> dict[str, Any]:
        session_id = str(session_data.get("sessionId") or session_data.get("studentId") or session_data.get("rollNumber") or "")
        self.collection("exam_autosaves").replace_one(
            {"sessionId": session_id},
            {**session_data, "sessionId": session_id, "updatedAt": utc_now()},
            upsert=True,
        )
        return {"sessionId": session_id, "saved": True}

    def submit_full_exam(self, session_data: dict[str, Any]) -> dict[str, Any]:
        roll_number = str(session_data.get("rollNumber") or session_data.get("studentId") or "")
        exam_code = str(session_data.get("examCode") or session_data.get("examId") or "")
        answers = list(session_data.get("answers") or [])
        answered_count = len(answers)
        total_questions = int(session_data.get("totalQuestions") or answered_count)
        self.collection("submissions").update_one(
            {"studentId": roll_number, "examCode": exam_code},
            {
                "$set": {
                    "studentId": roll_number,
                    "studentName": session_data.get("studentName") or roll_number,
                    "examCode": exam_code,
                    "answeredCount": answered_count,
                    "totalQuestions": total_questions,
                    "answers": answers,
                    "submittedAt": utc_now(),
                    "status": "submitted",
                }
            },
            upsert=True,
        )
        self.submit_exam(roll_number, exam_code)
        return {"sessionId": roll_number, "results": {"estimatedScore": answered_count}}

    def find_student_by_credentials(self, email: str, password: str) -> dict[str, Any] | None:
        student = self.collection("students").find_one({"email": email.lower().strip()})
        if not student:
            return None
        stored = student.get("passwordHash") or student.get("password")
        if not verify_password(password, stored):
            return None
        return serialize(student)

    def find_student_by_id(self, id_or_roll: str) -> dict[str, Any] | None:
        student = self.collection("students").find_one(
            {"$or": [{"studentId": id_or_roll}, {"rollNumber": id_or_roll}, {"registerNumber": id_or_roll}]}
        )
        return serialize(student) if student else None

    def get_dashboard_stats(self) -> dict[str, Any]:
        return {
            "totalExams": self.collection("exams").count_documents({}),
            "totalSubmissions": self.collection("responses").count_documents({}),
            "pendingReview": 0,
            "averageScore": 0,
        }

    def get_recent_activity(self) -> list[dict[str, str]]:
        docs = list(self.collection("audits").find({}).sort("timestamp", -1).limit(20))
        return [{"message": f"{doc.get('action', 'ACTION')} by {doc.get('studentId') or 'system'}"} for doc in docs]

    def get_submissions(self) -> list[dict[str, Any]]:
        submissions = list(self.collection("submissions").find({}).sort("submittedAt", -1))
        responses = list(self.collection("responses").find({}))
        students = list(self.collection("students").find({}))
        face_embeddings = list(self.collection("face_embeddings").find({}))
        student_name_by_id: dict[str, str] = {}
        for student in students:
            key = str(student.get("studentId") or student.get("rollNumber") or student.get("registerNumber") or "").strip()
            if key:
                student_name_by_id[key] = str(student.get("name") or student.get("fullName") or key)
        for embedding in face_embeddings:
            key = str(embedding.get("studentId") or "").strip()
            if key and key not in student_name_by_id:
                student_name_by_id[key] = str(embedding.get("studentName") or key)

        if submissions:
            normalized = []
            for index, submission in enumerate(submissions):
                student_id = str(submission.get("studentId") or submission.get("rollNumber") or "").strip()
                total_questions = int(submission.get("totalQuestions") or 0)
                answer_count = int(submission.get("answeredCount") or len(submission.get("answers") or []))
                score = round((answer_count / total_questions) * 100) if total_questions else None
                normalized.append(
                    {
                        "id": str(submission.get("_id") or submission.get("sessionId") or f"{student_id}-{index}"),
                        "name": student_name_by_id.get(student_id, submission.get("studentName") or student_id or "Unknown Student"),
                        "exam": str(submission.get("examCode") or submission.get("exam") or "Unknown Exam"),
                        "score": score,
                        "status": "graded" if submission.get("status") == "graded" else "submitted",
                        "submittedAt": serialize(submission.get("submittedAt")) or "-",
                        "rollNumber": student_id or None,
                        "sessionId": str(submission.get("sessionId") or ""),
                        "answerCount": answer_count,
                    }
                )
            return normalized

        grouped: dict[str, dict[str, Any]] = {}
        for response in responses:
            student_id = str(response.get("rollNumber") or response.get("studentId") or "").strip()
            exam_code = str(response.get("examCode") or "Unknown Exam").strip()
            key = f"{student_id}::{exam_code}"
            timestamp = response.get("timestamp") or utc_now()
            if key not in grouped:
                grouped[key] = {
                    "studentId": student_id,
                    "examCode": exam_code,
                    "answerCount": 0,
                    "submittedAt": timestamp,
                }
            grouped[key]["answerCount"] += 1
            if timestamp > grouped[key]["submittedAt"]:
                grouped[key]["submittedAt"] = timestamp

        return [
            {
                "id": f"{item['studentId']}-{item['examCode']}-{index}",
                "name": student_name_by_id.get(item["studentId"], item["studentId"] or "Unknown Student"),
                "exam": item["examCode"],
                "score": None,
                "status": "pending",
                "submittedAt": serialize(item["submittedAt"]),
                "rollNumber": item["studentId"] or None,
                "sessionId": None,
                "answerCount": item["answerCount"],
            }
            for index, item in enumerate(grouped.values())
        ]

    def get_students_for_scoring(self) -> list[dict[str, Any]]:
        students = list(self.collection("students").find({}))
        submissions = list(self.collection("submissions").find({}).sort("submittedAt", -1))
        
        # Build a map of latest exam per student
        latest_exam_by_student: dict[str, str] = {}
        for submission in submissions:
            student_id = str(submission.get("studentId") or submission.get("rollNumber") or "")
            if student_id and student_id not in latest_exam_by_student:
                latest_exam_by_student[student_id] = str(submission.get("examCode") or submission.get("exam") or "Unknown")
        
        result = []
        for student in students:
            student_id = str(student.get("studentId") or student.get("rollNumber") or student.get("registerNumber") or "")
            result.append({
                **serialize(student),
                "id": serialize(student.get("_id")),
                "exam": latest_exam_by_student.get(student_id, student.get("exam") or student.get("examCode") or "No Exam"),
            })
        
        return result

    def set_student_score(self, id_or_roll: str, score: int) -> None:
        self.collection("students").update_one(
            {"$or": [{"studentId": id_or_roll}, {"rollNumber": id_or_roll}, {"registerNumber": id_or_roll}]},
            {"$set": {"score": score, "updatedAt": utc_now()}},
        )

    def get_student_answers(self, id_or_roll: str, exam_code: str | None = None) -> list[dict[str, Any]]:
        student_filter: dict[str, Any] = {"$or": [{"studentId": id_or_roll}, {"rollNumber": id_or_roll}]}
        query = {**student_filter, **({"examCode": exam_code} if exam_code else {})}
        answers = list(self.collection("responses").find(query).sort("_id", -1))
        if not answers:
            submission = self.collection("submissions").find_one(student_filter)
            if submission and isinstance(submission.get("answers"), list):
                answers = list(submission["answers"])
        deduped: dict[Any, dict[str, Any]] = {}
        for answer in reversed(answers):
            key = answer.get("questionId", answer.get("questionIndex", answer.get("_id")))
            deduped[key] = answer
        sorted_answers = sorted(
            deduped.values(),
            key=lambda item: int(item.get("questionId", item.get("questionIndex", 0)) or 0),
        )
        return serialize(sorted_answers)

    def get_student_dashboard_stats(self, id_or_roll: str) -> dict[str, Any]:
        submissions = list(self.collection("submissions").find({"studentId": id_or_roll, "status": "submitted"}))
        completed_exams = len(submissions)
        fallback_count = completed_exams or self.collection("responses").count_documents({"rollNumber": id_or_roll})
        published_exams = self.collection("exams").count_documents({"$or": [{"published": True}, {"status": "active"}]})
        average_score = 0
        if submissions:
            aggregate = 0
            for submission in submissions:
                answered = int(submission.get("answeredCount") or 0)
                total = int(submission.get("totalQuestions") or 1)
                aggregate += round((answered / total) * 100)
            average_score = round(aggregate / len(submissions))
        return {
            "completedExams": completed_exams or fallback_count,
            "upcomingExams": max(0, published_exams - completed_exams),
            "averageScore": average_score,
            "totalTimeSpent": completed_exams,
        }

    def get_student_profile(self, id_or_roll: str) -> dict[str, Any] | None:
        student = self.collection("students").find_one(
            {"$or": [{"studentId": id_or_roll}, {"rollNumber": id_or_roll}, {"registerNumber": id_or_roll}]}
        )
        return serialize(student) if student else None

    def get_all_results(self) -> list[dict[str, Any]]:
        return serialize(list(self.collection("results").find({})))

    def get_result_by_session(self, session_id: str) -> dict[str, Any] | None:
        doc = self.collection("results").find_one({"sessionId": session_id})
        return serialize(doc) if doc else None

    def get_ai_config(self) -> dict[str, Any]:
        config = self.collection("ai_configurations").find_one_and_update(
            {"singletonKey": "global"},
            {"$setOnInsert": {"singletonKey": "global", "grammarCorrection": True, "autoSaveInterval": 15, "ttsSpeed": 1.0}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return serialize(config)

    def update_ai_config(self, payload: dict[str, Any], admin_id: str) -> dict[str, Any]:
        config = self.collection("ai_configurations").find_one_and_update(
            {"singletonKey": "global"},
            {"$set": {**payload, "updatedBy": admin_id, "updatedAt": utc_now()}},
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        return serialize(config)

    def create_system_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        doc = {**payload, "timestamp": payload.get("timestamp") or utc_now()}
        result = self.collection("system_logs").insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize(doc)

    def create_v1_student(self, payload: dict[str, Any]) -> dict[str, Any]:
        doc = {**payload, "createdAt": utc_now(), "updatedAt": utc_now()}
        result = self.collection("students").insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize(doc)

    def update_v1_face_embedding(self, student_id: str, face_embedding: list[float]) -> dict[str, Any] | None:
        doc = self.collection("students").find_one_and_update(
            {"_id": ObjectId(student_id)},
            {
                "$set": {
                    "faceEmbedding": face_embedding,
                    "faceRegisteredAt": utc_now(),
                    "faceAuthEnabled": True,
                    "updatedAt": utc_now(),
                }
            },
            return_document=ReturnDocument.AFTER,
        )
        return serialize(doc) if doc else None

    def create_v1_exam(self, payload: dict[str, Any], admin_id: str) -> dict[str, Any]:
        doc = {**payload, "createdBy": admin_id, "createdAt": utc_now(), "updatedAt": utc_now()}
        result = self.collection("v1_exams").insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize(doc)

    def get_v1_exam(self, exam_id: str) -> dict[str, Any] | None:
        try:
            doc = self.collection("v1_exams").find_one({"_id": ObjectId(exam_id)})
        except Exception:
            return None
        return serialize(doc) if doc else None

    def start_v1_exam_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        doc = {
            **payload,
            "loginTime": utc_now(),
            "startTime": utc_now(),
            "currentQuestionNumber": 1,
            "status": "in-progress",
            "autoSaveCount": 0,
            "isLocked": False,
        }
        result = self.collection("exam_sessions").insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize(doc)

    def submit_v1_exam_session(self, session_id: str, final_pdf_url: str | None = None) -> dict[str, Any] | None:
        try:
            doc = self.collection("exam_sessions").find_one_and_update(
                {"_id": ObjectId(session_id)},
                {
                    "$set": {
                        "status": "submitted",
                        "submittedAt": utc_now(),
                        "endTime": utc_now(),
                        "isLocked": True,
                        "finalPdfURL": final_pdf_url,
                    }
                },
                return_document=ReturnDocument.AFTER,
            )
        except Exception:
            return None
        return serialize(doc) if doc else None

    def get_v1_exam_session(self, session_id: str) -> dict[str, Any] | None:
        try:
            session = self.collection("exam_sessions").find_one({"_id": ObjectId(session_id)})
        except Exception:
            return None
        if not session:
            return None
        student = self.find_student_by_id(str(session.get("studentId") or ""))
        exam = self.get_v1_exam(str(session.get("examId") or ""))
        answers = serialize(list(self.collection("answers").find({"examSessionId": session_id}).sort("questionNumber", 1)))
        return {"session": {**serialize(session), "student": student, "exam": exam}, "answers": answers}

    def autosave_v1_answer(self, payload: dict[str, Any]) -> dict[str, Any]:
        exam_session_id = payload["examSessionId"]
        question_number = int(payload["questionNumber"])
        formatted_answer = str(payload["formattedAnswer"])
        revision = {
            "rawSpeechText": payload["rawSpeechText"],
            "formattedAnswer": formatted_answer,
            "editedAt": utc_now(),
        }
        doc = self.collection("answers").find_one_and_update(
            {"examSessionId": exam_session_id, "questionNumber": question_number},
            {
                "$set": {
                    "examSessionId": exam_session_id,
                    "questionNumber": question_number,
                    "rawSpeechText": payload["rawSpeechText"],
                    "formattedAnswer": formatted_answer,
                    "wordCount": len([word for word in formatted_answer.split() if word]),
                    "lastEditedAt": utc_now(),
                },
                "$push": {"revisionHistory": {"$each": [revision], "$slice": -20}},
                "$setOnInsert": {"createdAt": utc_now()},
            },
            upsert=True,
            return_document=ReturnDocument.AFTER,
        )
        try:
            self.collection("exam_sessions").update_one(
                {"_id": ObjectId(exam_session_id)},
                {"$inc": {"autoSaveCount": 1}, "$set": {"currentQuestionNumber": question_number, "updatedAt": utc_now()}},
            )
        except Exception:
            pass
        return serialize(doc)

    def create_activity_log(self, payload: dict[str, Any]) -> dict[str, Any]:
        doc = {**payload, "timestamp": utc_now()}
        result = self.collection("activity_logs").insert_one(doc)
        doc["_id"] = result.inserted_id
        return serialize(doc)
