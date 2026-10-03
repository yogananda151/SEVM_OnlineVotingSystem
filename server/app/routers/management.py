import os
import shutil
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Request, HTTPException, UploadFile, File, Form, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.config import settings
from app.models.location import Region, Constituency, PollingStation
from app.models.party_candidate import PoliticalParty, Candidate
from app.models.user import User, ElectionOfficer
from app.models.voter import Voter, ElectionVoterStatus
from app.models.vote import Vote
from app.models.election import Election, ElectionConstituency
from app.models.enums import UserRole, MachineStatus, AuditAction, ElectionStatus
from app.middleware.auth import get_current_user, require_roles, CurrentUser
from app.schemas.location import (
    CreateRegionRequest, UpdateRegionRequest,
    CreateConstituencyRequest, UpdateConstituencyRequest,
    CreatePollingStationRequest, UpdatePollingStationRequest,
    UpdateMachineStatusRequest,
)
from app.schemas.party import CreatePartyRequest, UpdatePartyRequest
from app.schemas.candidate import CreateCandidateRequest, UpdateCandidateRequest, BulkCandidatesRequest
from app.schemas.officer import CreateOfficerRequest, UpdateOfficerRequest
from app.services.candidate_excel_service import candidate_excel_service
from app.services.bulk_excel_service import bulk_excel_service
from app.services.audit_service import audit_service
from app.utils.crypto import hash_password
from app.utils.response import success_response

router = APIRouter(prefix="/api", tags=["Management"])

def save_uploaded_file(file: UploadFile, subfolder: str) -> str:
    target_dir = os.path.join(settings.UPLOAD_PATH, subfolder)
    os.makedirs(target_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "")[1] or ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(target_dir, unique_filename)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/uploads/{subfolder}/{unique_filename}"

# ─────────────────────────────────────────────────────────────────────────────
# REGIONS
# ─────────────────────────────────────────────────────────────────────────────

# ── ELECTORAL HIERARCHY MASTER IMPORT ──────────────────────────────────────────
@router.get("/electoral-hierarchy/template/excel")
def download_hierarchy_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER))):
    stream = bulk_excel_service.generate_hierarchy_template()
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=electoral_hierarchy_template.xlsx"},
    )

@router.post("/electoral-hierarchy/upload-excel")
async def upload_hierarchy_excel(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = bulk_excel_service.parse_and_import_hierarchy(db, contents)
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="Hierarchy",
        description=f"Excel imported electoral hierarchy: {result['importedCount']} total records ({result['skippedDuplicatesCount']} duplicates skipped)",
        user_id=current_user.userId,
        ip_address=request.client.host if request and request.client else None,
    )
    return success_response(data=result, message=result.get("message", "Electoral hierarchy imported successfully"))

@router.get("/regions")
def get_all_regions(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    regions = db.query(Region).filter(Region.deletedAt.is_(None)).order_by(Region.name.asc()).all()
    data = [{
        "id": r.id,
        "name": r.name,
        "code": r.code,
        "description": r.description,
        "isActive": r.isActive,
        "_count": {"constituencies": len([c for c in r.constituencies if not c.deletedAt])},
    } for r in regions]
    return success_response(data=data)

@router.get("/regions/template/excel")
def download_regions_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER))):
    stream = bulk_excel_service.generate_regions_template()
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=regions_template.xlsx"},
    )

@router.post("/regions/upload-excel")
async def upload_regions_excel(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = bulk_excel_service.parse_and_import_regions(db, contents)
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="Region",
        description=f"Excel imported {result['importedCount']} regions ({result['skippedDuplicatesCount']} duplicates skipped)",
        user_id=current_user.userId,
        ip_address=request.client.host if request and request.client else None,
    )
    return success_response(data=result, message=f"Imported {result['importedCount']} regions successfully")

