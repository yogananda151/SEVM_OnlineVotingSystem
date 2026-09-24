import io
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from app.models.location import Constituency
from app.models.party_candidate import PoliticalParty, Candidate

class CandidateExcelService:
    @staticmethod
    def generate_template(db: Session) -> io.BytesIO:
        constituencies = db.query(Constituency).filter(Constituency.deletedAt.is_(None)).order_by(Constituency.id.asc()).all()
        parties = db.query(PoliticalParty).filter(PoliticalParty.deletedAt.is_(None)).order_by(PoliticalParty.id.asc()).all()

        wb = openpyxl.Workbook()
        ws_roster = wb.active
        ws_roster.title = "Candidates"

        headers = [
            "Full Name *", "Age *", "Serial Number", "Qualification",
            "Independent (Yes/No) *", "Party ID (If not Independent)", "Constituency ID *",
        ]
        ws_roster.append(headers)

        header_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="10B981", end_color="10B981", fill_type="solid")
        header_align = Alignment(horizontal="center", vertical="center")

        for col_num in range(1, len(headers) + 1):
            cell = ws_roster.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align

        sample_c_id = constituencies[0].id if constituencies else 1
        sample_p_id = parties[0].id if parties else 1

        samples = [
            ["Jane Doe", 45, 1, "B.A.", "No", sample_p_id, sample_c_id],
            ["John Smith", 50, 2, "M.Sc.", "Yes", "", sample_c_id],
        ]
        for row in samples:
            ws_roster.append(row)

        widths = [26, 10, 15, 25, 22, 26, 18]
        for idx, width in enumerate(widths, start=1):
            col_letter = openpyxl.utils.get_column_letter(idx)
            ws_roster.column_dimensions[col_letter].width = width

        # Reference sheet
        ws_ref = wb.create_sheet(title="Reference Data")
        ref_headers = ["Constituency ID", "Constituency Name", "", "Party ID", "Party Name", "Party Abbr"]
        ws_ref.append(ref_headers)

        ref_fill = PatternFill(start_color="334155", end_color="334155", fill_type="solid")
        for col_num in range(1, len(ref_headers) + 1):
            if col_num == 3:
                continue
            cell = ws_ref.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = ref_fill
            cell.alignment = header_align

        max_rows = max(len(constituencies), len(parties))
        for i in range(max_rows):
            c = constituencies[i] if i < len(constituencies) else None
            p = parties[i] if i < len(parties) else None
            ws_ref.append([
                c.id if c else "",
                c.name if c else "",
                "",
                p.id if p else "",
                p.name if p else "",
                p.abbreviation if p else "",
            ])

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    @staticmethod
    def parse_excel(
        db: Session,
        file_bytes: bytes,
        election_id: int,
        default_constituency_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        try:
            wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
            ws = wb.worksheets[0]
        except Exception:
            raise HTTPException(status_code=400, detail="Failed to parse spreadsheet. Please upload a valid .xlsx file.")

        rows = list(ws.iter_rows(values_only=True))
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="The uploaded sheet is empty or contains no data rows.")

        header_row = [str(cell or "").lower().strip() for cell in rows[0]]
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = "".join(ch for ch in h if ch.isalnum())
            if any(k in h_clean for k in ["fullname", "name", "candidatename"]):
                col_map["fullName"] = idx
            elif any(k in h_clean for k in ["age"]):
                col_map["age"] = idx
            elif any(k in h_clean for k in ["serialnumber", "serialno"]):
                col_map["serialNumber"] = idx
            elif any(k in h_clean for k in ["qualification"]):
                col_map["qualification"] = idx
            elif any(k in h_clean for k in ["independent", "isindependent"]):
                col_map["isIndependent"] = idx
            elif any(k in h_clean for k in ["partyid", "party"]):
                col_map["partyId"] = idx
            elif any(k in h_clean for k in ["constituencyid", "constituency"]):
                col_map["constituencyId"] = idx

        if "fullName" not in col_map:
            raise HTTPException(status_code=400, detail='Could not find "Full Name" column.')

        errors = []
        duplicate_names = []
        seen_names = set()
        raw_candidates = []

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue

            full_name = str(row[col_map["fullName"]] or "").strip()
            if not full_name or len(full_name) < 2:
                errors.append(f"Row {r_idx}: Full Name is required.")
                continue

            raw_cid = row[col_map.get("constituencyId")] if "constituencyId" in col_map else None
            constituency_id = int(raw_cid) if raw_cid is not None and str(raw_cid).isdigit() else default_constituency_id
            if not constituency_id:
                errors.append(f"Row {r_idx}: Constituency ID is missing.")
                continue

            dedup_key = f"{full_name.lower()}-{constituency_id}"
            if dedup_key in seen_names:
                duplicate_names.append(full_name)
                continue
            seen_names.add(dedup_key)

            raw_age = row[col_map.get("age")] if "age" in col_map else None
            age = int(raw_age) if raw_age is not None and str(raw_age).isdigit() else 25

            raw_serial = row[col_map.get("serialNumber")] if "serialNumber" in col_map else None
            serial_no = int(raw_serial) if raw_serial is not None and str(raw_serial).isdigit() else len(raw_candidates) + 1

            indep_str = str(row[col_map.get("isIndependent")] or "").lower().strip() if "isIndependent" in col_map else "no"
            is_independent = indep_str.startswith("y") or indep_str == "true" or indep_str == "1"

            party_id = None
            if not is_independent and "partyId" in col_map:
                raw_pid = row[col_map["partyId"]]
                party_id = int(raw_pid) if raw_pid is not None and str(raw_pid).isdigit() else None

            qualification = str(row[col_map.get("qualification")] or "").strip() if "qualification" in col_map else None

            raw_candidates.append({
                "electionId": election_id,
                "constituencyId": constituency_id,
                "fullName": full_name,
                "age": age,
                "serialNumber": serial_no,
                "qualification": qualification,
                "isIndependent": is_independent,
                "partyId": party_id,
            })

        # Check existing in DB
        existing = db.query(Candidate.fullName, Candidate.constituencyId).filter(
            Candidate.electionId == election_id,
            Candidate.deletedAt.is_(None),
        ).all()
        existing_set = {f"{c[0].lower()}-{c[1]}" for c in existing}

        valid_candidates = []
        for c in raw_candidates:
            if f"{c['fullName'].lower()}-{c['constituencyId']}" in existing_set:
                duplicate_names.append(c["fullName"])
                continue
            valid_candidates.append(c)

        return {
            "totalRows": len(rows) - 1,
            "validRowsCount": len(raw_candidates),
            "importedCount": len(valid_candidates),
            "skippedDuplicatesCount": len(duplicate_names),
            "duplicateCandidateNames": duplicate_names,
            "errors": errors,
            "validCandidates": valid_candidates,
        }

candidate_excel_service = CandidateExcelService()
