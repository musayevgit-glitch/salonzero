/**
 * Creates a demo stylist user and links them to the first salon as SALON_MANAGER.
 * Run: pnpm tsx scripts/create-stylist-user.ts
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const db = new PrismaClient();

const EMAIL = 'stilist@salonomia.com';
const PASSWORD = 'Stilist123!';
const FULL_NAME = 'Aytən Məmmədova';

async function main() {
  // Find first active salon
  const salon = await db.salon.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
  });
  if (!salon) {
    console.error('No active salon found.');
    process.exit(1);
  }
  console.log(`Using salon: ${salon.name} (${salon.id})`);

  // Check if user already exists
  const existing = await db.user.findUnique({ where: { email: EMAIL }, select: { id: true } });
  if (existing) {
    console.log(`User ${EMAIL} already exists (id: ${existing.id}). Skipping.`);
    await db.$disconnect();
    return;
  }

  const passwordHash = await argon2.hash(PASSWORD, { type: argon2.argon2id });

  // Create user + membership + employee profile in a transaction
  const result = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: EMAIL,
        passwordHash,
        fullName: FULL_NAME,
        emailVerifiedAt: new Date(),
      },
      select: { id: true, email: true },
    });

    const membership = await tx.salonMembership.create({
      data: {
        userId: user.id,
        salonId: salon.id,
        role: 'SALON_MANAGER',
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    const employee = await tx.employeeProfile.create({
      data: {
        salonId: salon.id,
        userId: user.id,
        fullName: FULL_NAME,
        isActive: true,
      },
      select: { id: true },
    });

    return { user, membership, employee };
  });

  console.log('\n✓ Stylist user created:');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  User ID:  ${result.user.id}`);
  console.log(`  Employee: ${result.employee.id}`);
  console.log(`  Salon:    ${salon.name}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  db.$disconnect();
  process.exit(1);
});
