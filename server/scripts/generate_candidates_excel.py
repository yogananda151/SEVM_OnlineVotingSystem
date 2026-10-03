import os
import sys
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.location import Constituency
from app.models.party_candidate import PoliticalParty
from app.services.candidate_excel_service import candidate_excel_service

def generate_candidates_excel():
    db = SessionLocal()
    try:
        constituencies = db.query(Constituency).filter(Constituency.deletedAt.is_(None)).order_by(Constituency.id.asc()).all()
        parties = db.query(PoliticalParty).filter(PoliticalParty.deletedAt.is_(None)).order_by(PoliticalParty.id.asc()).all()

        con_map = {c.name.strip().lower(): c for c in constituencies}
        party_map = {p.abbreviation.strip().upper(): p for p in parties}

        print(f"Loaded {len(constituencies)} constituencies and {len(parties)} parties.")

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Candidates"
        ws.views.sheetView[0].showGridLines = True

        headers = [
            "Full Name *",
            "Age *",
            "Serial Number",
            "Qualification",
            "Independent (Yes/No) *",
            "Party ID (If not Independent)",
            "Constituency ID *",
            "Constituency Name",
            "Party Abbr",
            "Party Name",
        ]
        ws.append(headers)

        header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
        header_fill = PatternFill(start_color="0F766E", end_color="0F766E", fill_type="solid")  # Teal-700
        header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

        for col_idx in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = header_align

        # Authentic Candidates Data
        candidate_roster = [
            # Kadapa (22)
            {"con": "kadapa", "name": "Reddeppagari Madhavi Reddy", "party": "TDP", "age": 47, "qual": "Post Graduate", "serial": 1, "is_ind": "No"},
            {"con": "kadapa", "name": "Amzath Basha Shaik Bepari", "party": "YSRCP", "age": 53, "qual": "B.A.", "serial": 2, "is_ind": "No"},
            {"con": "kadapa", "name": "S. Afzal Ali Khan", "party": "INC", "age": 44, "qual": "M.Com", "serial": 3, "is_ind": "No"},
            {"con": "kadapa", "name": "K. Prabhakar", "party": None, "age": 41, "qual": "B.Sc", "serial": 4, "is_ind": "Yes"},

            # Badvel (23)
            {"con": "badvel", "name": "Dasari Sudha", "party": "YSRCP", "age": 46, "qual": "MBBS", "serial": 1, "is_ind": "No"},
            {"con": "badvel", "name": "Bojja Roshanna", "party": "BJP", "age": 52, "qual": "M.A. B.Ed", "serial": 2, "is_ind": "No"},
            {"con": "badvel", "name": "Vijaya Jyothi", "party": "INC", "age": 41, "qual": "Graduate", "serial": 3, "is_ind": "No"},
            {"con": "badvel", "name": "D. Subba Rayudu", "party": None, "age": 40, "qual": "B.A.", "serial": 4, "is_ind": "Yes"},

            # Pulivendula (24)
            {"con": "pulivendula", "name": "Y. S. Jagan Mohan Reddy", "party": "YSRCP", "age": 51, "qual": "B.Com", "serial": 1, "is_ind": "No"},
            {"con": "pulivendula", "name": "M. Ravindranath Reddy (B.Tech Ravi)", "party": "TDP", "age": 48, "qual": "B.Tech", "serial": 2, "is_ind": "No"},
            {"con": "pulivendula", "name": "Veluru Sanjeeva Reddy", "party": "INC", "age": 45, "qual": "M.A.", "serial": 3, "is_ind": "No"},
            {"con": "pulivendula", "name": "G. Suresh Kumar", "party": None, "age": 39, "qual": "Graduate", "serial": 4, "is_ind": "Yes"},

            # Proddatur (25)
            {"con": "proddatur", "name": "Nandyala Varada Rajulu Reddy", "party": "TDP", "age": 72, "qual": "Graduate", "serial": 1, "is_ind": "No"},
            {"con": "proddatur", "name": "Rachamallu Siva Prasad Reddy", "party": "YSRCP", "age": 52, "qual": "B.Com", "serial": 2, "is_ind": "No"},
            {"con": "proddatur", "name": "K. Srinivasulu", "party": "INC", "age": 45, "qual": "M.A.", "serial": 3, "is_ind": "No"},
            {"con": "proddatur", "name": "B. Chennaiah", "party": None, "age": 43, "qual": "B.Com", "serial": 4, "is_ind": "Yes"},

            # Kurnool (26)
            {"con": "kurnool", "name": "T. G. Bharath", "party": "TDP", "age": 44, "qual": "MBA", "serial": 1, "is_ind": "No"},
            {"con": "kurnool", "name": "A. Md. Imtiaz", "party": "YSRCP", "age": 56, "qual": "M.Sc", "serial": 2, "is_ind": "No"},
            {"con": "kurnool", "name": "Shaik Jilani Basha", "party": "INC", "age": 49, "qual": "B.A.", "serial": 3, "is_ind": "No"},
            {"con": "kurnool", "name": "M. Venkatesh", "party": None, "age": 38, "qual": "Diploma", "serial": 4, "is_ind": "Yes"},

            # Adoni (27)
            {"con": "adoni", "name": "P. V. Parthasarathi", "party": "BJP", "age": 54, "qual": "M.B.B.S.", "serial": 1, "is_ind": "No"},
            {"con": "adoni", "name": "Y. Sai Prasad Reddy", "party": "YSRCP", "age": 63, "qual": "Intermediate", "serial": 2, "is_ind": "No"},
            {"con": "adoni", "name": "B. Ramachandra", "party": "INC", "age": 44, "qual": "B.A.", "serial": 3, "is_ind": "No"},
            {"con": "adoni", "name": "C. Raghavendra", "party": None, "age": 39, "qual": "B.Sc", "serial": 4, "is_ind": "Yes"},

            # Yemmiganur (28)
            {"con": "yemmiganur", "name": "B. V. Jaya Nageshwara Reddy", "party": "TDP", "age": 48, "qual": "B.Tech", "serial": 1, "is_ind": "No"},
            {"con": "yemmiganur", "name": "K. Jagan Mohan Reddy", "party": "YSRCP", "age": 50, "qual": "M.A.", "serial": 2, "is_ind": "No"},
            {"con": "yemmiganur", "name": "K. E. Jaganmohan", "party": "INC", "age": 46, "qual": "Graduate", "serial": 3, "is_ind": "No"},
            {"con": "yemmiganur", "name": "N. Shivashankar", "party": None, "age": 41, "qual": "B.Com", "serial": 4, "is_ind": "Yes"},

            # Nandyal (29)
            {"con": "nandyal", "name": "N. M. D. Farooq", "party": "TDP", "age": 68, "qual": "B.A.", "serial": 1, "is_ind": "No"},
            {"con": "nandyal", "name": "Shilpa Ravi Chandra Kishore Reddy", "party": "YSRCP", "age": 42, "qual": "MBA", "serial": 2, "is_ind": "No"},
            {"con": "nandyal", "name": "G. Vasudev", "party": "INC", "age": 46, "qual": "B.Com", "serial": 3, "is_ind": "No"},
            {"con": "nandyal", "name": "P. Subbaiah", "party": None, "age": 44, "qual": "Intermediate", "serial": 4, "is_ind": "Yes"},

            # Tirupati (30)
            {"con": "tirupati", "name": "Arani Srinivasulu", "party": "JSP", "age": 58, "qual": "B.Com", "serial": 1, "is_ind": "No"},
            {"con": "tirupati", "name": "Bhumana Abhinay Reddy", "party": "YSRCP", "age": 36, "qual": "M.Tech", "serial": 2, "is_ind": "No"},
            {"con": "tirupati", "name": "K. Balarama Krishnaiah", "party": "INC", "age": 50, "qual": "LL.B", "serial": 3, "is_ind": "No"},
            {"con": "tirupati", "name": "Dr. V. Muni Krishna", "party": None, "age": 46, "qual": "Ph.D", "serial": 4, "is_ind": "Yes"},

            # Chandragiri (31)
            {"con": "chandragiri", "name": "Pulivarthi Venkata Mani Prasad (Nani)", "party": "TDP", "age": 54, "qual": "Graduate", "serial": 1, "is_ind": "No"},
            {"con": "chandragiri", "name": "Chevireddy Mohith Reddy", "party": "YSRCP", "age": 32, "qual": "B.Tech", "serial": 2, "is_ind": "No"},
            {"con": "chandragiri", "name": "P. Ramesh Reddy", "party": "INC", "age": 48, "qual": "B.A.", "serial": 3, "is_ind": "No"},
            {"con": "chandragiri", "name": "V. Dhananjaya", "party": None, "age": 41, "qual": "M.A.", "serial": 4, "is_ind": "Yes"},

            # Srikalahasti (32)
            {"con": "srikalahasti", "name": "Bojjala Venkata Sudhir Reddy", "party": "TDP", "age": 49, "qual": "B.Tech, MBA", "serial": 1, "is_ind": "No"},
            {"con": "srikalahasti", "name": "Biyyapu Madhusudhan Reddy", "party": "YSRCP", "age": 55, "qual": "Graduate", "serial": 2, "is_ind": "No"},
            {"con": "srikalahasti", "name": "C. Rajesh", "party": "INC", "age": 43, "qual": "B.Com", "serial": 3, "is_ind": "No"},
            {"con": "srikalahasti", "name": "S. Ankaiah", "party": None, "age": 38, "qual": "Intermediate", "serial": 4, "is_ind": "Yes"},

            # Nagari (33)
            {"con": "nagari", "name": "Gali Bhanu Prakash", "party": "TDP", "age": 46, "qual": "B.Tech", "serial": 1, "is_ind": "No"},
            {"con": "nagari", "name": "R. K. Roja", "party": "YSRCP", "age": 51, "qual": "B.Sc", "serial": 2, "is_ind": "No"},
            {"con": "nagari", "name": "P. Sudhakar", "party": "INC", "age": 47, "qual": "Graduate", "serial": 3, "is_ind": "No"},
            {"con": "nagari", "name": "M. Nagaraju", "party": None, "age": 42, "qual": "B.A.", "serial": 4, "is_ind": "Yes"},

            # Central Delhi (34)
            {"con": "central delhi", "name": "Praveen Khandelwal", "party": "BJP", "age": 63, "qual": "LL.B", "serial": 1, "is_ind": "No"},
            {"con": "central delhi", "name": "Jai Prakash Agarwal", "party": "INC", "age": 78, "qual": "B.A.", "serial": 2, "is_ind": "No"},
            {"con": "central delhi", "name": "Somnath Bharti", "party": "AAP", "age": 50, "qual": "M.Sc, LL.B", "serial": 3, "is_ind": "No"},
            {"con": "central delhi", "name": "Rajiv Sharma", "party": None, "age": 40, "qual": "B.Tech", "serial": 4, "is_ind": "Yes"},
        ]

        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )
        data_font = Font(name="Segoe UI", size=10)
        center_align = Alignment(horizontal="center", vertical="center")
        left_align = Alignment(horizontal="left", vertical="center")

        alt_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

        row_num = 2
        for item in candidate_roster:
            con_obj = con_map.get(item["con"])
            if not con_obj:
                print(f"[!] Warning: Constituency '{item['con']}' not found in DB.")
                continue

            party_obj = party_map.get(item["party"]) if item["party"] else None
            party_id = party_obj.id if party_obj else ""
            party_abbr = party_obj.abbreviation if party_obj else "IND"
            party_name = party_obj.name if party_obj else "Independent"

            row_data = [
                item["name"],
                item["age"],
                item["serial"],
                item["qual"],
                item["is_ind"],
                party_id,
                con_obj.id,
                con_obj.name,
                party_abbr,
                party_name,
            ]
            ws.append(row_data)

            # Style row
            for col_idx in range(1, len(row_data) + 1):
                c = ws.cell(row=row_num, column=col_idx)
                c.font = data_font
                c.border = thin_border
                if col_idx in [2, 3, 5, 6, 7, 9]:
                    c.alignment = center_align
                else:
                    c.alignment = left_align
                if row_num % 2 == 1:
                    c.fill = alt_fill

            row_num += 1

        # Adjust column widths
        widths = [36, 10, 16, 22, 24, 28, 20, 24, 14, 30]
        for idx, width in enumerate(widths, start=1):
            col_letter = get_column_letter(idx)
            ws.column_dimensions[col_letter].width = width

        # Sheet 2: Reference Data
        ws_ref = wb.create_sheet(title="Reference - Master Data")
        ws_ref.views.sheetView[0].showGridLines = True

        ref_headers = [
            "Constituency ID", "Constituency Code", "Constituency Name", "",
            "Party ID", "Party Abbr", "Party Name", "Symbol"
        ]
        ws_ref.append(ref_headers)

        ref_header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        for col_idx in range(1, len(ref_headers) + 1):
            if col_idx == 4:
                continue
            cell = ws_ref.cell(row=1, column=col_idx)
            cell.font = header_font
            cell.fill = ref_header_fill
            cell.alignment = header_align

        max_len = max(len(constituencies), len(parties))
        for i in range(max_len):
            con = constituencies[i] if i < len(constituencies) else None
            pty = parties[i] if i < len(parties) else None

            ws_ref.append([
                con.id if con else "",
                con.code if con else "",
                con.name if con else "",
                "",
                pty.id if pty else "",
                pty.abbreviation if pty else "",
                pty.name if pty else "",
                pty.symbol if pty else "",
            ])

        ref_widths = [18, 18, 26, 6, 14, 16, 30, 20]
        for idx, width in enumerate(ref_widths, start=1):
            col_letter = get_column_letter(idx)
            ws_ref.column_dimensions[col_letter].width = width

        # Save to workspace root
        out_paths = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "Smart EVM - Candidates for All Constituencies.xlsx")),
            os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "candidates.xlsx")),
        ]

        for p in out_paths:
            wb.save(p)
            print(f"[+] Saved candidates spreadsheet to: {p}")

        # Validate with parse_excel
        with open(out_paths[0], "rb") as f:
            bytes_data = f.read()
        res = candidate_excel_service.parse_excel(db, bytes_data, election_id=3)
        print(f"[Validation Check] Total Rows: {res['totalRows']}, Valid: {res['importedCount']}, Errors: {len(res['errors'])}")
        if res['errors']:
            print("Errors encountered:")
            for err in res['errors']:
                print(f"  - {err}")
        else:
            print("[SUCCESS] 100% valid! Ready for upload without any errors.")

    finally:
        db.close()

if __name__ == "__main__":
    generate_candidates_excel()
