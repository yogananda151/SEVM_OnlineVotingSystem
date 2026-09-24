import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import { prisma } from '../src/config/database';

interface VoterData {
  fullName: string;
  voterId: string;
  constituencyId: number;
  constituencyName: string;
  pollingStationId: number;
  pollingStationName: string;
  pollingStationCode: string;
  serialNumber: number;
  dateOfBirth: string;
  gender: string;
  address: string;
  phone: string;
  aadhaarNumber: string;
}

// 10 realistic voters for each of the 4 stations
const voterSeedData: Record<number, Array<{
  fullName: string;
  gender: 'Male' | 'Female';
  dob: string;
  address: string;
  phoneSuffix: string;
  aadhaarSuffix: string;
}>> = {
  // Station 2: GJC, BADVEL (Constituency: BADVEL, ID: 2)
  2: [
    { fullName: 'Venkata Subbaiah', gender: 'Male', dob: '1976-05-14', address: 'D.No 2/104, Near Govt Junior College, Badvel', phoneSuffix: '1001', aadhaarSuffix: '1001' },
    { fullName: 'Lakshmi Prasanna', gender: 'Female', dob: '1982-08-20', address: 'D.No 2/108, College Road, Badvel', phoneSuffix: '1002', aadhaarSuffix: '1002' },
    { fullName: 'Rajesh Kumar Reddy', gender: 'Male', dob: '1989-11-12', address: 'Plot 15, RTC Colony, Near GJC, Badvel', phoneSuffix: '1003', aadhaarSuffix: '1003' },
    { fullName: 'Anuradha Devi', gender: 'Female', dob: '1991-03-25', address: 'H.No 3/45, Teachers Colony, Badvel', phoneSuffix: '1004', aadhaarSuffix: '1004' },
    { fullName: 'Siva Prasad Rao', gender: 'Male', dob: '1968-07-19', address: 'D.No 1/88, Main Bazaar, Badvel', phoneSuffix: '1005', aadhaarSuffix: '1005' },
    { fullName: 'Kavitha Rani', gender: 'Female', dob: '1995-12-04', address: 'H.No 2/210, GJC Quarters, Badvel', phoneSuffix: '1006', aadhaarSuffix: '1006' },
    { fullName: 'Babu Janardhan', gender: 'Male', dob: '1984-09-30', address: 'D.No 4/12, Market Street, Badvel', phoneSuffix: '1007', aadhaarSuffix: '1007' },
    { fullName: 'Sunitha Kumari', gender: 'Female', dob: '1998-02-17', address: 'H.No 2/155, Sanjeeva Nagar, Badvel', phoneSuffix: '1008', aadhaarSuffix: '1008' },
    { fullName: 'Nagaraju Chetty', gender: 'Male', dob: '1973-04-08', address: 'D.No 3/89, Old Bus Stand Road, Badvel', phoneSuffix: '1009', aadhaarSuffix: '1009' },
    { fullName: 'Padmavathi Bai', gender: 'Female', dob: '1987-10-15', address: 'D.No 2/176, College Road, Badvel', phoneSuffix: '1010', aadhaarSuffix: '1010' },
  ],

  // Station 3: Anna street (Constituency: BADVEL, ID: 2)
  3: [
    { fullName: 'Chandra Sekhar', gender: 'Male', dob: '1979-06-11', address: 'H.No 5-21, Anna Street, Badvel', phoneSuffix: '2001', aadhaarSuffix: '2001' },
    { fullName: 'Gayathri Devi', gender: 'Female', dob: '1985-01-29', address: 'H.No 5-34, Near Anna Statue, Badvel', phoneSuffix: '2002', aadhaarSuffix: '2002' },
    { fullName: 'Ramanjaneyulu V', gender: 'Male', dob: '1970-12-18', address: 'D.No 5-42, Anna Street Corner, Badvel', phoneSuffix: '2003', aadhaarSuffix: '2003' },
    { fullName: 'Swarna Latha', gender: 'Female', dob: '1993-07-09', address: 'H.No 5-55, Anna Street 2nd Cross, Badvel', phoneSuffix: '2004', aadhaarSuffix: '2004' },
    { fullName: 'Kishore Babu', gender: 'Male', dob: '1988-04-03', address: 'D.No 5-68, Anna Street, Badvel', phoneSuffix: '2005', aadhaarSuffix: '2005' },
    { fullName: 'Bharathi Reddy', gender: 'Female', dob: '1996-09-14', address: 'H.No 5-77, Anna Street Main Road, Badvel', phoneSuffix: '2006', aadhaarSuffix: '2006' },
    { fullName: 'Surendra Nath', gender: 'Male', dob: '1981-11-22', address: 'D.No 5-89, Anna Street, Badvel', phoneSuffix: '2007', aadhaarSuffix: '2007' },
    { fullName: 'Madhavi Latha', gender: 'Female', dob: '1990-03-16', address: 'H.No 5-102, Anna Street, Badvel', phoneSuffix: '2008', aadhaarSuffix: '2008' },
    { fullName: 'Venkata Ramana', gender: 'Male', dob: '1965-08-05', address: 'D.No 5-115, Anna Street Extension, Badvel', phoneSuffix: '2009', aadhaarSuffix: '2009' },
    { fullName: 'Hemalatha M', gender: 'Female', dob: '2000-05-27', address: 'H.No 5-128, Anna Street, Badvel', phoneSuffix: '2010', aadhaarSuffix: '2010' },
  ],

  // Station 4: RAMA STREET (Constituency: BADVEL NORTH, ID: 3)
  4: [
    { fullName: 'Rama Mohan Rao', gender: 'Male', dob: '1974-03-15', address: 'D.No 12/4, Rama Street, Badvel North', phoneSuffix: '3001', aadhaarSuffix: '3001' },
    { fullName: 'Saraswathi Bai', gender: 'Female', dob: '1980-09-10', address: 'H.No 12/18, Rama Temple Lane, Badvel North', phoneSuffix: '3002', aadhaarSuffix: '3002' },
    { fullName: 'Naveen Kumar', gender: 'Male', dob: '1992-07-21', address: 'D.No 12/29, Rama Street 1st Lane, Badvel North', phoneSuffix: '3003', aadhaarSuffix: '3003' },
    { fullName: 'Radha Krishna Kumari', gender: 'Female', dob: '1986-11-02', address: 'H.No 12/35, Rama Street, Badvel North', phoneSuffix: '3004', aadhaarSuffix: '3004' },
    { fullName: 'Govindarajulu K', gender: 'Male', dob: '1969-01-14', address: 'D.No 12/48, Rama Street, Badvel North', phoneSuffix: '3005', aadhaarSuffix: '3005' },
    { fullName: 'Bhavani Devi', gender: 'Female', dob: '1994-04-19', address: 'H.No 12/60, Rama Street North Extension, Badvel North', phoneSuffix: '3006', aadhaarSuffix: '3006' },
    { fullName: 'Srinivasaulu Reddy', gender: 'Male', dob: '1983-10-28', address: 'D.No 12/72, Rama Street, Badvel North', phoneSuffix: '3007', aadhaarSuffix: '3007' },
    { fullName: 'Usha Rani', gender: 'Female', dob: '1997-08-08', address: 'H.No 12/84, Rama Street, Badvel North', phoneSuffix: '3008', aadhaarSuffix: '3008' },
    { fullName: 'Praveen Kumar', gender: 'Male', dob: '1991-12-30', address: 'D.No 12/96, Rama Street, Badvel North', phoneSuffix: '3009', aadhaarSuffix: '3009' },
    { fullName: 'Meenakshi Sundaram', gender: 'Female', dob: '1977-02-12', address: 'H.No 12/108, Rama Street, Badvel North', phoneSuffix: '3010', aadhaarSuffix: '3010' },
  ],

  // Station 5: MAIN ROAD (Constituency: CHENNUR, ID: 4)
  5: [
    { fullName: 'Hari Prasad', gender: 'Male', dob: '1975-08-14', address: 'D.No 8/12, Main Road, Chennur Town', phoneSuffix: '4001', aadhaarSuffix: '4001' },
    { fullName: 'Venkata Lakshmi', gender: 'Female', dob: '1983-05-22', address: 'H.No 8/25, Main Road, Near Clock Tower, Chennur', phoneSuffix: '4002', aadhaarSuffix: '4002' },
    { fullName: 'Pratap Reddy', gender: 'Male', dob: '1988-10-17', address: 'D.No 8/38, Main Road, Chennur Town', phoneSuffix: '4003', aadhaarSuffix: '4003' },
    { fullName: 'Kalyani Kumari', gender: 'Female', dob: '1995-02-09', address: 'H.No 8/50, Main Road, Opp SBI, Chennur', phoneSuffix: '4004', aadhaarSuffix: '4004' },
    { fullName: 'Dhanunjaya Rao', gender: 'Male', dob: '1971-06-30', address: 'D.No 8/64, Main Road, Chennur Town', phoneSuffix: '4005', aadhaarSuffix: '4005' },
    { fullName: 'Geetha Vani', gender: 'Female', dob: '1990-12-05', address: 'H.No 8/78, Main Road, Chennur Town', phoneSuffix: '4006', aadhaarSuffix: '4006' },
    { fullName: 'Mahesh Babu C', gender: 'Male', dob: '1984-04-18', address: 'D.No 8/92, Main Road Commercial Area, Chennur', phoneSuffix: '4007', aadhaarSuffix: '4007' },
    { fullName: 'Sujatha Bai', gender: 'Female', dob: '1978-09-26', address: 'H.No 8/105, Main Road, Chennur Town', phoneSuffix: '4008', aadhaarSuffix: '4008' },
    { fullName: 'Anand Kumar', gender: 'Male', dob: '1999-01-11', address: 'D.No 8/118, Main Road, Chennur Town', phoneSuffix: '4009', aadhaarSuffix: '4009' },
    { fullName: 'Shanthi Priya', gender: 'Female', dob: '1993-07-14', address: 'H.No 8/132, Main Road, Chennur Town', phoneSuffix: '4010', aadhaarSuffix: '4010' },
  ],
};

