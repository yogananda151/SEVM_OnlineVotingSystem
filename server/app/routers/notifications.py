from datetime import datetime
from typing import Optional, List, Dict
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.system import Notification, Setting
from app.models.enums import UserRole
from app.middleware.auth import get_current_user, require_roles, CurrentUser
from app.schemas.notification import CreateNotificationRequest, SettingUpdateRequest, BulkSettingsRequest
from app.utils.response import success_response, paginated_response

router = APIRouter(prefix="/api", tags=["Notifications & Settings"])

# ── Notifications ─────────────────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications(
    page: int = 1,
    limit: int = 20,
    isRead: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Notification)
    if isRead == "true":
        q = q.filter(Notification.isRead.is_(True))
    elif isRead == "false":
        q = q.filter(Notification.isRead.is_(False))

    total = q.count()
    items = q.order_by(Notification.createdAt.desc()).offset((page - 1) * limit).limit(limit).all()

    data = [{
        "id": n.id,
        "title": n.title,
        "message": n.message,
        "type": n.type,
        "isRead": n.isRead,
        "electionId": n.electionId,
        "createdAt": n.createdAt.isoformat() if n.createdAt else None,
        "election": {"id": n.election.id, "name": n.election.name} if n.election else None,
    } for n in items]

    return paginated_response(data=data, total=total, page=page, limit=limit)

@router.get("/notifications/unread-count")
def get_unread_count(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    count = db.query(Notification).filter(Notification.isRead.is_(False)).count()
    return success_response(data={"count": count})

@router.post("/notifications")
def create_notification(
    payload: CreateNotificationRequest,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    n = Notification(
        title=payload.title.strip(),
        message=payload.message.strip(),
        type=payload.type or "info",
        electionId=payload.electionId,
    )
    db.add(n)
    db.commit()
    db.refresh(n)
    return success_response(data={"id": n.id, "title": n.title}, message="Notification created", status_code=201)

@router.patch("/notifications/read-all")
def mark_all_read(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.isRead.is_(False)).update({"isRead": True})
    db.commit()
    return success_response(data={"message": "All notifications marked as read"})

@router.delete("/notifications")
def clear_read_notifications(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    deleted = db.query(Notification).filter(Notification.isRead.is_(True)).delete()
    db.commit()
    return success_response(data={"message": f"Cleared {deleted} read notifications"})

@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.isRead = True
    db.commit()
    db.refresh(n)
    return success_response(data={"id": n.id, "isRead": n.isRead})

@router.delete("/notifications/{notification_id}")
def delete_notification(
    notification_id: int,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()
    return success_response(data={"message": "Notification deleted"})

# ── Settings ──────────────────────────────────────────────────────────────────

@router.get("/settings")
def get_all_settings(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    settings_list = db.query(Setting).order_by(Setting.group.asc(), Setting.key.asc()).all()
    grouped: Dict[str, list] = {}
    items = []
    for s in settings_list:
        obj = {
            "id": s.id,
            "key": s.key,
            "value": s.value,
            "group": s.group,
            "label": s.label,
        }
        items.append(obj)
        grp = s.group or "general"
        if grp not in grouped:
            grouped[grp] = []
        grouped[grp].append(obj)

    return success_response(data={"settings": items, "grouped": grouped})

@router.put("/settings/{key}")
def update_setting(
    key: str,
    payload: SettingUpdateRequest,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    s = db.query(Setting).filter(Setting.key == key).first()
    if not s:
        raise HTTPException(status_code=404, detail=f'Setting "{key}" not found')
    s.value = payload.value
    db.commit()
    db.refresh(s)
    return success_response(data={"id": s.id, "key": s.key, "value": s.value})

@router.post("/settings/bulk")
def bulk_update_settings(
    payload: BulkSettingsRequest,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    results = []
    for item in payload.updates:
        s = db.query(Setting).filter(Setting.key == item.key).first()
        if s:
            s.value = item.value
        else:
            s = Setting(key=item.key, value=item.value, label=item.key, group="general")
            db.add(s)
        results.append({"key": item.key, "value": item.value})
    db.commit()
    return success_response(data=results, message="Settings updated successfully")
