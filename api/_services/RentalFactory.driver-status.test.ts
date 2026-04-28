import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DatabaseClient } from '../_lib/DatabaseClient.js';
import { RentalFactory } from '../_services/RentalFactory.js';
import type { RentalInput } from '../_services/RentalFactory.js';

const baseInput: RentalInput = {
  driver_id: 'd1',
  vehicle_id: 'v1',
  bond_amount: 500,
  weekly_rate: 450,
  business_id: 'b1',
};

// Mock DB builder helpers
function mockBuilder(data: Record<string, unknown> | null, error: object | null = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error }),
    then: vi.fn((resolve: (v: unknown) => unknown) => resolve({ data, error })),
  };
}

function mockDb(overrides: {
  vehicle?: Record<string, unknown>;
  vehicleErr?: object;
  driver?: Record<string, unknown>;
  driverErr?: object;
  existingRental?: Record<string, unknown> | null;
} = {}) {
  const { vehicle = { id: 'v1', status: 'AVAILABLE' }, vehicleErr, driver = { id: 'd1', status: 'ACTIVE' }, driverErr, existingRental = null } = overrides;

  return {
    from: vi.fn((table: string) => mockBuilder(
      table === 'vehicles' ? vehicle : table === 'drivers' ? driver : null,
      table === 'vehicles' ? vehicleErr : table === 'drivers' ? driverErr : null
    )),
    auth: { getUser: vi.fn() },
  } as unknown as DatabaseClient;
}

describe('Rental creation — driver status enforcement', () => {
  it('rejects rental when driver status is SUSPENDED', async () => {
    const db = mockDb({ driver: { id: 'd1', status: 'SUSPENDED' } });
    const factory = new RentalFactory(db);

    await expect(factory.createRental(baseInput)).rejects.toThrow('Driver must be active');
  });

  it('rejects rental when driver status is PENDING', async () => {
    const db = mockDb({ driver: { id: 'd1', status: 'PENDING' } });
    const factory = new RentalFactory(db);

    await expect(factory.createRental(baseInput)).rejects.toThrow('Driver must be active');
  });
});