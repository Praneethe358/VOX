from __future__ import annotations

import csv
import json
import re
from io import StringIO
from pathlib import Path
from typing import Any

from pypdf import PdfReader


QUESTION_SPLIT_RE = re.compile(r"(?:^|\n)\s*(?:Q(?:uestion)?\s*)?(\d+)[\).:-]\s+", re.IGNORECASE)
# Match MCQ options: "A)", "A.", "A:", " A) ", etc.
OPTION_PATTERN_RE = re.compile(r"^[A-Za-z]\)[\s.:]?\s*(.+?)$", re.MULTILINE)


def extract_mcq_options(text: str) -> tuple[str, list[str] | None]:
    """
    Extract MCQ options from question text if they exist.
    Returns: (cleaned_question_text, options_list or None)
    
    Detects patterns like:
    - A) Option text
    - B) Option text
    - etc.
    """
    lines = text.split('\n')
    question_lines = []
    options = []
    current_option = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if this line starts with an option marker (A), B), C), D), etc.)
        option_match = re.match(r'^[A-Za-z]\)[:\s.]?\s*(.+)$', line)
        if option_match:
            # This is an option line
            if current_option:
                options.append(current_option)
            current_option = option_match.group(1).strip()
        else:
            # Not an option line
            if current_option:
                # We have an option in progress but hit a non-option line
                # Check if this is a continuation of the option or a new question part
                if len(options) > 0 or current_option:
                    # We've already started collecting options, so treat subsequent lines as part of options
                    if current_option and line and not re.match(r'^\d+[\).:-]', line):
                        # Append to current option if it looks like continuation
                        current_option += " " + line
                    else:
                        # New question, save current option and start question lines
                        if current_option:
                            options.append(current_option)
                        current_option = None
                        if not re.match(r'^\d+[\).:-]', line):
                            question_lines.append(line)
                else:
                    question_lines.append(line)
            else:
                question_lines.append(line)
    
    # Don't forget the last option
    if current_option:
        options.append(current_option)
    
    # Build cleaned question text
    cleaned_question = '\n'.join(question_lines).strip()
    
    # Return question and options only if we found at least 2 options (valid MCQ)
    if len(options) >= 2:
        return cleaned_question, options
    else:
        # Not MCQ - return full text and None
        return text, None


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
        
        # Try to extract MCQ options
        question_text, options = extract_mcq_options(text)
        
        q_dict = {
            "id": int(match.group(1)),
            "text": question_text,
            "type": "mcq" if options else "descriptive"
        }
        
        # Add options if MCQ
        if options:
            q_dict["options"] = options
        
        questions.append(q_dict)
    
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
