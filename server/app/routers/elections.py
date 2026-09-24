from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.election import Election, ElectionConstituency
from app.models.location import Constituency
from app.models.user import ElectionOfficer
from app.models.enums import UserRole, ElectionStatus, AuditAction
from app.middleware.auth import get_current_user, require_roles, CurrentUser
from app.schemas.election import (
    CreateElectionRequest,
    UpdateElectionRequest,
    UpdateElectionStatusRequest,
    SetElectionConstituenciesRequest,
    SetElectionOfficerRequest,
)
from app.services.election_service import election_service
from app.services.vote_service import vote_service
from app.services.audit_service import audit_service
from app.utils.response import success_response

router = APIRouter(prefix="/api/elections", tags=["Elections"])

def format_election_summary(e: Election, db: Session):
    constituencies_data = []
    for link in e.electionConstituencies:
        con = link.constituency
        voter_count = len(con.voters)
        candidate_count = len([c for c in con.candidates if c.electionId == e.id and not c.deletedAt])
        constituencies_data.append({
            "id": con.id,
            "name": con.name,
            "code": con.code,
            "_count": {
                "voters": voter_count,
                "candidates": candidate_count,
                "pollingStations": len(con.pollingStations),
            },
        })

    officer_data = None
    if e.officer:
        officer_data = {
            "id": e.officer.id,
            "fullName": e.officer.fullName,
            "employeeId": e.officer.employeeId,
            "phone": e.officer.phone,
        }

    return {
        "id": e.id,
        "name": e.name,
        "description": e.description,
        "electionType": e.electionType,
        "scheduledDate": e.scheduledDate.isoformat() if e.scheduledDate else None,
        "startTime": e.startTime.isoformat() if e.startTime else None,
        "endTime": e.endTime.isoformat() if e.endTime else None,
        "status": str(e.status.value if hasattr(e.status, "value") else e.status),
        "isResultPublished": e.isResultPublished,
        "officerId": e.officerId,
        "officer": officer_data,
        "electionConstituencies": [
            {"constituency": c} for c in constituencies_data
        ],
        "_count": {
            "electionConstituencies": len(e.electionConstituencies),
            "candidates": len([c for c in e.candidates if not c.deletedAt]),
        },
    }

@router.get("/my/assigned")
def get_my_assigned_elections(
    current_user: CurrentUser = Depends(require_roles(UserRole.OFFICER)),
    db: Session = Depends(get_db),
):
    officer = db.query(ElectionOfficer).filter(ElectionOfficer.userId == current_user.userId, ElectionOfficer.deletedAt.is_(None)).first()
    if not officer:
        return success_response(data=[])

    # Find elections where officerId == officer.id OR polling station matches
    elections = db.query(Election).filter(Election.deletedAt.is_(None)).order_by(Election.scheduledDate.desc()).all()
    assigned = []
    for e in elections:
        is_assigned = (e.officerId == officer.id)
        if not is_assigned and officer.pollingStationId:
            for ec in e.electionConstituencies:
                if any(ps.id == officer.pollingStationId for ps in ec.constituency.pollingStations):
                    is_assigned = True
                    break
        if is_assigned:
            assigned.append(format_election_summary(e, db))

    return success_response(data=assigned)

