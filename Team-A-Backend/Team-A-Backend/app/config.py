from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    mongodb_uri: str = "mongodb://127.0.0.1:27017"
    mongodb_db_name: str = "vox"
    port: int = 3000
    frontend_url: str = "http://localhost:5173"
    jwt_secret: str = "vox-local-dev-secret-change-this"
    whisper_bin: str = "whisper"
    whisper_model_path: str = "tiny.en"
    ffmpeg_bin: str = "ffmpeg"
    espeak_bin: str = "espeak-ng"
    ollama_url: str = "http://localhost:11434"
    ollama_model: str = "llama3:latest"
    vox_superadmin_email: str = "admin@vox.edu"
    vox_superadmin_password: str = "ChangeMe@123"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
