import ExcelJS from 'exceljs';
import { Response } from 'express';
import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';

export interface ParsedCandidateRow {
  fullName: string;
  serialNumber: number;
  age: number;
  qualification?: string;
  isIndependent: boolean;
  partyId?: number;
  constituencyId: number;
  electionId: number;
}

export interface CandidateExcelImportResult {
  totalRows: number;
  validRowsCount: number;
  importedCount: number;
  skippedDuplicatesCount: number;
  duplicateCandidateNames: string[];
  errors: string[];
  validCandidates: ParsedCandidateRow[];
}

export class CandidateExcelService {
  async generateTemplate(res: Response): Promise<void> {
    const constituencies = await prisma.constituency.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { id: 'asc' },
    });

    const parties = await prisma.politicalParty.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, abbreviation: true },
      orderBy: { id: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart EVM System';
    workbook.created = new Date();

    const rosterSheet = workbook.addWorksheet('Candidates', {
      views: [{ showGridLines: true }],
    });

    rosterSheet.columns = [
      { header: 'Full Name *', key: 'fullName', width: 26 },
      { header: 'Age *', key: 'age', width: 10 },
      { header: 'Serial Number', key: 'serialNumber', width: 15 },
      { header: 'Qualification', key: 'qualification', width: 25 },
      { header: 'Independent (Yes/No) *', key: 'isIndependent', width: 22 },
      { header: 'Party ID (If not Independent)', key: 'partyId', width: 26 },
      { header: 'Constituency ID *', key: 'constituencyId', width: 18 },
    ];

    const headerRow = rosterSheet.getRow(1);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF10B981' }, // Emerald
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      };
    });

    const sampleConstituencyId = constituencies[0]?.id || 1;
    const samplePartyId = parties[0]?.id || 1;

    const samples = [
      {
        fullName: 'Jane Doe',
        age: 45,
        serialNumber: 1,
        qualification: 'B.A.',
        isIndependent: 'No',
        partyId: samplePartyId,
        constituencyId: sampleConstituencyId,
      },
      {
        fullName: 'John Smith',
        age: 50,
        serialNumber: 2,
        qualification: 'M.Sc.',
        isIndependent: 'Yes',
        partyId: '',
        constituencyId: sampleConstituencyId,
      },
    ];

    samples.forEach((item) => {
      const row = rosterSheet.addRow(item);
      row.height = 22;
      row.eachCell((cell) => {
        cell.alignment = { vertical: 'middle' };
      });
    });

    const refSheet = workbook.addWorksheet('Reference Data', {
      views: [{ showGridLines: true }],
    });

    refSheet.columns = [
      { header: 'Constituency ID', key: 'cId', width: 16 },
      { header: 'Constituency Name', key: 'cName', width: 26 },
      { header: '', key: 'sep', width: 5 },
      { header: 'Party ID', key: 'pId', width: 14 },
      { header: 'Party Name', key: 'pName', width: 30 },
      { header: 'Party Abbr', key: 'pAbbr', width: 16 },
    ];

    const refHeader = refSheet.getRow(1);
    refHeader.height = 26;
    refHeader.eachCell((cell, colNum) => {
      if (colNum === 3) return;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });

    const maxRows = Math.max(constituencies.length, parties.length);
    for (let i = 0; i < maxRows; i++) {
      const c = constituencies[i];
      const p = parties[i];
      refSheet.addRow({
        cId: c ? c.id : '',
        cName: c ? c.name : '',
        sep: '',
        pId: p ? p.id : '',
        pName: p ? p.name : '',
        pAbbr: p ? p.abbreviation : '',
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="candidate_template.xlsx"',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  async parseAndValidateExcel(
    buffer: Buffer,
    electionId: number,
    defaultConstituencyId?: number,
  ): Promise<CandidateExcelImportResult> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as any);
    } catch {
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

    const headerRow = worksheet.getRow(1);
    const colMap: Record<string, number> = {};

    headerRow.eachCell((cell, colNum) => {
      const val = String(cell.value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (['fullname', 'name', 'candidatename'].some((k) => val.includes(k))) colMap.fullName = colNum;
      else if (['age'].some((k) => val.includes(k))) colMap.age = colNum;
      else if (['serialnumber', 'serialno'].some((k) => val.includes(k))) colMap.serialNumber = colNum;
      else if (['qualification'].some((k) => val.includes(k))) colMap.qualification = colNum;
      else if (['independent', 'isindependent'].some((k) => val.includes(k))) colMap.isIndependent = colNum;
      else if (['partyid', 'party'].some((k) => val.includes(k))) colMap.partyId = colNum;
      else if (['constituencyid', 'constituency'].some((k) => val.includes(k))) colMap.constituencyId = colNum;
    });

    if (!colMap.fullName) {
      throw new AppError('Could not find "Full Name" column.', 400);
    }

    const errors: string[] = [];
    const duplicateCandidateNames: string[] = [];
    const seenInFile = new Set<string>();
    const rawCandidates: ParsedCandidateRow[] = [];

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const row = worksheet.getRow(r);
      let hasData = false;
      row.eachCell(() => { hasData = true; });
      if (!hasData) continue;

      const getVal = (col?: number): string => {
        if (!col) return '';
        const cell = row.getCell(col);
        if (cell.value === null || cell.value === undefined) return '';
        if (typeof cell.value === 'object') {
          const textObj = cell.value as any;
          return String(textObj.result ?? textObj.text ?? textObj.richText?.[0]?.text ?? '').trim();
        }
        return String(cell.value).trim();
      };

      const fullName = getVal(colMap.fullName);
      if (!fullName) continue;

      if (fullName.length < 2) {
        errors.push(`Row ${r}: Full Name must be at least 2 characters.`);
        continue;
      }

      const rawCId = getVal(colMap.constituencyId);
      const parsedCId = rawCId ? Number(rawCId) : defaultConstituencyId;
      if (!parsedCId || isNaN(parsedCId)) {
        errors.push(`Row ${r}: Constituency ID is missing.`);
        continue;
      }

      const key = `${fullName.toLowerCase()}-${parsedCId}`;
      if (seenInFile.has(key)) {
        duplicateCandidateNames.push(fullName);
        continue;
      }
      seenInFile.add(key);

      const ageStr = getVal(colMap.age);
      const age = Number(ageStr);
      if (!age || isNaN(age) || age < 18) {
        errors.push(`Row ${r}: Age must be a number >= 18.`);
        continue;
      }

      const serialStr = getVal(colMap.serialNumber);
      const serialNumber = Number(serialStr) > 0 ? Number(serialStr) : rawCandidates.length + 1;

      const isIndepStr = getVal(colMap.isIndependent).toLowerCase();
      const isIndependent = isIndepStr.startsWith('y') || isIndepStr === 'true' || isIndepStr === '1';

      let partyId: number | undefined;
      if (!isIndependent) {
        const pIdStr = getVal(colMap.partyId);
        partyId = Number(pIdStr);
        if (!partyId || isNaN(partyId)) {
          errors.push(`Row ${r}: Party ID is required if not independent.`);
          continue;
        }
      }

      rawCandidates.push({
        fullName,
        serialNumber,
        age,
        qualification: getVal(colMap.qualification) || undefined,
        isIndependent,
        partyId,
        constituencyId: parsedCId,
        electionId,
      });
    }

    if (rawCandidates.length === 0 && errors.length > 0) {
      throw new AppError(`Validation failed:\n${errors.slice(0, 5).join('\n')}`, 422);
    }

    // Check DB duplicates for same name in same constituency for this election
    const existingCandidates = await prisma.candidate.findMany({
      where: {
        electionId,
        deletedAt: null,
      },
      select: { fullName: true, constituencyId: true, partyId: true },
    });

    const partyConstituencyMap = new Map<string, string>();
    existingCandidates.forEach(c => {
      if (c.partyId) {
        partyConstituencyMap.set(`${c.partyId}-${c.constituencyId}`, c.fullName);
      }
    });

    const existingSet = new Set(existingCandidates.map(c => `${c.fullName.toLowerCase()}-${c.constituencyId}`));
    const validCandidates: ParsedCandidateRow[] = [];

    for (const c of rawCandidates) {
      if (existingSet.has(`${c.fullName.toLowerCase()}-${c.constituencyId}`)) {
        duplicateCandidateNames.push(c.fullName);
        continue;
      }

      if (!c.isIndependent && c.partyId) {
        const pKey = `${c.partyId}-${c.constituencyId}`;
        if (partyConstituencyMap.has(pKey)) {
          errors.push(`Party ID ${c.partyId} already has a candidate in Constituency ID ${c.constituencyId}.`);
          continue;
        }
        partyConstituencyMap.set(pKey, c.fullName);
      }

      validCandidates.push(c);
    }

    return {
      totalRows: worksheet.rowCount - 1,
      validRowsCount: rawCandidates.length,
      importedCount: validCandidates.length,
      skippedDuplicatesCount: duplicateCandidateNames.length,
      duplicateCandidateNames,
      errors,
      validCandidates,
    };
  }
}

export const candidateExcelService = new CandidateExcelService();
