from __future__ import annotations

import csv
import json
import re
from io import StringIO
from pathlib import Path
from typing import Any

from pypdf import PdfReader


QUESTION_SPLIT_RE = re.compile(r"(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)[\).:-]\s+", re.IGNORECASE)


def extract_questions(raw_text: str) -> list[dict[str, Any]]:
    matches = list(QUESTION_SPLIT_RE.finditer(raw_text))
    if not matches:
        lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
        return [
            {"id": index + 1, "text": line, "type": "descriptive"}
            for index, line in enumerate(lines)
            if len(line) > 10
        ]

    questions: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(raw_text)
        text = raw_text[start:end].strip()
        if not text:
            continue
        questions.append({"id": int(match.group(1)), "text": text, "type": "descriptive"})
    return questions


def parse_uploaded_exam(file_name: str, content: bytes) -> list[dict[str, Any]]:
    suffix = Path(file_name).suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(StringIO())
        raise RuntimeError("PDF parsing requires file-path parsing")
    if suffix == ".json":
        parsed = json.loads(content.decode("utf-8"))
        items = parsed if isinstance(parsed, list) else parsed.get("questions", [])
        questions = []
        for index, item in enumerate(items):
            if isinstance(item, str):
                questions.append({"id": index + 1, "text": item, "type": "descriptive"})
                continue
            text = item.get("text") or item.get("question") or str(item)
            has_options = isinstance(item.get("options"), list) and len(item["options"]) >= 2
            question = {
                "id": item.get("id", index + 1),
                "text": text,
                "type": item.get("type") or ("mcq" if has_options else "descriptive"),
            }
            if has_options:
                question["options"] = item["options"]
            if has_options and item.get("correctAnswer") is not None:
                question["correctAnswer"] = item["correctAnswer"]
            questions.append(question)
        return questions
    if suffix == ".csv":
        reader = csv.DictReader(StringIO(content.decode("utf-8")))
        questions = []
        for index, row in enumerate(reader):
            text = row.get("text") or row.get("question") or row.get("prompt")
            if not text:
                continue
            questions.append({"id": index + 1, "text": text, "type": row.get("type") or "descriptive"})
        return questions
    return extract_questions(content.decode("utf-8"))


def parse_pdf_file(path: Path) -> list[dict[str, Any]]:
    reader = PdfReader(str(path))
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    return extract_questions(text)
