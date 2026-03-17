from __future__ import annotations

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import httpx
from fastapi import HTTPException, UploadFile

from ..config import Settings


class AIService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def _resolve_binary(self, configured: str) -> str | None:
        candidate = configured.strip().strip('"')
        if not candidate:
            return None
        if os.path.exists(candidate):
            return candidate
        return shutil.which(candidate)

    async def _save_upload(self, upload: UploadFile, temp_dir: str) -> Path:
        suffix = Path(upload.filename or "audio.webm").suffix or ".webm"
        target = Path(temp_dir) / f"upload{suffix}"
        content = await upload.read()
        target.write_bytes(content)
        return target

    async def transcribe(self, upload: UploadFile) -> dict[str, float | str]:
        whisper_bin = self._resolve_binary(self._settings.whisper_bin)
        if not whisper_bin:
            raise HTTPException(status_code=503, detail="Whisper is not installed or configured")
        with tempfile.TemporaryDirectory() as temp_dir:
            source_path = await self._save_upload(upload, temp_dir)
            output_dir = Path(temp_dir) / "out"
            output_dir.mkdir(parents=True, exist_ok=True)
            command = [
                whisper_bin,
                str(source_path),
                "--model",
                self._settings.whisper_model_path,
                "--output_format",
                "txt",
                "--output_dir",
                str(output_dir),
            ]
            try:
                subprocess.run(command, check=True, capture_output=True, text=True)
            except subprocess.CalledProcessError as exc:
                raise HTTPException(status_code=500, detail=exc.stderr.strip() or "Whisper transcription failed") from exc
            transcript_file = output_dir / f"{source_path.stem}.txt"
            if not transcript_file.exists():
                raise HTTPException(status_code=500, detail="Whisper did not produce a transcript")
            text = transcript_file.read_text(encoding="utf-8").strip()
            return {"text": text, "confidence": 0.9 if text else 0.0}

    def synthesize(self, text: str, speed: int, voice: str, pitch: int) -> bytes:
        espeak_bin = self._resolve_binary(self._settings.espeak_bin)
        if not espeak_bin:
            raise HTTPException(status_code=503, detail="eSpeak NG is not installed or configured")
        with tempfile.TemporaryDirectory() as temp_dir:
            output_path = Path(temp_dir) / "speech.wav"
            command = [
                espeak_bin,
                "-w",
                str(output_path),
                "-s",
                str(speed),
                "-v",
                voice,
                "-p",
                str(pitch),
                text,
            ]
            try:
                subprocess.run(command, check=True, capture_output=True, text=True)
            except subprocess.CalledProcessError as exc:
                raise HTTPException(status_code=500, detail=exc.stderr.strip() or "TTS synthesis failed") from exc
            return output_path.read_bytes()

    def format_answer(self, raw_text: str, question_context: str | None = None) -> str:
        prompt = (
            "Rewrite the following exam answer so it is grammatically correct, concise, and keeps the original meaning. "
            "Do not add facts. Return only the rewritten answer.\n\n"
            f"Question context: {question_context or 'N/A'}\n\n"
            f"Answer: {raw_text}"
        )
        try:
            response = httpx.post(
                f"{self._settings.ollama_url.rstrip('/')}/api/generate",
                json={"model": self._settings.ollama_model, "prompt": prompt, "stream": False},
                timeout=30.0,
            )
            response.raise_for_status()
            payload = response.json()
            formatted = str(payload.get("response") or "").strip()
            return formatted or raw_text
        except Exception:
            return raw_text
