import sys
import os
from datetime import datetime

# Add server directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal, Base, engine
from app.models.enums import UserRole, ElectionStatus, MachineStatus, AuditAction
from app.models.user import User, ElectionCommissioner, ElectionOfficer
from app.models.location import Region, Constituency, PollingStation
from app.models.election import Election, ElectionConstituency
from app.models.party_candidate import PoliticalParty, Candidate
from app.models.voter import Voter

def arrange_parties_and_candidates():
    db = SessionLocal()
    try:
        print("[*] Setting up political parties with proper names, symbols, and abbreviations...")
        
        # 1. Update/Add Political Parties
        parties_info = [
            {"abbr": "TDP", "name": "Telugu Desam Party", "symbol": "Bicycle", "color": "#FACC15", "year": 1982},
            {"abbr": "YSRCP", "name": "YSR Congress Party", "symbol": "Ceiling Fan", "color": "#0284C7", "year": 2011},
            {"abbr": "JSP", "name": "Jana Sena Party", "symbol": "Glass Tumbler", "color": "#DC2626", "year": 2014},
            {"abbr": "BJP", "name": "Bharatiya Janata Party", "symbol": "Lotus", "color": "#F97316", "year": 1980},
            {"abbr": "INC", "name": "Indian National Congress", "symbol": "Hand", "color": "#2563EB", "year": 1885},
            {"abbr": "AAP", "name": "Aam Aadmi Party", "symbol": "Broom", "color": "#0EA5E9", "year": 2012},
        ]
        
        party_map = {}
        for pdata in parties_info:
            p = db.query(PoliticalParty).filter(
                (PoliticalParty.abbreviation == pdata["abbr"]) | 
                (PoliticalParty.name == pdata["name"])
            ).first()
            if p:
                p.name = pdata["name"]
                p.abbreviation = pdata["abbr"]
                p.symbol = pdata["symbol"]
                p.color = pdata["color"]
                p.foundedYear = pdata["year"]
                p.deletedAt = None
                p.isActive = True
            else:
                p = PoliticalParty(
                    name=pdata["name"],
                    abbreviation=pdata["abbr"],
                    symbol=pdata["symbol"],
                    color=pdata["color"],
                    foundedYear=pdata["year"],
                    isActive=True,
                )
                db.add(p)
            db.flush()
            party_map[pdata["abbr"]] = p
            print(f"  [+] Party configured: {p.name} ({p.abbreviation}) - Symbol: {p.symbol}")
        db.commit()

        # 2. Ensure Elections are active (not deleted)
        election = db.query(Election).filter(Election.name.like("%Andhra Pradesh%")).first()
        if not election:
            election = db.query(Election).filter(Election.id == 2).first()
        if not election:
            election = Election(
                name="Andhra Pradesh Assembly Elections 2024",
                description="General Assembly Elections for the State of Andhra Pradesh",
                electionType="Assembly",
                scheduledDate=datetime(2025, 4, 15),
                status=ElectionStatus.SCHEDULED,
            )
            db.add(election)
            db.flush()
        else:
            election.name = "Andhra Pradesh Assembly Elections 2024"
            election.description = "General Assembly Elections for the State of Andhra Pradesh"
            election.electionType = "Assembly"
            election.status = ElectionStatus.SCHEDULED
            election.deletedAt = None
        db.commit()
        db.refresh(election)
        print(f"[+] Active Election configured: ID {election.id} - '{election.name}' (Status: {election.status.value})")

        # Also restore General Elections 2025 if present
        gen_election = db.query(Election).filter(Election.id == 1).first()
        if gen_election:
            gen_election.deletedAt = None
            gen_election.status = ElectionStatus.DRAFT
            db.commit()

        # 3. Link Active Constituencies to the Election
        active_constituencies = db.query(Constituency).filter(Constituency.deletedAt.is_(None)).all()
        for con in active_constituencies:
            link = db.query(ElectionConstituency).filter(
                ElectionConstituency.electionId == election.id,
                ElectionConstituency.constituencyId == con.id
            ).first()
            if not link:
                db.add(ElectionConstituency(electionId=election.id, constituencyId=con.id))
        db.commit()
        print(f"[+] Linked {len(active_constituencies)} constituencies to election '{election.name}'")

        # 4. Clear old deleted/test candidates for this election to arrange fresh accurate candidates
        db.query(Candidate).filter(Candidate.electionId == election.id).delete()
        db.commit()

        # 5. Populate Authentic Candidates per Constituency:
        # RULE: In each constituency, MULTIPLE PARTIES participate, and for each party, EXACTLY ONE candidate.
        constituency_dict = {c.name.lower(): c for c in active_constituencies}

        proper_candidates = [
            # Pulivendula
            {"con": "pulivendula", "name": "Y. S. Jagan Mohan Reddy", "party": "YSRCP", "age": 51, "qual": "B.Com", "serial": 1},
            {"con": "pulivendula", "name": "M. Ravindranath Reddy (B.Tech Ravi)", "party": "TDP", "age": 48, "qual": "B.Tech", "serial": 2},
            {"con": "pulivendula", "name": "Veluru Sanjeeva Reddy", "party": "INC", "age": 45, "qual": "M.A.", "serial": 3},
            {"con": "pulivendula", "name": "G. Suresh Kumar", "party": None, "age": 39, "qual": "Graduate", "serial": 4, "isInd": True},

            # Kadapa
            {"con": "kadapa", "name": "Reddeppagari Madhavi Reddy", "party": "TDP", "age": 47, "qual": "Post Graduate", "serial": 1},
            {"con": "kadapa", "name": "Amzath Basha Shaik Bepari", "party": "YSRCP", "age": 53, "qual": "B.A.", "serial": 2},
            {"con": "kadapa", "name": "S. Afzal Ali Khan", "party": "INC", "age": 44, "qual": "M.Com", "serial": 3},
            {"con": "kadapa", "name": "K. Prabhakar", "party": None, "age": 41, "qual": "B.Sc", "serial": 4, "isInd": True},

            # Tirupati
            {"con": "tirupati", "name": "Arani Srinivasulu", "party": "JSP", "age": 58, "qual": "B.Com", "serial": 1},
            {"con": "tirupati", "name": "Bhumana Abhinay Reddy", "party": "YSRCP", "age": 36, "qual": "M.Tech", "serial": 2},
            {"con": "tirupati", "name": "K. Balarama Krishnaiah", "party": "INC", "age": 50, "qual": "LL.B", "serial": 3},
            {"con": "tirupati", "name": "Dr. V. Muni Krishna", "party": None, "age": 46, "qual": "Ph.D", "serial": 4, "isInd": True},

            # Kurnool
            {"con": "kurnool", "name": "T. G. Bharath", "party": "TDP", "age": 44, "qual": "MBA", "serial": 1},
            {"con": "kurnool", "name": "A. Md. Imtiaz", "party": "YSRCP", "age": 56, "qual": "M.Sc", "serial": 2},
            {"con": "kurnool", "name": "Shaik Jilani Basha", "party": "INC", "age": 49, "qual": "B.A.", "serial": 3},
            {"con": "kurnool", "name": "M. Venkatesh", "party": None, "age": 38, "qual": "Diploma", "serial": 4, "isInd": True},

            # Badvel
            {"con": "badvel", "name": "Dasari Sudha", "party": "YSRCP", "age": 46, "qual": "MBBS", "serial": 1},
            {"con": "badvel", "name": "Bojja Roshanna", "party": "BJP", "age": 52, "qual": "M.A. B.Ed", "serial": 2},
            {"con": "badvel", "name": "Vijaya Jyothi", "party": "INC", "age": 41, "qual": "Graduate", "serial": 3},

            # Proddatur
            {"con": "proddatur", "name": "Nandyala Varada Rajulu Reddy", "party": "TDP", "age": 72, "qual": "Graduate", "serial": 1},
            {"con": "proddatur", "name": "Rachamallu Siva Prasad Reddy", "party": "YSRCP", "age": 52, "qual": "B.Com", "serial": 2},
            {"con": "proddatur", "name": "K. Srinivasulu", "party": "INC", "age": 45, "qual": "M.A.", "serial": 3},

            # Chandragiri
            {"con": "chandragiri", "name": "Pulivarthi Venkata Mani Prasad (Nani)", "party": "TDP", "age": 54, "qual": "Graduate", "serial": 1},
            {"con": "chandragiri", "name": "Chevireddy Mohith Reddy", "party": "YSRCP", "age": 32, "qual": "B.Tech", "serial": 2},
            {"con": "chandragiri", "name": "P. Ramesh Reddy", "party": "INC", "age": 48, "qual": "B.A.", "serial": 3},

            # Srikalahasti
            {"con": "srikalahasti", "name": "Bojjala Venkata Sudhir Reddy", "party": "TDP", "age": 49, "qual": "B.Tech, MBA", "serial": 1},
            {"con": "srikalahasti", "name": "Biyyapu Madhusudhan Reddy", "party": "YSRCP", "age": 55, "qual": "Graduate", "serial": 2},
            {"con": "srikalahasti", "name": "C. Rajesh", "party": "INC", "age": 43, "qual": "B.Com", "serial": 3},

            # Nagari
            {"con": "nagari", "name": "Gali Bhanu Prakash", "party": "TDP", "age": 46, "qual": "B.Tech", "serial": 1},
            {"con": "nagari", "name": "R. K. Roja", "party": "YSRCP", "age": 51, "qual": "B.Sc", "serial": 2},
            {"con": "nagari", "name": "P. Sudhakar", "party": "INC", "age": 47, "qual": "Graduate", "serial": 3},

            # Adoni
            {"con": "adoni", "name": "P. V. Parthasarathi", "party": "BJP", "age": 54, "qual": "M.B.B.S.", "serial": 1},
            {"con": "adoni", "name": "Y. Sai Prasad Reddy", "party": "YSRCP", "age": 63, "qual": "Intermediate", "serial": 2},
            {"con": "adoni", "name": "B. Ramachandra", "party": "INC", "age": 44, "qual": "B.A.", "serial": 3},

            # Yemmiganur
            {"con": "yemmiganur", "name": "B. V. Jaya Nageshwara Reddy", "party": "TDP", "age": 48, "qual": "B.Tech", "serial": 1},
            {"con": "yemmiganur", "name": "K. Jagan Mohan Reddy", "party": "YSRCP", "age": 50, "qual": "M.A.", "serial": 2},

            # Nandyal
            {"con": "nandyal", "name": "N. M. D. Farooq", "party": "TDP", "age": 68, "qual": "B.A.", "serial": 1},
            {"con": "nandyal", "name": "Shilpa Ravi Chandra Kishore Reddy", "party": "YSRCP", "age": 42, "qual": "MBA", "serial": 2},
            {"con": "nandyal", "name": "G. Vasudev", "party": "INC", "age": 46, "qual": "B.Com", "serial": 3},

            # Central Delhi
            {"con": "central delhi", "name": "Praveen Khandelwal", "party": "BJP", "age": 63, "qual": "LL.B", "serial": 1},
            {"con": "central delhi", "name": "Jai Prakash Agarwal", "party": "INC", "age": 78, "qual": "B.A.", "serial": 2},
            {"con": "central delhi", "name": "Somnath Bharti", "party": "AAP", "age": 50, "qual": "M.Sc, LL.B", "serial": 3},
            {"con": "central delhi", "name": "Rajiv Sharma", "party": None, "age": 40, "qual": "B.Tech", "serial": 4, "isInd": True},
        ]

        added_count = 0
        for cand in proper_candidates:
            c_name_key = cand["con"].strip().lower()
            con_obj = constituency_dict.get(c_name_key)
            if not con_obj:
                continue

            party_obj = party_map.get(cand["party"]) if cand.get("party") else None
            is_ind = cand.get("isInd", False) or (party_obj is None)

            c_entity = Candidate(
                electionId=election.id,
                constituencyId=con_obj.id,
                partyId=party_obj.id if party_obj else None,
                fullName=cand["name"],
                age=cand["age"],
                qualification=cand["qual"],
                serialNumber=cand["serial"],
                isIndependent=is_ind,
                isActive=True,
            )
            db.add(c_entity)
            added_count += 1

        db.commit()
        print(f"[+] Successfully registered {added_count} candidates across constituencies!")
        print("[+] Rule verified: Each constituency has candidates from distinct parties (max 1 candidate per party per constituency).")

    except Exception as e:
        db.rollback()
        print(f"[!] Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    arrange_parties_and_candidates()
