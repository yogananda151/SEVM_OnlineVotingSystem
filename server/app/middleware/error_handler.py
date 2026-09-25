from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.utils.logger import logger

async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": detail},
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_messages = []
    for err in exc.errors():
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "Invalid value")
        error_messages.append(f"{loc}: {msg}")
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "message": "Validation error: " + "; ".join(error_messages),
            "errors": exc.errors(),
        },
    )

async def integrity_exception_handler(request: Request, exc: Exception):
    logger.warning(f"Database IntegrityError on {request.url}: {exc}")
    msg = str(exc)
    # Check for duplicate key messages
    if "Duplicate entry" in msg or "1062" in msg:
        clean_msg = "A record with these unique details (name or code) already exists. Please choose different values."
        if "regions_name_key" in msg:
            clean_msg = "A region with this name already exists. Please use a different name."
        elif "regions_code_key" in msg:
            clean_msg = "A region with this code already exists. Please use a different code."
        elif "constituencies_code_key" in msg:
            clean_msg = "A constituency with this code already exists. Please use a different code."
        elif "polling_stations_code_key" in msg:
            clean_msg = "A polling station with this code already exists. Please use a different code."
        elif "voters_voterId_key" in msg:
            clean_msg = "A voter with this Voter ID already exists."
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"success": False, "message": clean_msg},
        )
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"success": False, "message": "Database constraint violation occurred."},
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing request: {request.url}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": str(exc) or "Internal server error"},
    )
