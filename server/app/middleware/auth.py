from typing import Optional, List
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.enums import UserRole
from app.utils.jwt import verify_access_token

class CurrentUser:
    def __init__(self, user_id: int, email: str, role: UserRole, station_id: Optional[int] = None, user_model: Optional[User] = None):
        self.userId = user_id
        self.email = email
        self.role = role
        self.stationId = station_id
        self.userModel = user_model

def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> CurrentUser:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access denied. No token provided.",
        )

    token = authorization.split(" ")[1]
    payload = verify_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    user_id = payload.get("userId")
    user = db.query(User).filter(User.id == user_id, User.deletedAt.is_(None)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deleted.",
        )

    if not user.isActive:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact administrator.",
        )

    station_id = payload.get("stationId")
    if station_id is None and user.officer:
        station_id = user.officer.pollingStationId

    return CurrentUser(
        user_id=user.id,
        email=user.email,
        role=UserRole(user.role),
        station_id=station_id,
        user_model=user,
    )

def require_roles(*allowed_roles: UserRole):
    def role_checker(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden. Insufficient permissions.",
            )
        return current_user
    return role_checker
