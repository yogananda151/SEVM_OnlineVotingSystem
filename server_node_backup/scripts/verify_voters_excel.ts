import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import { voterExcelService } from '../src/services/voter-excel.service';
import { prisma } from '../src/config/database';

async function verify() {
  const excelPath = path.resolve(__dirname, '../../voters.xlsx');
  console.log(`Checking ${excelPath}...`);

  if (!fs.existsSync(excelPath)) {
    throw new Error('voters.xlsx does not exist!');
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(excelPath);

  console.log(`\nWorkbook contains ${workbook.worksheets.length} sheets:`);
  workbook.worksheets.forEach((ws, i) => {
    console.log(` Sheet ${i + 1}: "${ws.name}" (${ws.rowCount} rows)`);
  });

  const buffer = fs.readFileSync(excelPath);
  console.log(`\nTesting parseAndValidateExcel with voters.xlsx buffer (${buffer.length} bytes)...`);

  const result = await voterExcelService.parseAndValidateExcel(buffer);

  console.log('\n--- Parse & Validation Result ---');
  console.log('Total rows in sheet:', result.totalRows);
  console.log('Valid rows count:', result.validRowsCount);
  console.log('Ready to import count:', result.importedCount);
  console.log('Duplicate voter IDs count:', result.skippedDuplicatesCount);
  console.log('Errors:', result.errors);

  if (result.errors.length > 0) {
    console.error('Validation errors found:', result.errors);
    process.exit(1);
  }

  console.log('\nSample parsed voter:', JSON.stringify(result.validVoters[0], null, 2));
  console.log('\nStation breakdown of valid parsed voters:');
  const stationCounts: Record<number, number> = {};
  for (const v of result.validVoters) {
    stationCounts[v.pollingStationId] = (stationCounts[v.pollingStationId] || 0) + 1;
  }
  for (const [sId, count] of Object.entries(stationCounts)) {
    console.log(` Station ID ${sId}: ${count} voters`);
  }

  console.log('\n🎉 Verification passed with 100% SUCCESS!');
}

verify()
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
