import os
import ssl
import urllib.parse
from typing import Optional, List, Dict, Any, Tuple
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Server Environment & Network Binding
    ENV: str = Field(default="development")
    HOST: str = Field(default="0.0.0.0")
    PORT: int = Field(default=5000)

    # Database
    DATABASE_URL: str = Field(
        default="mysql+pymysql://root:password@localhost:3306/voting_system"
    )

    # Cryptographic Authentication Secrets
    JWT_SECRET: str = Field(
        default="smart_evm_dev_access_secret_key_2025_min_32_chars"
    )
    JWT_EXPIRES_IN: str = Field(default="8h")
    JWT_REFRESH_SECRET: str = Field(
        default="smart_evm_dev_refresh_secret_key_2025_min_32_chars"
    )
    JWT_REFRESH_EXPIRES_IN: str = Field(default="7d")
    AADHAAR_HMAC_SECRET: str = Field(
        default="smart_evm_dev_aadhaar_hmac_secret_2025_min_32_chars"
    )

    # Allowed Frontend Client Origin(s) for CORS
    CLIENT_URL: str = Field(default="http://localhost:5173")

    # File Storage
    UPLOAD_PATH: str = Field(default="./uploads")
    MAX_FILE_SIZE: int = Field(default=5242880)  # 5 MB
    STORAGE_BACKEND: str = Field(default="local")  # local | s3

    # Logging
    LOG_LEVEL: str = Field(default="INFO")
    LOG_FILE: str = Field(default="./logs/app.log")

    # Optional TLS CA certificate override (e.g., custom root CA for MySQL)
    TIDB_CA_PATH: Optional[str] = Field(default=None)

    # Optional Seed Account Credentials (used during initial explicit database setup)
    SEED_COMMISSIONER_PASSWORD: Optional[str] = Field(default=None)
    SEED_OFFICER_PASSWORD: Optional[str] = Field(default=None)

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        env_lower = self.ENV.lower()
        if env_lower == "production":
            insecure_markers = [
                "change_in_production",
                "your_super_secret",
                "your_refresh_secret",
                "your_aadhaar_hmac",
                "smart_evm_dev",
                "admin123",
                "secret",
            ]

            # Validate JWT_SECRET
            if not self.JWT_SECRET or len(self.JWT_SECRET) < 32:
                raise ValueError(
                    "Production configuration error: JWT_SECRET must be at least 32 characters."
                )
            if any(marker in self.JWT_SECRET.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production configuration error: Insecure placeholder detected in JWT_SECRET. "
                    "Provide a dedicated, randomly generated 32+ character secret."
                )

            # Validate JWT_REFRESH_SECRET
            if not self.JWT_REFRESH_SECRET or len(self.JWT_REFRESH_SECRET) < 32:
                raise ValueError(
                    "Production configuration error: JWT_REFRESH_SECRET must be at least 32 characters."
                )
            if self.JWT_REFRESH_SECRET == self.JWT_SECRET:
                raise ValueError(
                    "Production configuration error: JWT_REFRESH_SECRET must be distinct from JWT_SECRET."
                )
            if any(marker in self.JWT_REFRESH_SECRET.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production configuration error: Insecure placeholder detected in JWT_REFRESH_SECRET."
                )

            # Validate AADHAAR_HMAC_SECRET
            if not self.AADHAAR_HMAC_SECRET or len(self.AADHAAR_HMAC_SECRET) < 32:
                raise ValueError(
                    "Production configuration error: AADHAAR_HMAC_SECRET must be at least 32 characters."
                )
            if self.AADHAAR_HMAC_SECRET in (self.JWT_SECRET, self.JWT_REFRESH_SECRET):
                raise ValueError(
                    "Production configuration error: AADHAAR_HMAC_SECRET must be distinct from JWT secrets."
                )
            if any(marker in self.AADHAAR_HMAC_SECRET.lower() for marker in insecure_markers):
                raise ValueError(
                    "Production configuration error: Insecure placeholder detected in AADHAAR_HMAC_SECRET."
                )

            # Validate DATABASE_URL is not default dev
            if "root:password@localhost" in self.DATABASE_URL:
                raise ValueError(
                    "Production configuration error: DATABASE_URL is set to local default. "
                    "Provide a managed MySQL or TiDB Cloud connection string."
                )
        return self

    @property
    def cors_origins(self) -> List[str]:
        """Returns clean list of allowed CORS origins without trailing slashes."""
        default_dev_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        origins = list(default_dev_origins)
        if self.CLIENT_URL:
            for part in self.CLIENT_URL.split(","):
                cleaned = part.strip().rstrip("/")
                if cleaned and cleaned not in origins:
                    origins.append(cleaned)
        return origins

    def _parse_database_url_details(self) -> Tuple[str, Dict[str, Any], bool]:
        """
        Parses DATABASE_URL safely handling:
        1. Translating mysql:// to mysql+pymysql://
        2. Safely quoting unencoded passwords containing '@', '#', or special characters
        3. Stripping unsupported parameters (like 'ssl_mode' which crashes PyMySQL)
        4. Detecting remote or TiDB connections requiring TLS
        """
        raw = self.DATABASE_URL.strip().strip('"').strip("'")
        if not raw:
            return "mysql+pymysql://root:password@localhost:3306/voting_system", {}, False

        # Extract scheme
        if "://" in raw:
            proto, rest = raw.split("://", 1)
        else:
            proto, rest = "mysql", raw

        proto = "mysql+pymysql"

        # Separate query parameters
        query_str = ""
        if "?" in rest:
            rest, query_str = rest.split("?", 1)

        # Separate database path
        if "/" in rest:
            netloc, dbname = rest.split("/", 1)
        else:
            netloc, dbname = rest, ""

        # Parse credentials and host safely
        is_remote = False
        is_tidb = False
        if "@" in netloc:
            creds, host_part = netloc.rsplit("@", 1)
            if ":" in creds:
                user, pwd = creds.split(":", 1)
                # Percent-encode if not already encoded
                pwd = urllib.parse.quote_plus(urllib.parse.unquote(pwd))
                user = urllib.parse.quote_plus(urllib.parse.unquote(user))
                netloc = f"{user}:{pwd}@{host_part}"
            if "localhost" not in host_part and "127.0.0.1" not in host_part:
                is_remote = True
            if "tidb" in host_part.lower():
                is_tidb = True
        else:
            if "localhost" not in netloc and "127.0.0.1" not in netloc:
                is_remote = True

        # Process query parameters
        connect_args: Dict[str, Any] = {}
        cleaned_query_params: List[Tuple[str, str]] = []
        requires_tls = is_tidb

        if query_str:
            raw_params = urllib.parse.parse_qsl(query_str, keep_blank_values=True)
            for k, v in raw_params:
                k_lower = k.lower()
                if k_lower == "ssl_mode":
                    # PyMySQL raises TypeError on ssl_mode. Convert to TLS requirement.
                    if v.upper() in ("VERIFY_IDENTITY", "VERIFY_CA", "REQUIRED", "PREFERRED"):
                        requires_tls = True
                    continue  # Strip ssl_mode so PyMySQL doesn't crash
                elif k_lower in ("ssl_ca", "ssl-ca"):
                    requires_tls = True
                    # Check if CA file exists locally (e.g., Linux vs Windows differences)
                    if os.path.exists(v):
                        cleaned_query_params.append(("ssl_ca", v))
                    else:
                        # Fallback to system default CA context if path does not exist
                        pass
                else:
                    cleaned_query_params.append((k, v))

        # Build clean URL
        clean_url = f"{proto}://{netloc}/{dbname}"
        if cleaned_query_params:
            clean_url = f"{clean_url}?{urllib.parse.urlencode(cleaned_query_params)}"

        return clean_url, connect_args, requires_tls

    @property
    def sqlalchemy_database_url(self) -> str:
        """Returns clean SQLAlchemy-compatible database URL."""
        url, _, _ = self._parse_database_url_details()
        return url

    def get_database_engine_params(self) -> Tuple[str, Dict[str, Any]]:
        """
        Returns (url, connect_args) configured with TLS certificate verification
        for TiDB Cloud or remote production MySQL databases.
        """
        url, connect_args, requires_tls = self._parse_database_url_details()

        if requires_tls or (self.ENV.lower() == "production" and "localhost" not in url):
            # Create standard default TLS context verifying system/host certificates
            ca_file = self.TIDB_CA_PATH
            if not ca_file and os.path.exists("/etc/ssl/certs/ca-certificates.crt"):
                ca_file = "/etc/ssl/certs/ca-certificates.crt"

            if ca_file and os.path.exists(ca_file):
                ssl_ctx = ssl.create_default_context(cafile=ca_file)
            else:
                ssl_ctx = ssl.create_default_context()

            ssl_ctx.check_hostname = True
            ssl_ctx.verify_mode = ssl.CERT_REQUIRED
            connect_args["ssl"] = ssl_ctx

        return url, connect_args

    @property
    def safe_database_url(self) -> str:
        """Returns connection string with password masked for safe logging/display."""
        url, _, _ = self._parse_database_url_details()
        try:
            proto, rest = url.split("://", 1)
            if "@" in rest and ":" in rest.split("@")[0]:
                creds, host_part = rest.rsplit("@", 1)
                user = creds.split(":", 1)[0]
                return f"{proto}://{user}:***@{host_part}"
        except Exception:
            pass
        return "mysql+pymysql://***:***@masked-host/masked-db"


settings = Settings()
