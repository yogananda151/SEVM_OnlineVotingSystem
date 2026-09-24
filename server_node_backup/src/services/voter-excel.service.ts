import ExcelJS from 'exceljs';
import { Response } from 'express';
import { prisma } from '../config/database';
import { hashAadhaar } from '../utils/crypto';
import { AppError } from '../middleware/error.middleware';

export interface ParsedVoterRow {
  fullName: string;
  voterId: string;
  constituencyId: number;
  pollingStationId: number;
  serialNumber: number;
  dateOfBirth: Date;
  gender: string;
  address: string;
  phone?: string;
  aadhaarHash?: string;
}

export interface ExcelImportResult {
  totalRows: number;
  validRowsCount: number;
  importedCount: number;
  skippedDuplicatesCount: number;
  duplicateVoterIds: string[];
  errors: string[];
  validVoters: ParsedVoterRow[];
}

export class VoterExcelService {
  /**
   * Generates a styled Excel template (.xlsx) with:
   * 1. 'Voters Roster' sheet with formatted headers & sample rows
   * 2. 'Reference - Stations & IDs' sheet with live constituencies and polling stations
   */
  async generateTemplate(res: Response): Promise<void> {
    const constituencies = await prisma.constituency.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { id: 'asc' },
    });

    const pollingStations = await prisma.pollingStation.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true, constituencyId: true },
      orderBy: { id: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart EVM System';
    workbook.created = new Date();

    // ── Sheet 1: Voters Roster ───────────────────────────────────────
    const rosterSheet = workbook.addWorksheet('Voters Roster', {
      views: [{ showGridLines: true }],
    });

    rosterSheet.columns = [
      { header: 'Full Name *', key: 'fullName', width: 26 },
      { header: 'Voter ID (EPIC) *', key: 'voterId', width: 22 },
      { header: 'Constituency ID *', key: 'constituencyId', width: 18 },
      { header: 'Polling Station ID *', key: 'pollingStationId', width: 20 },
      { header: 'Serial Number', key: 'serialNumber', width: 15 },
      { header: 'Date of Birth (YYYY-MM-DD) *', key: 'dateOfBirth', width: 28 },
      { header: 'Gender (Male/Female/Other) *', key: 'gender', width: 26 },
      { header: 'Address *', key: 'address', width: 35 },
      { header: 'Phone (10 digits)', key: 'phone', width: 18 },
      { header: 'Aadhaar Number (12 digits)', key: 'aadhaarNumber', width: 26 },
    ];

    const headerRow = rosterSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }, // Deep indigo/blue
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      };
    });

    // Sample data rows
    const sampleConstituencyId = constituencies[0]?.id || 1;
    const sampleStationId = pollingStations[0]?.id || 1;

    const samples = [
      {
        fullName: 'Ravi Kumar',
        voterId: 'AP/01/001/0101',
        constituencyId: sampleConstituencyId,
        pollingStationId: sampleStationId,
        serialNumber: 1,
        dateOfBirth: '1995-04-12',
        gender: 'Male',
        address: 'H.No 4-12, Main Bazar, Guntur',
        phone: '9876543210',
        aadhaarNumber: '234567890123',
      },
      {
        fullName: 'Lakshmi Devi',
        voterId: 'AP/01/001/0102',
        constituencyId: sampleConstituencyId,
        pollingStationId: sampleStationId,
        serialNumber: 2,
        dateOfBirth: '1998-09-24',
        gender: 'Female',
        address: 'Plot 18, Gandhi Nagar, Guntur',
        phone: '9876543211',
        aadhaarNumber: '234567890124',
      },
      {
        fullName: 'Suresh Babu',
        voterId: 'AP/01/001/0103',
        constituencyId: sampleConstituencyId,
        pollingStationId: sampleStationId,
        serialNumber: 3,
        dateOfBirth: '1990-11-05',
        gender: 'Male',
        address: 'Near Old Bus Stand, Guntur',
        phone: '9876543212',
        aadhaarNumber: '234567890125',
      },
    ];

    samples.forEach((item) => {
      const row = rosterSheet.addRow(item);
      row.height = 22;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
      });
    });

    // ── Sheet 2: Reference Data ──────────────────────────────────────
    const refSheet = workbook.addWorksheet('Reference Data', {
      views: [{ showGridLines: true }],
    });

    refSheet.columns = [
      { header: 'Constituency ID', key: 'cId', width: 16 },
      { header: 'Constituency Name', key: 'cName', width: 26 },
      { header: 'Constituency Code', key: 'cCode', width: 18 },
      { header: '', key: 'sep', width: 5 },
      { header: 'Station ID', key: 'sId', width: 14 },
      { header: 'Station Name', key: 'sName', width: 30 },
      { header: 'Station Code', key: 'sCode', width: 16 },
      { header: 'Belongs to Const. ID', key: 'sCId', width: 22 },
    ];

    const refHeader = refSheet.getRow(1);
    refHeader.height = 26;
    refHeader.eachCell((cell, colNum) => {
      if (colNum === 4) return;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' }, // Slate
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const maxRows = Math.max(constituencies.length, pollingStations.length);
    for (let i = 0; i < maxRows; i++) {
      const c = constituencies[i];
      const s = pollingStations[i];
      refSheet.addRow({
        cId: c ? c.id : '',
        cName: c ? c.name : '',
        cCode: c ? c.code : '',
        sep: '',
        sId: s ? s.id : '',
        sName: s ? s.name : '',
        sCode: s ? s.code : '',
        sCId: s ? s.constituencyId : '',
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="voter_registration_template.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Helper to parse and normalize date from Excel cells
   */
  private parseDateCell(raw: unknown): Date | null {
    if (!raw) return null;
    if (raw instanceof Date && !isNaN(raw.getTime())) return raw;

    if (typeof raw === 'number') {
      // Excel serial date format
      const utcDays = Math.floor(raw - 25569);
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      return isNaN(dateInfo.getTime()) ? null : dateInfo;
    }

    if (typeof raw === 'string') {
      const clean = raw.trim();
      // Try YYYY-MM-DD
      const isoParsed = Date.parse(clean);
      if (!isNaN(isoParsed)) return new Date(isoParsed);

      // Try DD/MM/YYYY or DD-MM-YYYY
      const parts = clean.split(/[/\-.]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (!isNaN(d.getTime())) return d;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          const d = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    return null;
  }

  /**
   * Parses Excel file buffer (.xlsx or .csv), applies normalization,
   * validates rows, ensures internal and database-level deduplication
   * ("add each member once"), and returns validated voters.
   */
  async parseAndValidateExcel(
    buffer: Buffer,
    defaultConstituencyId?: number,
    defaultPollingStationId?: number,
  ): Promise<ExcelImportResult> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
      // Fallback: try CSV if xlsx loader fails
      try {
        const stream = require('stream');
        const bufferStream = new stream.PassThrough();
        bufferStream.end(buffer as any);
        await workbook.csv.read(bufferStream);
      } catch (err: any) {
        throw new AppError('Failed to parse spreadsheet. Please upload a valid .xlsx or .csv file.', 400);
      }
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      throw new AppError('The uploaded sheet is empty or contains no data rows.', 400);
    }

    // ── Map header row (Row 1) ─────────────────────────────────────────
    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNum) => {
      const val = String(cell.value || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '');

      if (['fullname', 'name', 'votername'].some((k) => val.includes(k))) {
        colMap.fullName = colNum;
      } else if (['voterid', 'epic', 'epicno', 'epicnumber', 'cardno'].some((k) => val.includes(k))) {
        colMap.voterId = colNum;
      } else if (['constituencyid', 'constituency'].some((k) => val.includes(k))) {
        colMap.constituencyId = colNum;
      } else if (['pollingstationid', 'stationid', 'boothid', 'station'].some((k) => val.includes(k))) {
        colMap.pollingStationId = colNum;
      } else if (['serialnumber', 'serialno', 'slno', 'serial'].some((k) => val.includes(k))) {
        colMap.serialNumber = colNum;
      } else if (['dateofbirth', 'dob', 'birthdate'].some((k) => val.includes(k))) {
        colMap.dateOfBirth = colNum;
      } else if (['gender', 'sex'].some((k) => val.includes(k))) {
        colMap.gender = colNum;
      } else if (['address', 'residentialaddress'].some((k) => val.includes(k))) {
        colMap.address = colNum;
      } else if (['phone', 'mobile', 'contact'].some((k) => val.includes(k))) {
        colMap.phone = colNum;
      } else if (['aadhaar', 'aadhar', 'aadhaarnumber'].some((k) => val.includes(k))) {
        colMap.aadhaarNumber = colNum;
      }
    });

    if (!colMap.fullName || !colMap.voterId) {
      throw new AppError(
        'Could not find required columns. Please ensure columns include "Full Name" and "Voter ID" (or download our template).',
        400,
      );
    }

    const errors: string[] = [];
    const duplicateVoterIds: string[] = [];
    const seenInFile = new Set<string>();
    const rawCandidates: Array<{
      rowNumber: number;
      fullName: string;
      voterId: string;
      constituencyId: number;
      pollingStationId: number;
      serialNumber: number;
      dateOfBirth: Date;
      gender: string;
      address: string;
      phone?: string;
      aadhaarNumber?: string;
    }> = [];

    const today = new Date();

    // Iterate data rows starting from row 2
    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      // Skip completely empty rows
      let hasData = false;
      row.eachCell(() => {
        hasData = true;
      });
      if (!hasData) continue;

      const getVal = (col?: number): string => {
        if (!col) return '';
        const cell = row.getCell(col);
        if (cell.value === null || cell.value === undefined) return '';
        if (typeof cell.value === 'object') {
          // If rich text or formula
          const textObj = cell.value as any;
          return String(textObj.result ?? textObj.text ?? textObj.richText?.[0]?.text ?? '').trim();
        }
        return String(cell.value).trim();
      };

      const fullName = getVal(colMap.fullName);
      const voterId = getVal(colMap.voterId).toUpperCase();

      if (!fullName && !voterId) continue; // skip blank row

      if (!fullName || fullName.length < 2) {
        errors.push(`Row ${r}: Full Name is required (minimum 2 characters).`);
        continue;
      }

      if (!voterId || voterId.length < 4) {
        errors.push(`Row ${r}: Voter ID (EPIC) is required.`);
        continue;
      }

      // Check for in-file duplicates ("Add each member once")
      if (seenInFile.has(voterId)) {
        duplicateVoterIds.push(voterId);
        // Skip duplicate row so each member is added once
        continue;
      }
      seenInFile.add(voterId);

      // Constituency & Polling Station IDs (fall back to default if provided)
      const rawCId = getVal(colMap.constituencyId);
      const parsedCId = rawCId ? Number(rawCId) : defaultConstituencyId;
      if (!parsedCId || isNaN(parsedCId)) {
        errors.push(`Row ${r}: Constituency ID is missing or invalid.`);
        continue;
      }

      const rawSId = getVal(colMap.pollingStationId);
      const parsedSId = rawSId ? Number(rawSId) : defaultPollingStationId;
      if (!parsedSId || isNaN(parsedSId)) {
        errors.push(`Row ${r}: Polling Station ID is missing or invalid.`);
        continue;
      }

      // Serial number
      const rawSerial = getVal(colMap.serialNumber);
      const serialNumber = Number(rawSerial) > 0 ? Number(rawSerial) : rawCandidates.length + 1;

      // Date of birth & Age validation (18+)
      const cellDob = colMap.dateOfBirth ? row.getCell(colMap.dateOfBirth).value : null;
      const dob = this.parseDateCell(cellDob);
      if (!dob) {
        errors.push(`Row ${r}: Valid Date of Birth is required.`);
        continue;
      }
      const age = today.getFullYear() - dob.getFullYear();
      if (age < 18 || dob >= today) {
        errors.push(`Row ${r}: Voter must be at least 18 years old.`);
        continue;
      }

      // Gender normalization
      let rawGender = getVal(colMap.gender).toLowerCase();
      let gender = 'Other';
      if (rawGender.startsWith('m')) gender = 'Male';
      else if (rawGender.startsWith('f')) gender = 'Female';
      else if (rawGender.startsWith('o')) gender = 'Other';

      // Address
      const address = getVal(colMap.address);
      if (!address || address.length < 3) {
        errors.push(`Row ${r}: Address is required.`);
        continue;
      }

      // Optional fields
      const phone = getVal(colMap.phone) || undefined;
      const rawAadhaar = getVal(colMap.aadhaarNumber).replace(/\D/g, '');
      const aadhaarNumber = rawAadhaar.length === 12 ? rawAadhaar : undefined;

      rawCandidates.push({
        rowNumber: r,
        fullName,
        voterId,
        constituencyId: parsedCId,
        pollingStationId: parsedSId,
        serialNumber,
        dateOfBirth: dob,
        gender,
        address,
        phone,
        aadhaarNumber,
      });
    }

    if (rawCandidates.length === 0 && errors.length > 0) {
      throw new AppError(`Validation failed:\n${errors.slice(0, 5).join('\n')}`, 422);
    }

    // ── Database-level deduplication ───────────────────────────────────
    // Query existing voters to ensure "add each member once"
    const allFileVoterIds = rawCandidates.map((c) => c.voterId);
    const existingVoters = await prisma.voter.findMany({
      where: { voterId: { in: allFileVoterIds }, deletedAt: null },
      select: { voterId: true },
    });
    const existingSet = new Set(existingVoters.map((v) => v.voterId.toUpperCase()));

    const validVoters: ParsedVoterRow[] = [];
    for (const c of rawCandidates) {
      if (existingSet.has(c.voterId)) {
        duplicateVoterIds.push(c.voterId);
        continue;
      }

      validVoters.push({
        fullName: c.fullName,
        voterId: c.voterId,
        constituencyId: c.constituencyId,
        pollingStationId: c.pollingStationId,
        serialNumber: c.serialNumber,
        dateOfBirth: c.dateOfBirth,
        gender: c.gender,
        address: c.address,
        phone: c.phone,
        aadhaarHash: c.aadhaarNumber ? hashAadhaar(c.aadhaarNumber) : undefined,
      });
    }

    return {
      totalRows: worksheet.rowCount - 1,
      validRowsCount: rawCandidates.length,
      importedCount: validVoters.length,
      skippedDuplicatesCount: duplicateVoterIds.length,
      duplicateVoterIds,
      errors,
      validVoters,
    };
  }
}

export const voterExcelService = new VoterExcelService();
