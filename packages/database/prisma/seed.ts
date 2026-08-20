// Development-only seed. Never used in production (guarded by NODE_ENV check below).
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function hashPassword(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id });
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed a production environment.');
  }

  console.log('🗑  Clearing database...');
  // Delete in dependency order
  await prisma.reservationStatusHistory.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.employeePortfolioItem.deleteMany();
  await prisma.employeeService.deleteMany();
  await prisma.workingSchedule.deleteMany();
  await prisma.break.deleteMany();
  await prisma.timeOff.deleteMany();
  await prisma.employeeProfile.deleteMany();
  await prisma.service.deleteMany();
  await prisma.serviceCategory.deleteMany();
  await prisma.bookingPolicy.deleteMany();
  await prisma.salonInvitation.deleteMany();
  await prisma.salonMembership.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.salon.deleteMany();
  await prisma.user.deleteMany();

  // Also clear sessions so stale CSRF tokens are gone (table may not exist yet)
  await prisma.$executeRawUnsafe('DELETE FROM session;').catch(() => {});

  console.log('✅ Database cleared.');

  // ─── Passwords ────────────────────────────────────────────
  const PW = 'Test1234!';
  const pwHash = await hashPassword(PW);

  // ─── Users ────────────────────────────────────────────────
  console.log('👤 Creating users...');

  const superadmin = await prisma.user.create({
    data: {
      email: 'superadmin@salonomia.az',
      passwordHash: pwHash,
      fullName: 'Super Admin',
      isSuperadmin: true,
      status: 'ACTIVE',
    },
  });

  const salon1Admin = await prisma.user.create({
    data: {
      email: 'admin@guzelxanim.az',
      passwordHash: pwHash,
      fullName: 'Lalə Əliyeva',
      status: 'ACTIVE',
    },
  });

  const salon2Admin = await prisma.user.create({
    data: {
      email: 'admin@gentlemanclub.az',
      passwordHash: pwHash,
      fullName: 'Tural Həsənov',
      status: 'ACTIVE',
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: 'musteri@mail.az',
      passwordHash: pwHash,
      fullName: 'Aynur Quliyeva',
      phone: '+994501234567',
      status: 'ACTIVE',
    },
  });

  // Stylist users (will be linked to EmployeeProfile)
  const stylist1User = await prisma.user.create({
    data: {
      email: 'sevinc@guzelxanim.az',
      passwordHash: pwHash,
      fullName: 'Sevinc Məmmədova',
      status: 'ACTIVE',
    },
  });

  const stylist2User = await prisma.user.create({
    data: {
      email: 'nigar@guzelxanim.az',
      passwordHash: pwHash,
      fullName: 'Nigar İsmayılova',
      status: 'ACTIVE',
    },
  });

  const stylist3User = await prisma.user.create({
    data: {
      email: 'kamran@gentlemanclub.az',
      passwordHash: pwHash,
      fullName: 'Kamran Rəhimov',
      status: 'ACTIVE',
    },
  });

  const stylist4User = await prisma.user.create({
    data: {
      email: 'rashad@gentlemanclub.az',
      passwordHash: pwHash,
      fullName: 'Rəşad Babayev',
      status: 'ACTIVE',
    },
  });

  const stylist5User = await prisma.user.create({
    data: {
      email: 'leyla@guzelxanim.az',
      passwordHash: pwHash,
      fullName: 'Leyla Hüseynova',
      status: 'ACTIVE',
    },
  });

  // ─── Salon 1: Gözəl Xanım ─────────────────────────────────
  console.log('💈 Creating Gözəl Xanım salon...');

  const salon1 = await prisma.salon.create({
    data: {
      slug: 'gozel-xanim-beauty',
      name: 'Gözəl Xanım Beauty',
      status: 'ACTIVE',
      timezone: 'Asia/Baku',
      description:
        'Bakının ən prestijli qadın gözəllik salonu. Saç, dırnaq, üz baxımı və relaksasiya xidmətlərini peşəkar əldə etmək istəyən hər qadın üçün ideal yer.',
      addressLine: 'Nizami küçəsi 54, 3-cü mərtəbə',
      city: 'Bakı',
      phone: '+994 12 555 1234',
      email: 'info@guzelxanim.az',
      genderFocus: 'WOMEN',
      bookingPolicy: {
        create: {
          autoConfirm: false,
          minNoticeMinutes: 60,
          maxAdvanceDays: 60,
          cancellationWindowHours: 24,
          rescheduleWindowHours: 24,
        },
      },
      memberships: {
        create: {
          userId: salon1Admin.id,
          role: 'SALON_ADMIN',
          status: 'ACTIVE',
        },
      },
    },
  });

  // Service categories for salon 1
  const catSac = await prisma.serviceCategory.create({
    data: {
      salonId: salon1.id,
      name: 'Saç Xidmətləri',
      sortOrder: 1,
    },
  });
  const catDirnaq = await prisma.serviceCategory.create({
    data: {
      salonId: salon1.id,
      name: 'Dırnaq Xidmətləri',
      sortOrder: 2,
    },
  });
  const catUz = await prisma.serviceCategory.create({
    data: {
      salonId: salon1.id,
      name: 'Üz Baxımı',
      sortOrder: 3,
    },
  });

  // Services for salon 1
  const s1sacKesme = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catSac.id,
      name: 'Saç kəsmə (qadın)',
      description: 'Rəng bərpası ilə birlikdə peşəkar saç kəsimi.',
      priceAmount: 3000, // 30.00 AZN
      currency: 'AZN',
      durationMinutes: 60,
      bufferMinutes: 10,
      isActive: true,
    },
  });
  const s1sacBoya = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catSac.id,
      name: 'Saç boyası (tam)',
      description: 'Kök-uc boyası, ammonyaksız rənglər mövcuddur.',
      priceAmount: 8000,
      currency: 'AZN',
      durationMinutes: 120,
      bufferMinutes: 15,
      isActive: true,
    },
  });
  const s1ombre = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catSac.id,
      name: 'Ombre & Balayage',
      description: 'Təbii görünüşlü rəng keçidi — balayage texnikası.',
      priceAmount: 12000,
      currency: 'AZN',
      durationMinutes: 150,
      bufferMinutes: 20,
      isActive: true,
    },
  });
  const s1keratin = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catSac.id,
      name: 'Keratin düzləşdirmə',
      description: '3-6 ay effektli brasilian keratin müalicəsi.',
      priceAmount: 15000,
      currency: 'AZN',
      durationMinutes: 180,
      bufferMinutes: 30,
      isActive: true,
    },
  });
  const s1manikur = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catDirnaq.id,
      name: 'Manikür (gel-lak)',
      description: 'Pedikül və gel-lak örtüyü ilə klassik manikür.',
      priceAmount: 2500,
      currency: 'AZN',
      durationMinutes: 75,
      bufferMinutes: 10,
      isActive: true,
    },
  });
  const s1pedikur = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catDirnaq.id,
      name: 'Pedikür (klassik)',
      description: 'Ayaq baxımı + rəng.',
      priceAmount: 2000,
      currency: 'AZN',
      durationMinutes: 60,
      bufferMinutes: 10,
      isActive: true,
    },
  });
  const s1uzBaxim = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catUz.id,
      name: 'Dərin üz təmizliyi',
      description: 'Ultrasəs peeling + maska + nəmləndirici serum.',
      priceAmount: 6000,
      currency: 'AZN',
      durationMinutes: 90,
      bufferMinutes: 15,
      isActive: true,
    },
  });
  const s1qas = await prisma.service.create({
    data: {
      salonId: salon1.id,
      categoryId: catUz.id,
      name: 'Qaş dizaynı (tint + şəkil)',
      description: 'Qaş boyası + laminasiya + şəkil vermə.',
      priceAmount: 2000,
      currency: 'AZN',
      durationMinutes: 45,
      bufferMinutes: 5,
      isActive: true,
    },
  });

  // Employees for salon 1
  // Weekday schedule: Mon-Sat 09:00-19:00 (540-1140 minutes)
  const weekdaysSched = [1, 2, 3, 4, 5, 6].map((wd) => ({
    weekday: wd,
    startMinuteOfDay: 540,
    endMinuteOfDay: 1140,
  }));

  const emp1 = await prisma.employeeProfile.create({
    data: {
      salonId: salon1.id,
      userId: stylist1User.id,
      fullName: 'Sevinc Məmmədova',
      bio: '12 illik təcrübəyə malik saç ustası. Fransız texnikalarında ixtisaslaşmış, rəng nəzəriyyəsi üzrə Parisdə təhsil almışdır. Hər müştəriyə fərdi yanaşma.',
      isActive: true,
      portfolio: {
        create: [
          {
            imageUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
            caption: 'Balayage texnikası',
            sortOrder: 1,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600&q=80',
            caption: 'Ombre effekti',
            sortOrder: 2,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80',
            caption: 'Klassik düzləşdirmə',
            sortOrder: 3,
          },
        ],
      },
      eligibleServices: {
        create: [
          { serviceId: s1sacKesme.id },
          { serviceId: s1sacBoya.id },
          { serviceId: s1ombre.id },
          { serviceId: s1keratin.id },
        ],
      },
      workingSchedules: { create: weekdaysSched },
      breaks: {
        create: [1, 2, 3, 4, 5, 6].map((wd) => ({
          weekday: wd,
          startMinuteOfDay: 780, // 13:00
          endMinuteOfDay: 840, // 14:00
        })),
      },
    },
  });

  const emp2 = await prisma.employeeProfile.create({
    data: {
      salonId: salon1.id,
      userId: stylist2User.id,
      fullName: 'Nigar İsmayılova',
      bio: 'Manikür və nail-art sahəsində 8 illik peşəkar. Xəzər Universiteti Dizayn fakültəsi məzunu. 3D nail art, çiçək naxışları və premium gel sistemi üzrə sertifikatlı.',
      isActive: true,
      portfolio: {
        create: [
          {
            imageUrl: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
            caption: 'Gel-lak dizayn',
            sortOrder: 1,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1604654894611-df63bc536372?w=600&q=80',
            caption: 'Fransız manikür',
            sortOrder: 2,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1604654894612-df63bc536373?w=600&q=80',
            caption: 'Nail art',
            sortOrder: 3,
          },
        ],
      },
      eligibleServices: {
        create: [{ serviceId: s1manikur.id }, { serviceId: s1pedikur.id }],
      },
      workingSchedules: {
        create: [1, 2, 3, 4, 5].map((wd) => ({
          weekday: wd,
          startMinuteOfDay: 600, // 10:00
          endMinuteOfDay: 1140, // 19:00
        })),
      },
    },
  });

  const emp5 = await prisma.employeeProfile.create({
    data: {
      salonId: salon1.id,
      userId: stylist5User.id,
      fullName: 'Leyla Hüseynova',
      bio: 'Kosmetologiya üzrə tibb təhsili olan gözəllik mütəxəssisi. Cilt baxımı, qaş laminasiyası və üz masajında ixtisaslaşmış. Hyaluronik turşu müalicələri üzrə sertifikatlı.',
      isActive: true,
      portfolio: {
        create: [
          {
            imageUrl: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=600&q=80',
            caption: 'Üz müalicəsi',
            sortOrder: 1,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80',
            caption: 'Qaş dizaynı',
            sortOrder: 2,
          },
        ],
      },
      eligibleServices: {
        create: [{ serviceId: s1uzBaxim.id }, { serviceId: s1qas.id }],
      },
      workingSchedules: {
        create: [2, 3, 4, 5, 6].map((wd) => ({
          weekday: wd,
          startMinuteOfDay: 540, // 09:00
          endMinuteOfDay: 1080, // 18:00
        })),
      },
    },
  });

  // ─── Salon 2: Gentleman's Club ─────────────────────────────
  console.log("💈 Creating Gentleman's Club salon...");

  const salon2 = await prisma.salon.create({
    data: {
      slug: 'gentlemans-club-baki',
      name: "Gentleman's Club",
      status: 'ACTIVE',
      timezone: 'Asia/Baku',
      description:
        'Bakının ən elit kişi bərbər salonu. Klassik berbər mədəniyyəti ilə müasir texnikaların mükəmməl birləşməsi. Saç, saqqal, üz baxımı — hər şey tək bir yerdə.',
      addressLine: 'Neftçilər prospekti 44, 1-ci mərtəbə',
      city: 'Bakı',
      phone: '+994 12 444 5678',
      email: 'info@gentlemanclub.az',
      genderFocus: 'MEN',
      bookingPolicy: {
        create: {
          autoConfirm: true, // auto-confirm for barber
          minNoticeMinutes: 30,
          maxAdvanceDays: 30,
          cancellationWindowHours: 12,
          rescheduleWindowHours: 12,
        },
      },
      memberships: {
        create: {
          userId: salon2Admin.id,
          role: 'SALON_ADMIN',
          status: 'ACTIVE',
        },
      },
    },
  });

  const catBerber = await prisma.serviceCategory.create({
    data: {
      salonId: salon2.id,
      name: 'Berbər Xidmətləri',
      sortOrder: 1,
    },
  });
  const catSaqqal = await prisma.serviceCategory.create({
    data: {
      salonId: salon2.id,
      name: 'Saqqal & Üz',
      sortOrder: 2,
    },
  });

  const s2sacKesme = await prisma.service.create({
    data: {
      salonId: salon2.id,
      categoryId: catBerber.id,
      name: 'Saç kəsmə (kişi)',
      description: 'Klassik berbər saç kəsimi, yuma və qurutma daxil.',
      priceAmount: 2000,
      currency: 'AZN',
      durationMinutes: 45,
      bufferMinutes: 10,
      isActive: true,
    },
  });
  const s2fade = await prisma.service.create({
    data: {
      salonId: salon2.id,
      categoryId: catBerber.id,
      name: 'Fade & Undercut',
      description: 'Müasir kəsim texnikaları — skin fade, mid fade, high fade.',
      priceAmount: 2500,
      currency: 'AZN',
      durationMinutes: 50,
      bufferMinutes: 10,
      isActive: true,
    },
  });
  const s2saqqal = await prisma.service.create({
    data: {
      salonId: salon2.id,
      categoryId: catSaqqal.id,
      name: 'Saqqal düzəltmə',
      description: 'Ülgüclə saqqal trim + hot towel müalicəsi.',
      priceAmount: 1500,
      currency: 'AZN',
      durationMinutes: 30,
      bufferMinutes: 5,
      isActive: true,
    },
  });
  const s2kompleks = await prisma.service.create({
    data: {
      salonId: salon2.id,
      categoryId: catBerber.id,
      name: 'Kişi kompleksi (saç + saqqal)',
      description: 'Saç kəsimi + saqqal düzəltmə + üz maskası — tam qayğı paketi.',
      priceAmount: 3500,
      currency: 'AZN',
      durationMinutes: 75,
      bufferMinutes: 15,
      isActive: true,
    },
  });
  const s2kidsHaircut = await prisma.service.create({
    data: {
      salonId: salon2.id,
      categoryId: catBerber.id,
      name: 'Uşaq saç kəsimi',
      description: 'Uşaqlar üçün xüsusi yanaşma, rahat mühit.',
      priceAmount: 1200,
      currency: 'AZN',
      durationMinutes: 30,
      bufferMinutes: 10,
      isActive: true,
    },
  });

  const s2barbeSched = [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
    weekday: wd,
    startMinuteOfDay: 600, // 10:00
    endMinuteOfDay: 1200, // 20:00
  }));

  const emp3 = await prisma.employeeProfile.create({
    data: {
      salonId: salon2.id,
      userId: stylist3User.id,
      fullName: 'Kamran Rəhimov',
      bio: "15 illik berbər təcrübəsi. London'da TONI&GUY akademiyasından sertifikat almışdır. Fade texnikası üzrə Azərbaycan çempionu (2022). Hər kəsmə bir sənət əsəridir.",
      isActive: true,
      portfolio: {
        create: [
          {
            imageUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=600&q=80',
            caption: 'Skin fade kəsimi',
            sortOrder: 1,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1534297635766-a262cdcb8ee4?w=600&q=80',
            caption: 'Klassik kəsim + saqqal',
            sortOrder: 2,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=600&q=80',
            caption: 'Teksturlü saç',
            sortOrder: 3,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=600&q=80',
            caption: 'Pompadour stil',
            sortOrder: 4,
          },
        ],
      },
      eligibleServices: {
        create: [
          { serviceId: s2sacKesme.id },
          { serviceId: s2fade.id },
          { serviceId: s2saqqal.id },
          { serviceId: s2kompleks.id },
          { serviceId: s2kidsHaircut.id },
        ],
      },
      workingSchedules: { create: s2barbeSched },
      breaks: {
        create: [0, 1, 2, 3, 4, 5, 6].map((wd) => ({
          weekday: wd,
          startMinuteOfDay: 840, // 14:00
          endMinuteOfDay: 900, // 15:00
        })),
      },
    },
  });

  const emp4 = await prisma.employeeProfile.create({
    data: {
      salonId: salon2.id,
      userId: stylist4User.id,
      fullName: 'Rəşad Babayev',
      bio: 'Müasir berbər texnikaları üzrə ixtisaslaşmış 7 illik peşəkar. Hair tattoo, dəqiq sac kəsimi və saqqal şəkilləndirmədə mahir. Müştəri məmnuniyyəti birinci yerdə.',
      isActive: true,
      portfolio: {
        create: [
          {
            imageUrl: 'https://images.unsplash.com/photo-1512690459411-b9245aed614b?w=600&q=80',
            caption: 'High fade kəsimi',
            sortOrder: 1,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=600&q=80',
            caption: 'Saqqal şəkilləndirmə',
            sortOrder: 2,
          },
          {
            imageUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&q=80',
            caption: 'Textured crop',
            sortOrder: 3,
          },
        ],
      },
      eligibleServices: {
        create: [
          { serviceId: s2sacKesme.id },
          { serviceId: s2fade.id },
          { serviceId: s2saqqal.id },
          { serviceId: s2kompleks.id },
        ],
      },
      workingSchedules: {
        create: [1, 2, 3, 4, 5, 6].map((wd) => ({
          weekday: wd,
          startMinuteOfDay: 540, // 09:00
          endMinuteOfDay: 1140, // 19:00
        })),
      },
    },
  });

  // ─── Summary ─────────────────────────────────────────────
  console.log('\n✅ Seed complete!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('  GİRİŞ MƏLUMATLARI (şifrə hamısı: Test1234!)');
  console.log('═══════════════════════════════════════════════════');
  console.log('  SUPERADMIN   superadmin@salonomia.az');
  console.log('  SALON ADMIN  admin@guzelxanim.az       (Gözəl Xanım)');
  console.log("  SALON ADMIN  admin@gentlemanclub.az    (Gentleman's Club)");
  console.log('  CUSTOMER     musteri@mail.az');
  console.log('  STİLİST      sevinc@guzelxanim.az      (Sevinc Məmmədova)');
  console.log('  STİLİST      nigar@guzelxanim.az       (Nigar İsmayılova)');
  console.log('  STİLİST      leyla@guzelxanim.az       (Leyla Hüseynova)');
  console.log('  STİLİST      kamran@gentlemanclub.az   (Kamran Rəhimov)');
  console.log('  STİLİST      rashad@gentlemanclub.az   (Rəşad Babayev)');
  console.log('═══════════════════════════════════════════════════\n');

  void superadmin;
  void emp1;
  void emp2;
  void emp3;
  void emp4;
  void emp5;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
