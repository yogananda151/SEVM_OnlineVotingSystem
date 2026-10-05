from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.election import Election, ElectionConstituency
from app.models.location import Constituency, PollingStation
from app.models.party_candidate import Candidate
from app.models.voter import Voter
from app.models.user import ElectionOfficer
from app.models.vote import Vote
from app.models.enums import ElectionStatus, UserRole
from app.middleware.auth import CurrentUser

VALID_TRANSITIONS = {
    "DRAFT": ["SCHEDULED", "ACTIVE"],
    "SCHEDULED": ["ACTIVE", "DRAFT"],
    "ACTIVE": ["PAUSED", "CLOSED"],
    "PAUSED": ["ACTIVE", "CLOSED"],
    "CLOSED": ["RESULTS_PUBLISHED"],
    "RESULTS_PUBLISHED": [],
}

class ElectionService:
    @staticmethod
    def get_readiness(db: Session, election_id: int) -> Optional[Dict[str, Any]]:
        election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
        if not election:
            return None

        links = (
            db.query(ElectionConstituency)
            .filter(ElectionConstituency.electionId == election_id)
            .all()
        )
        constituency_ids = [l.constituencyId for l in links]
        total_constituencies = len(constituency_ids)

        # Candidates count per constituency
        cand_counts = (
            db.query(Candidate.constituencyId, func.count(Candidate.id))
            .filter(Candidate.electionId == election_id, Candidate.deletedAt.is_(None))
            .group_by(Candidate.constituencyId)
            .all()
        )
        cands_per_con = {row[0]: row[1] for row in cand_counts}
        constituencies_without_candidates = [cid for cid in constituency_ids if cands_per_con.get(cid, 0) == 0]

        # Polling stations in these constituencies
        stations = (
            db.query(PollingStation)
            .filter(PollingStation.constituencyId.in_(constituency_ids), PollingStation.deletedAt.is_(None))
            .all()
        ) if constituency_ids else []
        total_stations = len(stations)
        stations_without_officer = [s for s in stations if len(s.officers) == 0]

        total_voters = (
            db.query(func.count(Voter.id))
            .filter(Voter.constituencyId.in_(constituency_ids), Voter.deletedAt.is_(None))
            .scalar() or 0
        ) if constituency_ids else 0

        total_candidates = sum(cands_per_con.values())

        issues = []
        if total_constituencies == 0:
            issues.append("No constituencies selected for this election.")
        if not election.officer:
            issues.append("No Election Officer assigned. Please assign an Election Officer.")
        if constituencies_without_candidates:
            con_names = [
                l.constituency.name for l in links if l.constituencyId in constituencies_without_candidates
            ]
            issues.append(f"{len(con_names)} constituency(ies) have no candidates: {', '.join(con_names)}")
        if stations_without_officer:
            issues.append(f"{len(stations_without_officer)} polling station(s) have no officer assigned.")
        if total_voters == 0:
            issues.append("No voters registered in the selected constituencies.")

        return {
            "election": {
                "id": election.id,
                "name": election.name,
                "status": str(election.status.value if hasattr(election.status, "value") else election.status),
                "scheduledDate": election.scheduledDate.isoformat(),
            },
            "officer": {
                "id": election.officer.id,
                "fullName": election.officer.fullName,
                "employeeId": election.officer.employeeId,
            } if election.officer else None,
            "totalConstituencies": total_constituencies,
            "totalStations": total_stations,
            "totalVoters": total_voters,
            "totalCandidates": total_candidates,
            "stationsWithoutOfficer": len(stations_without_officer),
            "constituenciesWithoutCandidates": len(constituencies_without_candidates),
            "hasElectionOfficer": election.officer is not None,
            "issues": issues,
            "isReady": len(issues) == 0,
        }

    @staticmethod
    def get_stats(db: Session, election_id: int) -> Optional[Dict[str, Any]]:
        election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
        if not election:
            return None

        links = db.query(ElectionConstituency).filter(ElectionConstituency.electionId == election_id).all()
        con_ids = [l.constituencyId for l in links]

        total_voters = 0
        total_stations = 0
        if con_ids:
            total_voters = db.query(func.count(Voter.id)).filter(Voter.constituencyId.in_(con_ids), Voter.deletedAt.is_(None)).scalar() or 0
            total_stations = db.query(func.count(PollingStation.id)).filter(PollingStation.constituencyId.in_(con_ids), PollingStation.deletedAt.is_(None)).scalar() or 0

        voted_count = db.query(func.count(Vote.id)).filter(Vote.electionId == election_id).scalar() or 0
        total_candidates = db.query(func.count(Candidate.id)).filter(Candidate.electionId == election_id, Candidate.deletedAt.is_(None)).scalar() or 0

        turnout_percent = f"{(voted_count / total_voters) * 100:.2f}" if total_voters > 0 else "0.00"

        return {
            "election": {
                "id": election.id,
                "name": election.name,
                "electionType": election.electionType,
                "status": str(election.status.value if hasattr(election.status, "value") else election.status),
                "scheduledDate": election.scheduledDate.isoformat(),
            },
            "totalVoters": total_voters,
            "votedCount": voted_count,
            "turnoutPercent": turnout_percent,
            "totalCandidates": total_candidates,
            "totalStations": total_stations,
            "totalConstituencies": len(con_ids),
        }

    @staticmethod
    def update_status(db: Session, election_id: int, new_status: ElectionStatus, current_user: CurrentUser) -> Election:
        election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
        if not election:
            raise HTTPException(status_code=404, detail="Election not found.")

        # Authority guard for starting/stopping
        status_val = new_status.value if hasattr(new_status, "value") else str(new_status)
        if status_val in ["ACTIVE", "CLOSED", "PAUSED"]:
            if current_user.role not in [UserRole.OFFICER, UserRole.COMMISSIONER]:
                raise HTTPException(status_code=403, detail="Elections can only be started and stopped by authorized election officials.")

            if current_user.role == UserRole.OFFICER:
                officer = db.query(ElectionOfficer).filter(ElectionOfficer.userId == current_user.userId, ElectionOfficer.deletedAt.is_(None)).first()
                if not officer:
                    raise HTTPException(status_code=404, detail="Election Officer profile not found.")

                is_supervising = election.officerId == officer.id
                is_station_officer = False
                if officer.pollingStationId:
                    for ec in election.electionConstituencies:
                        if any(ps.id == officer.pollingStationId for ps in ec.constituency.pollingStations):
                            is_station_officer = True
                            break

                if not is_supervising and not is_station_officer:
                    raise HTTPException(status_code=403, detail="You are not assigned to this election.")

        # Status transition check
        curr_status = str(election.status.value if hasattr(election.status, "value") else election.status)
        allowed = VALID_TRANSITIONS.get(curr_status, [])
        if status_val not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f'Cannot change election from "{curr_status}" to "{status_val}". Valid transitions: {", ".join(allowed) or "none"}.',
            )

        # Readiness check before activating/scheduling
        if status_val in ["ACTIVE", "SCHEDULED"]:
            readiness = ElectionService.get_readiness(db, election_id)
            if readiness and not readiness["isReady"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot activate election. Issues found:\n• " + "\n• ".join(readiness["issues"]),
                )

        election.status = new_status
        if status_val == "ACTIVE" and not election.startTime:
            election.startTime = datetime.utcnow()
        if status_val == "CLOSED" and not election.endTime:
            election.endTime = datetime.utcnow()

        db.commit()
        db.refresh(election)
        return election

    @staticmethod
    def auto_assign_officers(db: Session, election_id: int) -> Dict[str, Any]:
        election = db.query(Election).filter(Election.id == election_id, Election.deletedAt.is_(None)).first()
        if not election:
            raise HTTPException(status_code=404, detail="Election not found.")

        status_val = str(election.status.value if hasattr(election.status, "value") else election.status)
        if status_val not in ["DRAFT", "SCHEDULED"]:
            raise HTTPException(status_code=400, detail="Cannot assign officers after election has started.")

        links = db.query(ElectionConstituency).filter(ElectionConstituency.electionId == election_id).all()
        con_ids = [l.constituencyId for l in links]
        if not con_ids:
            raise HTTPException(status_code=400, detail="No constituencies are selected for this election. Select constituencies first.")

        stations = (
            db.query(PollingStation)
            .filter(PollingStation.constituencyId.in_(con_ids), PollingStation.deletedAt.is_(None))
            .all()
        )
        unassigned_stations = [s for s in stations if len(s.officers) == 0]
        if not unassigned_stations:
            return {"count": 0, "totalNeeded": 0}

        available_officers = (
            db.query(ElectionOfficer)
            .filter(
                ElectionOfficer.deletedAt.is_(None),
                ElectionOfficer.pollingStationId.is_(None),
                ElectionOfficer.id != (election.officerId or -1),
            )
            .order_by(ElectionOfficer.id.asc())
            .all()
        )

        if not available_officers:
            raise HTTPException(status_code=400, detail="No unassigned officers available. Please register more officers in Master Data → Officers.")

        assigned_count = 0
        limit = min(len(unassigned_stations), len(available_officers))
        for i in range(limit):
            st = unassigned_stations[i]
            off = available_officers[i]
            off.pollingStationId = st.id
            assigned_count += 1

        db.commit()
        return {"count": assigned_count, "totalNeeded": len(unassigned_stations)}

election_service = ElectionService()
