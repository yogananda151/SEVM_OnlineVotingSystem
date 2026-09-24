import os
from datetime import datetime
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config import settings
from app.database import engine, Base
import app.models  # ensure all models are imported so relationships are linked
from app.utils.logger import logger
from app.middleware.error_handler import (
    http_exception_handler,
    validation_exception_handler,
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
    
    # Auto-create tables if they don't exist
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified.")
    except Exception as e:
        logger.error(f"Error checking/creating database tables: {e}")

    logger.info(f"Smart EVM FastAPI Server started on {settings.HOST}:{settings.PORT} ({settings.ENV})")
    yield
    logger.info("Smart EVM FastAPI Server stopping.")

app = FastAPI(
    title="Smart EVM – Online Voting System API",
    description="Python FastAPI backend simulation for Electronic Voting Machine",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
origins = [
    settings.CLIENT_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static File Serving for Uploads ───────────────────────────────────────────
upload_abs_path = os.path.abspath(settings.UPLOAD_PATH)
os.makedirs(upload_abs_path, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=upload_abs_path), name="uploads")

# ── Exception Handlers ────────────────────────────────────────────────────────
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

# ── Health Check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "env": settings.ENV,
    }

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(voting.router)
app.include_router(elections.router)
app.include_router(voters.router)
app.include_router(management.router)
app.include_router(reports.router)
app.include_router(notifications.router)
