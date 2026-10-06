from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.voter import Voter, ElectionVoterStatus, OTPVerification
from app.models.election import Election, ElectionConstituency
from app.models.location import PollingStation, Constituency
from app.models.enums import ElectionStatus, VerificationMethod, VerificationStatus
from app.utils.crypto import hash_aadhaar, generate_otp

class VerificationService:
    @staticmethod
    def initiate_verification(
        db: Session,
        method: VerificationMethod,
        polling_station_id: int,
        voter_id_str: Optional[str] = None,
        aadhaar_number: Optional[str] = None,
    ) -> Dict[str, Any]:
        voter: Optional[Voter] = None

        if method == VerificationMethod.VOTER_ID:
            if not voter_id_str or not voter_id_str.strip():
                raise HTTPException(status_code=400, detail="Voter ID is required.")
            voter = db.query(Voter).filter(
                Voter.voterId == voter_id_str.strip(),
                Voter.deletedAt.is_(None),
            ).first()
        else:
            if not aadhaar_number or not aadhaar_number.strip():
                raise HTTPException(status_code=400, detail="Aadhaar number is required.")
            ahash = hash_aadhaar(aadhaar_number.strip())
            voter = db.query(Voter).filter(
                Voter.aadhaarHash == ahash,
                Voter.deletedAt.is_(None),
            ).first()

        if not voter:
            raise HTTPException(status_code=404, detail="Voter not found. Please check your details.")

        if not voter.isActive:
            raise HTTPException(status_code=403, detail="Voter record is inactive. Contact the officer.")

        if voter.pollingStationId != polling_station_id:
            raise HTTPException(status_code=403, detail="You are not registered at this polling station.")

        # Check active election for constituency
        active_link = (
            db.query(ElectionConstituency)
            .join(Election, ElectionConstituency.electionId == Election.id)
            .filter(
                ElectionConstituency.constituencyId == voter.constituencyId,
                Election.status == ElectionStatus.ACTIVE,
                Election.deletedAt.is_(None),
            )
            .first()
        )
        if not active_link:
            # Fallback 1: check if polling station has an active election link
            station = db.query(PollingStation).filter(PollingStation.id == polling_station_id).first()
            if station and station.constituencyId:
                station_link = (
                    db.query(ElectionConstituency)
                    .join(Election, ElectionConstituency.electionId == Election.id)
                    .filter(
                        ElectionConstituency.constituencyId == station.constituencyId,
                        Election.status == ElectionStatus.ACTIVE,
                        Election.deletedAt.is_(None),
                    )
                    .first()
                )
                if station_link:
                    active_link = station_link
                    voter.constituencyId = station.constituencyId
                    db.commit()

        if not active_link:
            # Fallback 2: check if any active election exists that has a constituency with the same name
            voter_con = db.query(Constituency).filter(Constituency.id == voter.constituencyId).first()
            if voter_con:
                same_name_con = (
                    db.query(Constituency)
                    .filter(
                        func.lower(Constituency.name) == func.lower(voter_con.name),
                        Constituency.deletedAt.is_(None),
                    )
                    .first()
                )
                if same_name_con and same_name_con.id != voter.constituencyId:
                    name_link = (
                        db.query(ElectionConstituency)
                        .join(Election, ElectionConstituency.electionId == Election.id)
                        .filter(
                            ElectionConstituency.constituencyId == same_name_con.id,
                            Election.status == ElectionStatus.ACTIVE,
                            Election.deletedAt.is_(None),
                        )
                        .first()
                    )
                    if name_link:
                        active_link = name_link
                        voter.constituencyId = same_name_con.id
                        db.commit()

        if not active_link:
            raise HTTPException(status_code=400, detail="No active election found for your constituency.")

        # Check if already voted
        voter_status = (
            db.query(ElectionVoterStatus)
            .filter(
                ElectionVoterStatus.voterId == voter.id,
                ElectionVoterStatus.electionId == active_link.electionId,
            )
            .first()
        )
        if voter_status and voter_status.hasVoted:
            raise HTTPException(status_code=409, detail="This voter has already cast their vote in the current election.")

        # Generate simulated OTP (5 min validity)
        otp = generate_otp()
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        otp_record = OTPVerification(
            voterId=voter.id,
            otp=otp,
            method=method,
            status=VerificationStatus.PENDING,
            expiresAt=expires_at,
        )
        db.add(otp_record)
        db.commit()

        masked_phone = f"+91-XXXXX{voter.phone[-4:]}" if voter.phone and len(voter.phone) >= 4 else "N/A"

        return {
            "voterId": voter.id,
            "voterName": voter.fullName,
            "maskedPhone": masked_phone,
            "simulatedOtp": otp,
            "message": "OTP sent to registered mobile number (SIMULATION).",
        }

    @staticmethod
    def verify_otp(db: Session, voter_id: int, otp: str) -> Dict[str, Any]:
        now = datetime.utcnow()
        record = (
            db.query(OTPVerification)
            .filter(
                OTPVerification.voterId == voter_id,
                OTPVerification.otp == otp.strip(),
                OTPVerification.status == VerificationStatus.PENDING,
                OTPVerification.expiresAt > now,
            )
            .first()
        )
        if not record:
            raise HTTPException(status_code=401, detail="Invalid or expired OTP.")

        record.status = VerificationStatus.VERIFIED
        record.verifiedAt = now
        db.commit()

        voter = db.query(Voter).filter(Voter.id == voter_id, Voter.deletedAt.is_(None)).first()
        if not voter:
            raise HTTPException(status_code=404, detail="Voter not found.")

        return {
            "verified": True,
            "voter": {
                "id": voter.id,
                "fullName": voter.fullName,
                "voterId": voter.voterId,
                "constituencyId": voter.constituencyId,
                "pollingStationId": voter.pollingStationId,
                "serialNumber": voter.serialNumber,
                "gender": voter.gender,
                "address": voter.address,
            },
        }

    @staticmethod
    def simulate_biometric(db: Session, voter_id: int, bio_type: str = "FINGERPRINT") -> Dict[str, Any]:
        voter = db.query(Voter).filter(Voter.id == voter_id, Voter.deletedAt.is_(None)).first()
        if not voter:
            raise HTTPException(status_code=404, detail="Voter not found.")

        active_link = (
            db.query(ElectionConstituency)
            .join(Election, ElectionConstituency.electionId == Election.id)
            .filter(
                ElectionConstituency.constituencyId == voter.constituencyId,
                Election.status == ElectionStatus.ACTIVE,
                Election.deletedAt.is_(None),
            )
            .first()
        )
        if active_link:
            voter_status = (
                db.query(ElectionVoterStatus)
                .filter(
                    ElectionVoterStatus.voterId == voter.id,
                    ElectionVoterStatus.electionId == active_link.electionId,
                )
                .first()
            )
            if voter_status and voter_status.hasVoted:
                raise HTTPException(status_code=409, detail="Voter has already voted in the current election.")

        return {
            "verified": True,
            "voter": {
                "id": voter.id,
                "fullName": voter.fullName,
                "voterId": voter.voterId,
                "constituencyId": voter.constituencyId,
                "pollingStationId": voter.pollingStationId,
                "serialNumber": voter.serialNumber,
                "gender": voter.gender,
                "address": voter.address,
            },
            "message": f"{bio_type} verification successful (SIMULATION).",
        }

verification_service = VerificationService()
