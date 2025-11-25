from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

env_path = Path(__file__).parent.parent.parent / ".env"

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./citizens_appeals.db"
    SECRET_KEY: str = "novie-lyudi-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    UPLOAD_DIR: str = "uploads"
    
    class Config:
        env_file = str(env_path)
        env_file_encoding = 'utf-8'

settings = Settings()
