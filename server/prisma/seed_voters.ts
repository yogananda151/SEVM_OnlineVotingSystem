import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding 20 random voters...');

  // Ensure there is at least one region, constituency, and polling station
  let region = await prisma.region.findFirst();
  if (!region) {
    region = await prisma.region.create({
      data: { name: 'Seed Region', code: 'SR-01', description: 'Region for seeded voters' }
    });
  }

  let constituency = await prisma.constituency.findFirst();
  if (!constituency) {
    constituency = await prisma.constituency.create({
      data: { name: 'Seed Constituency', code: 'SC-01', regionId: region.id }
    });
  }

  let pollingStation = await prisma.pollingStation.findFirst();
  if (!pollingStation) {
    pollingStation = await prisma.pollingStation.create({
      data: {
        name: 'Seed Polling Station',
        code: 'SPS-01',
        address: '123 Seed Street',
        constituencyId: constituency.id,
      }
    });
  }

  for (let i = 0; i < 20; i++) {
    await prisma.voter.create({
      data: {
        constituencyId: constituency.id,
        pollingStationId: pollingStation.id,
        fullName: faker.person.fullName(),
        voterId: faker.string.alphanumeric(10).toUpperCase(),
        aadhaarHash: crypto.createHash('sha256').update(faker.string.numeric(12)).digest('hex'),
        dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }),
        gender: faker.helpers.arrayElement(['MALE', 'FEMALE', 'OTHER']),
        address: faker.location.streetAddress(),
        phone: faker.phone.number({ style: 'national' }),
        serialNumber: faker.number.int({ min: 1, max: 10000 }),
      }
    });
  }
  
  console.log('Successfully added 20 voters.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
