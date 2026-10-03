import os
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

# Define officers data matching all 30 active polling stations
OFFICERS_DATA = [
    {
        "station_id": 18,
        "station_code": "PS-KDP-001",
        "station_name": "Municipal High School, Nagarajupalli",
        "constituency_code": "KDP-01",
        "constituency_name": "Kadapa",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Nagarajupalli, Kadapa - 516001",
        "total_booths": 2,
        "capacity": 1200,
        "officer_name": "Rajesh Kumar Reddy",
        "email": "rajesh.kdp001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-KDP-001",
        "phone": "+91-9848011001",
    },
    {
        "station_id": 19,
        "station_code": "PS-KDP-002",
        "station_name": "Govt Junior College for Men, RIMS Road",
        "constituency_code": "KDP-01",
        "constituency_name": "Kadapa",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "RIMS Road, Kadapa - 516002",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Suresh Babu Varma",
        "email": "suresh.kdp002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-KDP-002",
        "phone": "+91-9848011002",
    },
    {
        "station_id": 20,
        "station_code": "PS-BDV-001",
        "station_name": "Govt Boys High School, Main Road",
        "constituency_code": "BDV-01",
        "constituency_name": "Badvel",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Main Road, Badvel - 516227",
        "total_booths": 1,
        "capacity": 1100,
        "officer_name": "Venkata Ramaniah",
        "email": "vraman.bdv001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-BDV-001",
        "phone": "+91-9848011003",
    },
    {
        "station_id": 21,
        "station_code": "PS-BDV-002",
        "station_name": "Mandal Praja Parishad School, Madakalavaripalli",
        "constituency_code": "BDV-01",
        "constituency_name": "Badvel",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Madakalavaripalli, Badvel - 516227",
        "total_booths": 1,
        "capacity": 950,
        "officer_name": "Lakshmi Narayana",
        "email": "lakshmi.bdv002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-BDV-002",
        "phone": "+91-9848011004",
    },
    {
        "station_id": 22,
        "station_code": "PS-PLV-001",
        "station_name": "Zilla Parishad High School, Bakharapuram",
        "constituency_code": "PLV-01",
        "constituency_name": "Pulivendula",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Bakharapuram, Pulivendula - 516390",
        "total_booths": 2,
        "capacity": 1250,
        "officer_name": "Venkateswara Rao",
        "email": "vvenkat.plv001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-PLV-001",
        "phone": "+91-9848011005",
    },
    {
        "station_id": 23,
        "station_code": "PS-PLV-002",
        "station_name": "Loyola Polytechnic College",
        "constituency_code": "PLV-01",
        "constituency_name": "Pulivendula",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Kadapa Road, Pulivendula - 516390",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Anand Mohan Reddy",
        "email": "anand.plv002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-PLV-002",
        "phone": "+91-9848011006",
    },
    {
        "station_id": 24,
        "station_code": "PS-PRD-001",
        "station_name": "Municipal High School, Korrapadu Road",
        "constituency_code": "PRD-01",
        "constituency_name": "Proddatur",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Korrapadu Road, Proddatur - 516360",
        "total_booths": 2,
        "capacity": 1200,
        "officer_name": "Srinivasulu Chetty",
        "email": "srinivas.prd001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-PRD-001",
        "phone": "+91-9848011007",
    },
    {
        "station_id": 25,
        "station_code": "PS-PRD-002",
        "station_name": "Sri Srinivasa Degree College, Gandhi Road",
        "constituency_code": "PRD-01",
        "constituency_name": "Proddatur",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Gandhi Road, Proddatur - 516360",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Kishore Kumar",
        "email": "kishore.prd002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-PRD-002",
        "phone": "+91-9848011008",
    },
    {
        "station_id": 26,
        "station_code": "PS-KRN-001",
        "station_name": "Govt Model Higher Secondary School, B-Camp",
        "constituency_code": "KRN-01",
        "constituency_name": "Kurnool",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "B-Camp, Kurnool - 518002",
        "total_booths": 2,
        "capacity": 1300,
        "officer_name": "Abdul Rasheed Khan",
        "email": "arasheed.krn001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-KRN-001",
        "phone": "+91-9848011009",
    },
    {
        "station_id": 27,
        "station_code": "PS-KRN-002",
        "station_name": "Municipal High School, Old City",
        "constituency_code": "KRN-01",
        "constituency_name": "Kurnool",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "Old Town, Kurnool - 518001",
        "total_booths": 1,
        "capacity": 1100,
        "officer_name": "Maheshwar Reddy",
        "email": "mahesh.krn002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-KRN-002",
        "phone": "+91-9848011010",
    },
    {
        "station_id": 28,
        "station_code": "PS-ADN-001",
        "station_name": "The Municipal High School, Arts College Road",
        "constituency_code": "ADN-01",
        "constituency_name": "Adoni",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "Arts College Road, Adoni - 518301",
        "total_booths": 2,
        "capacity": 1150,
        "officer_name": "Mohammed Shafi",
        "email": "mshafi.adn001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-ADN-001",
        "phone": "+91-9848011011",
    },
    {
        "station_id": 29,
        "station_code": "PS-ADN-002",
        "station_name": "Govt Urdu High School, Fort Area",
        "constituency_code": "ADN-01",
        "constituency_name": "Adoni",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "Fort Road, Adoni - 518301",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Vijaya Bhaskar",
        "email": "vijay.adn002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-ADN-002",
        "phone": "+91-9848011012",
    },
    {
        "station_id": 30,
        "station_code": "PS-YMG-001",
        "station_name": "Govt Junior College, Somappa Nagar",
        "constituency_code": "YMG-01",
        "constituency_name": "Yemmiganur",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "Somappa Nagar, Yemmiganur - 518360",
        "total_booths": 2,
        "capacity": 1200,
        "officer_name": "Raghunath Swamy",
        "email": "raghu.ymg001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-YMG-001",
        "phone": "+91-9848011013",
    },
    {
        "station_id": 31,
        "station_code": "PS-YMG-002",
        "station_name": "ZP High School, Banavasi Road",
        "constituency_code": "YMG-01",
        "constituency_name": "Yemmiganur",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "Banavasi Road, Yemmiganur - 518360",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Prabhakar Goud",
        "email": "prabhakar.ymg002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-YMG-002",
        "phone": "+91-9848011014",
    },
    {
        "station_id": 32,
        "station_code": "PS-NDL-001",
        "station_name": "Municipal High School, NGO Colony",
        "constituency_code": "NDL-01",
        "constituency_name": "Nandyal",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "NGO Colony, Nandyal - 518501",
        "total_booths": 2,
        "capacity": 1200,
        "officer_name": "Subba Rayudu",
        "email": "subba.ndl001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-NDL-001",
        "phone": "+91-9848011015",
    },
    {
        "station_id": 33,
        "station_code": "PS-NDL-002",
        "station_name": "Govt Degree College, Sanjeeva Nagar",
        "constituency_code": "NDL-01",
        "constituency_name": "Nandyal",
        "region_code": "AP-KRN",
        "region_name": "Kurnool Region",
        "address": "Sanjeeva Nagar, Nandyal - 518502",
        "total_booths": 1,
        "capacity": 1050,
        "officer_name": "Chandra Sekhar",
        "email": "chandra.ndl002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-NDL-002",
        "phone": "+91-9848011016",
    },
    {
        "station_id": 34,
        "station_code": "PS-TPT-001",
        "station_name": "Sri Venkateswara High School, Balaji Colony",
        "constituency_code": "TPT-01",
        "constituency_name": "Tirupati",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "Balaji Colony, Tirupati - 517501",
        "total_booths": 2,
        "capacity": 1300,
        "officer_name": "Krishna Murthy",
        "email": "kmurthy.tpt001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-TPT-001",
        "phone": "+91-9848011017",
    },
    {
        "station_id": 35,
        "station_code": "PS-TPT-002",
        "station_name": "SPW Degree College, G.Car Street",
        "constituency_code": "TPT-01",
        "constituency_name": "Tirupati",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "G.Car Street, Tirupati - 517501",
        "total_booths": 1,
        "capacity": 1100,
        "officer_name": "Padmavathi Devi",
        "email": "padma.tpt002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-TPT-002",
        "phone": "+91-9848011018",
    },
    {
        "station_id": 36,
        "station_code": "PS-CDG-001",
        "station_name": "Govt Junior College, Main Road",
        "constituency_code": "CDG-01",
        "constituency_name": "Chandragiri",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "Main Road, Chandragiri - 517101",
        "total_booths": 2,
        "capacity": 1200,
        "officer_name": "Narasimha Murthy",
        "email": "nmurthy.cdg001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-CDG-001",
        "phone": "+91-9848011019",
    },
    {
        "station_id": 37,
        "station_code": "PS-CDG-002",
        "station_name": "ZP High School, A.Rangampeta",
        "constituency_code": "CDG-01",
        "constituency_name": "Chandragiri",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "A.Rangampeta, Chandragiri - 517102",
        "total_booths": 1,
        "capacity": 950,
        "officer_name": "Govinda Rajulu",
        "email": "govind.cdg002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-CDG-002",
        "phone": "+91-9848011020",
    },
    {
        "station_id": 38,
        "station_code": "PS-SKH-001",
        "station_name": "Govt Boys High School, Temple Street",
        "constituency_code": "SKH-01",
        "constituency_name": "Srikalahasti",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "Temple Street, Srikalahasti - 517644",
        "total_booths": 2,
        "capacity": 1200,
        "officer_name": "Subramanyam Sastri",
        "email": "subramanyam.skh001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-SKH-001",
        "phone": "+91-9848011021",
    },
    {
        "station_id": 39,
        "station_code": "PS-SKH-002",
        "station_name": "ZP High School, Bahadurpet",
        "constituency_code": "SKH-01",
        "constituency_name": "Srikalahasti",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "Bahadurpet, Srikalahasti - 517644",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Ganesh Naidu",
        "email": "ganesh.skh002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-SKH-002",
        "phone": "+91-9848011022",
    },
    {
        "station_id": 40,
        "station_code": "PS-NGR-001",
        "station_name": "Govt High School, Trunks Road",
        "constituency_code": "NGR-01",
        "constituency_name": "Nagari",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "Trunks Road, Nagari - 517590",
        "total_booths": 2,
        "capacity": 1150,
        "officer_name": "Saravanan Pillai",
        "email": "saravanan.ngr001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-NGR-001",
        "phone": "+91-9848011023",
    },
    {
        "station_id": 41,
        "station_code": "PS-NGR-002",
        "station_name": "ZP High School, Ekambarakuppam",
        "constituency_code": "NGR-01",
        "constituency_name": "Nagari",
        "region_code": "AP-TPT",
        "region_name": "Tirupati Region",
        "address": "Ekambarakuppam, Nagari - 517592",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Balaji Varma",
        "email": "balaji.ngr002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-NGR-002",
        "phone": "+91-9848011024",
    },
    {
        "station_id": 7,
        "station_code": "BD-TN01-001",
        "station_name": "Badvel Town 1",
        "constituency_code": "BD-01",
        "constituency_name": "Badvel",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Municipal Ward 1, Badvel Town - 516227",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Kondal Rao",
        "email": "kondal.bdv003@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-BDV-003",
        "phone": "+91-9848011025",
    },
    {
        "station_id": 8,
        "station_code": "BD-PO01-001",
        "station_name": "Porumamilla",
        "constituency_code": "BD-01",
        "constituency_name": "Badvel",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Panchayat Office, Porumamilla - 516193",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Obula Reddy",
        "email": "obula.bdv004@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-BDV-004",
        "phone": "+91-9848011026",
    },
    {
        "station_id": 9,
        "station_code": "BD-BK01-001",
        "station_name": "B.Kodur",
        "constituency_code": "BD-01",
        "constituency_name": "Badvel",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "MPP School, B.Kodur - 516228",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Ramanjaneyulu",
        "email": "ramanjaneyulu.bdv005@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-BDV-005",
        "phone": "+91-9848011027",
    },
    {
        "station_id": 10,
        "station_code": "MY-TW01-001",
        "station_name": "Mydukur town",
        "constituency_code": "MY-02",
        "constituency_name": "Mydukur",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Zilla Parishad High School, Mydukur - 516172",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Prasad Raju",
        "email": "prasad.myd001@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-MYD-001",
        "phone": "+91-9848011028",
    },
    {
        "station_id": 11,
        "station_code": "MY-ND01-002",
        "station_name": "M.P.E.S., Nandyalampeta",
        "constituency_code": "MY-02",
        "constituency_name": "Mydukur",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Nandyalampeta, Mydukur Mandal - 516172",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Devaiah Swamy",
        "email": "devaiah.myd002@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-MYD-002",
        "phone": "+91-9848011029",
    },
    {
        "station_id": 12,
        "station_code": "MY-KJ01-003",
        "station_name": "Khajipeta Town",
        "constituency_code": "MY-02",
        "constituency_name": "Mydukur",
        "region_code": "AP-KDP",
        "region_name": "YSR Kadapa Region",
        "address": "Govt High School, Khajipeta - 516214",
        "total_booths": 1,
        "capacity": 1000,
        "officer_name": "Sivashankar Reddy",
        "email": "sivashankar.myd003@evm.gov.in",
        "password": "Officer@12345",
        "employee_id": "EO-MYD-003",
        "phone": "+91-9848011030",
    },
]

