from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.election import Election, ElectionConstituency
from app.models.location import PollingStation
from app.models.party_candidate import Candidate
from app.models.enums import ElectionStatus
from app.schemas.voting import (
    InitiateVerificationRequest,
    VerifyOTPRequest,
    SimulateBiometricRequest,
    CastVoteRequest,
)
from app.services.verification_service import verification_service
from app.services.vote_service import vote_service
from app.utils.response import success_response

router = APIRouter(prefix="/api/voting", tags=["Voting"])

@router.post("/verify/initiate")
def initiate_verification(payload: InitiateVerificationRequest, db: Session = Depends(get_db)):
    result = verification_service.initiate_verification(
        db,
        method=payload.method,
        polling_station_id=payload.pollingStationId,
        voter_id_str=payload.voterId,
        aadhaar_number=payload.aadhaarNumber,
    )
    return success_response(data=result, message="OTP sent (simulation)")

@router.post("/verify/otp")
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    result = verification_service.verify_otp(db, voter_id=payload.voterId, otp=payload.otp)
    return success_response(data=result, message="Voter verified successfully")

@router.post("/verify/biometric")
def simulate_biometric(payload: SimulateBiometricRequest, db: Session = Depends(get_db)):
    result = verification_service.simulate_biometric(db, voter_id=payload.voterId, bio_type=payload.type)
    return success_response(data=result, message=result.get("message", "Biometric verified"))

@router.post("/cast")
def cast_vote(payload: CastVoteRequest, db: Session = Depends(get_db)):
    result = vote_service.cast_vote(
        db,
        voter_id=payload.voterId,
        candidate_id=payload.candidateId,
        polling_station_id=payload.pollingStationId,
    )
    return success_response(data=result, message="Vote cast successfully", status_code=201)

@router.get("/vvpat")
def get_vvpat_query(
    referenceNumber: Optional[str] = Query(None),
    ref: Optional[str] = Query(None),
    pollingStationId: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    raw_ref = referenceNumber or ref
    if not raw_ref or not raw_ref.strip():
        raise HTTPException(status_code=400, detail="Please enter a valid Vote Reference Number or Voter ID.")

    vvpat = vote_service.get_vvpat(db, reference_number=raw_ref.strip(), polling_station_id=pollingStationId)
    if not vvpat:
        raise HTTPException(status_code=404, detail=f'No verified vote record found for reference number or Voter ID "{raw_ref.strip()}".')

    return success_response(data=vvpat)

@router.get("/vvpat/{reference_number:path}")
def get_vvpat_path(
    reference_number: str,
    pollingStationId: Optional[int] = Query(None),
    db: Session = Depends(get_db),
):
    if not reference_number or not reference_number.strip():
        raise HTTPException(status_code=400, detail="Please enter a valid Vote Reference Number or Voter ID.")

    vvpat = vote_service.get_vvpat(db, reference_number=reference_number.strip(), polling_station_id=pollingStationId)
    if not vvpat:
        raise HTTPException(status_code=404, detail=f'No verified vote record found for reference number or Voter ID "{reference_number.strip()}".')

    return success_response(data=vvpat)

@router.get("/candidates")
def get_ballot_candidates(
    constituencyId: Optional[int] = None,
    electionId: Optional[int] = None,
    db: Session = Depends(get_db),
):
    # Auto-resolve active election if not specified
    if not electionId and constituencyId:
        active_link = (
            db.query(ElectionConstituency)
            .join(Election, ElectionConstituency.electionId == Election.id)
            .filter(
                ElectionConstituency.constituencyId == constituencyId,
                Election.status == ElectionStatus.ACTIVE,
                Election.deletedAt.is_(None),
            )
            .first()
        )
        if active_link:
            electionId = active_link.electionId
    elif not electionId:
        active_e = db.query(Election).filter(Election.status == ElectionStatus.ACTIVE, Election.deletedAt.is_(None)).first()
        if active_e:
            electionId = active_e.id

    q = db.query(Candidate).filter(Candidate.deletedAt.is_(None), Candidate.isActive.is_(True))
    if electionId:
        q = q.filter(Candidate.electionId == electionId)
    if constituencyId:
        q = q.filter(Candidate.constituencyId == constituencyId)

    candidates = q.order_by(Candidate.serialNumber.asc()).all()
    data = [{
        "id": c.id,
        "electionId": c.electionId,
        "constituencyId": c.constituencyId,
        "fullName": c.fullName,
        "photoUrl": c.photoUrl,
        "serialNumber": c.serialNumber,
        "isIndependent": c.isIndependent,
        "qualification": c.qualification,
        "party": {
            "id": c.party.id,
            "name": c.party.name,
            "abbreviation": c.party.abbreviation,
            "symbol": c.party.symbol,
            "symbolUrl": c.party.symbolUrl,
            "color": c.party.color,
        } if c.party else None,
    } for c in candidates]
    return success_response(data=data)

@router.get("/polling-stations")
def get_public_stations(db: Session = Depends(get_db)):
    stations = db.query(PollingStation).filter(PollingStation.deletedAt.is_(None), PollingStation.isActive.is_(True)).order_by(PollingStation.name.asc()).all()
    data = [{
        "id": ps.id,
        "name": ps.name,
        "code": ps.code,
        "address": ps.address,
        "machineStatus": str(ps.machineStatus.value if hasattr(ps.machineStatus, "value") else ps.machineStatus),
        "isPollingActive": ps.isPollingActive,
        "constituencyId": ps.constituencyId,
        "constituency": {"id": ps.constituency.id, "name": ps.constituency.name} if ps.constituency else None,
    } for ps in stations]
    return success_response(data=data)

@router.get("/polling-stations/{station_id}")
def get_public_station_by_id(station_id: int, db: Session = Depends(get_db)):
    ps = db.query(PollingStation).filter(PollingStation.id == station_id, PollingStation.deletedAt.is_(None)).first()
    if not ps:
        raise HTTPException(status_code=404, detail="Polling station not found")
    return success_response(data={
        "id": ps.id,
        "name": ps.name,
        "code": ps.code,
        "address": ps.address,
        "machineStatus": str(ps.machineStatus.value if hasattr(ps.machineStatus, "value") else ps.machineStatus),
        "isPollingActive": ps.isPollingActive,
        "constituencyId": ps.constituencyId,
        "constituency": {"id": ps.constituency.id, "name": ps.constituency.name} if ps.constituency else None,
    })
