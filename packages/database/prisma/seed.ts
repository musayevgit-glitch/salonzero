// Development-only fake data. Never used in production (guarded by NODE_ENV below).
import { PrismaClient } from '../generated/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production environment.');
  }

  const salon = await prisma.salon.upsert({
    where: { slug: 'demo-salon' },
    update: {},
    create: {
      slug: 'demo-salon',
      name: 'Demo Salon (seed data — not a real business)',
      timezone: 'Asia/Baku',
      city: 'Baku',
      genderFocus: 'UNISEX',
      bookingPolicy: {
        create: {
          autoConfirm: false,
          minNoticeMinutes: 60,
          maxAdvanceDays: 60,
          cancellationWindowHours: 24,
          rescheduleWindowHours: 24,
        },
      },
    },
  });

  const category = await prisma.serviceCategory.upsert({
    where: { salonId_name: { salonId: salon.id, name: 'Hair' } },
    update: {},
    create: { salonId: salon.id, name: 'Hair', sortOrder: 0 },
  });

  const service = await prisma.service.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      salonId: salon.id,
      categoryId: category.id,
      name: 'Haircut (seed data)',
      priceAmount: 3000,
      currency: 'AZN',
      durationMinutes: 45,
      bufferMinutes: 15,
    },
  });

  const employee = await prisma.employeeProfile.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      salonId: salon.id,
      fullName: 'Seed Stylist (fake data)',
      eligibleServices: { create: { serviceId: service.id } },
      workingSchedules: {
        create: [
          { weekday: 1, startMinuteOfDay: 9 * 60, endMinuteOfDay: 18 * 60 },
          { weekday: 2, startMinuteOfDay: 9 * 60, endMinuteOfDay: 18 * 60 },
        ],
      },
    },
  });

  console.log('Seeded:', { salon: salon.slug, service: service.name, employee: employee.fullName });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
