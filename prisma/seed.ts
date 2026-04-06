import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Vehicles
  const v1 = await prisma.vehicle.upsert({
    where: { vin: 'VIN10001' },
    update: {},
    create: {
      vin: 'VIN10001',
      plate: 'ABC-123',
      make: 'Toyota',
      model: 'Camry',
      year: 2023,
      color: 'Silver',
      status: 'RENTED',
      weekly_rate: 450.00,
      bond_amount: 1000.00,
      rego_expiry: new Date('2025-12-01'),
      ctp_expiry: new Date('2025-12-01'),
      pink_slip_expiry: new Date('2025-12-01'),
    }
  });

  const v2 = await prisma.vehicle.upsert({
    where: { vin: 'VIN10002' },
    update: {},
    create: {
      vin: 'VIN10002',
      plate: 'ELN-001',
      make: 'Tesla',
      model: 'Model 3',
      year: 2024,
      color: 'White',
      status: 'AVAILABLE',
      weekly_rate: 650.00,
      bond_amount: 1500.00,
      rego_expiry: new Date('2025-10-15'),
      ctp_expiry: new Date('2025-10-15'),
      pink_slip_expiry: new Date('2025-10-15'),
    }
  });

  const v3 = await prisma.vehicle.upsert({
    where: { vin: 'VIN10003' },
    update: {},
    create: {
      vin: 'VIN10003',
      plate: 'EV-999',
      make: 'Hyundai',
      model: 'Ioniq 5',
      year: 2023,
      color: 'Matte Grey',
      status: 'SUSPENDED',
      weekly_rate: 550.00,
      bond_amount: 1200.00,
      rego_expiry: new Date('2024-05-20'),
      ctp_expiry: new Date('2024-05-20'),
      pink_slip_expiry: new Date('2024-05-20'),
    }
  });

  // 2. Create Drivers
  const d1 = await prisma.driver.upsert({
    where: { email: 'driver@fleetsync.com.au' },
    update: {},
    create: {
      name: 'Demo Driver',
      email: 'driver@fleetsync.com.au',
      phone: '0412345678',
      license_no: '12345678',
      license_expiry: new Date('2026-12-01'),
      status: 'ACTIVE',
      balance: 0.00,
    }
  });

  // 3. Create a Rental
  await prisma.rental.create({
    data: {
      driver_id: d1.id,
      vehicle_id: v1.id,
      start_date: new Date('2025-01-01'),
      bond_amount: 1000.00,
      weekly_rate: 450.00,
      next_payment_date: new Date('2025-04-09'),
      status: 'ACTIVE',
    }
  });

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
