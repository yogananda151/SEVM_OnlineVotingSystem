import os
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from fastapi import FastAPI, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base, check_db_connection
import app.models  # ensure all models are imported so relationships are linked
from app.utils.logger import logger
from sqlalchemy.exc import IntegrityError, OperationalError
from app.middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
    integrity_exception_handler,
    operational_exception_handler,
    generic_exception_handler,
)
from app.routers import (
    auth,
    elections,
    management,
    voters,
    voting,
    reports,
    notifications,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure upload subfolders exist
    for sub in ["candidates", "parties", "voters"]:
        os.makedirs(os.path.join(settings.UPLOAD_PATH, sub), exist_ok=True)

    # Verify and create missing tables safely without dropping data
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema verified via SQLAlchemy metadata.")
    except Exception as e:
        logger.error(f"Database schema verification warning: {e}")

    logger.info(
        f"Smart EVM FastAPI Server starting on {settings.HOST}:{settings.PORT} "
        f"[ENV={settings.ENV}, DB={settings.safe_database_url}]"
    )
    yield
    logger.info("Smart EVM FastAPI Server stopped.")


app = FastAPI(
    title="Smart EVM – Online Voting System API",
    description="Python FastAPI backend simulation for Electronic Voting Machine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS Middleware ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Static File Serving for Uploads ───────────────────────────────────────────
upload_abs_path = os.path.abspath(settings.UPLOAD_PATH)
os.makedirs(upload_abs_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_abs_path), name="uploads")

# ── Exception Handlers ────────────────────────────────────────────────────────
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(IntegrityError, integrity_exception_handler)
app.add_exception_handler(OperationalError, operational_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check(check_db: bool = Query(default=False, description="Perform active database ping")):
    db_ok, db_msg = check_db_connection()
    status_code = 200
    if check_db and not db_ok:
        status_code = 503

    payload = {
        "status": "ok" if (not check_db or db_ok) else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "env": settings.ENV,
        "services": {
            "api": "healthy",
            "database": "connected" if db_ok else "unreachable",
        },
    }
    return JSONResponse(status_code=status_code, content=payload)


# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(voting.router)
app.include_router(elections.router)
app.include_router(voters.router)
app.include_router(management.router)
app.include_router(reports.router)
app.include_router(notifications.router)
