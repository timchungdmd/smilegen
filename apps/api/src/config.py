# apps/api/src/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://smilegen:smilegen@localhost:5432/smilegen"
    aws_bucket: str = "smilegen-assets"
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    secret_key: str = "dev-secret-change-in-prod"

    class Config:
        env_file = ".env"

settings = Settings()
