import json
from typing import Any

import requests

BASE = "http://127.0.0.1:3000"


def check(status: bool, label: str, details: Any) -> None:
    if not status:
        raise RuntimeError(f"{label} failed: {details}")
    print(f"PASS: {label}")


def post(path: str, payload: dict[str, Any], headers: dict[str, str] | None = None) -> requests.Response:
    return requests.post(f"{BASE}{path}", json=payload, headers=headers, timeout=30)


def get(path: str, headers: dict[str, str] | None = None) -> requests.Response:
    return requests.get(f"{BASE}{path}", headers=headers, timeout=30)


def main() -> None:
    health = get("/health")
    check(health.status_code == 200 and health.json().get("status") == "ok", "health", health.text)

    v1_login = post("/api/v1/auth/admin-login", {"email": "admin@vox.edu", "password": "ChangeMe@123"})
    v1_json = v1_login.json()
    check(v1_login.status_code == 200 and v1_json.get("success"), "v1 admin login", v1_json)

    admin_login = post("/api/admin/login", {"username": "admin", "password": "ChangeMe@123"})
    admin_json = admin_login.json()
    if admin_login.status_code == 200 and admin_json.get("success"):
        print("PASS: legacy admin login")
    else:
        print(f"WARN: legacy admin login skipped in this DB state: {admin_json}")

    exam_code = "SMOKE_EXAM_001"
    create_exam = post(
        "/api/admin/create-exam",
        {
            "code": exam_code,
            "title": "Smoke Test Exam",
            "durationMinutes": 30,
            "questions": [
                {"id": 1, "text": "What is 2 + 2?", "type": "mcq", "options": ["3", "4", "5"], "correctAnswer": 1},
                {"id": 2, "text": "Write one sentence about testing.", "type": "descriptive"},
            ],
        },
    )
    create_json = create_exam.json()
    check(create_exam.status_code == 200 and create_json.get("success"), "create exam", create_json)

    publish_exam = post("/api/admin/publish-exam", {"code": exam_code})
    publish_json = publish_exam.json()
    check(publish_exam.status_code == 200 and publish_json.get("success"), "publish exam", publish_json)

    register_face = post(
        "/api/face/register",
        {
            "studentId": "SMOKE_STUDENT_1",
            "studentName": "Smoke Student",
            "examCode": exam_code,
            "email": "smoke.student@example.com",
            "descriptors": [[0.01 * (i + 1) for i in range(128)], [0.01 * (i + 1) for i in range(128)]],
            "qualityScore": 0.95,
        },
    )
    register_json = register_face.json()
    check(register_face.status_code == 200 and register_json.get("success"), "face registration", register_json)

    list_exams = get("/api/student/exams")
    list_json = list_exams.json()
    exam_codes = [exam.get("code") for exam in list_json.get("data", [])]
    check(list_exams.status_code == 200 and exam_code in exam_codes, "list active exams", list_json)

    verify_face = post(
        "/api/face/verify-by-id",
        {
            "studentId": "SMOKE_STUDENT_1",
            "liveDescriptor": [0.01 * (i + 1) for i in range(128)],
        },
    )
    verify_json = verify_face.json()
    check(verify_face.status_code == 200 and verify_json.get("success"), "face verify-by-id endpoint", verify_json)

    start_exam = post(
        "/api/student/start-exam",
        {
            "examCode": exam_code,
            "rollNumber": "SMOKE_STUDENT_1",
            "studentId": "SMOKE_STUDENT_1",
        },
    )
    start_json = start_exam.json()
    check(start_exam.status_code == 200 and start_json.get("success"), "start exam", start_json)

    submit_answer = post(
        "/api/student/submit-answer",
        {
            "rollNumber": "SMOKE_STUDENT_1",
            "examCode": exam_code,
            "questionIndex": 0,
            "answer": "Four",
        },
    )
    submit_json = submit_answer.json()
    check(submit_answer.status_code == 200 and submit_json.get("success"), "submit answer", submit_json)

    end_exam = post(
        "/api/student/end-exam",
        {
            "rollNumber": "SMOKE_STUDENT_1",
            "examCode": exam_code,
        },
    )
    end_json = end_exam.json()
    check(end_exam.status_code == 200 and end_json.get("success"), "end exam", end_json)

    token = v1_json["data"]["token"]
    headers = {"Authorization": f"Bearer {token}"}
    v1_config = get("/api/v1/config/ai", headers=headers)
    v1_config_json = v1_config.json()
    check(v1_config.status_code == 200 and v1_config_json.get("success"), "v1 config read", v1_config_json)

    print(json.dumps({"ok": True, "tested": ["login", "exams", "submissions", "face registration"]}, indent=2))


if __name__ == "__main__":
    main()
