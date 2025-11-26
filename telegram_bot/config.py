from pydantic_settings import BaseSettings
from pathlib import Path
import os


class Settings(BaseSettings):
    BOT_TOKEN: str = ""
    WEBAPP_URL: str = ""
    BACKEND_URL: str = "http://localhost:8000"
    DATABASE_URL: str = "sqlite:///../backend/citizens_appeals.db"
    
    class Config:
        env_file = str(Path(__file__).parent / ".env")
        env_file_encoding = 'utf-8'


settings = Settings()
