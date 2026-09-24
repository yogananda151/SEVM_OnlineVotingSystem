import os
import urllib.parse
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENV: str = "development"
    PORT: int = 5000
    HOST: str = "0.0.0.0"

    DATABASE_URL: str = "mysql+pymysql://root:Yoga%401234@localhost:3306/voting_system"

    JWT_SECRET: str = "smart_evm_super_secret_jwt_key_2025_change_in_production"
    JWT_EXPIRES_IN: str = "8h"
    JWT_REFRESH_SECRET: str = "smart_evm_refresh_secret_key_2025_change_in_production"
    JWT_REFRESH_EXPIRES_IN: str = "7d"

    AADHAAR_HMAC_SECRET: str = "smart_evm_aadhaar_hmac_secret_2025_change_in_production"

    CLIENT_URL: str = "http://localhost:5173"
    UPLOAD_PATH: str = "./uploads"
    MAX_FILE_SIZE: int = 5242880

    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def sqlalchemy_database_url(self) -> str:
        raw = self.DATABASE_URL.strip().strip('"').strip("'")
        
        # Ensure pymysql driver
        if raw.startswith("mysql://"):
            raw = raw.replace("mysql://", "mysql+pymysql://", 1)
        elif not raw.startswith("mysql+pymysql://"):
            if "://" not in raw:
                raw = f"mysql+pymysql://{raw}"

        # Handle passwords containing '@'
        try:
            proto, rest = raw.split("://", 1)
            if "@" in rest and ":" in rest.split("@")[0]:
                creds, host_part = rest.rsplit("@", 1)
                user, password = creds.split(":", 1)
                # If password is not already percent-encoded, encode it
                if "%" not in password:
                    password = urllib.parse.quote_plus(password)
                return f"{proto}://{user}:{password}@{host_part}"
        except Exception:
            pass

        return raw

settings = Settings()
