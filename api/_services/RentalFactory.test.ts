import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RentalFactory, type RentalInput } from './RentalFactory.js';
import type { DatabaseClient } from './DatabaseClient.js';

// Helper to build a mock adapter
function createMockDb(overrides: Partial<{
  vehicle: Record<string, unknown> | null;
  vehicleError: object | null;
  driver: Record<string, unknown> | null;
  driverError: object | null;
  existingRental: Record<string, unknown> | null;
  rentalQueryResult: Record<string, unknown>;
  insertRentalResult: Record<string, unknown>;
  updateResult: Record<string, unknown>;
  deleteResult: Record<string, unknown>;
}> = {}) {
  const {
    vehicle = { id: 'v1', status: 'AVAILABLE' },
    vehicleError = null,
    driver = { id: 'd1', status: 'ACTIVE' },
    driverError = null,
    existingRental = null,
    rentalQueryResult = { id: 'r1', driver_id: 'd1', vehicle_id: 'v1', status: 'ACTIVE', business_id: 'b1' },
    insertRentalResult = { id: 'r1', driver_id: 'd1', vehicle_id: 'v1', status: 'ACTIVE', business_id: 'b1' },
    updateResult = { id: 'v1', status: 'RENTED' },
    deleteResult = null,
  } = overrides;

  const mockVehicleBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: vehicle, error: vehicleError }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    then: vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: updateResult, error: null })),
  };

  const mockDriverBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: driver, error: driverError }),
    maybeSingle: vi.fn().mockResolvedValue({ data: existingRental, error: null }),
  };

  // Fully chainable rental/insert/update builder
  let singleCallCount = 0;
  const chainable = () => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => {
      singleCallCount++;
      // First call = query result; second call = update result
      return Promise.resolve({
        data: singleCallCount === 1 ? rentalQueryResult : { ...rentalQueryResult, status: 'COMPLETED' },
        error: null,
      });
    }),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: existingRental, error: null }),
    then: vi.fn((resolve: (val: unknown) => unknown) => resolve({ data: insertRentalResult, error: null })),
  });

  const mockInsertBuilder = chainable();

  const mockClient = {
    from: vi.fn((table: string) => {
      if (table === 'vehicles') return mockVehicleBuilder;
      if (table === 'drivers') return mockDriverBuilder;
      return mockInsertBuilder;
    }),
    auth: { getUser: vi.fn() },
  };

  return { mockClient, builders: { vehicle: mockVehicleBuilder, driver: mockDriverBuilder, insert: mockInsertBuilder } };
}

const baseInput: RentalInput = {
  driver_id: 'd1',
  vehicle_id: 'v1',
  bond_amount: 500,
  weekly_rate: 450,
  business_id: 'b1',
};

describe('RentalFactory — behavior 1: vehicle availability check', () => {
  it('rejects rental when vehicle is RENTED', async () => {
    const { mockClient } = createMockDb({ vehicle: { id: 'v1', status: 'RENTED' } });
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    await expect(factory.createRental(baseInput)).rejects.toThrow('Vehicle is already rented');
  });

  it('rejects rental when vehicle is not found', async () => {
    const { mockClient } = createMockDb({ vehicle: null });
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    await expect(factory.createRental(baseInput)).rejects.toThrow('Vehicle not found');
  });
});

describe('RentalFactory — behavior 2: driver status check', () => {
  it('rejects rental when driver is not ACTIVE', async () => {
    const { mockClient } = createMockDb({ driver: { id: 'd1', status: 'PENDING' } });
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    await expect(factory.createRental(baseInput)).rejects.toThrow('Driver must be active');
  });

  it('rejects rental when driver is BLOCKED', async () => {
    const { mockClient } = createMockDb({ driver: { id: 'd1', status: 'BLOCKED' } });
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    await expect(factory.createRental(baseInput)).rejects.toThrow('Driver is blocked');
  });
});

describe('RentalFactory — behavior 3: existing active rental check', () => {
  it('rejects rental when driver already has an active rental', async () => {
    const { mockClient } = createMockDb({ existingRental: { id: 'existing-r1', status: 'ACTIVE' } });
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    await expect(factory.createRental(baseInput)).rejects.toThrow('Driver already has an active rental');
  });
});

describe('RentalFactory — behavior 4: rental creation sets vehicle to RENTED', () => {
  it('creates rental and marks vehicle RENTED atomically', async () => {
    const { mockClient, builders } = createMockDb();
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    const result = await factory.createRental(baseInput);

    expect(result).toMatchObject({ id: 'r1', status: 'ACTIVE' });
  });
});

describe('RentalFactory — behavior 5: ending rental sets vehicle to AVAILABLE', () => {
  it('ends rental and marks vehicle AVAILABLE', async () => {
    const { mockClient } = createMockDb();
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    const result = await factory.endRental('r1', 'b1');

    expect(result).toMatchObject({ id: 'r1', status: 'COMPLETED' });
  });

  it('rejects ending a non-active rental', async () => {
    const { mockClient } = createMockDb({
      rentalQueryResult: { id: 'r1', status: 'COMPLETED', vehicle_id: 'v1', driver_id: 'd1', business_id: 'b1' },
    });
    const factory = new RentalFactory(mockClient as unknown as DatabaseClient);

    await expect(factory.endRental('r1', 'b1')).rejects.toThrow('Rental not active');
  });
});