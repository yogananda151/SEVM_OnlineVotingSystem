import os
import shutil
import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, Request, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.database import get_db
from app.config import settings
from app.models.voter import Voter, ElectionVoterStatus
from app.models.enums import UserRole, AuditAction
from app.middleware.auth import get_current_user, require_roles, CurrentUser
from app.schemas.voter import CreateVoterRequest, UpdateVoterRequest, BulkVotersRequest
from app.services.voter_excel_service import voter_excel_service
from app.services.audit_service import audit_service
from app.utils.crypto import hash_aadhaar
from app.utils.response import success_response, paginated_response

router = APIRouter(prefix="/api/voters", tags=["Voters"])

def format_voter(v: Voter):
    return {
        "id": v.id,
        "constituencyId": v.constituencyId,
        "pollingStationId": v.pollingStationId,
        "fullName": v.fullName,
        "voterId": v.voterId,
        "dateOfBirth": v.dateOfBirth.isoformat() if v.dateOfBirth else None,
        "gender": v.gender,
        "address": v.address,
        "phone": v.phone,
        "photoUrl": v.photoUrl,
        "serialNumber": v.serialNumber,
        "isActive": v.isActive,
        "createdAt": v.createdAt.isoformat() if v.createdAt else None,
        "constituency": {"id": v.constituency.id, "name": v.constituency.name} if v.constituency else None,
        "pollingStation": {"id": v.pollingStation.id, "name": v.pollingStation.name, "code": v.pollingStation.code} if v.pollingStation else None,
    }

@router.get("")
@router.get("/")
def get_voters(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    constituencyId: Optional[int] = None,
    pollingStationId: Optional[int] = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    q = db.query(Voter).filter(Voter.deletedAt.is_(None))
    if constituencyId:
        q = q.filter(Voter.constituencyId == constituencyId)
    if pollingStationId:
        q = q.filter(Voter.pollingStationId == pollingStationId)
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.filter(or_(Voter.fullName.ilike(term), Voter.voterId.ilike(term), Voter.phone.ilike(term)))

    total = q.count()
    voters = q.order_by(Voter.serialNumber.asc()).offset((page - 1) * limit).limit(limit).all()
    data = [format_voter(v) for v in voters]
    return paginated_response(data=data, total=total, page=page, limit=limit)

@router.get("/template/excel")
def download_voter_template(current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    stream = voter_excel_service.generate_template(db)
    return StreamingResponse(
        stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="voter_registration_template.xlsx"'},
    )

@router.post("/upload-excel")
async def upload_voter_excel(
    file: UploadFile = File(...),
    defaultConstituencyId: Optional[int] = Form(None),
    defaultPollingStationId: Optional[int] = Form(None),
    request: Request = None,
    current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)),
    db: Session = Depends(get_db),
):
    contents = await file.read()
    result = voter_excel_service.parse_excel(db, contents, default_constituency_id=defaultConstituencyId, default_polling_station_id=defaultPollingStationId)

    if result["validVoters"]:
        for item in result["validVoters"]:
            v = Voter(
                constituencyId=item["constituencyId"],
                pollingStationId=item["pollingStationId"],
                fullName=item["fullName"],
                voterId=item["voterId"],
                serialNumber=item["serialNumber"],
                dateOfBirth=item["dateOfBirth"],
                gender=item["gender"],
                address=item["address"],
                phone=item["phone"],
                aadhaarHash=item["aadhaarHash"],
            )
            db.add(v)
        db.commit()

        audit_service.log(db, action=AuditAction.CREATE, module="Voter", description=f"Excel imported {len(result['validVoters'])} voters ({result['skippedDuplicatesCount']} duplicates skipped)", user_id=current_user.userId, ip_address=request.client.host if request and request.client else None)

    message = f"Successfully imported {len(result['validVoters'])} voters!" if result["validVoters"] else "No new voters imported."
    return success_response(data={
        "totalRows": result["totalRows"],
        "imported": len(result["validVoters"]),
        "skippedDuplicates": result["skippedDuplicatesCount"],
        "duplicateVoterIds": result["duplicateVoterIds"],
        "errors": result["errors"],
    }, message=message, status_code=201)

