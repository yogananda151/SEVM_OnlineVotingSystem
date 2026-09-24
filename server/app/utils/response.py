import math
from typing import Any, Optional, Dict
from fastapi.responses import JSONResponse

def success_response(
    data: Any = None,
    message: str = "Success",
    status_code: int = 200,
    meta: Optional[Dict[str, Any]] = None,
) -> JSONResponse:
    content: Dict[str, Any] = {
        "success": True,
        "message": message,
        "data": data,
    }
    if meta is not None:
        content["meta"] = meta
    return JSONResponse(status_code=status_code, content=content)

def paginated_response(
    data: list,
    total: int,
    page: int,
    limit: int,
    message: str = "Success",
) -> JSONResponse:
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return JSONResponse(
        status_code=200,
        content={
            "success": True,
            "message": message,
            "data": data,
            "meta": {
                "total": total,
                "page": page,
                "limit": limit,
                "totalPages": total_pages,
            },
        },
    )

def error_response(
    message: str = "An error occurred",
    status_code: int = 400,
    errors: Any = None,
) -> JSONResponse:
    content: Dict[str, Any] = {
        "success": False,
        "message": message,
    }
    if errors is not None:
        content["errors"] = errors
    return JSONResponse(status_code=status_code, content=content)
