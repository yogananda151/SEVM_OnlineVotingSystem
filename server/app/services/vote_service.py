import secrets
from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.voter import Voter, ElectionVoterStatus
from app.models.location import PollingStation, Constituency
from app.models.election import Election, ElectionConstituency
from app.models.party_candidate import Candidate, PoliticalParty
from app.models.vote import Vote, DigitalVVPAT
from app.models.enums import ElectionStatus, MachineStatus, AuditAction
from app.utils.crypto import generate_vote_hash, generate_reference_number
from app.services.audit_service import audit_service

class VoteService:
    @staticmethod
    def cast_vote(
        db: Session,
        voter_id: int,
        candidate_id: int,
        polling_station_id: int,
    ) -> Dict[str, Any]:
        try:
            # 1. Verify voter
            voter = db.query(Voter).filter(Voter.id == voter_id, Voter.deletedAt.is_(None)).first()
            if not voter:
                raise HTTPException(status_code=404, detail="Voter not found.")
            if not voter.isActive:
                raise HTTPException(status_code=403, detail="Voter account is inactive.")
            if voter.pollingStationId != polling_station_id:
                raise HTTPException(status_code=403, detail="Voter is not registered at this polling station.")

            # 2. Verify election is active for constituency
            election_link = (
                db.query(ElectionConstituency)
                .join(Election, ElectionConstituency.electionId == Election.id)
                .filter(
                    ElectionConstituency.constituencyId == voter.constituencyId,
                    Election.status == ElectionStatus.ACTIVE,
                    Election.deletedAt.is_(None),
                )
                .order_by(Election.scheduledDate.desc())
                .first()
            )
            if not election_link or not election_link.election:
                raise HTTPException(status_code=400, detail="No active election found for this constituency.")

            election = election_link.election

            # 3. Check if already voted
            existing_status = (
                db.query(ElectionVoterStatus)
                .filter(
                    ElectionVoterStatus.voterId == voter.id,
                    ElectionVoterStatus.electionId == election.id,
                )
                .first()
            )
            if existing_status and existing_status.hasVoted:
                raise HTTPException(status_code=409, detail="Voter has already cast their vote in this election.")

            # 4. Verify polling station machine is active
            station = db.query(PollingStation).filter(PollingStation.id == polling_station_id).first()
            if not station:
                raise HTTPException(status_code=404, detail="Polling station not found.")
            if station.machineStatus != MachineStatus.ACTIVE:
                if election.status == ElectionStatus.ACTIVE and station.machineStatus == MachineStatus.IDLE:
                    station.machineStatus = MachineStatus.ACTIVE
                    station.isPollingActive = True
                    db.commit()
                else:
                    status_name = station.machineStatus.value.lower() if hasattr(station.machineStatus, 'value') else str(station.machineStatus).lower()
                    raise HTTPException(status_code=400, detail=f"Voting machine is currently {status_name}. Please contact the booth officer.")

            # 5. Verify candidate
            candidate = (
                db.query(Candidate)
                .filter(Candidate.id == candidate_id, Candidate.deletedAt.is_(None))
                .first()
            )
            if not candidate or candidate.constituencyId != voter.constituencyId:
                raise HTTPException(status_code=400, detail="Invalid candidate.")
            if candidate.electionId != election.id:
                raise HTTPException(status_code=400, detail="Candidate does not belong to the current active election.")

            # 6. Generate cryptographic hash & reference number
            timestamp = datetime.utcnow().isoformat()
            nonce = secrets.token_hex(6)
            vote_hash = generate_vote_hash({
                "voterId": voter_id,
                "candidateId": candidate_id,
                "pollingStationId": polling_station_id,
                "timestamp": timestamp,
                "nonce": nonce,
            })
            reference_number = generate_reference_number()

            # 7. Create vote record
            vote = Vote(
                voterId=voter_id,
                electionId=election.id,
                candidateId=candidate_id,
                pollingStationId=polling_station_id,
                voteHash=vote_hash,
                referenceNumber=reference_number,
                isVerified=True,
            )
            db.add(vote)
            db.flush()

            # 8. Create Digital VVPAT
            vvpat = DigitalVVPAT(
                voteId=vote.id,
                candidateId=candidate.id,
                candidateName=candidate.fullName,
                partyName=candidate.party.name if candidate.party else "Independent",
                partySymbolUrl=candidate.party.symbolUrl if candidate.party else None,
                electionName=election.name,
                referenceNumber=reference_number,
                voteHash=vote_hash,
            )
            db.add(vvpat)

            # 9. Mark voter status
            if existing_status:
                existing_status.hasVoted = True
                existing_status.votedAt = datetime.utcnow()
            else:
                db.add(ElectionVoterStatus(
                    voterId=voter_id,
                    electionId=election.id,
                    hasVoted=True,
                    votedAt=datetime.utcnow(),
                ))

            # 10. Audit log
            audit_service.log(
                db,
                action=AuditAction.VOTE_CAST,
                module="Voting",
                description=f'Vote cast at station {polling_station_id} for election "{election.name}" - Ref: {reference_number}',
                election_id=election.id,
                metadata={"referenceNumber": reference_number, "voteHash": vote_hash},
            )

            db.commit()

            return {
                "vote": {
                    "id": vote.id,
                    "referenceNumber": vote.referenceNumber,
                    "voteHash": vote.voteHash,
                    "castAt": vote.castAt.isoformat(),
                },
                "vvpat": {
                    "id": vvpat.id,
                    "candidateName": vvpat.candidateName,
                    "partyName": vvpat.partyName,
                    "partySymbolUrl": vvpat.partySymbolUrl,
                    "electionName": vvpat.electionName,
                    "referenceNumber": vvpat.referenceNumber,
                    "voteHash": vvpat.voteHash,
                    "timestamp": vvpat.timestamp.isoformat(),
                },
                "candidate": {
                    "id": candidate.id,
                    "fullName": candidate.fullName,
                    "party": {"name": candidate.party.name, "symbol": candidate.party.symbol} if candidate.party else None,
                },
                "election": {
                    "id": election.id,
                    "name": election.name,
                },
            }
        except Exception:
            db.rollback()
            raise

    @staticmethod
    def get_vvpat(
        db: Session,
        reference_number: str,
        polling_station_id: Optional[int] = None,
    ) -> Optional[Dict[str, Any]]:
        clean_ref = reference_number.strip()

        # 1. Search directly in DigitalVVPAT
        query = db.query(DigitalVVPAT).join(Vote, DigitalVVPAT.voteId == Vote.id)
        if polling_station_id:
            query = query.filter(Vote.pollingStationId == polling_station_id)
        
        vvpat = query.filter(DigitalVVPAT.referenceNumber == clean_ref).first()
        if vvpat:
            return VoteService._format_vvpat(vvpat)

        # 2. Search by Vote reference number
        vote_query = db.query(Vote).filter(Vote.referenceNumber == clean_ref)
        if polling_station_id:
            vote_query = vote_query.filter(Vote.pollingStationId == polling_station_id)
        
        vote_record = vote_query.first()
        if vote_record and vote_record.vvpat:
            return VoteService._format_vvpat(vote_record.vvpat)

        # 3. Search by Voter ID (EPIC)
        voter_query = db.query(Voter).filter(Voter.voterId == clean_ref, Voter.deletedAt.is_(None))
        if polling_station_id:
            voter_query = voter_query.filter(Voter.pollingStationId == polling_station_id)
        
        voter = voter_query.first()
        if voter:
            # Look for vote in active election
            active_vote = (
                db.query(Vote)
                .join(Election, Vote.electionId == Election.id)
                .filter(
                    Vote.voterId == voter.id,
                    Election.status == ElectionStatus.ACTIVE,
                )
                .order_by(Vote.castAt.desc())
                .first()
            )
            if active_vote and active_vote.vvpat:
                return VoteService._format_vvpat(active_vote.vvpat)

            raise HTTPException(
                status_code=404,
                detail=f'Voter "{voter.fullName}" ({voter.voterId}) has not yet cast a vote in the current election. Please cast your ballot at the voting machine to generate a digital VVPAT slip.',
            )

        return None

    @staticmethod
    def _format_vvpat(vvpat: DigitalVVPAT) -> Dict[str, Any]:
        return {
            "id": vvpat.id,
            "voteId": vvpat.voteId,
            "candidateId": vvpat.candidateId,
            "candidateName": vvpat.candidateName,
            "partyName": vvpat.partyName,
            "partySymbolUrl": vvpat.partySymbolUrl,
            "electionName": vvpat.electionName,
            "referenceNumber": vvpat.referenceNumber,
            "voteHash": vvpat.voteHash,
            "timestamp": vvpat.timestamp.isoformat(),
            "candidate": {
                "id": vvpat.candidate.id,
                "fullName": vvpat.candidate.fullName,
                "party": {
                    "name": vvpat.candidate.party.name if vvpat.candidate.party else "Independent",
                    "symbol": vvpat.candidate.party.symbol if vvpat.candidate.party else None,
                    "symbolUrl": vvpat.candidate.party.symbolUrl if vvpat.candidate.party else None,
                    "color": vvpat.candidate.party.color if vvpat.candidate.party else "#1a73e8",
                } if vvpat.candidate.party else None,
            } if vvpat.candidate else None,
        }

    @staticmethod
    def get_dashboard_stats(db: Session) -> Dict[str, Any]:
        total_elections = db.query(func.count(Election.id)).filter(Election.deletedAt.is_(None)).scalar() or 0
        active_election = (
            db.query(Election)
            .filter(Election.status == ElectionStatus.ACTIVE, Election.deletedAt.is_(None))
            .first()
        )
        total_stations = db.query(func.count(PollingStation.id)).filter(PollingStation.deletedAt.is_(None)).scalar() or 0
        total_voters = db.query(func.count(Voter.id)).filter(Voter.deletedAt.is_(None)).scalar() or 0
        total_candidates = db.query(func.count(Candidate.id)).filter(Candidate.deletedAt.is_(None)).scalar() or 0
        total_parties = db.query(func.count(PoliticalParty.id)).filter(PoliticalParty.deletedAt.is_(None)).scalar() or 0
        total_votes = db.query(func.count(Vote.id)).scalar() or 0

        turnout_percent = "0.00"
        if active_election:
            con_ids = [
                row[0] for row in db.query(ElectionConstituency.constituencyId)
                .filter(ElectionConstituency.electionId == active_election.id)
                .all()
            ]
            if con_ids:
                active_voters = (
                    db.query(func.count(Voter.id))
                    .filter(Voter.deletedAt.is_(None), Voter.constituencyId.in_(con_ids))
                    .scalar() or 0
                )
                active_votes = (
                    db.query(func.count(Vote.id))
                    .filter(Vote.electionId == active_election.id)
                    .scalar() or 0
                )
                if active_voters > 0:
                    turnout_percent = f"{(active_votes / active_voters) * 100:.2f}"

        return {
            "totalElections": total_elections,
            "activeElection": {
                "id": active_election.id,
                "name": active_election.name,
                "status": str(active_election.status.value if hasattr(active_election.status, "value") else active_election.status),
                "scheduledDate": active_election.scheduledDate.isoformat(),
            } if active_election else None,
            "totalStations": total_stations,
            "totalVoters": total_voters,
            "totalCandidates": total_candidates,
            "totalParties": total_parties,
            "totalVotes": total_votes,
            "turnoutPercent": turnout_percent,
        }

    @staticmethod
    def get_results(db: Session, election_id: int) -> List[Dict[str, Any]]:
        links = (
            db.query(ElectionConstituency)
            .filter(ElectionConstituency.electionId == election_id)
            .all()
        )
        results = []
        for link in links:
            con = link.constituency
            candidates = (
                db.query(Candidate)
                .filter(Candidate.electionId == election_id, Candidate.constituencyId == con.id, Candidate.deletedAt.is_(None))
                .all()
            )
            candidate_list = []
            for c in candidates:
                vote_count = db.query(func.count(Vote.id)).filter(Vote.candidateId == c.id, Vote.electionId == election_id).scalar() or 0
                candidate_list.append({
                    "id": c.id,
                    "fullName": c.fullName,
                    "serialNumber": c.serialNumber,
                    "age": c.age,
                    "qualification": c.qualification,
                    "photoUrl": c.photoUrl,
                    "party": {
                        "id": c.party.id,
                        "name": c.party.name,
                        "abbreviation": c.party.abbreviation,
                        "symbol": c.party.symbol,
                        "symbolUrl": c.party.symbolUrl,
                        "color": c.party.color,
                    } if c.party else None,
                    "_count": {"votes": vote_count},
                })
            # Sort by vote count descending
            candidate_list.sort(key=lambda x: x["_count"]["votes"], reverse=True)
            results.append({
                "id": con.id,
                "name": con.name,
                "code": con.code,
                "candidates": candidate_list,
            })
        return results

vote_service = VoteService()
