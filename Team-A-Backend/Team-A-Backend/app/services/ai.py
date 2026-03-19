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
            print(f"[STT] Audio file received: {source_path.name} ({source_path.stat().st_size} bytes)")
            
            # Validate file has content
            if source_path.stat().st_size < 1000:
                print(f"[STT] WARNING: Audio file too small ({source_path.stat().st_size} bytes) - may be empty or corrupted")
            
            # Attempt WAV conversion if file is WebM or unknown format
            target_path = source_path
            original_suffix = source_path.suffix.lower()
            
            if original_suffix in ['.webm', '.mkv']:
                print(f"[STT] Converting {original_suffix} to WAV for better Whisper compatibility...")
                wav_path = Path(temp_dir) / "converted.wav"
                ffmpeg_bin = shutil.which('ffmpeg')
                
                if ffmpeg_bin:
                    try:
                        result = subprocess.run(
                            [ffmpeg_bin, '-i', str(source_path), '-acodec', 'pcm_s16le', 
                             '-ar', '16000', '-ac', '1', str(wav_path), '-y'],
                            capture_output=True, text=True, timeout=30
                        )
                        if wav_path.exists() and wav_path.stat().st_size > 1000:
                            target_path = wav_path
                            print(f"[STT] Conversion successful: {wav_path.stat().st_size} bytes")
                        else:
                            print(f"[STT] Conversion failed, attempting direct Whisper processing")
                    except Exception as e:
                        print(f"[STT] ffmpeg unavailable ({e}), attempting direct Whisper processing")
                else:
                    print(f"[STT] ffmpeg not available, attempting direct Whisper processing")
            
            output_dir = Path(temp_dir) / "out"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            command = [
                whisper_bin,
                str(target_path),
                "--model",
                self._settings.whisper_model_path,
                "--output_format",
                "txt",
                "--output_dir",
                str(output_dir),
                "--language",
                "en",
                "--task",
                "transcribe",
                "--temperature",
                "0",
                "--best_of",
                "1",
                "--beam_size",
                "1",
            ]

            configured_model = self._settings.whisper_model_path
            fallback_model = "tiny.en"
            models_to_try = [configured_model]
            if configured_model != fallback_model:
                models_to_try.append(fallback_model)

            completed = False
            last_error: str | None = None

            for model_name in models_to_try:
                trial_command = command.copy()
                model_index = trial_command.index("--model") + 1
                trial_command[model_index] = model_name

                try:
                    subprocess.run(trial_command, check=True, capture_output=True, text=True, timeout=30)
                    print(f"[STT] Whisper completed successfully with model: {model_name}")
                    completed = True
                    break
                except subprocess.TimeoutExpired:
                    last_error = f"Whisper model '{model_name}' timed out"
                    print(f"[STT] {last_error}")
                except subprocess.CalledProcessError as exc:
                    stderr = exc.stderr.strip() or "Whisper transcription failed"
                    last_error = stderr
                    print(f"[STT] Whisper error ({model_name}): {stderr}")

            if not completed:
                # Do not 500 the request for transient STT failures; return empty transcript.
                print(f"[STT] Returning empty transcript after failures: {last_error or 'unknown error'}")
                return {"text": "", "confidence": 0.0}
            
            transcript_file = output_dir / f"{target_path.stem}.txt"
            if not transcript_file.exists():
                print(f"[STT] ERROR: Transcript file not created at {transcript_file}")
                raise HTTPException(status_code=500, detail="Whisper did not produce a transcript")
            
            text = transcript_file.read_text(encoding="utf-8").strip()
            print(f"[STT] Transcribed text: '{text}' (confidence: {'0.95' if text else '0.0'})")
            return {"text": text, "confidence": 0.95 if text else 0.0}

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
