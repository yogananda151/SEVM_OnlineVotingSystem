import io
import csv
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

from app.models.location import Region, Constituency, PollingStation
from app.models.party_candidate import PoliticalParty
from app.models.user import User, ElectionOfficer
from app.models.enums import UserRole
from app.utils.crypto import hash_password

def _parse_tabular_bytes(
    file_bytes: bytes,
    preferred_sheet_names: Optional[List[str]] = None,
    required_keywords: Optional[List[str]] = None,
    specific_sheet_name: Optional[str] = None,
) -> List[List[Any]]:
    """Tries parsing file as .xlsx with smart sheet detection, falls back to .csv if needed."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        target_ws = None

        # 1. Match specific requested sheet name
        if specific_sheet_name:
            for sname in wb.sheetnames:
                if sname.strip().lower() == specific_sheet_name.strip().lower():
                    target_ws = wb[sname]
                    break

        # 2. Match by preferred sheet name keyword
        if not target_ws and preferred_sheet_names:
            for p in preferred_sheet_names:
                for sname in wb.sheetnames:
                    if p.lower() in sname.strip().lower():
                        target_ws = wb[sname]
                        break
                if target_ws:
                    break

        # 3. Match by required keywords present in header row
        if not target_ws and required_keywords:
            for ws in wb.worksheets:
                first_row_cells = next(ws.iter_rows(max_row=1, values_only=True), [])
                first_row_str = " ".join([str(c or "").lower() for c in first_row_cells])
                if all(kw.lower() in first_row_str for kw in required_keywords):
                    target_ws = ws
                    break

        # 4. Fallback to active or first sheet
        if not target_ws:
            target_ws = wb.active or wb.worksheets[0]

        return list(target_ws.iter_rows(values_only=True))
    except Exception:
        pass

    # Try CSV
    try:
        text = file_bytes.decode("utf-8-sig", errors="replace")
        reader = csv.reader(io.StringIO(text))
        return list(reader)
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Failed to parse spreadsheet. Please upload a valid .xlsx or .csv file.",
        )

def _inspect_workbook_sheets(file_bytes: bytes) -> List[str]:
    """Returns list of worksheet names from an Excel file, or empty list if not Excel."""
    try:
        wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
        return list(wb.sheetnames)
    except Exception:
        return []

def _style_worksheet(ws, headers: List[str], samples: List[List[Any]], widths: List[int], fill_color: str = "10B981"):
    ws.append(headers)
    h_font = Font(name="Arial", size=11, bold=True, color="FFFFFF")
    h_fill = PatternFill(start_color=fill_color, end_color=fill_color, fill_type="solid")
    h_align = Alignment(horizontal="center", vertical="center")

    for col_idx in range(1, len(headers) + 1):
        c = ws.cell(row=1, column=col_idx)
        c.font = h_font
        c.fill = h_fill
        c.alignment = h_align

    for s in samples:
        ws.append(s)

    for idx, width in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(idx)].width = width

class BulkExcelService:
    # ── HIERARCHY MASTER TEMPLATE ───────────────────────────────────────────────
    @staticmethod
    def generate_hierarchy_template() -> io.BytesIO:
        """Generates a complete 3-tab workbook: Regions, Constituencies, and Polling Stations in logical input order."""
        wb = openpyxl.Workbook()

        # Sheet 1: Regions
        ws1 = wb.active
        ws1.title = "Regions"
        r_headers = ["Region Code *", "Region Name *", "Description"]
        r_samples = [
            ["AP-KDP", "YSR Kadapa Region", "Central Rayalaseema district in Andhra Pradesh"],
            ["AP-KRN", "Kurnool Region", "Northern Rayalaseema gateway in Andhra Pradesh"],
            ["AP-TPT", "Tirupati Region", "Pilgrimage and cultural hub in Andhra Pradesh"],
        ]
        _style_worksheet(ws1, r_headers, r_samples, [18, 30, 45], fill_color="10B981")

        # Sheet 2: Constituencies
        ws2 = wb.create_sheet(title="Constituencies")
        c_headers = ["Constituency Code *", "Constituency Name *", "Region Code *", "Region Name", "Description"]
        c_samples = [
            ["KDP-01", "Kadapa", "AP-KDP", "YSR Kadapa Region", "District headquarters assembly constituency"],
            ["BDV-01", "Badvel", "AP-KDP", "YSR Kadapa Region", "Prominent assembly constituency in eastern Kadapa"],
            ["KRN-01", "Kurnool", "AP-KRN", "Kurnool Region", "Historical capital city assembly constituency"],
            ["TPT-01", "Tirupati", "AP-TPT", "Tirupati Region", "Temple city urban assembly constituency"],
        ]
        _style_worksheet(ws2, c_headers, c_samples, [20, 26, 18, 26, 45], fill_color="0284C7")

        # Sheet 3: Polling Stations
        ws3 = wb.create_sheet(title="Polling Stations")
        ps_headers = ["Station Code *", "Polling Station Name *", "Constituency Code *", "Constituency Name", "Region Code", "Address / Location *", "Total Booths", "Voter Capacity"]
        ps_samples = [
            ["PS-KDP-001", "Municipal High School, Nagarajupalli", "KDP-01", "Kadapa", "AP-KDP", "Nagarajupalli, Kadapa - 516001", 2, 1200],
            ["PS-KDP-002", "Govt Junior College for Men, RIMS Road", "KDP-01", "Kadapa", "AP-KDP", "RIMS Road, Kadapa - 516002", 1, 1000],
            ["PS-KRN-001", "Govt Model Higher Secondary School, B-Camp", "KRN-01", "Kurnool", "AP-KRN", "B-Camp, Kurnool - 518002", 2, 1300],
            ["PS-TPT-001", "Sri Venkateswara Junior College, Balaji Colony", "TPT-01", "Tirupati", "AP-TPT", "Balaji Colony, Tirupati - 517502", 2, 1300],
        ]
        _style_worksheet(ws3, ps_headers, ps_samples, [18, 38, 20, 22, 16, 36, 14, 16], fill_color="8B5CF6")

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    # ── REGIONS ─────────────────────────────────────────────────────────────
    @staticmethod
    def generate_regions_template() -> io.BytesIO:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Regions"

        headers = ["Region Code *", "Region Name *", "Description"]
        samples = [
            ["AP-KDP", "YSR Kadapa Region", "Central Rayalaseema district in Andhra Pradesh"],
            ["AP-KRN", "Kurnool Region", "Northern Rayalaseema gateway in Andhra Pradesh"],
            ["AP-TPT", "Tirupati Region", "Pilgrimage and cultural hub in Andhra Pradesh"],
        ]
        widths = [18, 30, 45]
        _style_worksheet(ws, headers, samples, widths, fill_color="10B981")

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    @staticmethod
    def parse_and_import_regions(db: Session, file_bytes: bytes) -> Dict[str, Any]:
        rows = _parse_tabular_bytes(file_bytes, preferred_sheet_names=["region"])
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="The uploaded sheet is empty or contains no data rows.")

        header_row = [str(cell or "").lower().strip() for cell in rows[0]]
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = "".join(ch for ch in h if ch.isalnum())
            if "regioncode" in h_clean or (h_clean == "code" and "code" not in col_map):
                col_map["code"] = idx
            elif "regionname" in h_clean or (h_clean == "name" and "name" not in col_map):
                col_map["name"] = idx
            elif any(k in h_clean for k in ["description", "desc", "districtscovered", "hqcity", "notes"]):
                if "description" not in col_map:
                    col_map["description"] = idx

        if "name" not in col_map or "code" not in col_map:
            raise HTTPException(status_code=400, detail='Missing required columns: "Region Name" and "Region Code".')

        existing_regions = db.query(Region).filter(Region.deletedAt.is_(None)).all()
        existing_names = {r.name.strip().lower() for r in existing_regions}
        existing_codes = {r.code.strip().lower() for r in existing_regions}

        valid_items = []
        errors = []
        duplicates = []
        seen_names = set()
        seen_codes = set()

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue
            name = str(row[col_map["name"]] or "").strip()
            code = str(row[col_map["code"]] or "").strip()
            desc = str(row[col_map.get("description")] or "").strip() if "description" in col_map and row[col_map["description"]] else None

            if not name or len(name) < 2:
                errors.append(f"Row {r_idx}: Region Name must be at least 2 characters.")
                continue
            if not code or len(code) < 2:
                errors.append(f"Row {r_idx}: Region Code must be at least 2 characters.")
                continue

            n_low = name.lower()
            c_low = code.lower()
            if n_low in existing_names or n_low in seen_names:
                duplicates.append(f"{name} (Duplicate name)")
                continue
            if c_low in existing_codes or c_low in seen_codes:
                duplicates.append(f"{code} (Duplicate code)")
                continue

            seen_names.add(n_low)
            seen_codes.add(c_low)
            valid_items.append({"name": name, "code": code, "description": desc})

        # Insert valid items
        for item in valid_items:
            db.add(Region(name=item["name"], code=item["code"], description=item["description"]))
        db.commit()

        return {
            "totalRows": len(rows) - 1,
            "importedCount": len(valid_items),
            "skippedDuplicatesCount": len(duplicates),
            "duplicates": duplicates,
            "errors": errors,
        }

    # ── CONSTITUENCIES ──────────────────────────────────────────────────────────
    @staticmethod
    def generate_constituencies_template(db: Session) -> io.BytesIO:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Constituencies"

        headers = ["Constituency Code *", "Constituency Name *", "Region Code *", "Region Name", "Description"]
        regions = db.query(Region).filter(Region.deletedAt.is_(None)).order_by(Region.id.asc()).all()
        sample_reg = regions[0].code if regions else "AP-KDP"
        sample_reg_name = regions[0].name if regions else "YSR Kadapa Region"

        samples = [
            ["KDP-01", "Kadapa", sample_reg, sample_reg_name, "District headquarters assembly segment"],
            ["BDV-01", "Badvel", sample_reg, sample_reg_name, "Assembly segment in eastern region"],
        ]
        widths = [20, 28, 18, 28, 45]
        _style_worksheet(ws, headers, samples, widths, fill_color="10B981")

        # Reference Sheet: Available Regions
        ws_ref = wb.create_sheet(title="Available Regions")
        ref_headers = ["Region ID", "Region Code", "Region Name"]
        _style_worksheet(ws_ref, ref_headers, [], [12, 18, 30], fill_color="334155")
        for r in regions:
            ws_ref.append([r.id, r.code, r.name])

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    @staticmethod
    def parse_and_import_constituencies(db: Session, file_bytes: bytes, default_region_id: Optional[int] = None) -> Dict[str, Any]:
        # If the file contains a Regions sheet and regions are empty, import regions first!
        sheets = _inspect_workbook_sheets(file_bytes)
        if any("region" in s.lower() for s in sheets):
            try:
                BulkExcelService.parse_and_import_regions(db, file_bytes)
            except Exception:
                pass

        rows = _parse_tabular_bytes(file_bytes, preferred_sheet_names=["constituenc", "assembly"])
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="The uploaded sheet is empty or contains no data rows.")

        header_row = [str(cell or "").lower().strip() for cell in rows[0]]
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = "".join(ch for ch in h if ch.isalnum())
            if "regioncode" in h_clean or "regionid" in h_clean:
                col_map["regionCode"] = idx
            elif "regionname" in h_clean:
                col_map["regionName"] = idx
            elif h_clean == "region":
                col_map["region"] = idx
            elif "constituencycode" in h_clean or (h_clean == "code" and "code" not in col_map):
                col_map["code"] = idx
            elif "constituencyname" in h_clean or (h_clean == "name" and "name" not in col_map):
                col_map["name"] = idx
            elif any(k in h_clean for k in ["description", "desc", "category"]):
                if "description" not in col_map:
                    col_map["description"] = idx

        if "name" not in col_map or "code" not in col_map:
            raise HTTPException(status_code=400, detail='Missing required columns: "Constituency Name" and "Constituency Code".')

        regions = db.query(Region).filter(Region.deletedAt.is_(None)).all()
        reg_by_id = {r.id: r for r in regions}
        reg_by_code = {r.code.strip().lower(): r for r in regions}
        reg_by_name = {r.name.strip().lower(): r for r in regions}

        existing_cons = db.query(Constituency).filter(Constituency.deletedAt.is_(None)).all()
        existing_codes = {c.code.strip().lower() for c in existing_cons}

        valid_items = []
        errors = []
        duplicates = []
        seen_codes = set()

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue
            name = str(row[col_map["name"]] or "").strip()
            code = str(row[col_map["code"]] or "").strip()
            desc = str(row[col_map.get("description")] or "").strip() if "description" in col_map and row[col_map["description"]] else None

            if not name or len(name) < 2:
                errors.append(f"Row {r_idx}: Constituency Name must be at least 2 characters.")
                continue
            if not code or len(code) < 2:
                errors.append(f"Row {r_idx}: Constituency Code must be at least 2 characters.")
                continue

            # Determine region
            target_reg = None
            if "regionCode" in col_map and row[col_map["regionCode"]]:
                rc = str(row[col_map["regionCode"]]).strip().lower()
                if rc in reg_by_code:
                    target_reg = reg_by_code[rc]

            if not target_reg and "regionName" in col_map and row[col_map["regionName"]]:
                rn = str(row[col_map["regionName"]]).strip().lower()
                if rn in reg_by_name:
                    target_reg = reg_by_name[rn]
                else:
                    for r_obj in regions:
                        if rn in r_obj.name.lower() or r_obj.name.lower() in rn:
                            target_reg = r_obj
                            break

            if not target_reg and "region" in col_map and row[col_map["region"]]:
                raw_val = str(row[col_map["region"]]).strip()
                if raw_val.isdigit() and int(raw_val) in reg_by_id:
                    target_reg = reg_by_id[int(raw_val)]
                elif raw_val.lower() in reg_by_code:
                    target_reg = reg_by_code[raw_val.lower()]
                elif raw_val.lower() in reg_by_name:
                    target_reg = reg_by_name[raw_val.lower()]

            if not target_reg and default_region_id and default_region_id in reg_by_id:
                target_reg = reg_by_id[default_region_id]

            # Auto-create Region if missing from DB but present in row
            if not target_reg:
                rc_val = str(row[col_map["regionCode"]]).strip() if "regionCode" in col_map and row[col_map["regionCode"]] else ""
                rn_val = str(row[col_map["regionName"]]).strip() if "regionName" in col_map and row[col_map["regionName"]] else ""
                if not rc_val and "region" in col_map and row[col_map["region"]]:
                    rc_val = str(row[col_map["region"]]).strip()

                if rc_val or rn_val:
                    new_code = rc_val or (rn_val[:6].upper() if len(rn_val) >= 2 else "REG")
                    new_name = rn_val or f"Region {new_code}"
                    target_reg = Region(name=new_name, code=new_code, description="Auto-created during bulk import")
                    db.add(target_reg)
                    db.flush()
                    regions.append(target_reg)
                    reg_by_id[target_reg.id] = target_reg
                    reg_by_code[target_reg.code.lower()] = target_reg
                    reg_by_name[target_reg.name.lower()] = target_reg

            if not target_reg:
                errors.append(f"Row {r_idx}: Valid Region ID, Code, or Name is required.")
                continue

            c_low = code.lower()
            if c_low in existing_codes or c_low in seen_codes:
                duplicates.append(f"{code} (Duplicate code)")
                continue

            seen_codes.add(c_low)
            valid_items.append({
                "regionId": target_reg.id,
                "name": name,
                "code": code,
                "description": desc,
            })

        for item in valid_items:
            db.add(Constituency(
                regionId=item["regionId"],
                name=item["name"],
                code=item["code"],
                description=item["description"],
            ))
        db.commit()

        return {
            "totalRows": len(rows) - 1,
            "importedCount": len(valid_items),
            "skippedDuplicatesCount": len(duplicates),
            "duplicates": duplicates,
            "errors": errors,
        }

    # ── POLLING STATIONS ────────────────────────────────────────────────────────
    @staticmethod
    def generate_polling_stations_template(db: Session) -> io.BytesIO:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Polling Stations"

        headers = ["Station Code *", "Polling Station Name *", "Constituency Code *", "Constituency Name", "Region Code", "Address / Location *", "Total Booths", "Voter Capacity"]
        constituencies = db.query(Constituency).filter(Constituency.deletedAt.is_(None)).order_by(Constituency.id.asc()).all()
        sample_con = constituencies[0].code if constituencies else "KDP-01"
        sample_con_name = constituencies[0].name if constituencies else "Kadapa"
        sample_reg = constituencies[0].region.code if constituencies and constituencies[0].region else "AP-KDP"

        samples = [
            ["PS-KDP-001", "Municipal High School, Nagarajupalli", sample_con, sample_con_name, sample_reg, "Nagarajupalli, Kadapa - 516001", 2, 1200],
            ["PS-KDP-002", "Govt Junior College for Men, RIMS Road", sample_con, sample_con_name, sample_reg, "RIMS Road, Kadapa - 516002", 1, 1000],
        ]
        widths = [18, 38, 20, 22, 16, 36, 14, 16]
        _style_worksheet(ws, headers, samples, widths, fill_color="10B981")

        # Reference Sheet: Available Constituencies
        ws_ref = wb.create_sheet(title="Available Constituencies")
        ref_headers = ["Constituency ID", "Constituency Code", "Constituency Name", "Region Code"]
        _style_worksheet(ws_ref, ref_headers, [], [16, 20, 28, 16], fill_color="334155")
        for c in constituencies:
            ws_ref.append([c.id, c.code, c.name, c.region.code if c.region else ""])

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    @staticmethod
    def parse_and_import_polling_stations(db: Session, file_bytes: bytes, default_constituency_id: Optional[int] = None) -> Dict[str, Any]:
        # If the file contains parent sheets (Regions, Constituencies), ensure they are imported first!
        sheets = _inspect_workbook_sheets(file_bytes)
        if any("region" in s.lower() for s in sheets):
            try:
                BulkExcelService.parse_and_import_regions(db, file_bytes)
            except Exception:
                pass
        if any("constituenc" in s.lower() for s in sheets):
            try:
                BulkExcelService.parse_and_import_constituencies(db, file_bytes)
            except Exception:
                pass

        rows = _parse_tabular_bytes(file_bytes, preferred_sheet_names=["polling", "station"])
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="The uploaded sheet is empty or contains no data rows.")

        header_row = [str(cell or "").lower().strip() for cell in rows[0]]
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = "".join(ch for ch in h if ch.isalnum())
            if "constituencycode" in h_clean or "constituencyid" in h_clean:
                col_map["constituencyCode"] = idx
            elif "constituencyname" in h_clean:
                col_map["constituencyName"] = idx
            elif h_clean == "constituency":
                col_map["constituency"] = idx
            elif "regioncode" in h_clean or "regionid" in h_clean:
                col_map["regionCode"] = idx
            elif "regionname" in h_clean:
                col_map["regionName"] = idx
            elif "stationcode" in h_clean or (h_clean == "code" and "code" not in col_map):
                col_map["code"] = idx
            elif any(k in h_clean for k in ["pollingstationname", "stationname"]) or (h_clean == "name" and "name" not in col_map):
                col_map["name"] = idx
            elif any(k in h_clean for k in ["address", "location"]):
                col_map["address"] = idx
            elif "capacity" in h_clean or "votercapacity" in h_clean:
                col_map["capacity"] = idx
            elif any(k in h_clean for k in ["booths", "totalbooths"]):
                col_map["totalBooths"] = idx

        if "name" not in col_map or "code" not in col_map:
            raise HTTPException(status_code=400, detail='Missing required columns: "Polling Station Name" and "Station Code".')

        constituencies = db.query(Constituency).filter(Constituency.deletedAt.is_(None)).all()
        con_by_id = {c.id: c for c in constituencies}
        con_by_code = {c.code.strip().lower(): c for c in constituencies}
        con_by_name = {c.name.strip().lower(): c for c in constituencies}

        existing_stations = db.query(PollingStation).filter(PollingStation.deletedAt.is_(None)).all()
        existing_codes = {ps.code.strip().lower() for ps in existing_stations}

        valid_items = []
        errors = []
        duplicates = []
        seen_codes = set()

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue
            name = str(row[col_map["name"]] or "").strip()
            code = str(row[col_map["code"]] or "").strip()
            addr = str(row[col_map.get("address")] or "").strip() if "address" in col_map and row[col_map["address"]] else "Main Street"

            if not name or len(name) < 2:
                errors.append(f"Row {r_idx}: Polling Station Name must be at least 2 characters.")
                continue
            if not code or len(code) < 2:
                errors.append(f"Row {r_idx}: Station Code must be at least 2 characters.")
                continue

            target_con = None
            if "constituencyCode" in col_map and row[col_map["constituencyCode"]]:
                cc = str(row[col_map["constituencyCode"]]).strip().lower()
                if cc in con_by_code:
                    target_con = con_by_code[cc]

            if not target_con and "constituencyName" in col_map and row[col_map["constituencyName"]]:
                cn = str(row[col_map["constituencyName"]]).strip().lower()
                if cn in con_by_name:
                    target_con = con_by_name[cn]
                else:
                    for c_obj in constituencies:
                        if cn in c_obj.name.lower() or c_obj.name.lower() in cn:
                            target_con = c_obj
                            break

            if not target_con and "constituency" in col_map and row[col_map["constituency"]]:
                raw_con = str(row[col_map["constituency"]]).strip()
                if raw_con.isdigit() and int(raw_con) in con_by_id:
                    target_con = con_by_id[int(raw_con)]
                elif raw_con.lower() in con_by_code:
                    target_con = con_by_code[raw_con.lower()]
                elif raw_con.lower() in con_by_name:
                    target_con = con_by_name[raw_con.lower()]

            if not target_con and default_constituency_id and default_constituency_id in con_by_id:
                target_con = con_by_id[default_constituency_id]

            # Auto-create Constituency if code or name provided in row
            if not target_con:
                cc_val = str(row[col_map["constituencyCode"]]).strip() if "constituencyCode" in col_map and row[col_map["constituencyCode"]] else ""
                cn_val = str(row[col_map["constituencyName"]]).strip() if "constituencyName" in col_map and row[col_map["constituencyName"]] else ""
                if not cc_val and "constituency" in col_map and row[col_map["constituency"]]:
                    cc_val = str(row[col_map["constituency"]]).strip()

                if cc_val or cn_val:
                    # Find or auto-create region
                    reg_obj = None
                    if "regionCode" in col_map and row[col_map["regionCode"]]:
                        rc = str(row[col_map["regionCode"]]).strip().lower()
                        reg_obj = db.query(Region).filter(Region.code.ilike(rc), Region.deletedAt.is_(None)).first()
                    if not reg_obj and "regionName" in col_map and row[col_map["regionName"]]:
                        rn = str(row[col_map["regionName"]]).strip().lower()
                        reg_obj = db.query(Region).filter(Region.name.ilike(rn), Region.deletedAt.is_(None)).first()
                    if not reg_obj:
                        reg_obj = db.query(Region).filter(Region.deletedAt.is_(None)).first()
                    if not reg_obj:
                        reg_obj = Region(name="Default Region", code="DEF-REG")
                        db.add(reg_obj)
                        db.flush()

                    final_con_code = cc_val or (cn_val[:6].upper() if len(cn_val) >= 2 else "CON")
                    final_con_name = cn_val or f"Constituency {final_con_code}"
                    target_con = Constituency(regionId=reg_obj.id, name=final_con_name, code=final_con_code)
                    db.add(target_con)
                    db.flush()
                    constituencies.append(target_con)
                    con_by_id[target_con.id] = target_con
                    con_by_code[target_con.code.lower()] = target_con
                    con_by_name[target_con.name.lower()] = target_con

            if not target_con:
                errors.append(f"Row {r_idx}: Valid Constituency ID, Code, or Name is required.")
                continue

            c_low = code.lower()
            if c_low in existing_codes or c_low in seen_codes:
                duplicates.append(f"{code} (Duplicate code)")
                continue

            # Capacity & Booths
            cap = 1000
            if "capacity" in col_map and row[col_map["capacity"]]:
                try: cap = int(row[col_map["capacity"]])
                except Exception: pass

            booths = 1
            if "totalBooths" in col_map and row[col_map["totalBooths"]]:
                try: booths = int(row[col_map["totalBooths"]])
                except Exception: pass

            seen_codes.add(c_low)
            valid_items.append({
                "constituencyId": target_con.id,
                "name": name,
                "code": code,
                "address": addr,
                "capacity": cap,
                "totalBooths": booths,
            })

        for item in valid_items:
            db.add(PollingStation(
                constituencyId=item["constituencyId"],
                name=item["name"],
                code=item["code"],
                address=item["address"],
                capacity=item["capacity"],
                totalBooths=item["totalBooths"],
            ))
        db.commit()

        return {
            "totalRows": len(rows) - 1,
            "importedCount": len(valid_items),
            "skippedDuplicatesCount": len(duplicates),
            "duplicates": duplicates,
            "errors": errors,
        }

    # ── COMPLETE HIERARCHY IMPORT ───────────────────────────────────────────────
    @staticmethod
    def parse_and_import_hierarchy(db: Session, file_bytes: bytes) -> Dict[str, Any]:
        """Imports all 3 levels (Regions, Constituencies, Polling Stations) from a single master workbook in logical input order."""
        sheets = _inspect_workbook_sheets(file_bytes)
        results = {}

        # 1. Regions
        r_result = {"importedCount": 0, "skippedDuplicatesCount": 0, "errors": []}
        if any("region" in s.lower() for s in sheets) or len(sheets) == 0:
            try:
                r_result = BulkExcelService.parse_and_import_regions(db, file_bytes)
            except Exception as e:
                r_result["errors"] = [str(e)]
        results["regions"] = r_result

        # 2. Constituencies
        c_result = {"importedCount": 0, "skippedDuplicatesCount": 0, "errors": []}
        if any("constituenc" in s.lower() for s in sheets) or len(sheets) == 0:
            try:
                c_result = BulkExcelService.parse_and_import_constituencies(db, file_bytes)
            except Exception as e:
                c_result["errors"] = [str(e)]
        results["constituencies"] = c_result

        # 3. Polling Stations
        ps_result = {"importedCount": 0, "skippedDuplicatesCount": 0, "errors": []}
        if any("polling" in s.lower() or "station" in s.lower() for s in sheets) or len(sheets) == 0:
            try:
                ps_result = BulkExcelService.parse_and_import_polling_stations(db, file_bytes)
            except Exception as e:
                ps_result["errors"] = [str(e)]
        results["pollingStations"] = ps_result

        total_imported = r_result.get("importedCount", 0) + c_result.get("importedCount", 0) + ps_result.get("importedCount", 0)
        total_dups = r_result.get("skippedDuplicatesCount", 0) + c_result.get("skippedDuplicatesCount", 0) + ps_result.get("skippedDuplicatesCount", 0)
        all_errors = r_result.get("errors", []) + c_result.get("errors", []) + ps_result.get("errors", [])

        return {
            "hierarchyImported": True,
            "totalImported": total_imported,
            "importedCount": total_imported,
            "skippedDuplicatesCount": total_dups,
            "errors": all_errors,
            "regions": r_result,
            "constituencies": c_result,
            "pollingStations": ps_result,
            "message": f"Hierarchy imported: {r_result.get('importedCount', 0)} regions, {c_result.get('importedCount', 0)} constituencies, {ps_result.get('importedCount', 0)} polling stations.",
        }

    # ── PARTIES ─────────────────────────────────────────────────────────────────
    @staticmethod
    def generate_parties_template() -> io.BytesIO:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Political Parties"

        headers = ["Party Name *", "Abbreviation *", "Symbol Name", "Color (Hex)", "Founded Year"]
        samples = [
            ["Telugu Desam Party", "TDP", "Bicycle", "#F4C430", 1982],
            ["YSR Congress Party", "YSRCP", "Ceiling Fan", "#1560BD", 2011],
            ["Jana Sena Party", "JSP", "Glass Tumbler", "#C41E3A", 2014],
        ]
        widths = [30, 18, 20, 15, 15]
        _style_worksheet(ws, headers, samples, widths, fill_color="10B981")

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    @staticmethod
    def parse_and_import_parties(db: Session, file_bytes: bytes) -> Dict[str, Any]:
        rows = _parse_tabular_bytes(file_bytes)
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="The uploaded sheet is empty or contains no data rows.")

        header_row = [str(cell or "").lower().strip() for cell in rows[0]]
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = "".join(ch for ch in h if ch.isalnum())
            if any(k in h_clean for k in ["partyname", "name"]):
                col_map["name"] = idx
            elif any(k in h_clean for k in ["abbreviation", "abbr", "code"]):
                col_map["abbr"] = idx
            elif any(k in h_clean for k in ["symbol", "symbolname"]):
                col_map["symbol"] = idx
            elif "color" in h_clean:
                col_map["color"] = idx
            elif "founded" in h_clean or "year" in h_clean:
                col_map["year"] = idx

        if "name" not in col_map or "abbr" not in col_map:
            raise HTTPException(status_code=400, detail='Missing required columns: "Party Name" and "Abbreviation".')

        existing_parties = db.query(PoliticalParty).filter(PoliticalParty.deletedAt.is_(None)).all()
        existing_names = {p.name.strip().lower() for p in existing_parties}
        existing_abbrs = {p.abbreviation.strip().lower() for p in existing_parties}

        valid_items = []
        errors = []
        duplicates = []
        seen_names = set()
        seen_abbrs = set()

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue
            name = str(row[col_map["name"]] or "").strip()
            abbr = str(row[col_map["abbr"]] or "").strip().upper()
            sym = str(row[col_map.get("symbol")] or "").strip() if "symbol" in col_map and row[col_map["symbol"]] else None
            color = str(row[col_map.get("color")] or "").strip() if "color" in col_map and row[col_map["color"]] else "#1a73e8"
            if not color.startswith("#"):
                color = f"#{color}"

            year = None
            if "year" in col_map and row[col_map["year"]]:
                try: year = int(row[col_map["year"]])
                except Exception: pass

            if not name or len(name) < 2:
                errors.append(f"Row {r_idx}: Party Name must be at least 2 characters.")
                continue
            if not abbr or len(abbr) < 2:
                errors.append(f"Row {r_idx}: Abbreviation must be at least 2 characters.")
                continue

            n_low = name.lower()
            a_low = abbr.lower()
            if n_low in existing_names or n_low in seen_names:
                duplicates.append(f"{name} (Duplicate name)")
                continue
            if a_low in existing_abbrs or a_low in seen_abbrs:
                duplicates.append(f"{abbr} (Duplicate abbreviation)")
                continue

            seen_names.add(n_low)
            seen_abbrs.add(a_low)
            valid_items.append({
                "name": name,
                "abbreviation": abbr,
                "symbol": sym,
                "color": color,
                "foundedYear": year,
            })

        for item in valid_items:
            db.add(PoliticalParty(
                name=item["name"],
                abbreviation=item["abbreviation"],
                symbol=item["symbol"],
                color=item["color"],
                foundedYear=item["foundedYear"],
            ))
        db.commit()

        return {
            "totalRows": len(rows) - 1,
            "importedCount": len(valid_items),
            "skippedDuplicatesCount": len(duplicates),
            "duplicates": duplicates,
            "errors": errors,
        }

    # ── ELECTION OFFICERS ───────────────────────────────────────────────────────
    @staticmethod
    def generate_officers_template(db: Session) -> io.BytesIO:
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Officers"

        headers = ["Full Name *", "Email *", "Password *", "Employee ID *", "Phone", "Polling Station ID or Code"]
        stations = db.query(PollingStation).filter(PollingStation.deletedAt.is_(None)).order_by(PollingStation.id.asc()).all()
        sample_ps = stations[0].code if stations else "PS-KDP-001"

        samples = [
            ["Rajesh Kumar", "rajesh.officer@evm.gov.in", "Officer@12345", "EO-AP-001", "+91-9876543210", sample_ps],
            ["Suresh Reddy", "suresh.officer@evm.gov.in", "Officer@12345", "EO-AP-002", "+91-9876543211", sample_ps],
        ]
        widths = [26, 30, 18, 18, 18, 28]
        _style_worksheet(ws, headers, samples, widths, fill_color="10B981")

        # Reference Sheet: Available Polling Stations
        ws_ref = wb.create_sheet(title="Available Stations")
        ref_headers = ["Station ID", "Station Code", "Station Name", "Constituency ID"]
        _style_worksheet(ws_ref, ref_headers, [], [14, 18, 30, 16], fill_color="334155")
        for ps in stations:
            ws_ref.append([ps.id, ps.code, ps.name, ps.constituencyId])

        stream = io.BytesIO()
        wb.save(stream)
        stream.seek(0)
        return stream

    @staticmethod
    def parse_and_import_officers(db: Session, file_bytes: bytes) -> Dict[str, Any]:
        rows = _parse_tabular_bytes(file_bytes)
        if len(rows) < 2:
            raise HTTPException(status_code=400, detail="The uploaded sheet is empty or contains no data rows.")

        header_row = [str(cell or "").lower().strip() for cell in rows[0]]
        col_map = {}
        for idx, h in enumerate(header_row):
            h_clean = "".join(ch for ch in h if ch.isalnum())
            if any(k in h_clean for k in ["fullname", "name", "officername"]):
                col_map["name"] = idx
            elif any(k in h_clean for k in ["email", "emailaddress"]):
                col_map["email"] = idx
            elif "password" in h_clean or "pwd" in h_clean:
                col_map["password"] = idx
            elif any(k in h_clean for k in ["employeeid", "empid", "officerid"]):
                col_map["employeeId"] = idx
            elif any(k in h_clean for k in ["phone", "mobile", "contact"]):
                col_map["phone"] = idx
            elif any(k in h_clean for k in ["pollingstation", "stationid", "stationcode", "station"]):
                col_map["station"] = idx

        if "name" not in col_map or "email" not in col_map or "employeeId" not in col_map:
            raise HTTPException(status_code=400, detail='Missing required columns: "Full Name", "Email", and "Employee ID".')

        stations = db.query(PollingStation).filter(PollingStation.deletedAt.is_(None)).all()
        ps_by_id = {ps.id: ps for ps in stations}
        ps_by_code = {ps.code.strip().lower(): ps for ps in stations}

        existing_users = db.query(User).filter(User.deletedAt.is_(None)).all()
        existing_emails = {u.email.strip().lower() for u in existing_users}

        existing_officers = db.query(ElectionOfficer).filter(ElectionOfficer.deletedAt.is_(None)).all()
        existing_emp_ids = {o.employeeId.strip().lower() for o in existing_officers}

        valid_items = []
        errors = []
        duplicates = []
        seen_emails = set()
        seen_emp_ids = set()

        for r_idx, row in enumerate(rows[1:], start=2):
            if not any(row):
                continue
            name = str(row[col_map["name"]] or "").strip()
            email = str(row[col_map["email"]] or "").strip().lower()
            emp_id = str(row[col_map["employeeId"]] or "").strip()
            pwd = str(row[col_map.get("password")] or "").strip() if "password" in col_map and row[col_map["password"]] else "Officer@12345"
            phone = str(row[col_map.get("phone")] or "").strip() if "phone" in col_map and row[col_map["phone"]] else "+91-9000000000"

            if not name or len(name) < 2:
                errors.append(f"Row {r_idx}: Full Name is required.")
                continue
            if not email or "@" not in email:
                errors.append(f"Row {r_idx}: A valid email address is required.")
                continue
            if not emp_id or len(emp_id) < 2:
                errors.append(f"Row {r_idx}: Employee ID is required.")
                continue

            if email in existing_emails or email in seen_emails:
                duplicates.append(f"{email} (Duplicate email)")
                continue
            if emp_id.lower() in existing_emp_ids or emp_id.lower() in seen_emp_ids:
                duplicates.append(f"{emp_id} (Duplicate Employee ID)")
                continue

            # Station assignment (optional)
            raw_ps = str(row[col_map["station"]] or "").strip() if "station" in col_map else ""
            station_id = None
            if raw_ps:
                if raw_ps.isdigit() and int(raw_ps) in ps_by_id:
                    station_id = int(raw_ps)
                elif raw_ps.lower() in ps_by_code:
                    station_id = ps_by_code[raw_ps.lower()].id

            seen_emails.add(email)
            seen_emp_ids.add(emp_id.lower())

            valid_items.append({
                "fullName": name,
                "email": email,
                "password": pwd,
                "employeeId": emp_id,
                "phone": phone,
                "pollingStationId": station_id,
            })

        for item in valid_items:
            u = User(
                email=item["email"],
                passwordHash=hash_password(item["password"]),
                role=UserRole.OFFICER,
            )
            db.add(u)
            db.flush()

            eo = ElectionOfficer(
                userId=u.id,
                fullName=item["fullName"],
                employeeId=item["employeeId"],
                phone=item["phone"],
                pollingStationId=item["pollingStationId"],
            )
            db.add(eo)

        db.commit()

        return {
            "totalRows": len(rows) - 1,
            "importedCount": len(valid_items),
            "skippedDuplicatesCount": len(duplicates),
            "duplicates": duplicates,
            "errors": errors,
        }

bulk_excel_service = BulkExcelService()
