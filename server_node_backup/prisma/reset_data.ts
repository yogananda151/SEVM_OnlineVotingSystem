import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

async function resetData() {
  console.log('🔄 Fetching all tables in the database...');

  const tablesResult: Array<Record<string, string>> = await prisma.$queryRawUnsafe('SHOW TABLES;');
  
  // Extract table names
  const tableNames = tablesResult
    .map(row => Object.values(row)[0])
    .filter(name => name !== '_prisma_migrations');

  console.log(`📋 Found ${tableNames.length} data tables to clear:`);
  console.log(tableNames.join(', '));

  console.log('\n⏳ Disabling foreign key checks and truncating tables...');
  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 0;');

  for (const table of tableNames) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${table}\`;`);
    console.log(`  ✓ Truncated table: ${table}`);
  }

  await prisma.$executeRawUnsafe('SET FOREIGN_KEY_CHECKS = 1;');
  console.log('✅ All data truncated successfully. Tables and schema preserved.');

  console.log('\n🌱 Running seed script to populate initial demo data...');
  execSync('npx tsx prisma/seed.ts', {
    cwd: process.cwd(),
    stdio: 'inherit',
  });

  console.log('\n✨ Database reset and re-seeded successfully!');
}

resetData()
  .catch((err) => {
    console.error('❌ Error resetting data:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
