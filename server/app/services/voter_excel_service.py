import io
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from app.models.location import Constituency, PollingStation
from app.models.voter import Voter
from app.utils.crypto import hash_aadhaar

class VoterExcelService:
    @staticmethod
    def generate_template(db: Session) -> io.BytesIO:
        constituencies = db.query(Constituency).filter(Constituency.deletedAt.is_(None)).order_by(Constituency.id.asc()).all()
        polling_stations = db.query(PollingStation).filter(PollingStation.deletedAt.is_(None)).order_by(PollingStation.id.asc()).all()

        wb = openpyxl.Workbook()
        ws_roster = wb.active
        ws_roster.title = "Voters Roster"

        headers = [
            "Full Name *", "Voter ID (EPIC) *", "Constituency ID *", "Polling Station ID *",
            "Serial Number", "Date of Birth (YYYY-MM-DD) *", "Gender (Male/Female/Other) *",
            "Address *", "Phone (10 digits)", "Aadhaar Number (12 digits)",
        ]
        ws_roster.append(headers)

        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        header_align = Alignment(horizontal="center", vertical="center")

        for col_num in range(1, len(headers) + 1):
            cell = ws_roster.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align

        sample_c_id = constituencies[0].id if constituencies else 1
        sample_s_id = polling_stations[0].id if polling_stations else 1

        samples = [
            ["Ravi Kumar", "AP/01/001/0101", sample_c_id, sample_s_id, 1, "1995-04-12", "Male", "H.No 4-12, Main Bazar, Guntur", "9876543210", "234567890123"],
            ["Lakshmi Devi", "AP/01/001/0102", sample_c_id, sample_s_id, 2, "1998-09-24", "Female", "Plot 18, Gandhi Nagar, Guntur", "9876543211", "234567890124"],
            ["Suresh Babu", "AP/01/001/0103", sample_c_id, sample_s_id, 3, "1990-11-05", "Male", "Near Old Bus Stand, Guntur", "9876543212", "234567890125"],
        ]
        for row in samples:
            ws_roster.append(row)

        # Set column widths
        widths = [26, 22, 18, 20, 15, 28, 26, 35, 18, 26]
        for idx, width in enumerate(widths, start=1):
            col_letter = openpyxl.utils.get_column_letter(idx)
            ws_roster.column_dimensions[col_letter].width = width

        # Sheet 2: Reference Data
        ws_ref = wb.create_sheet(title="Reference Data")
        ref_headers = ["Constituency ID", "Constituency Name", "Constituency Code", "", "Station ID", "Station Name", "Station Code", "Belongs to Const. ID"]
        ws_ref.append(ref_headers)

        ref_fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
        for col_num in range(1, len(ref_headers) + 1):
            if col_num == 4:
                continue
            cell = ws_ref.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = ref_fill
            cell.alignment = header_align

        max_rows = max(len(constituencies), len(polling_stations))
        for i in range(max_rows):
            c = constituencies[i] if i < len(constituencies) else None
            s = polling_stations[i] if i < len(polling_stations) else None
            ws_ref.append([
                c.id if c else "",
                c.name if c else "",
                c.code if c else "",
                "",
                s.id if s else "",
                s.name if s else "",
                s.code if s else "",
                s.constituencyId if s else "",
            ])

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    @staticmethod
    def parse_excel(
        db: Session,
        file_bytes: bytes,
        default_constituency_id: Optional[int] = None,
        default_polling_station_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            ws = wb.worksheets[0]
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to parse spreadsheet. Please upload a valid .xlsx or .csv file.")

        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="The uploaded sheet is empty or contains no data rows.")

        header_row = [str(cell or "").lower().strip() for cell in rows[0]]
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = "".join(ch for ch in h if ch.isalnum())
            if any(k in h_clean for k in ["fullname", "name", "votername"]):
                col_map["fullName"] = idx
            elif any(k in h_clean for k in ["voterid", "epic", "epicno", "epicnumber", "cardno"]):
                col_map["voterId"] = idx
            elif any(k in h_clean for k in ["constituencyid", "constituency"]):
                col_map["constituencyId"] = idx
            elif any(k in h_clean for k in ["pollingstationid", "stationid", "boothid", "station"]):
                col_map["pollingStationId"] = idx
            elif any(k in h_clean for k in ["serialnumber", "serialno", "slno", "serial"]):
                col_map["serialNumber"] = idx
            elif any(k in h_clean for k in ["dateofbirth", "dob", "birthdate"]):
                col_map["dateOfBirth"] = idx
            elif any(k in h_clean for k in ["gender", "sex"]):
                col_map["gender"] = idx
            elif any(k in h_clean for k in ["address", "residentialaddress"]):
                col_map["address"] = idx
            elif any(k in h_clean for k in ["phone", "mobile", "contact"]):
                col_map["phone"] = idx
            elif any(k in h_clean for k in ["aadhaar", "aadhar", "aadhaarnumber"]):
                col_map["aadhaarNumber"] = idx

        if "fullName" not in col_map or "voterId" not in col_map:
            raise HTTPException(status_code=400, detail='Could not find required columns. Please ensure columns include "Full Name" and "Voter ID".')

        errors = []
        duplicate_voter_ids = []
        seen_voter_ids = set()
        raw_voters = []

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue

            full_name = str(row[col_map["fullName"]] or "").strip() if "fullName" in col_map else ""
            voter_id = str(row[col_map["voterId"]] or "").strip().upper() if "voterId" in col_map else ""

            if not full_name or len(full_name) < 2:
                errors.append(f"Row {r_idx}: Full Name is required (min 2 characters).")
                continue
            if not voter_id or len(voter_id) < 5:
                errors.append(f"Row {r_idx}: Voter ID is required (min 5 characters).")
                continue

            if voter_id in seen_voter_ids:
                duplicate_voter_ids.append(voter_id)
                continue
            seen_voter_ids.add(voter_id)

            raw_cid = row[col_map.get("constituencyId")] if "constituencyId" in col_map else None
            constituency_id = int(raw_cid) if raw_cid is not None and str(raw_cid).isdigit() else default_constituency_id

            raw_sid = row[col_map.get("pollingStationId")] if "pollingStationId" in col_map else None
            station_id = int(raw_sid) if raw_sid is not None and str(raw_sid).isdigit() else default_polling_station_id

            if not constituency_id:
                errors.append(f"Row {r_idx}: Constituency ID is missing.")
                continue
            if not station_id:
                errors.append(f"Row {r_idx}: Polling Station ID is missing.")
                continue

            # Parse DOB
            raw_dob = row[col_map.get("dateOfBirth")] if "dateOfBirth" in col_map else None
            dob = None
            if isinstance(raw_dob, (datetime, date)):
                dob = datetime.combine(raw_dob, datetime.min.time()) if isinstance(raw_dob, date) and not isinstance(raw_dob, datetime) else raw_dob
            elif raw_dob:
                try:
                    dob = datetime.fromisoformat(str(raw_dob).strip().split("T")[0])
                except Exception:
                    dob = datetime(1990, 1, 1)
            else:
                dob = datetime(1990, 1, 1)

            gender = str(row[col_map.get("gender")] or "Male").strip().capitalize()
            if gender not in ["Male", "Female", "Other"]:
                gender = "Male"

            address = str(row[col_map.get("address")] or "").strip()
            if not address or len(address) < 5:
                address = "Registered Address"

            raw_serial = row[col_map.get("serialNumber")] if "serialNumber" in col_map else None
            serial_no = int(raw_serial) if raw_serial is not None and str(raw_serial).isdigit() else len(raw_voters) + 1

            phone = str(row[col_map.get("phone")] or "").strip() if "phone" in col_map else None
            aadhaar = str(row[col_map.get("aadhaarNumber")] or "").strip() if "aadhaarNumber" in col_map else None
            aadhaar_hash = hash_aadhaar(aadhaar) if aadhaar and len(aadhaar) == 12 else None

            raw_voters.append({
                "fullName": full_name,
                "voterId": voter_id,
                "constituencyId": constituency_id,
                "pollingStationId": station_id,
                "serialNumber": serial_no,
                "dateOfBirth": dob,
                "gender": gender,
                "address": address,
                "phone": phone,
                "aadhaarHash": aadhaar_hash,
            })

        # Check existing in DB
        voter_ids = [v["voterId"] for v in raw_voters]
        existing_voters = db.query(Voter.voterId).filter(Voter.voterId.in_(voter_ids), Voter.deletedAt.is_(None)).all()
        existing_set = {v[0].upper() for v in existing_voters}

        valid_voters = [v for v in raw_voters if v["voterId"] not in existing_set]
        skipped_count = len(duplicate_voter_ids) + len(existing_set)

        return {
            "totalRows": len(rows) - 1,
            "validRowsCount": len(raw_voters),
            "importedCount": len(valid_voters),
            "skippedDuplicatesCount": skipped_count,
            "duplicateVoterIds": duplicate_voter_ids + list(existing_set),
            "errors": errors,
            "validVoters": valid_voters,
        }

voter_excel_service = VoterExcelService()
