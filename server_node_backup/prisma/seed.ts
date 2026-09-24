import { PrismaClient, UserRole, ElectionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Settings ─────────────────────────────────────────────
  await prisma.setting.createMany({
    data: [
      { key: 'app_name', value: 'Smart EVM – Online Voting System', group: 'general', label: 'Application Name' },
      { key: 'app_logo', value: '', group: 'general', label: 'Application Logo URL' },
      { key: 'otp_expiry_minutes', value: '5', group: 'security', label: 'OTP Expiry (minutes)' },
      { key: 'session_timeout_minutes', value: '480', group: 'security', label: 'Session Timeout (minutes)' },
      { key: 'vvpat_display_seconds', value: '7', group: 'voting', label: 'VVPAT Display Duration (seconds)' },
      { key: 'max_login_attempts', value: '5', group: 'security', label: 'Max Login Attempts' },
    ],
    skipDuplicates: true,
  });

  // ── Commissioner ──────────────────────────────────────────
  const commHash = await bcrypt.hash('Admin@12345', 12);
  const commUser = await prisma.user.upsert({
    where: { email: 'commissioner@evm.gov.in' },
    update: {},
    create: {
      email: 'commissioner@evm.gov.in',
      passwordHash: commHash,
      role: UserRole.COMMISSIONER,
      commissioner: {
        create: {
          fullName: 'Chief Election Commissioner',
          employeeId: 'ECI-0001',
          phone: '+91-9000000001',
          designation: 'Chief Election Commissioner',
        },
      },
    },
  });
  console.log('✅ Commissioner created:', commUser.email);

  // ── Political Parties ─────────────────────────────────────
  const party1 = await prisma.politicalParty.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'National Democratic Alliance',
      abbreviation: 'NDA',
      symbol: 'Lotus',
      color: '#FF6B35',
      foundedYear: 1998,
    },
  });

  const party2 = await prisma.politicalParty.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'United Progressive Alliance',
      abbreviation: 'UPA',
      symbol: 'Hand',
      color: '#2196F3',
      foundedYear: 2004,
    },
  });

  const party3 = await prisma.politicalParty.upsert({
    where: { id: 3 },
    update: {},
    create: {
      name: 'People\'s Progressive Party',
      abbreviation: 'PPP',
      symbol: 'Rising Sun',
      color: '#4CAF50',
      foundedYear: 2010,
    },
  });
  console.log('✅ Parties created');

  // ── Election ──────────────────────────────────────────────
  const election = await prisma.election.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'General Elections 2025',
      description: 'Indian General Elections – Lok Sabha 2025',
      electionType: 'General',
      scheduledDate: new Date('2025-04-15'),
      status: ElectionStatus.DRAFT,
    },
  });
  console.log('✅ Election created');

  // ── Region ────────────────────────────────────────────────
  const region = await prisma.region.upsert({
    where: { code: 'REG-DL' },
    update: {},
    create: {
      name: 'National Capital Territory of Delhi',
      code: 'REG-DL',
      description: 'Delhi NCT Region',
      isActive: true,
    },
  });
  console.log('✅ Region created');

  // ── Constituency ──────────────────────────────────────────
  const constituency = await prisma.constituency.upsert({
    where: { code: 'DL-01' },
    update: {},
    create: {
      regionId: region.id,
      name: 'Central Delhi',
      code: 'DL-01',
      description: 'Central Delhi Parliamentary Constituency',
      isActive: true,
    },
  });
  console.log('✅ Constituency created');

  // ── Link Election & Constituency ──────────────────────────
  await prisma.electionConstituency.upsert({
    where: {
      electionId_constituencyId: {
        electionId: election.id,
        constituencyId: constituency.id,
      },
    },
    update: {},
    create: {
      electionId: election.id,
      constituencyId: constituency.id,
    },
  });
  console.log('✅ Election constituency link created');

  // ── Polling Station ───────────────────────────────────────
  const station = await prisma.pollingStation.upsert({
    where: { code: 'PS-DL-001' },
    update: {},
    create: {
      constituencyId: constituency.id,
      name: 'Government Primary School – Booth 1',
      code: 'PS-DL-001',
      address: '12, Rajendra Prasad Road, New Delhi – 110001',
      totalBooths: 1,
    },
  });
  console.log('✅ Polling station created');

  // ── Election Officer ──────────────────────────────────────
  const officerHash = await bcrypt.hash('Officer@12345', 12);
  const officerUser = await prisma.user.upsert({
    where: { email: 'officer1@evm.gov.in' },
    update: {},
    create: {
      email: 'officer1@evm.gov.in',
      passwordHash: officerHash,
      role: UserRole.OFFICER,
      officer: {
        create: {
          fullName: 'Rajesh Kumar Singh',
          employeeId: 'EO-DL-001',
          phone: '+91-9000000002',
          pollingStationId: station.id,
        },
      },
    },
  });
  console.log('✅ Officer created:', officerUser.email);

  const officerRecord = await prisma.electionOfficer.findUnique({ where: { userId: officerUser.id } });
  if (officerRecord) {
    await prisma.election.update({ where: { id: election.id }, data: { officerId: officerRecord.id } });
  }

  // ── Candidates ────────────────────────────────────────────
  await prisma.candidate.createMany({
    data: [
      { electionId: election.id, constituencyId: constituency.id, partyId: party1.id, fullName: 'Amit Sharma', age: 52, qualification: 'MBA', serialNumber: 1 },
      { electionId: election.id, constituencyId: constituency.id, partyId: party2.id, fullName: 'Priya Malhotra', age: 45, qualification: 'LLB', serialNumber: 2 },
      { electionId: election.id, constituencyId: constituency.id, partyId: party3.id, fullName: 'Suresh Patel', age: 58, qualification: 'B.Com', serialNumber: 3 },
      { electionId: election.id, constituencyId: constituency.id, partyId: null, fullName: 'Independent Candidate', age: 40, qualification: 'Graduate', serialNumber: 4, isIndependent: true },
    ],
    skipDuplicates: true,
  });
  console.log('✅ Candidates created');

  // ── Voters (20 sample voters) ─────────────────────────────
  const voterData = Array.from({ length: 20 }, (_, i) => ({
    constituencyId: constituency.id,
    pollingStationId: station.id,
    fullName: `Sample Voter ${i + 1}`,
    voterId: `DL/01/001/${String(i + 1).padStart(4, '0')}`,
    aadhaarHash: `hash_${String(i + 1).padStart(12, '0')}`,
    dateOfBirth: new Date(`${1970 + (i % 30)}-0${(i % 9) + 1}-${(i % 28) + 1}`),
    gender: i % 3 === 0 ? 'Female' : 'Male',
    address: `${i + 1}, Sample Street, New Delhi – 110001`,
    serialNumber: i + 1,
    phone: `+91-90000${String(i + 1).padStart(5, '0')}`,
  }));

  await prisma.voter.createMany({ data: voterData, skipDuplicates: true });
  console.log('✅ Sample voters created');

  // ── Audit Log ─────────────────────────────────────────────
  await prisma.auditLog.create({
    data: {
      userId: commUser.id,
      action: 'CREATE',
      module: 'System',
      description: 'Database seeded successfully',
      ipAddress: '127.0.0.1',
    },
  });

  console.log('\n🎉 Seeding complete!');
  console.log('\n📋 Default Credentials:');
  console.log('   Commissioner → commissioner@evm.gov.in / Admin@12345');
  console.log('   Officer      → officer1@evm.gov.in    / Officer@12345');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