async function generate() {
  console.log('Fetching active polling stations from database...');
  const stations = await prisma.pollingStation.findMany({
    where: { deletedAt: null },
    include: {
      constituency: {
        include: {
          region: true,
        },
      },
    },
    orderBy: { id: 'asc' },
  });

  if (stations.length === 0) {
    throw new Error('No active polling stations found in database.');
  }

  console.log(`Found ${stations.length} polling stations:`);
  stations.forEach((s) => {
    console.log(` - Station ID ${s.id}: ${s.name} (${s.code}) in Constituency: ${s.constituency.name} (ID: ${s.constituencyId})`);
  });

  const allVoters: VoterData[] = [];
  let epicCounter = 1001;

  for (const station of stations) {
    const list = voterSeedData[station.id];
    if (!list) {
      console.warn(`No predefined seeds for station ID ${station.id}, skipping...`);
      continue;
    }

    list.forEach((item, index) => {
      const voterId = `VOT${epicCounter}`;
      const phone = `98480${item.phoneSuffix.padStart(5, '0')}`;
      const aadhaarNumber = `234567${item.aadhaarSuffix.padStart(6, '0')}`;

      allVoters.push({
        fullName: item.fullName,
        voterId,
        constituencyId: station.constituencyId,
        constituencyName: station.constituency.name,
        pollingStationId: station.id,
        pollingStationName: station.name,
        pollingStationCode: station.code,
        serialNumber: index + 1,
        dateOfBirth: item.dob,
        gender: item.gender,
        address: item.address,
        phone,
        aadhaarNumber,
      });

      epicCounter++;
    });
  }

  console.log(`Total voters generated: ${allVoters.length} across ${stations.length} polling stations.`);

  // ─────────────────────────────────────────────────────────────
  // Build Excel Workbook (.xlsx)
  // ─────────────────────────────────────────────────────────────
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Smart EVM Online Voting System';
  workbook.lastModifiedBy = 'Admin';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ─────────────────────────────────────────────────────────────
  // Sheet 1: Master Voters Roster (System Import Compatible)
  // ─────────────────────────────────────────────────────────────
  const rosterSheet = workbook.addWorksheet('Voters Roster', {
    views: [{ showGridLines: true }],
  });

  rosterSheet.columns = [
    { header: 'Full Name *', key: 'fullName', width: 26 },
    { header: 'Voter ID (EPIC) *', key: 'voterId', width: 20 },
    { header: 'Constituency ID *', key: 'constituencyId', width: 18 },
    { header: 'Polling Station ID *', key: 'pollingStationId', width: 22 },
    { header: 'Serial Number', key: 'serialNumber', width: 15 },
    { header: 'Date of Birth (YYYY-MM-DD) *', key: 'dateOfBirth', width: 28 },
    { header: 'Gender (Male/Female/Other) *', key: 'gender', width: 26 },
    { header: 'Address *', key: 'address', width: 44 },
    { header: 'Phone (10 digits)', key: 'phone', width: 20 },
    { header: 'Aadhaar Number (12 digits)', key: 'aadhaarNumber', width: 26 },
  ];

  // Style Header Row
  const rosterHeader = rosterSheet.getRow(1);
  rosterHeader.height = 30;
  rosterHeader.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }, // Deep Blue
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };
  });

  // Add all voter rows to Sheet 1
  allVoters.forEach((v, idx) => {
    const row = rosterSheet.addRow({
      fullName: v.fullName,
      voterId: v.voterId,
      constituencyId: v.constituencyId,
      pollingStationId: v.pollingStationId,
      serialNumber: v.serialNumber,
      dateOfBirth: v.dateOfBirth,
      gender: v.gender,
      address: v.address,
      phone: v.phone,
      aadhaarNumber: v.aadhaarNumber,
    });

    row.height = 24;
    const isEven = idx % 2 === 0;

    row.eachCell((cell, colNum) => {
      cell.font = { size: 10, name: 'Segoe UI' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (!isEven) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }

      // Column-specific alignments
      if ([3, 4, 5].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else if ([2, 6, 7, 9, 10].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Sheet 2: Station-Wise Summary
  // ─────────────────────────────────────────────────────────────
  const summarySheet = workbook.addWorksheet('Station-Wise Summary', {
    views: [{ showGridLines: true }],
  });

  // Title block
  summarySheet.mergeCells('A1:G1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'POLLING STATIONS & REGISTERED VOTERS SUMMARY';
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 36;

  summarySheet.mergeCells('A2:G2');
  const subtitleCell = summarySheet.getCell('A2');
  subtitleCell.value = `Report Generated on ${new Date().toLocaleDateString('en-IN')} | Minimum 10 Voters Configured per Station`;
  subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF334155' }, name: 'Segoe UI' };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 22;

  summarySheet.columns = [
    { header: 'Station ID', key: 'sId', width: 14 },
    { header: 'Station Code', key: 'sCode', width: 18 },
    { header: 'Station Name', key: 'sName', width: 28 },
    { header: 'Constituency ID', key: 'cId', width: 18 },
    { header: 'Constituency Name', key: 'cName', width: 24 },
    { header: 'Station Address', key: 'address', width: 36 },
    { header: 'Voters Count', key: 'count', width: 16 },
  ];

  const sumHeaderRow = summarySheet.getRow(4);
  sumHeaderRow.values = [
    'Station ID',
    'Station Code',
    'Station Name',
    'Constituency ID',
    'Constituency Name',
    'Station Address',
    'Voters in Roster',
  ];
  sumHeaderRow.height = 28;
  sumHeaderRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF64748B' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
    };
  });

  let sumRowIdx = 5;
  for (const st of stations) {
    const stVoters = allVoters.filter((v) => v.pollingStationId === st.id);
    const row = summarySheet.getRow(sumRowIdx);
    row.values = [
      st.id,
      st.code,
      st.name,
      st.constituencyId,
      st.constituency.name,
      st.address,
      stVoters.length,
    ];
    row.height = 24;
    row.eachCell((cell, colNum) => {
      cell.font = { size: 10, name: 'Segoe UI' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if ([1, 2, 4, 7].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      }
      if (colNum === 7) {
        cell.font = { bold: true, color: { argb: 'FF0F766E' } };
      }
    });
    sumRowIdx++;
  }

  // Total summary row
  const totalRow = summarySheet.getRow(sumRowIdx);
  totalRow.values = [
    'TOTAL',
    '',
    `Total Stations: ${stations.length}`,
    '',
    '',
    'All Polling Stations Active',
    allVoters.length,
  ];
  totalRow.height = 26;
  totalRow.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF475569' } },
      bottom: { style: 'medium', color: { argb: 'FF475569' } },
    };
  });
  totalRow.getCell(7).alignment = { vertical: 'middle', horizontal: 'center' };

  // ─────────────────────────────────────────────────────────────
  // Sheets 3 to 6: Station Specific Detailed Sheets
  // ─────────────────────────────────────────────────────────────
  for (const station of stations) {
    const stVoters = allVoters.filter((v) => v.pollingStationId === station.id);
    const cleanSheetName = `Station ${station.id} - ${station.name}`.slice(0, 31);
    const sheet = workbook.addWorksheet(cleanSheetName, {
      views: [{ showGridLines: true }],
    });

    sheet.columns = [
      { header: 'Serial No', key: 'serialNumber', width: 12 },
      { header: 'Full Name', key: 'fullName', width: 24 },
      { header: 'Voter ID (EPIC)', key: 'voterId', width: 18 },
      { header: 'DOB', key: 'dateOfBirth', width: 16 },
      { header: 'Gender', key: 'gender', width: 14 },
      { header: 'Phone Number', key: 'phone', width: 18 },
      { header: 'Aadhaar Number', key: 'aadhaarNumber', width: 22 },
      { header: 'Residential Address', key: 'address', width: 44 },
    ];

    // Banner
    sheet.mergeCells('A1:H1');
    const b1 = sheet.getCell('A1');
    b1.value = `Polling Station: ${station.name} (${station.code}) — Constituency: ${station.constituency.name} (ID: ${station.constituencyId})`;
    b1.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
    b1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Royal Blue
    b1.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(1).height = 32;

    sheet.mergeCells('A2:H2');
    const b2 = sheet.getCell('A2');
    b2.value = `Station Location / Address: ${station.address} | Total Registered Voters in Station: ${stVoters.length}`;
    b2.font = { italic: true, size: 10, color: { argb: 'FF1E293B' }, name: 'Segoe UI' };
    b2.alignment = { vertical: 'middle', horizontal: 'center' };
    sheet.getRow(2).height = 22;

    const stHeader = sheet.getRow(4);
    stHeader.values = [
      'Sl. No',
      'Full Name',
      'Voter ID (EPIC)',
      'Date of Birth',
      'Gender',
      'Phone Number',
      'Aadhaar Number',
      'Residential Address',
    ];
    stHeader.height = 26;
    stHeader.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF93C5FD' } },
        bottom: { style: 'medium', color: { argb: 'FF1D4ED8' } },
      };
    });

    stVoters.forEach((v, idx) => {
      const row = sheet.getRow(5 + idx);
      row.values = [
        v.serialNumber,
        v.fullName,
        v.voterId,
        v.dateOfBirth,
        v.gender,
        v.phone,
        v.aadhaarNumber,
        v.address,
      ];
      row.height = 22;
      const isEven = idx % 2 === 0;

      row.eachCell((cell, colNum) => {
        cell.font = { size: 10, name: 'Segoe UI' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (!isEven) {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF8FAFC' },
          };
        }
        if ([1, 3, 4, 5, 6, 7].includes(colNum)) {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Sheet 7: Reference Data
  // ─────────────────────────────────────────────────────────────
  const refSheet = workbook.addWorksheet('Reference Data', {
    views: [{ showGridLines: true }],
  });

  refSheet.columns = [
    { header: 'Constituency ID', key: 'cId', width: 18 },
    { header: 'Constituency Name', key: 'cName', width: 28 },
    { header: 'Constituency Code', key: 'cCode', width: 20 },
    { header: '', key: 'sep', width: 6 },
    { header: 'Station ID', key: 'sId', width: 16 },
    { header: 'Station Name', key: 'sName', width: 30 },
    { header: 'Station Code', key: 'sCode', width: 18 },
    { header: 'Belongs to Const. ID', key: 'sCId', width: 22 },
  ];

  const refHeader = refSheet.getRow(1);
  refHeader.height = 28;
  refHeader.eachCell((cell, colNum) => {
    if (colNum === 4) return;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' }, // Slate
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  const constituencies = await prisma.constituency.findMany({
    where: { deletedAt: null },
    orderBy: { id: 'asc' },
  });

  const maxRows = Math.max(constituencies.length, stations.length);
  for (let i = 0; i < maxRows; i++) {
    const c = constituencies[i];
    const s = stations[i];
    const row = refSheet.addRow({
      cId: c ? c.id : '',
      cName: c ? c.name : '',
      cCode: c ? c.code : '',
      sep: '',
      sId: s ? s.id : '',
      sName: s ? s.name : '',
      sCode: s ? s.code : '',
      sCId: s ? s.constituencyId : '',
    });
    row.height = 22;
    row.eachCell((cell, colNum) => {
      if (colNum === 4) return;
      cell.font = { size: 10, name: 'Segoe UI' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if ([1, 3, 5, 7, 8].includes(colNum)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Save Excel file to root and server directory
  // ─────────────────────────────────────────────────────────────
  const rootExcelPath = path.resolve(__dirname, '../../voters.xlsx');
  await workbook.xlsx.writeFile(rootExcelPath);
  console.log(`✅ Excel file successfully generated at: ${rootExcelPath}`);

  // ─────────────────────────────────────────────────────────────
  // Also update voters.csv in root for complete consistency
  // ─────────────────────────────────────────────────────────────
  const rootCsvPath = path.resolve(__dirname, '../../voters.csv');
  const csvHeaders = 'Full Name *,Voter ID (EPIC) *,Constituency ID *,Polling Station ID *,Serial Number,Date of Birth (YYYY-MM-DD) *,Gender (Male/Female/Other) *,Address *,Phone (10 digits),Aadhaar Number (12 digits)';
  const csvLines = allVoters.map((v) =>
    `"${v.fullName.replace(/"/g, '""')}","${v.voterId}",${v.constituencyId},${v.pollingStationId},${v.serialNumber},"${v.dateOfBirth}","${v.gender}","${v.address.replace(/"/g, '""')}","${v.phone}","${v.aadhaarNumber}"`
  );
  const csvContent = [csvHeaders, ...csvLines].join('\n') + '\n';
  fs.writeFileSync(rootCsvPath, csvContent, 'utf-8');
  console.log(`✅ CSV file successfully updated at: ${rootCsvPath}`);
}

generate()
  .catch((err) => {
    console.error('Error generating voters file:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