@router.get("/stats/dashboard")
def get_dashboard_stats(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stats = vote_service.get_dashboard_stats(db)
    return success_response(data=stats)

@router.get("")
@router.get("/")
def get_all_elections(
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    elections = db.query(Election).filter(Election.deletedAt.is_(None)).order_by(Election.scheduledDate.desc()).all()
    data = [format_election_summary(e, db) for e in elections]
    return success_response(data=data)

@router.get("/{election_id}")
def get_election_by_id(
    election_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    return success_response(data=format_election_summary(election, db))

@router.get("/{election_id}/stats")
def get_election_stats(
    election_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    stats = election_service.get_stats(db, election_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Election not found")
    return success_response(data=stats)

@router.get("/{election_id}/results")
def get_election_results(
    election_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")

    if not election.isResultPublished and current_user.role != UserRole.COMMISSIONER:
        raise HTTPException(status_code=403, detail="Results have not been published yet.")

    results = vote_service.get_results(db, election_id)
    return success_response(data={"election": format_election_summary(election, db), "results": results})

@router.get("/{election_id}/readiness")
def get_election_readiness(
    election_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    readiness = election_service.get_readiness(db, election_id)
    if not readiness:
        raise HTTPException(status_code=404, detail="Election not found")
    return success_response(data=readiness)

@router.get("/{election_id}/constituencies")
def get_election_constituencies(
    election_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    links = db.query(ElectionConstituency).filter(ElectionConstituency.electionId == election_id).all()
    data = [{
        "id": l.id,
        "electionId": l.electionId,
        "constituencyId": l.constituencyId,
        "constituency": {
            "id": l.constituency.id,
            "name": l.constituency.name,
            "code": l.constituency.code,
        },
    } for l in links]
    return success_response(data=data)

@router.get("/{election_id}/officer")
def get_election_officer(
    election_id: int,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")

    officer_data = None
    if election.officer:
        officer_data = {
            "id": election.officer.id,
            "fullName": election.officer.fullName,
            "employeeId": election.officer.employeeId,
            "phone": election.officer.phone,
        }
    return success_response(data=officer_data, message="Election officer retrieved")

@router.patch("/{election_id}/status")
def update_status(
    election_id: int,
    payload: UpdateElectionStatusRequest,
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated = election_service.update_status(db, election_id, payload.status, current_user)
    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.UPDATE,
        module="Election",
        description=f"Election status changed to: {payload.status}",
        user_id=current_user.userId,
        election_id=election_id,
        ip_address=ip_addr,
    )
    return success_response(data=format_election_summary(updated, db), message=f"Election status updated to {payload.status}")

@router.post("")
@router.post("/")
def create_election(
    payload: CreateElectionRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    scheduled = datetime.fromisoformat(str(payload.scheduledDate).replace("Z", "+00:00")) if isinstance(payload.scheduledDate, str) else payload.scheduledDate
    election = Election(
        name=payload.name,
        description=payload.description,
        electionType=payload.electionType,
        scheduledDate=scheduled,
        status=ElectionStatus.DRAFT,
    )
    db.add(election)
    db.commit()
    db.refresh(election)

    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="Election",
        description=f"Created election: {election.name}",
        user_id=current_user.userId,
        election_id=election.id,
        ip_address=ip_addr,
    )
    return success_response(data=format_election_summary(election, db), message="Election created successfully", status_code=201)

@router.post("/{election_id}/clone")
def clone_election(
    election_id: int,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    orig = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Election not found.")

    base_name = f"Copy of {orig.name}"
    cloned_name = base_name[:200]

    cloned = Election(
        name=cloned_name,
        description=orig.description,
        electionType=orig.electionType,
        scheduledDate=orig.scheduledDate,
        status=ElectionStatus.DRAFT,
    )
    db.add(cloned)
    db.commit()
    db.refresh(cloned)

    for ec in orig.electionConstituencies:
        db.add(ElectionConstituency(electionId=cloned.id, constituencyId=ec.constituencyId))
    db.commit()
    db.refresh(cloned)

    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="Election",
        description=f"Cloned election from ID {election_id} ({orig.name}) into new draft ID {cloned.id}",
        user_id=current_user.userId,
        election_id=cloned.id,
        ip_address=ip_addr,
    )
    return success_response(data=format_election_summary(cloned, db), message="Election cloned successfully", status_code=201)

@router.put("/{election_id}")
def update_election(
    election_id: int,
    payload: UpdateElectionRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")

    status_str = str(election.status.value if hasattr(election.status, "value") else election.status)
    if status_str in ["ACTIVE", "CLOSED", "RESULTS_PUBLISHED"]:
        raise HTTPException(
            status_code=400,
            detail=f'Cannot edit election in "{status_str}" status. Election configuration is locked once activated or completed.',
        )

    if payload.name is not None:
        election.name = payload.name
    if payload.description is not None:
        election.description = payload.description
    if payload.electionType is not None:
        election.electionType = payload.electionType
    if payload.scheduledDate is not None:
        election.scheduledDate = (
            datetime.fromisoformat(str(payload.scheduledDate).replace("Z", "+00:00"))
            if isinstance(payload.scheduledDate, str) else payload.scheduledDate
        )

    db.commit()
    db.refresh(election)

    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.UPDATE,
        module="Election",
        description=f"Updated election: {election.name}",
        user_id=current_user.userId,
        election_id=election_id,
        ip_address=ip_addr,
    )
    return success_response(data=format_election_summary(election, db), message="Election updated")

@router.put("/{election_id}/constituencies")
def set_constituencies(
    election_id: int,
    payload: SetElectionConstituenciesRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")

    status_str = str(election.status.value if hasattr(election.status, "value") else election.status)
    if status_str not in ["DRAFT", "SCHEDULED"]:
        raise HTTPException(status_code=400, detail="Cannot change constituencies after the election has been activated.")

    db.query(ElectionConstituency).filter(ElectionConstituency.electionId == election_id).delete()
    for cid in payload.constituencyIds:
        db.add(ElectionConstituency(electionId=election_id, constituencyId=cid))
    db.commit()
    db.refresh(election)

    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.UPDATE,
        module="Election",
        description=f"Updated election constituencies: {len(payload.constituencyIds)} selected",
        user_id=current_user.userId,
        election_id=election_id,
        ip_address=ip_addr,
    )
    links = db.query(ElectionConstituency).filter(ElectionConstituency.electionId == election_id).all()
    return success_response(data=[{"id": l.id, "constituencyId": l.constituencyId} for l in links], message="Election constituencies updated")

@router.put("/{election_id}/officer")
def set_officer(
    election_id: int,
    payload: SetElectionOfficerRequest,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")

    status_str = str(election.status.value if hasattr(election.status, "value") else election.status)
    if status_str not in ["DRAFT", "SCHEDULED"]:
        raise HTTPException(status_code=400, detail="Cannot change the Election Officer after the election has been activated.")

    if payload.officerId:
        officer = db.query(ElectionOfficer).filter(ElectionOfficer.id == payload.officerId, ElectionOfficer.deletedAt.is_(None)).first()
        if not officer or not officer.user.isActive:
            raise HTTPException(status_code=400, detail="The selected Election Officer does not exist or is inactive.")

    election.officerId = payload.officerId
    db.commit()
    db.refresh(election)

    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.UPDATE,
        module="Election",
        description=f"Assigned Election Officer ID {payload.officerId} to election: {election.name}" if payload.officerId else f"Removed Election Officer from election: {election.name}",
        user_id=current_user.userId,
        election_id=election_id,
        ip_address=ip_addr,
    )
    return success_response(data={"id": election.officer.id, "fullName": election.officer.fullName} if election.officer else None, message="Election officer assigned successfully")

@router.post("/{election_id}/auto-assign-officers")
def auto_assign_officers(
    election_id: int,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    res = election_service.auto_assign_officers(db, election_id)
    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.UPDATE,
        module="Election",
        description=f"Auto-assigned {res['count']} officers to polling stations",
        user_id=current_user.userId,
        election_id=election_id,
        ip_address=ip_addr,
    )
    return success_response(
        data=res,
        message=f"Successfully auto-assigned {res['count']} officer(s) to polling stations."
    )

@router.post("/{election_id}/publish-results")
def publish_results(
    election_id: int,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")

    status_str = str(election.status.value if hasattr(election.status, "value") else election.status)
    if status_str != "CLOSED":
        raise HTTPException(status_code=400, detail="Only closed elections can have results published.")

    election.status = ElectionStatus.RESULTS_PUBLISHED
    election.isResultPublished = True
    db.commit()

    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.PUBLISH_RESULTS,
        module="Election",
        description=f"Results published for election: {election.name}",
        user_id=current_user.userId,
        election_id=election_id,
        ip_address=ip_addr,
    )
    return success_response(data=None, message="Results published successfully")

@router.delete("/{election_id}")
def delete_election(
    election_id: int,
    request: Request,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")

    status_str = str(election.status.value if hasattr(election.status, "value") else election.status)
    if status_str == "ACTIVE":
        raise HTTPException(status_code=400, detail="Cannot delete an active election while voting is in progress. Please pause or close the election first.")

    election.deletedAt = datetime.utcnow()
    db.commit()

    ip_addr = request.client.host if request.client else None
    audit_service.log(
        db,
        action=AuditAction.DELETE,
        module="Election",
        description=f"Deleted election ID: {election_id} ({election.name})",
        user_id=current_user.userId,
        election_id=election_id,
        ip_address=ip_addr,
    )
    return success_response(data=None, message="Election deleted")
