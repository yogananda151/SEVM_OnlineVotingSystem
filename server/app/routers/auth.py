from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginRequest
from app.services.auth_service import auth_service
from app.middleware.auth import get_current_user, CurrentUser
from app.utils.response import success_response

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/login")
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    result = auth_service.login(
        db=db,
        email=payload.email,
        password=payload.password,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    return success_response(data=result, message="Login successful")

@router.post("/logout")
def logout(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent")
    auth_service.logout(db, user_id=current_user.userId, ip_address=ip_address, user_agent=user_agent)
    return success_response(data=None, message="Logged out successfully")

@router.get("/profile")
def get_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    profile = auth_service.get_profile(db, user_id=current_user.userId)
    return success_response(data=profile)
