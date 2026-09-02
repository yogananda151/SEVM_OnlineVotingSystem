import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { prisma } from '../config/database';

export class ReportService {
  // ── Election Summary PDF ─────────────────────────────────────────

  async generateElectionSummaryPDF(electionId: number, res: Response): Promise<void> {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        electionConstituencies: {
          include: {
            constituency: {
              include: {
                candidates: { where: { electionId }, include: { party: true, _count: { select: { votes: true } } } },
                _count: { select: { voters: true } },
              },
            },
          },
        },
      },
    });

    if (!election) throw new Error('Election not found');

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="election-${election.id}-summary.pdf"`);
    doc.pipe(res);

    // Header
    doc.fontSize(20).fillColor('#1a73e8').text('Election Commission of India', { align: 'center' });
    doc.fontSize(16).fillColor('#333').text('ELECTION SUMMARY REPORT', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#666').text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    // Election details
    doc.fontSize(14).fillColor('#1a73e8').text('Election Details');
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1a73e8');
    doc.moveDown(0.3);

    doc.fontSize(11).fillColor('#333');
    doc.text(`Election Name: ${election.name}`);
    doc.text(`Type: ${election.electionType}`);
    doc.text(`Status: ${election.status}`);
    doc.text(`Scheduled: ${new Date(election.scheduledDate).toLocaleDateString('en-IN')}`);
    if (election.startTime) doc.text(`Started: ${new Date(election.startTime).toLocaleString('en-IN')}`);
    if (election.endTime) doc.text(`Ended: ${new Date(election.endTime).toLocaleString('en-IN')}`);
    doc.moveDown(1);

    // Constituencies
    for (const link of election.electionConstituencies) {
      const con = link.constituency;
      if (doc.y > 680) doc.addPage();
      doc.fontSize(13).fillColor('#1a73e8').text(`Constituency: ${con.name} (${con.code})`);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#e0e0e0');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#333');
      doc.text(`Total Voters: ${con._count.voters}`);
      doc.moveDown(0.5);

      // Candidates table header
      doc.fontSize(10).fillColor('#fff').rect(50, doc.y, 495, 18).fill('#1a73e8');
      const yHead = doc.y - 14;
      doc.fillColor('#fff').text('#', 55, yHead).text('Candidate', 80, yHead).text('Party', 280, yHead).text('Votes', 470, yHead);
      doc.moveDown(0.3);

      for (const cand of con.candidates) {
        if (doc.y > 700) doc.addPage();
        const yRow = doc.y;
        doc.fontSize(10).fillColor('#333');
        doc.text(String(cand.serialNumber), 55, yRow);
        doc.text(cand.fullName.substring(0, 28), 80, yRow);
        doc.text((cand.party?.name ?? 'Independent').substring(0, 22), 280, yRow);
        doc.text(String(cand._count.votes), 470, yRow);
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#f0f0f0');
      }
      doc.moveDown(0.8);
    }

    doc.fontSize(9).fillColor('#999').text('OFFICIAL DOCUMENT – ELECTION COMMISSION OF INDIA', { align: 'center' });
    doc.end();
  }

  // ── Election Results Excel ────────────────────────────────────────

  async generateResultsExcel(electionId: number, res: Response): Promise<void> {
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        electionConstituencies: {
          include: {
            constituency: {
              include: {
                candidates: {
                  where: { electionId },
                  include: { party: true, _count: { select: { votes: true } } },
                  orderBy: { votes: { _count: 'desc' } },
                },
              },
            },
          },
        },
      },
    });
    if (!election) throw new Error('Election not found');

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Smart EVM System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Election Results');

    // Title
    sheet.mergeCells('A1:F1');
    sheet.getCell('A1').value = `Election Results – ${election.name}`;
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF1A73E8' } };
    sheet.getCell('A1').alignment = { horizontal: 'center' };

    sheet.mergeCells('A2:F2');
    sheet.getCell('A2').value = `Generated: ${new Date().toLocaleString('en-IN')}`;
    sheet.getCell('A2').alignment = { horizontal: 'center' };

    let row = 4;

    for (const link of election.electionConstituencies) {
      const con = link.constituency;
      sheet.getCell(`A${row}`).value = `Constituency: ${con.name} (${con.code})`;
      sheet.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: 'FF1A73E8' } };
      row++;

      const headerRow = sheet.getRow(row);
      ['#', 'Candidate Name', 'Party', 'Abbreviation', 'Votes', 'Winner'].forEach((h, i) => {
        headerRow.getCell(i + 1).value = h;
        headerRow.getCell(i + 1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.getCell(i + 1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
      });
      row++;

      const maxVotes = con.candidates.reduce((max: number, c: { _count: { votes: number } }) => Math.max(max, c._count.votes), 0);

      for (const cand of con.candidates) {
        const dataRow = sheet.getRow(row);
        const isWinner = election.isResultPublished && cand._count.votes === maxVotes;
        dataRow.getCell(1).value = cand.serialNumber;
        dataRow.getCell(2).value = cand.fullName;
        dataRow.getCell(3).value = cand.party?.name ?? 'Independent';
        dataRow.getCell(4).value = cand.party?.abbreviation ?? 'IND';
        dataRow.getCell(5).value = election.isResultPublished ? cand._count.votes : 'Locked';
        dataRow.getCell(6).value = isWinner ? '🏆 Winner' : '';
        if (isWinner) {
          dataRow.eachCell((cell) => {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
          });
        }
        row++;
      }
      row += 2;
    }

    // Column widths
    sheet.columns = [
      { width: 5 }, { width: 30 }, { width: 35 }, { width: 12 }, { width: 12 }, { width: 15 },
    ];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="election-${electionId}-results.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ── Voters List Excel ─────────────────────────────────────────────

  async generateVotersExcel(pollingStationId: number, res: Response): Promise<void> {
    const voters = await prisma.voter.findMany({
      where: { pollingStationId, deletedAt: null },
      include: { pollingStation: { select: { name: true, code: true } } },
      orderBy: { serialNumber: 'asc' },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Voters List');

    sheet.columns = [
      { header: '#', key: 'serial', width: 5 },
      { header: 'Full Name', key: 'name', width: 30 },
      { header: 'Voter ID', key: 'voterId', width: 20 },
      { header: 'Date of Birth', key: 'dob', width: 15 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Has Voted', key: 'voted', width: 12 },
      { header: 'Voted At', key: 'votedAt', width: 20 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A73E8' } };
    });

    for (const voter of voters) {
      const row = sheet.addRow({
        serial: voter.serialNumber,
        name: voter.fullName,
        voterId: voter.voterId,
        dob: new Date(voter.dateOfBirth).toLocaleDateString('en-IN'),
        gender: voter.gender,
        address: voter.address,
        voted: voter.hasVoted ? 'Yes' : 'No',
        votedAt: voter.votedAt ? new Date(voter.votedAt).toLocaleString('en-IN') : '-',
      });
      if (voter.hasVoted) {
        row.getCell('voted').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="voters-station-${pollingStationId}.xlsx"`);
    await workbook.xlsx.write(res);
    res.end();
  }

  // ── Audit Log PDF ─────────────────────────────────────────────────

  async generateAuditLogPDF(filters: { startDate?: Date; endDate?: Date }, res: Response): Promise<void> {
    const logs = await prisma.auditLog.findMany({
      where: {
        ...(filters.startDate && { createdAt: { gte: filters.startDate } }),
        ...(filters.endDate && { createdAt: { lte: filters.endDate } }),
      },
      include: { user: { select: { email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-log.pdf"');
    doc.pipe(res);

    doc.fontSize(18).fillColor('#1a73e8').text('AUDIT LOG REPORT', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString('en-IN')}`, { align: 'center' });
    doc.moveDown(1);

    for (const log of logs) {
      if (doc.y > 730) doc.addPage();
      doc.fontSize(9).fillColor('#333');
      doc.text(`[${new Date(log.createdAt).toLocaleString('en-IN')}] ${log.action} – ${log.module}`, { continued: false });
      doc.fillColor('#666').text(`  User: ${log.user?.email ?? 'System'} | ${log.description}`);
      doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).stroke('#f0f0f0');
      doc.moveDown(0.3);
    }

    doc.end();
  }
}

export const reportService = new ReportService();
