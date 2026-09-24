from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit import AuditLog
from app.models.enums import UserRole, AuditAction
from app.middleware.auth import require_roles, CurrentUser
from app.services.report_service import report_service
from app.utils.response import paginated_response

router = APIRouter(prefix="/api", tags=["Reports & Audit"])

@router.get("/audit-logs")
def get_audit_logs(
    page: int = 1,
    limit: int = 50,
    userId: Optional[int] = None,
    electionId: Optional[int] = None,
    action: Optional[AuditAction] = None,
    module: Optional[str] = None,
    startDate: Optional[str] = None,
    endDate: Optional[str] = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if userId:
        q = q.filter(AuditLog.userId == userId)
    if electionId:
        q = q.filter(AuditLog.electionId == electionId)
    if action:
        q = q.filter(AuditLog.action == action)
    if module:
        q = q.filter(AuditLog.module.ilike(f"%{module}%"))
    if startDate:
        s_date = datetime.fromisoformat(startDate.replace("Z", "+00:00"))
        q = q.filter(AuditLog.createdAt >= s_date)
    if endDate:
        e_date = datetime.fromisoformat(endDate.replace("Z", "+00:00"))
        q = q.filter(AuditLog.createdAt <= e_date)

    total = q.count()
    logs = q.order_by(AuditLog.createdAt.desc()).offset((page - 1) * limit).limit(limit).all()

    data = [{
        "id": log.id,
        "userId": log.userId,
        "electionId": log.electionId,
        "action": str(log.action.value if hasattr(log.action, "value") else log.action),
        "module": log.module,
        "description": log.description,
        "ipAddress": log.ipAddress,
        "userAgent": log.userAgent,
        "metadata": log.metadata_,
        "createdAt": log.createdAt.isoformat() if log.createdAt else None,
        "user": {
            "id": log.user.id,
            "email": log.user.email,
            "role": str(log.user.role.value if hasattr(log.user.role, "value") else log.user.role),
        } if log.user else None,
    } for log in logs]

    return paginated_response(data=data, total=total, page=page, limit=limit)

@router.get("/reports/election/{election_id}/summary/pdf")
def download_election_summary_pdf(
    election_id: int,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    pdf_stream = report_service.generate_election_summary_pdf(db, election_id)
    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="election-{election_id}-summary.pdf"'},
    )

@router.get("/reports/election/{election_id}/results/excel")
def download_election_results_excel(
    election_id: int,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    excel_stream = report_service.generate_results_excel(db, election_id)
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="election-{election_id}-results.xlsx"'},
    )

@router.get("/reports/station/{station_id}/voters/excel")
def download_station_voters_excel(
    station_id: int,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    excel_stream = report_service.generate_voters_excel(db, station_id)
    return StreamingResponse(
        excel_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="station-{station_id}-voters.xlsx"'},
    )

@router.get("/reports/audit-log/pdf")
def download_audit_log_pdf(
    startDate: Optional[str] = Query(None),
    endDate: Optional[str] = Query(None),
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    s_date = datetime.fromisoformat(startDate.replace("Z", "+00:00")) if startDate else None
    e_date = datetime.fromisoformat(endDate.replace("Z", "+00:00")) if endDate else None

    pdf_stream = report_service.generate_audit_log_pdf(db, start_date=s_date, end_date=e_date)
    today_str = datetime.now().strftime("%Y-%m-%d")
    return StreamingResponse(
        pdf_stream,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="audit-log-{today_str}.pdf"'},
    )