@router.get("/regions/{region_id}")
def get_region_by_id(region_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    r = db.query(Region).filter(Region.id == region_id, Region.deletedAt.is_(None)).first()
    if not r:
        raise HTTPException(status_code=404, detail="Region not found")
    return success_response(data={
        "id": r.id, "name": r.name, "code": r.code, "description": r.description, "isActive": r.isActive,
    })

@router.post("/regions")
def create_region(payload: CreateRegionRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    code = payload.code.strip()
    name = payload.name.strip()
    existing_code = db.query(Region).filter(Region.code == code, Region.deletedAt.is_(None)).first()
    if existing_code:
        raise HTTPException(status_code=409, detail=f"Region with code '{code}' already exists.")
    existing_name = db.query(Region).filter(Region.name == name, Region.deletedAt.is_(None)).first()
    if existing_name:
        raise HTTPException(status_code=409, detail=f"Region with name '{name}' already exists.")

    region = Region(name=name, code=code, description=payload.description)
    db.add(region)
    db.commit()
    db.refresh(region)

    audit_service.log(db, action=AuditAction.CREATE, module="Region", description=f"Created region: {region.name} ({region.code})", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)
    return success_response(data={"id": region.id, "name": region.name, "code": region.code, "description": region.description, "isActive": region.isActive}, message="Region created successfully", status_code=201)

@router.put("/regions/{region_id}")
def update_region(region_id: int, payload: UpdateRegionRequest, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    r = db.query(Region).filter(Region.id == region_id, Region.deletedAt.is_(None)).first()
    if not r:
        raise HTTPException(status_code=404, detail="Region not found")

    if payload.name is not None:
        name = payload.name.strip()
        existing = db.query(Region).filter(Region.name == name, Region.id != region_id, Region.deletedAt.is_(None)).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Region with name '{name}' already exists.")
        r.name = name

    if payload.code is not None:
        code = payload.code.strip()
        existing = db.query(Region).filter(Region.code == code, Region.id != region_id, Region.deletedAt.is_(None)).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Region with code '{code}' already exists.")
        r.code = code

    if payload.description is not None: r.description = payload.description
    if payload.isActive is not None: r.isActive = payload.isActive

    db.commit()
    db.refresh(r)
    return success_response(data={"id": r.id, "name": r.name, "code": r.code, "description": r.description, "isActive": r.isActive}, message="Region updated")

@router.delete("/regions/{region_id}")
def delete_region(region_id: int, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    r = db.query(Region).filter(Region.id == region_id, Region.deletedAt.is_(None)).first()
    if not r:
        raise HTTPException(status_code=404, detail="Region not found")
    now = datetime.utcnow()
    ts = int(now.timestamp())
    r.name = f"{r.name}_del_{ts}_{r.id}"
    r.code = f"{r.code}_del_{ts}_{r.id}"
    r.isActive = False
    r.deletedAt = now
    db.commit()
    return success_response(data=None, message="Region deleted")

# ─────────────────────────────────────────────────────────────────────────────
# CONSTITUENCIES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/constituencies")
def get_all_constituencies(regionId: Optional[int] = None, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Constituency).filter(Constituency.deletedAt.is_(None))
    if regionId:
        q = q.filter(Constituency.regionId == regionId)
    constituencies = q.order_by(Constituency.name.asc()).all()
    data = [{
        "id": c.id,
        "regionId": c.regionId,
        "name": c.name,
        "code": c.code,
        "description": c.description,
        "isActive": c.isActive,
        "region": {"id": c.region.id, "name": c.region.name} if c.region else None,
        "_count": {
            "pollingStations": len([ps for ps in c.pollingStations if not ps.deletedAt]),
            "voters": len([v for v in c.voters if not v.deletedAt]),
            "candidates": len([cd for cd in c.candidates if not cd.deletedAt]),
        },
    } for c in constituencies]
    return success_response(data=data)

@router.get("/constituencies/active")
def get_active_constituencies(regionId: Optional[int] = None, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Constituency).filter(Constituency.deletedAt.is_(None), Constituency.isActive.is_(True))
    if regionId:
        q = q.filter(Constituency.regionId == regionId)
    constituencies = q.order_by(Constituency.name.asc()).all()
    data = [{
        "id": c.id,
        "regionId": c.regionId,
        "name": c.name,
        "code": c.code,
        "description": c.description,
        "isActive": c.isActive,
        "region": {"id": c.region.id, "name": c.region.name} if c.region else None,
        "_count": {
            "pollingStations": len([ps for ps in c.pollingStations if not ps.deletedAt]),
            "voters": len([v for v in c.voters if not v.deletedAt]),
            "candidates": len([cd for cd in c.candidates if not cd.deletedAt]),
        },
    } for c in constituencies]
    return success_response(data=data)

@router.get("/constituencies/template/excel")
def download_constituencies_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    stream = bulk_excel_service.generate_constituencies_template(db)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=constituencies_template.xlsx"},
    )

@router.post("/constituencies/upload-excel")
async def upload_constituencies_excel(
    file: UploadFile = File(...),
    defaultRegionId: Optional[int] = Form(None),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = bulk_excel_service.parse_and_import_constituencies(db, contents, default_region_id=defaultRegionId)
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="Constituency",
        description=f"Excel imported {result['importedCount']} constituencies ({result['skippedDuplicatesCount']} duplicates skipped)",
        user_id=current_user.userId,
        ip_address=request.client.host if request and request.client else None,
    )
    return success_response(data=result, message=f"Imported {result['importedCount']} constituencies successfully")

@router.get("/constituencies/{constituency_id}")
def get_constituency_by_id(constituency_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Constituency).filter(Constituency.id == constituency_id, Constituency.deletedAt.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Constituency not found")
    return success_response(data={
        "id": c.id, "regionId": c.regionId, "name": c.name, "code": c.code, "description": c.description, "isActive": c.isActive,
    })

@router.post("/constituencies")
def create_constituency(payload: CreateConstituencyRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    reg = db.query(Region).filter(Region.id == payload.regionId, Region.deletedAt.is_(None)).first()
    if not reg:
        raise HTTPException(status_code=404, detail="Selected region not found or has been deleted.")

    code = payload.code.strip()
    existing = db.query(Constituency).filter(Constituency.code == code, Constituency.deletedAt.is_(None)).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Constituency with code '{code}' already exists.")

    con = Constituency(
        regionId=payload.regionId,
        name=payload.name.strip(),
        code=code,
        description=payload.description,
    )
    db.add(con)
    db.commit()
    db.refresh(con)

    audit_service.log(db, action=AuditAction.CREATE, module="Constituency", description=f"Created constituency: {con.name} ({con.code})", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)
    return success_response(data={"id": con.id, "name": con.name, "code": con.code}, message="Constituency created", status_code=201)

@router.put("/constituencies/{constituency_id}")
def update_constituency(constituency_id: int, payload: UpdateConstituencyRequest, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    c = db.query(Constituency).filter(Constituency.id == constituency_id, Constituency.deletedAt.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Constituency not found")

    if payload.regionId is not None:
        reg = db.query(Region).filter(Region.id == payload.regionId, Region.deletedAt.is_(None)).first()
        if not reg:
            raise HTTPException(status_code=404, detail="Selected region not found or has been deleted.")
        c.regionId = payload.regionId

    if payload.name is not None: c.name = payload.name.strip()
    if payload.code is not None:
        code = payload.code.strip()
        existing = db.query(Constituency).filter(Constituency.code == code, Constituency.id != constituency_id, Constituency.deletedAt.is_(None)).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Constituency with code '{code}' already exists.")
        c.code = code

    if payload.description is not None: c.description = payload.description
    if payload.isActive is not None: c.isActive = payload.isActive
    db.commit()
    db.refresh(c)
    return success_response(data={"id": c.id, "name": c.name, "code": c.code}, message="Constituency updated")

@router.delete("/constituencies/{constituency_id}")
def delete_constituency(constituency_id: int, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    c = db.query(Constituency).filter(Constituency.id == constituency_id, Constituency.deletedAt.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Constituency not found")
    now = datetime.utcnow()
    ts = int(now.timestamp())
    c.code = f"{c.code}_del_{ts}_{c.id}"
    c.isActive = False
    c.deletedAt = now
    db.commit()
    return success_response(data=None, message="Constituency deleted")

# ─────────────────────────────────────────────────────────────────────────────
# POLLING STATIONS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/polling-stations")
def get_all_polling_stations(constituencyId: Optional[int] = None, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(PollingStation).filter(PollingStation.deletedAt.is_(None))
    if constituencyId:
        q = q.filter(PollingStation.constituencyId == constituencyId)
    stations = q.order_by(PollingStation.name.asc()).all()
    data = [{
        "id": ps.id,
        "constituencyId": ps.constituencyId,
        "name": ps.name,
        "code": ps.code,
        "address": ps.address,
        "capacity": ps.capacity,
        "totalBooths": ps.totalBooths,
        "machineStatus": str(ps.machineStatus.value if hasattr(ps.machineStatus, "value") else ps.machineStatus),
        "isPollingActive": ps.isPollingActive,
        "isActive": ps.isActive,
        "constituency": {
            "id": ps.constituency.id,
            "name": ps.constituency.name,
            "code": ps.constituency.code if ps.constituency else None,
            "region": {"id": ps.constituency.region.id, "name": ps.constituency.region.name} if ps.constituency and ps.constituency.region else None,
        } if ps.constituency else None,
        "officers": [{
            "id": o.id,
            "fullName": o.fullName,
            "employeeId": o.employeeId,
            "phone": o.phone,
            "user": {"email": o.user.email} if o.user else None,
        } for o in ps.officers if not o.deletedAt],
        "_count": {
            "voters": len([v for v in ps.voters if not v.deletedAt]),
            "votes": len(ps.votes),
        },
    } for ps in stations]
    return success_response(data=data)

@router.get("/polling-stations/template/excel")
def download_polling_stations_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    stream = bulk_excel_service.generate_polling_stations_template(db)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=polling_stations_template.xlsx"},
    )

@router.post("/polling-stations/upload-excel")
async def upload_polling_stations_excel(
    file: UploadFile = File(...),
    defaultConstituencyId: Optional[int] = Form(None),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = bulk_excel_service.parse_and_import_polling_stations(db, contents, default_constituency_id=defaultConstituencyId)
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="PollingStation",
        description=f"Excel imported {result['importedCount']} stations ({result['skippedDuplicatesCount']} duplicates skipped)",
        user_id=current_user.userId,
        ip_address=request.client.host if request and request.client else None,
    )
    return success_response(data=result, message=f"Imported {result['importedCount']} polling stations successfully")

@router.get("/polling-stations/{station_id}")
def get_polling_station_by_id(station_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    ps = db.query(PollingStation).filter(PollingStation.id == station_id, PollingStation.deletedAt.is_(None)).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Station not found")
    return success_response(data={
        "id": ps.id,
        "name": ps.name,
        "code": ps.code,
        "address": ps.address,
        "capacity": ps.capacity,
        "totalBooths": ps.totalBooths,
        "machineStatus": str(ps.machineStatus.value if hasattr(ps.machineStatus, "value") else ps.machineStatus),
        "isPollingActive": ps.isPollingActive,
        "isActive": ps.isActive,
        "constituency": {"id": ps.constituency.id, "name": ps.constituency.name} if ps.constituency else None,
    })

@router.get("/polling-stations/{station_id}/turnout")
def get_polling_station_turnout(station_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    ps = db.query(PollingStation).filter(PollingStation.id == station_id, PollingStation.deletedAt.is_(None)).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Station not found")

    total_voters = db.query(func.count(Voter.id)).filter(Voter.pollingStationId == station_id, Voter.deletedAt.is_(None)).scalar() or 0
    active_election = db.query(Election).filter(Election.status == ElectionStatus.ACTIVE).first()
    votes_cast = 0
    if active_election:
        votes_cast = db.query(func.count(Vote.id)).filter(Vote.pollingStationId == station_id, Vote.electionId == active_election.id).scalar() or 0

    turnout = f"{(votes_cast / total_voters) * 100:.2f}" if total_voters > 0 else "0.00"
    return success_response(data={
        "pollingStation": {"id": ps.id, "name": ps.name, "code": ps.code},
        "totalVoters": total_voters,
        "votesCast": votes_cast,
        "turnoutPercentage": turnout,
    })

@router.post("/polling-stations")
def create_polling_station(payload: CreatePollingStationRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    con = db.query(Constituency).filter(Constituency.id == payload.constituencyId, Constituency.deletedAt.is_(None)).first()
    if not con:
        raise HTTPException(status_code=404, detail="Selected constituency not found or has been deleted.")

    code = payload.code.strip()
    existing = db.query(PollingStation).filter(PollingStation.code == code, PollingStation.deletedAt.is_(None)).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Polling station with code '{code}' already exists.")

    ps = PollingStation(
        constituencyId=payload.constituencyId,
        name=payload.name.strip(),
        code=code,
        address=payload.address.strip(),
        capacity=payload.capacity or 1000,
        totalBooths=payload.totalBooths or 1,
    )
    db.add(ps)
    db.commit()
    db.refresh(ps)

    audit_service.log(db, action=AuditAction.CREATE, module="PollingStation", description=f"Created station: {ps.name} ({ps.code})", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)
    return success_response(data={"id": ps.id, "name": ps.name, "code": ps.code}, message="Polling station created", status_code=201)

@router.put("/polling-stations/{station_id}")
def update_polling_station(station_id: int, payload: UpdatePollingStationRequest, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    ps = db.query(PollingStation).filter(PollingStation.id == station_id, PollingStation.deletedAt.is_(None)).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Station not found")

    if payload.constituencyId is not None:
        con = db.query(Constituency).filter(Constituency.id == payload.constituencyId, Constituency.deletedAt.is_(None)).first()
        if not con:
            raise HTTPException(status_code=404, detail="Selected constituency not found or has been deleted.")
        ps.constituencyId = payload.constituencyId

    if payload.name is not None: ps.name = payload.name.strip()
    if payload.code is not None:
        code = payload.code.strip()
        existing = db.query(PollingStation).filter(PollingStation.code == code, PollingStation.id != station_id, PollingStation.deletedAt.is_(None)).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Polling station with code '{code}' already exists.")
        ps.code = code

    if payload.address is not None: ps.address = payload.address.strip()
    if payload.capacity is not None: ps.capacity = payload.capacity
    if payload.totalBooths is not None: ps.totalBooths = payload.totalBooths
    if payload.isActive is not None: ps.isActive = payload.isActive
    db.commit()
    db.refresh(ps)
    return success_response(data={"id": ps.id, "name": ps.name}, message="Station updated")

@router.patch("/polling-stations/{station_id}/machine-status")
def update_machine_status(station_id: int, payload: UpdateMachineStatusRequest, request: Request, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    if current_user.role == UserRole.OFFICER and current_user.stationId != station_id:
        raise HTTPException(status_code=403, detail="Forbidden: You are only authorized to control your assigned polling station machine.")

    ps = db.query(PollingStation).filter(PollingStation.id == station_id, PollingStation.deletedAt.is_(None)).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Station not found")

    ps.machineStatus = payload.status
    if payload.isPollingActive is not None:
        ps.isPollingActive = payload.isPollingActive
    elif payload.status == MachineStatus.ACTIVE:
        ps.isPollingActive = True
    elif payload.status in [MachineStatus.CLOSED, MachineStatus.LOCKED, MachineStatus.PAUSED]:
        ps.isPollingActive = False

    db.commit()
    db.refresh(ps)

    action_enum = AuditAction.LOCK_MACHINE if payload.status == MachineStatus.LOCKED else (AuditAction.PAUSE_POLLING if payload.status == MachineStatus.PAUSED else AuditAction.UNLOCK_MACHINE)
    audit_service.log(db, action=action_enum, module="PollingStation", description=f"Machine status changed to {payload.status} at station {station_id}", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)
    return success_response(data={"id": ps.id, "machineStatus": str(ps.machineStatus.value if hasattr(ps.machineStatus, "value") else ps.machineStatus), "isPollingActive": ps.isPollingActive}, message=f"Machine status updated to {payload.status}")

@router.delete("/polling-stations/{station_id}")
def delete_polling_station(station_id: int, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    ps = db.query(PollingStation).filter(PollingStation.id == station_id, PollingStation.deletedAt.is_(None)).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Station not found")
    now = datetime.utcnow()
    ts = int(now.timestamp())
    ps.code = f"{ps.code}_del_{ts}_{ps.id}"
    ps.isActive = False
    ps.deletedAt = now
    db.commit()
    return success_response(data=None, message="Station deleted")

# ─────────────────────────────────────────────────────────────────────────────
# OFFICERS
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/officers")
def get_all_officers(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    officers = db.query(ElectionOfficer).filter(ElectionOfficer.deletedAt.is_(None)).order_by(ElectionOfficer.createdAt.desc()).all()
    data = [{
        "id": o.id,
        "userId": o.userId,
        "fullName": o.fullName,
        "employeeId": o.employeeId,
        "phone": o.phone,
        "pollingStationId": o.pollingStationId,
        "user": {
            "id": o.user.id,
            "email": o.user.email,
            "isActive": o.user.isActive,
            "lastLoginAt": o.user.lastLoginAt.isoformat() if o.user.lastLoginAt else None,
        } if o.user else None,
        "pollingStation": {
            "id": o.pollingStation.id,
            "name": o.pollingStation.name,
            "code": o.pollingStation.code,
        } if o.pollingStation else None,
    } for o in officers]
    return success_response(data=data)

@router.post("/officers")
def create_officer(payload: CreateOfficerRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email.strip().lower(), User.deletedAt.is_(None)).first()
    if existing_user:
        raise HTTPException(status_code=409, detail=f'An officer with email "{payload.email}" already exists.')

    existing_emp = db.query(ElectionOfficer).filter(ElectionOfficer.employeeId == payload.employeeId.strip(), ElectionOfficer.deletedAt.is_(None)).first()
    if existing_emp:
        raise HTTPException(status_code=409, detail=f'An officer with employee ID "{payload.employeeId}" already exists.')

    if payload.pollingStationId:
        st_officer = db.query(ElectionOfficer).filter(ElectionOfficer.pollingStationId == payload.pollingStationId, ElectionOfficer.deletedAt.is_(None)).first()
        if st_officer:
            raise HTTPException(status_code=409, detail="The selected polling station already has an assigned officer.")

    pwd_hash = hash_password(payload.password)
    user = User(
        email=payload.email.strip().lower(),
        passwordHash=pwd_hash,
        role=UserRole.OFFICER,
    )
    db.add(user)
    db.flush()

    officer = ElectionOfficer(
        userId=user.id,
        fullName=payload.fullName.strip(),
        employeeId=payload.employeeId.strip(),
        phone=payload.phone.strip(),
        pollingStationId=payload.pollingStationId,
    )
    db.add(officer)
    db.commit()
    db.refresh(officer)

    audit_service.log(db, action=AuditAction.CREATE, module="Officer", description=f"Registered officer: {officer.fullName} ({user.email})", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)
    return success_response(data={"id": officer.id, "fullName": officer.fullName, "employeeId": officer.employeeId}, message="Election officer registered", status_code=201)

@router.get("/officers/template/excel")
def download_officers_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    stream = bulk_excel_service.generate_officers_template(db)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=officers_template.xlsx"},
    )

@router.post("/officers/upload-excel")
async def upload_officers_excel(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = bulk_excel_service.parse_and_import_officers(db, contents)
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="Officer",
        description=f"Excel imported {result['importedCount']} officers ({result['skippedDuplicatesCount']} duplicates skipped)",
        user_id=current_user.userId,
        ip_address=request.client.host if request and request.client else None,
    )
    return success_response(data=result, message=f"Imported {result['importedCount']} officers successfully")

@router.put("/officers/{officer_id}")
def update_officer(officer_id: int, payload: UpdateOfficerRequest, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    officer = db.query(ElectionOfficer).filter(ElectionOfficer.id == officer_id, ElectionOfficer.deletedAt.is_(None)).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    if payload.pollingStationId:
        existing = db.query(ElectionOfficer).filter(ElectionOfficer.pollingStationId == payload.pollingStationId, ElectionOfficer.id != officer_id, ElectionOfficer.deletedAt.is_(None)).first()
        if existing:
            raise HTTPException(status_code=409, detail="The selected polling station already has an assigned officer.")
        officer.pollingStationId = payload.pollingStationId

    if payload.fullName is not None: officer.fullName = payload.fullName.strip()
    if payload.phone is not None: officer.phone = payload.phone.strip()

    db.commit()
    db.refresh(officer)
    return success_response(data={"id": officer.id, "fullName": officer.fullName}, message="Officer updated")

@router.delete("/officers/{officer_id}")
def delete_officer(officer_id: int, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    officer = db.query(ElectionOfficer).filter(ElectionOfficer.id == officer_id).first()
    if not officer:
        raise HTTPException(status_code=404, detail="Officer not found")

    active_e = db.query(Election).filter(Election.officerId == officer_id, Election.status == ElectionStatus.ACTIVE, Election.deletedAt.is_(None)).first()
    if active_e:
        raise HTTPException(status_code=400, detail=f'Cannot delete officer while assigned to active election "{active_e.name}".')

    now = datetime.utcnow()
    officer.employeeId = f"{officer.employeeId}_del_{int(now.timestamp())}"
    officer.pollingStationId = None
    officer.deletedAt = now

    if officer.user:
        officer.user.email = f"{officer.user.email}_del_{int(now.timestamp())}"
        officer.user.isActive = False
        officer.user.deletedAt = now

    db.commit()
    return success_response(data=None, message="Officer deleted")

# ─────────────────────────────────────────────────────────────────────────────
# CANDIDATES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/candidates")
def get_all_candidates(electionId: Optional[int] = None, constituencyId: Optional[int] = None, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    q = db.query(Candidate).filter(Candidate.deletedAt.is_(None))
    if electionId:
        q = q.filter(Candidate.electionId == electionId)
    if constituencyId:
        q = q.filter(Candidate.constituencyId == constituencyId)
    candidates = q.order_by(Candidate.serialNumber.asc()).all()

    data = [{
        "id": c.id,
        "electionId": c.electionId,
        "constituencyId": c.constituencyId,
        "partyId": c.partyId,
        "fullName": c.fullName,
        "photoUrl": c.photoUrl,
        "age": c.age,
        "qualification": c.qualification,
        "serialNumber": c.serialNumber,
        "isIndependent": c.isIndependent,
        "isActive": c.isActive,
        "party": {
            "id": c.party.id,
            "name": c.party.name,
            "abbreviation": c.party.abbreviation,
            "symbol": c.party.symbol,
            "symbolUrl": c.party.symbolUrl,
            "color": c.party.color,
        } if c.party else None,
        "constituency": {"id": c.constituency.id, "name": c.constituency.name} if c.constituency else None,
        "election": {
            "id": c.election.id,
            "name": c.election.name,
            "status": c.election.status.value if hasattr(c.election.status, 'value') else str(c.election.status),
        } if c.election else None,
        "_count": {
            "votes": len(c.votes) if c.votes else 0
        },
    } for c in candidates]
    return success_response(data=data)

@router.get("/candidates/template/excel")
def download_candidate_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    stream = candidate_excel_service.generate_template(db)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="candidate_template.xlsx"'},
    )

@router.post("/candidates/upload-excel")
async def upload_candidate_excel(
    file: UploadFile = File(...),
    electionId: int = Form(...),
    defaultConstituencyId: Optional[int] = Form(None),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = candidate_excel_service.parse_excel(db, contents, election_id=electionId, default_constituency_id=defaultConstituencyId)

    for item in result["validCandidates"]:
        c = Candidate(
            electionId=item["electionId"],
            constituencyId=item["constituencyId"],
            fullName=item["fullName"],
            age=item["age"],
            qualification=item["qualification"],
            serialNumber=item["serialNumber"],
            isIndependent=item["isIndependent"],
            partyId=item["partyId"],
        )
        db.add(c)
    db.commit()

    audit_service.log(db, action=AuditAction.CREATE, module="Candidate", description=f"Bulk imported {len(result['validCandidates'])} candidates for election {electionId}", user_id=current_user.userId, ip_address=request.client.host if request and request and request.client else None)
    return success_response(data=result, message="Excel file processed successfully")

@router.post("/candidates/bulk")
def bulk_create_candidates(payload: BulkCandidatesRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    created = []
    for item in payload.candidates:
        c = Candidate(
            electionId=item.electionId,
            constituencyId=item.constituencyId,
            partyId=item.partyId,
            fullName=item.fullName.strip(),
            age=item.age,
            qualification=item.qualification,
            serialNumber=item.serialNumber,
            isIndependent=item.isIndependent or False,
        )
        db.add(c)
        created.append(c)
    db.commit()
    return success_response(data={"count": len(created)}, message="Candidates registered successfully", status_code=201)

@router.get("/candidates/{candidate_id}")
def get_candidate_by_id(candidate_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deletedAt.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return success_response(data={
        "id": c.id, "fullName": c.fullName, "serialNumber": c.serialNumber, "age": c.age, "partyId": c.partyId,
    })

@router.post("/candidates")
def create_candidate(payload: CreateCandidateRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    election = db.query(Election).filter(Election.id == payload.electionId, Election.deletedAt.is_(None)).first()
    if not election:
        raise HTTPException(status_code=404, detail="Election not found.")
    st_val = str(election.status.value if hasattr(election.status, "value") else election.status)
    if st_val not in ["DRAFT", "SCHEDULED"]:
        raise HTTPException(status_code=400, detail=f'Cannot add candidate. Election "{election.name}" is in "{st_val}" status.')

    # Ensure election is linked to this constituency
    con = db.query(Constituency).filter(Constituency.id == payload.constituencyId, Constituency.deletedAt.is_(None)).first()
    if not con:
        raise HTTPException(status_code=404, detail="Constituency not found or has been deleted.")
    link = db.query(ElectionConstituency).filter(
        ElectionConstituency.electionId == payload.electionId,
        ElectionConstituency.constituencyId == payload.constituencyId
    ).first()
    if not link:
        db.add(ElectionConstituency(electionId=payload.electionId, constituencyId=payload.constituencyId))
        db.flush()

    # Rule: Each constituency can have multiple parties, but each party can nominate at most ONE candidate
    if payload.partyId and not payload.isIndependent:
        existing_party_cand = db.query(Candidate).filter(
            Candidate.electionId == payload.electionId,
            Candidate.constituencyId == payload.constituencyId,
            Candidate.partyId == payload.partyId,
            Candidate.deletedAt.is_(None),
        ).first()
        if existing_party_cand:
            party = db.query(PoliticalParty).filter(PoliticalParty.id == payload.partyId).first()
            party_name = f"{party.name} ({party.abbreviation})" if party else "This political party"
            raise HTTPException(
                status_code=409,
                detail=f"{party_name} already has candidate '{existing_party_cand.fullName}' in constituency '{con.name}'. Each political party can have only one candidate per constituency."
            )

    # Validate serial number uniqueness in election + constituency
    existing_serial = db.query(Candidate).filter(
        Candidate.electionId == payload.electionId,
        Candidate.constituencyId == payload.constituencyId,
        Candidate.serialNumber == payload.serialNumber,
        Candidate.deletedAt.is_(None),
    ).first()
    if existing_serial:
        raise HTTPException(
            status_code=409,
            detail=f"Serial number {payload.serialNumber} is already allocated to candidate '{existing_serial.fullName}' in constituency '{con.name}'."
        )

    c = Candidate(
        electionId=payload.electionId,
        constituencyId=payload.constituencyId,
        partyId=payload.partyId if not payload.isIndependent else None,
        fullName=payload.fullName.strip(),
        age=payload.age,
        qualification=payload.qualification,
        serialNumber=payload.serialNumber,
        isIndependent=payload.isIndependent or False,
    )
    db.add(c)
    db.commit()
    db.refresh(c)

    audit_service.log(db, action=AuditAction.CREATE, module="Candidate", description=f"Registered candidate: {c.fullName}", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)
    return success_response(data={"id": c.id, "fullName": c.fullName}, message="Candidate registered successfully", status_code=201)

@router.put("/candidates/{candidate_id}")
def update_candidate(candidate_id: int, payload: UpdateCandidateRequest, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deletedAt.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    new_party_id = payload.partyId if payload.partyId is not None else c.partyId
    new_is_ind = payload.isIndependent if payload.isIndependent is not None else c.isIndependent

    # Rule: Each political party can only have one candidate per constituency
    if new_party_id and not new_is_ind:
        existing_party_cand = db.query(Candidate).filter(
            Candidate.electionId == c.electionId,
            Candidate.constituencyId == c.constituencyId,
            Candidate.partyId == new_party_id,
            Candidate.id != candidate_id,
            Candidate.deletedAt.is_(None),
        ).first()
        if existing_party_cand:
            party = db.query(PoliticalParty).filter(PoliticalParty.id == new_party_id).first()
            party_name = f"{party.name} ({party.abbreviation})" if party else "This political party"
            raise HTTPException(
                status_code=409,
                detail=f"{party_name} already has candidate '{existing_party_cand.fullName}' in this constituency. Each political party can have only one candidate per constituency."
            )

    if payload.serialNumber is not None and payload.serialNumber != c.serialNumber:
        existing_serial = db.query(Candidate).filter(
            Candidate.electionId == c.electionId,
            Candidate.constituencyId == c.constituencyId,
            Candidate.serialNumber == payload.serialNumber,
            Candidate.id != candidate_id,
            Candidate.deletedAt.is_(None),
        ).first()
        if existing_serial:
            raise HTTPException(
                status_code=409,
                detail=f"Serial number {payload.serialNumber} is already assigned to '{existing_serial.fullName}' in this constituency."
            )

    if payload.fullName is not None: c.fullName = payload.fullName.strip()
    if payload.isIndependent is True:
        c.isIndependent = True
        c.partyId = None
    elif payload.partyId is not None:
        c.partyId = payload.partyId
        c.isIndependent = False

    if payload.age is not None: c.age = payload.age
    if payload.qualification is not None: c.qualification = payload.qualification
    if payload.serialNumber is not None: c.serialNumber = payload.serialNumber
    if payload.photoUrl is not None: c.photoUrl = payload.photoUrl
    if payload.isActive is not None: c.isActive = payload.isActive

    db.commit()
    db.refresh(c)
    return success_response(data={"id": c.id, "fullName": c.fullName}, message="Candidate updated")

@router.post("/candidates/{candidate_id}/photo")
def upload_candidate_photo(candidate_id: int, photo: UploadFile = File(...), current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deletedAt.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")

    photo_url = save_uploaded_file(photo, "candidates")
    c.photoUrl = photo_url
    db.commit()
    db.refresh(c)
    return success_response(data={"id": c.id, "photoUrl": c.photoUrl}, message="Photo uploaded successfully")

@router.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id, Candidate.deletedAt.is_(None)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found")
    now = datetime.utcnow()
    c.serialNumber = -int(c.id)
    c.isActive = False
    c.deletedAt = now
    db.commit()
    return success_response(data=None, message="Candidate removed")

# ─────────────────────────────────────────────────────────────────────────────
# PARTIES
# ─────────────────────────────────────────────────────────────────────────────

@router.get("/parties")
def get_all_parties(current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    parties = db.query(PoliticalParty).filter(PoliticalParty.deletedAt.is_(None)).order_by(PoliticalParty.name.asc()).all()
    data = [{
        "id": p.id,
        "name": p.name,
        "abbreviation": p.abbreviation,
        "symbol": p.symbol,
        "symbolUrl": p.symbolUrl,
        "color": p.color,
        "foundedYear": p.foundedYear,
        "isActive": p.isActive,
        "_count": {"candidates": len([c for c in p.candidates if not c.deletedAt])},
    } for p in parties]
    return success_response(data=data)

@router.get("/parties/template/excel")
def download_parties_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER))):
    stream = bulk_excel_service.generate_parties_template()
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=parties_template.xlsx"},
    )

@router.post("/parties/upload-excel")
async def upload_parties_excel(
    file: UploadFile = File(...),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = bulk_excel_service.parse_and_import_parties(db, contents)
    audit_service.log(
        db,
        action=AuditAction.CREATE,
        module="Party",
        description=f"Excel imported {result['importedCount']} parties ({result['skippedDuplicatesCount']} duplicates skipped)",
        user_id=current_user.userId,
        ip_address=request.client.host if request and request.client else None,
    )
    return success_response(data=result, message=f"Imported {result['importedCount']} parties successfully")

@router.get("/parties/{party_id}")
def get_party_by_id(party_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    p = db.query(PoliticalParty).filter(PoliticalParty.id == party_id, PoliticalParty.deletedAt.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Party not found")
    return success_response(data={
        "id": p.id, "name": p.name, "abbreviation": p.abbreviation, "symbol": p.symbol, "color": p.color,
    })

@router.post("/parties")
def create_party(payload: CreatePartyRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    p = PoliticalParty(
        name=payload.name.strip(),
        abbreviation=payload.abbreviation.strip().upper(),
        symbol=payload.symbol,
        color=payload.color or "#1a73e8",
        foundedYear=payload.foundedYear,
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    audit_service.log(db, action=AuditAction.CREATE, module="Party", description=f"Created party: {p.name} ({p.abbreviation})", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)
    return success_response(data={"id": p.id, "name": p.name, "abbreviation": p.abbreviation}, message="Party registered", status_code=201)

@router.put("/parties/{party_id}")
def update_party(party_id: int, payload: UpdatePartyRequest, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    p = db.query(PoliticalParty).filter(PoliticalParty.id == party_id, PoliticalParty.deletedAt.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Party not found")

    if payload.name is not None: p.name = payload.name.strip()
    if payload.abbreviation is not None: p.abbreviation = payload.abbreviation.strip().upper()
    if payload.symbol is not None: p.symbol = payload.symbol
    if payload.color is not None: p.color = payload.color
    if payload.foundedYear is not None: p.foundedYear = payload.foundedYear
    if payload.isActive is not None: p.isActive = payload.isActive

    db.commit()
    db.refresh(p)
    return success_response(data={"id": p.id, "name": p.name}, message="Party updated")

@router.post("/parties/{party_id}/symbol")
def upload_party_symbol(party_id: int, symbol: UploadFile = File(...), current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    p = db.query(PoliticalParty).filter(PoliticalParty.id == party_id, PoliticalParty.deletedAt.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Party not found")

    symbol_url = save_uploaded_file(symbol, "parties")
    p.symbolUrl = symbol_url
    db.commit()
    db.refresh(p)
    return success_response(data={"id": p.id, "symbolUrl": p.symbolUrl}, message="Symbol uploaded successfully")

@router.delete("/parties/{party_id}")
def delete_party(party_id: int, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    p = db.query(PoliticalParty).filter(PoliticalParty.id == party_id, PoliticalParty.deletedAt.is_(None)).first()
    if not p:
        raise HTTPException(status_code=404, detail="Party not found")
    p.deletedAt = datetime.utcnow()
    db.commit()
    return success_response(data=None, message="Party deleted")