def create_excel_workbook(filepath):
    wb = openpyxl.Workbook()
    
    # -------------------------------------------------------------
    # STYLING DEFINITIONS
    # -------------------------------------------------------------
    thin_border = Border(
        left=Side(style='thin', color='D1D5DB'),
        right=Side(style='thin', color='D1D5DB'),
        top=Side(style='thin', color='D1D5DB'),
        bottom=Side(style='thin', color='D1D5DB'),
    )
    
    header_font = Font(name='Segoe UI', size=11, bold=True, color='FFFFFF')
    title_font = Font(name='Segoe UI', size=14, bold=True, color='1E293B')
    subtitle_font = Font(name='Segoe UI', size=10, italic=True, color='64748B')
    regular_font = Font(name='Segoe UI', size=10, color='1F2937')
    mono_font = Font(name='Consolas', size=10, color='1F2937')
    bold_regular_font = Font(name='Segoe UI', size=10, bold=True, color='111827')
    
    emerald_fill = PatternFill(start_color='10B981', end_color='10B981', fill_type='solid') # #10B981
    slate_fill = PatternFill(start_color='1E293B', end_color='1E293B', fill_type='solid') # #1E293B
    indigo_fill = PatternFill(start_color='4F46E5', end_color='4F46E5', fill_type='solid') # #4F46E5
    blue_fill = PatternFill(start_color='0284C7', end_color='0284C7', fill_type='solid') # #0284C7
    
    zebra_even = PatternFill(start_color='F9FAFB', end_color='F9FAFB', fill_type='solid')
    zebra_odd = PatternFill(start_color='FFFFFF', end_color='FFFFFF', fill_type='solid')
    
    center_align = Alignment(horizontal='center', vertical='center')
    left_align = Alignment(horizontal='left', vertical='center')
    right_align = Alignment(horizontal='right', vertical='center')
    
    # -------------------------------------------------------------
    # SHEET 1: Officers (Bulk Import Template Compatible)
    # This sheet directly satisfies the bulk Excel importer on the Web Page!
    # -------------------------------------------------------------
    ws1 = wb.active
    ws1.title = "Officers"
    
    headers_s1 = [
        "Full Name *",
        "Email *",
        "Password *",
        "Employee ID *",
        "Phone",
        "Polling Station ID or Code",
    ]
    
    ws1.row_dimensions[1].height = 28
    for col_idx, h in enumerate(headers_s1, start=1):
        cell = ws1.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = emerald_fill
        cell.alignment = center_align
        cell.border = thin_border
        
    for row_idx, item in enumerate(OFFICERS_DATA, start=2):
        ws1.row_dimensions[row_idx].height = 22
        fill = zebra_even if row_idx % 2 == 0 else zebra_odd
        
        row_values = [
            item["officer_name"],
            item["email"],
            item["password"],
            item["employee_id"],
            item["phone"],
            item["station_code"], # Station code matches backend lookup exactly
        ]
        
        for col_idx, val in enumerate(row_values, start=1):
            cell = ws1.cell(row=row_idx, column=col_idx, value=val)
            cell.font = mono_font if col_idx in [2, 3, 4, 5, 6] else regular_font
            cell.fill = fill
            cell.border = thin_border
            cell.alignment = center_align if col_idx in [3, 4, 5, 6] else left_align

    # Column widths for Sheet 1
    s1_widths = [26, 34, 18, 18, 20, 30]
    for idx, w in enumerate(s1_widths, start=1):
        ws1.column_dimensions[get_column_letter(idx)].width = w

    # -------------------------------------------------------------
    # SHEET 2: Detailed Officer Directory (All Web Page Form Fields)
    # Includes full details: Station Name, Constituency, Region, Address, Booths, Capacity
    # -------------------------------------------------------------
    ws2 = wb.create_sheet(title="Detailed Directory")
    
    headers_s2 = [
        "S.No",
        "Officer Full Name",
        "Employee ID",
        "Official Email Address",
        "Login Password",
        "Contact Phone",
        "Polling Station Code",
        "Polling Station Name",
        "Assembly Constituency",
        "Region / District",
        "Polling Station Address",
        "Total Booths",
        "Voter Capacity",
        "Web Page Form Field Reference",
    ]
    
    ws2.row_dimensions[1].height = 30
    for col_idx, h in enumerate(headers_s2, start=1):
        cell = ws2.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = slate_fill
        cell.alignment = center_align
        cell.border = thin_border
        
    for row_idx, item in enumerate(OFFICERS_DATA, start=2):
        ws2.row_dimensions[row_idx].height = 22
        fill = zebra_even if row_idx % 2 == 0 else zebra_odd
        
        row_values = [
            row_idx - 1,
            item["officer_name"],
            item["employee_id"],
            item["email"],
            item["password"],
            item["phone"],
            item["station_code"],
            item["station_name"],
            f"{item['constituency_name']} ({item['constituency_code']})",
            item["region_name"],
            item["address"],
            item["total_booths"],
            item["capacity"],
            f"Select '{item['station_name']} ({item['station_code']})' in dropdown",
        ]
        
        for col_idx, val in enumerate(row_values, start=1):
            cell = ws2.cell(row=row_idx, column=col_idx, value=val)
            if col_idx in [3, 4, 5, 6, 7]:
                cell.font = mono_font
            elif col_idx == 2:
                cell.font = bold_regular_font
            else:
                cell.font = regular_font
            cell.fill = fill
            cell.border = thin_border
            if col_idx in [1, 3, 5, 6, 7, 12, 13]:
                cell.alignment = center_align
            elif col_idx in [12, 13]:
                cell.alignment = right_align
            else:
                cell.alignment = left_align
                
    s2_widths = [6, 26, 18, 34, 18, 20, 22, 45, 26, 24, 45, 14, 16, 45]
    for idx, w in enumerate(s2_widths, start=1):
        ws2.column_dimensions[get_column_letter(idx)].width = w

    # -------------------------------------------------------------
    # SHEET 3: Available Polling Stations Reference
    # -------------------------------------------------------------
    ws3 = wb.create_sheet(title="Polling Stations")
    
    headers_s3 = [
        "Station ID",
        "Station Code",
        "Polling Station Name",
        "Constituency Code",
        "Constituency Name",
        "Region Code",
        "Region Name",
        "Address / Location",
        "Total Booths",
        "Voter Capacity",
        "Assigned Officer Employee ID",
    ]
    
    ws3.row_dimensions[1].height = 28
    for col_idx, h in enumerate(headers_s3, start=1):
        cell = ws3.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = indigo_fill
        cell.alignment = center_align
        cell.border = thin_border
        
    for row_idx, item in enumerate(OFFICERS_DATA, start=2):
        ws3.row_dimensions[row_idx].height = 22
        fill = zebra_even if row_idx % 2 == 0 else zebra_odd
        
        row_values = [
            item["station_id"],
            item["station_code"],
            item["station_name"],
            item["constituency_code"],
            item["constituency_name"],
            item["region_code"],
            item["region_name"],
            item["address"],
            item["total_booths"],
            item["capacity"],
            item["employee_id"],
        ]
        
        for col_idx, val in enumerate(row_values, start=1):
            cell = ws3.cell(row=row_idx, column=col_idx, value=val)
            cell.font = mono_font if col_idx in [1, 2, 4, 6, 11] else regular_font
            cell.fill = fill
            cell.border = thin_border
            if col_idx in [1, 2, 4, 6, 9, 10, 11]:
                cell.alignment = center_align
            else:
                cell.alignment = left_align

    s3_widths = [12, 18, 45, 18, 22, 16, 24, 45, 14, 16, 28]
    for idx, w in enumerate(s3_widths, start=1):
        ws3.column_dimensions[get_column_letter(idx)].width = w

    # -------------------------------------------------------------
    # SHEET 4: Web Page Entry Guide
    # Instructions on entering officers in the Web Page
    # -------------------------------------------------------------
    ws4 = wb.create_sheet(title="Web Page Guide")
    
    instructions = [
        ("SMART EVM - ELECTION OFFICERS DATA ENTRY GUIDE", title_font),
        ("This document describes how to enter polling officers into the Smart EVM Web Portal.", subtitle_font),
        ("", regular_font),
        ("METHOD 1: BULK EXCEL UPLOAD (FASTEST & RECOMMENDED)", Font(name='Segoe UI', size=11, bold=True, color='0284C7')),
        ("1. Navigate to Web Portal: http://localhost:5173", regular_font),
        ("2. Log in with Commissioner credentials (commissioner@evm.gov.in / Admin@12345).", regular_font),
        ("3. Go to Master Data -> Election Officers (URL: /admin/officers).", regular_font),
        ("4. Click the 'Import Excel' button (with the green spreadsheet icon) at the top right.", regular_font),
        ("5. Drag and drop this Excel file (Sheet 'Officers' will be automatically parsed).", regular_font),
        ("6. Click 'Upload File'. All 30 officers will be registered and mapped to their stations instantly.", regular_font),
        ("", regular_font),
        ("METHOD 2: MANUAL FORM ENTRY (ONE-BY-ONE)", Font(name='Segoe UI', size=11, bold=True, color='0284C7')),
        ("1. On the Election Officers page (/admin/officers), click the '+ Register Officer' button.", regular_font),
        ("2. Complete each field using the values from the 'Detailed Directory' sheet:", regular_font),
        ("     - Full Name *: Enter the officer's full legal name (e.g., 'Rajesh Kumar Reddy').", regular_font),
        ("     - Employee ID *: Enter the unique official ID (e.g., 'EO-KDP-001').", regular_font),
        ("     - Phone *: Enter the 10-digit mobile number with country code (e.g., '+91-9848011001').", regular_font),
        ("     - Email *: Enter the official email (e.g., 'rajesh.kdp001@evm.gov.in').", regular_font),
        ("     - Password *: Enter the default initial password (e.g., 'Officer@12345').", regular_font),
        ("     - Assign Polling Station: Select the assigned station from the dropdown menu.", regular_font),
        ("3. Click 'Register'. Repeat for remaining polling stations.", regular_font),
        ("", regular_font),
        ("FIELD VALIDATION RULES & CONSTRAINTS", Font(name='Segoe UI', size=11, bold=True, color='0284C7')),
        ("• Full Name: Required, 2 to 150 characters.", regular_font),
        ("• Employee ID: Required, 3 to 50 characters, must be unique across all officers.", regular_font),
        ("• Email: Required, valid email format, must be unique across all system users.", regular_font),
        ("• Password: Required, minimum 8 characters.", regular_font),
        ("• Phone: Required, 10 to 20 characters (standard Indian phone format supported).", regular_font),
        ("• Polling Station: Optional during creation, but EACH station can only have ONE assigned officer.", regular_font),
    ]
    
    for r_idx, (text, font_style) in enumerate(instructions, start=1):
        cell = ws4.cell(row=r_idx, column=1, value=text)
        cell.font = font_style
        ws4.row_dimensions[r_idx].height = 20 if text else 10
        
    ws4.column_dimensions['A'].width = 110

    # Save to disk
    wb.save(filepath)
    print(f"[OK] Successfully created Excel file at: {filepath}")

if __name__ == "__main__":
    out_dir = r"d:\Yoga\DBMS\DBMS_project"
    file1 = os.path.join(out_dir, "polling_officers.xlsx")
    file2 = os.path.join(out_dir, "Smart EVM - Polling Officers.xlsx")
    create_excel_workbook(file1)
    create_excel_workbook(file2)
