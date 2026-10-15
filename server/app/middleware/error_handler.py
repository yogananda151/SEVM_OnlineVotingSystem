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
        elif "voters_voterid_key" in msg.lower() or "voterid" in msg.lower():
            clean_msg = "A voter with this Voter ID already exists in the system. Please use a unique Voter ID."
        elif "voters_aadhaarhash_key" in msg.lower() or "aadhaar" in msg.lower():
            clean_msg = "A voter with this Aadhaar Number already exists in the system. Each citizen must have a unique Aadhaar."
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"success": False, "message": clean_msg},
        )
    # Check for foreign key constraint violation messages (e.g. MySQL 1452)
    if "1452" in msg or "foreign key constraint fails" in msg.lower():
        clean_msg = "Database foreign key constraint violation: A referenced record does not exist. Please ensure Electoral Hierarchy is imported first."
        if "voters_constituencyId_fkey" in msg:
            clean_msg = "The specified Constituency ID does not exist in the database. Please ensure Electoral Hierarchy is imported first."
        elif "voters_pollingStationId_fkey" in msg:
            clean_msg = "The specified Polling Station ID does not exist in the database. Please ensure Electoral Hierarchy is imported first."
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"success": False, "message": clean_msg},
        )
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"success": False, "message": "Database constraint violation occurred."},
    )

from sqlalchemy.exc import OperationalError

async def operational_exception_handler(request: Request, exc: OperationalError):
    logger.error(f"Database OperationalError on {request.url}: {exc}")
    msg = str(exc)
    if "Can't connect to MySQL server" in msg or "2003" in msg or "10061" in msg:
        clean_msg = "Cannot connect to MySQL database server on localhost:3306. Please ensure the MySQL service ('MySQL97') is started."
    elif "Access denied" in msg or "1045" in msg:
        clean_msg = "MySQL authentication failed. Please verify the database user and password in server/.env."
    elif "Unknown database" in msg or "1049" in msg:
        clean_msg = "Database 'voting_system' does not exist in MySQL. Please run the database setup/seed script."
    else:
        clean_msg = f"Database connection error: {msg}"

    return JSONResponse(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"success": False, "message": clean_msg},
    )

async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing request: {request.url}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"success": False, "message": str(exc) or "Internal server error"},
    )
