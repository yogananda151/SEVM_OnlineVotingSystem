import os
import uuid
import shutil
from typing import Set
from fastapi import UploadFile, HTTPException, status
from app.config import settings

ALLOWED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
ALLOWED_MIME_TYPES: Set[str] = {
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/webp",
    "image/svg+xml",
}
ALLOWED_SUBFOLDERS: Set[str] = {"candidates", "parties", "voters"}


class StorageService:
    """
    Unified storage abstraction for uploaded assets (candidate photos, party symbols, voter photos).
    Enforces strict file extension and MIME type validation, max size limits, path-traversal prevention,
    and safe random UUID filenames.
    """

    @staticmethod
    def validate_and_save(file: UploadFile, subfolder: str) -> str:
        # 1. Validate subfolder to prevent path traversal
        clean_subfolder = os.path.basename(subfolder).strip().lower()
        if clean_subfolder not in ALLOWED_SUBFOLDERS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid upload destination. Allowed subfolders: {sorted(ALLOWED_SUBFOLDERS)}",
            )

        # 2. Validate file extension
        orig_name = file.filename or ""
        ext = os.path.splitext(orig_name)[1].lower()
        if not ext or ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file extension '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
            )

        # 3. Validate content type if provided
        content_type = (file.content_type or "").lower().split(";")[0].strip()
        if content_type and content_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid MIME type '{content_type}'. Must be an approved image format.",
            )

        # 4. Enforce file size limit safely by chunk streaming
        target_dir = os.path.abspath(os.path.join(settings.UPLOAD_PATH, clean_subfolder))
        os.makedirs(target_dir, exist_ok=True)

        unique_filename = f"{uuid.uuid4().hex}{ext}"
        destination_path = os.path.join(target_dir, unique_filename)

        total_bytes = 0
        chunk_size = 1024 * 64  # 64 KB chunks

        try:
            file.file.seek(0)
            with open(destination_path, "wb") as buffer:
                while True:
                    chunk = file.file.read(chunk_size)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > settings.MAX_FILE_SIZE:
                        # Clean up partial file
                        buffer.close()
                        if os.path.exists(destination_path):
                            os.remove(destination_path)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"Uploaded file exceeds maximum limit of {settings.MAX_FILE_SIZE // (1024 * 1024)} MB.",
                        )
                    buffer.write(chunk)
        except HTTPException:
            raise
        except Exception as e:
            if os.path.exists(destination_path):
                os.remove(destination_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist uploaded asset: {str(e)}",
            )

        # Return standardized URL path matching static file mount
        return f"/uploads/{clean_subfolder}/{unique_filename}"


storage_service = StorageService()