@router.post("/bulk")
def bulk_create_voters(payload: BulkVotersRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    if not payload.voters:
        raise HTTPException(status_code=400, detail="An array of voters is required.")
    if len(payload.voters) > 1000:
        raise HTTPException(status_code=400, detail="Bulk import is limited to 1000 voters per request.")

    imported = 0
    skipped = 0
    for v_data in payload.voters:
        voter_id = str(v_data.get("voterId") or "").strip().upper()
        if not voter_id:
            continue
        exists = db.query(Voter).filter(Voter.voterId == voter_id, Voter.deletedAt.is_(None)).first()
        if exists:
            skipped += 1
            continue

        raw_dob = v_data.get("dateOfBirth")
        dob = datetime.fromisoformat(str(raw_dob).replace("Z", "+00:00")) if raw_dob else datetime(1990, 1, 1)

        aadhaar = str(v_data.get("aadhaarNumber") or "").strip()
        ahash = hash_aadhaar(aadhaar) if len(aadhaar) == 12 else None

        v = Voter(
            constituencyId=int(v_data.get("constituencyId") or 1),
            pollingStationId=int(v_data.get("pollingStationId") or 1),
            fullName=str(v_data.get("fullName") or "").strip(),
            voterId=voter_id,
            dateOfBirth=dob,
            gender=str(v_data.get("gender") or "Male"),
            address=str(v_data.get("address") or "Registered Address"),
            phone=str(v_data.get("phone") or "") or None,
            serialNumber=int(v_data.get("serialNumber") or (imported + 1)),
            aadhaarHash=ahash,
        )
        db.add(v)
        imported += 1

    db.commit()
    audit_service.log(db, action=AuditAction.CREATE, module="Voter", description=f"Bulk imported {imported} voters ({skipped} duplicates skipped)", user_id=current_user.userId, ip_address=request.client.host if request.client else None)
    return success_response(data={"count": imported, "imported": imported, "skippedDuplicates": skipped}, message=f"Successfully imported {imported} voters", status_code=201)

@router.get("/{voter_id}")
def get_voter_by_id(voter_id: int, current_user: CurrentUser = Depends(get_current_user), db: Session = Depends(get_db)):
    v = db.query(Voter).filter(Voter.id == voter_id, Voter.deletedAt.is_(None)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voter not found")
    return success_response(data=format_voter(v))

@router.post("")
@router.post("/")
def create_voter(payload: CreateVoterRequest, request: Request, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    exists = db.query(Voter).filter(Voter.voterId == payload.voterId.strip().upper(), Voter.deletedAt.is_(None)).first()
    if exists:
        raise HTTPException(status_code=409, detail=f'Voter ID "{payload.voterId}" already exists.')

    dob = datetime.fromisoformat(str(payload.dateOfBirth).replace("Z", "+00:00")) if isinstance(payload.dateOfBirth, str) else payload.dateOfBirth
    ahash = hash_aadhaar(payload.aadhaarNumber.strip()) if payload.aadhaarNumber and len(payload.aadhaarNumber.strip()) == 12 else None

    v = Voter(
        constituencyId=payload.constituencyId,
        pollingStationId=payload.pollingStationId,
        fullName=payload.fullName.strip(),
        voterId=payload.voterId.strip().upper(),
        dateOfBirth=dob,
        gender=payload.gender,
        address=payload.address.strip(),
        phone=payload.phone.strip() if payload.phone else None,
        serialNumber=payload.serialNumber,
        aadhaarHash=ahash,
    )
    db.add(v)
    db.commit()
    db.refresh(v)

    audit_service.log(db, action=AuditAction.CREATE, module="Voter", description=f'Registered voter "{v.fullName}" ({v.voterId})', user_id=current_user.userId, ip_address=request.client.host if request.client else None)
    return success_response(data=format_voter(v), message="Voter registered successfully", status_code=201)

@router.put("/{voter_id}")
def update_voter(voter_id: int, payload: UpdateVoterRequest, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    v = db.query(Voter).filter(Voter.id == voter_id, Voter.deletedAt.is_(None)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voter not found")

    if payload.fullName is not None: v.fullName = payload.fullName.strip()
    if payload.voterId is not None: v.voterId = payload.voterId.strip().upper()
    if payload.constituencyId is not None: v.constituencyId = payload.constituencyId
    if payload.pollingStationId is not None: v.pollingStationId = payload.pollingStationId
    if payload.address is not None: v.address = payload.address.strip()
    if payload.phone is not None: v.phone = payload.phone.strip()
    if payload.gender is not None: v.gender = payload.gender
    if payload.serialNumber is not None: v.serialNumber = payload.serialNumber
    if payload.photoUrl is not None: v.photoUrl = payload.photoUrl
    if payload.isActive is not None: v.isActive = payload.isActive
    if payload.dateOfBirth is not None:
        v.dateOfBirth = datetime.fromisoformat(str(payload.dateOfBirth).replace("Z", "+00:00")) if isinstance(payload.dateOfBirth, str) else payload.dateOfBirth

    db.commit()
    db.refresh(v)
    return success_response(data=format_voter(v), message="Voter updated")

@router.post("/{voter_id}/photo")
def upload_voter_photo(voter_id: int, photo: UploadFile = File(...), current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    v = db.query(Voter).filter(Voter.id == voter_id, Voter.deletedAt.is_(None)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voter not found")

    target_dir = os.path.join(settings.UPLOAD_PATH, "voters")
    os.makedirs(target_dir, exist_ok=True)
    ext = os.path.splitext(photo.filename or "")[1] or ".jpg"
    unique_name = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(target_dir, unique_name)
    with open(filepath, "wb") as f:
        shutil.copyfileobj(photo.file, f)

    v.photoUrl = f"/uploads/voters/{unique_name}"
    db.commit()
    db.refresh(v)
    return success_response(data=format_voter(v), message="Photo uploaded successfully")

@router.delete("/{voter_id}")
def delete_voter(voter_id: int, current_user: CurrentUser = Depends(require_roles(UserRole.COMMISSIONER)), db: Session = Depends(get_db)):
    v = db.query(Voter).filter(Voter.id == voter_id, Voter.deletedAt.is_(None)).first()
    if not v:
        raise HTTPException(status_code=404, detail="Voter not found")
    v.deletedAt = datetime.utcnow()
    db.commit()
    return success_response(data=None, message="Voter deleted")
