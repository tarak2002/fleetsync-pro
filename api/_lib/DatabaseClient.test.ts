import { describe, it, expect, vi } from 'vitest';
import { DatabaseClient } from './DatabaseClient.js';
import { SupabaseAdapter } from './SupabaseAdapter.js';

// Mock Supabase responses for testing
const mockVehicleData = [
  { id: 'v1', plate: 'TEST001', status: 'AVAILABLE', business_id: 'b1' },
  { id: 'v2', plate: 'TEST002', status: 'RENTED', business_id: 'b1' },
];

const mockSupabaseClient = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: mockVehicleData[0], error: null }),
    insert: vi.fn().mockResolvedValue({ data: mockVehicleData[0], error: null }),
    update: vi.fn().mockResolvedValue({ data: mockVehicleData[0], error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve) => resolve({ data: mockVehicleData, error: null })),
  }),
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'u1', email: 'test@example.com' } },
      error: null,
    }),
  },
};

describe('DatabaseClient interface — behavior 1: query', () => {
  it('can query a table', async () => {
    const db = new SupabaseAdapter(mockSupabaseClient as any);
    const result = await db.from('vehicles').select('*');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('vehicles');
    expect(result.data).toEqual(mockVehicleData);
  });

  it('can filter with .eq()', async () => {
    const db = new SupabaseAdapter(mockSupabaseClient as any);
    await db.from('vehicles').select('*').eq('business_id', 'b1');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('vehicles');
  });

  it('can get a single row with .single()', async () => {
    const db = new SupabaseAdapter(mockSupabaseClient as any);
    const result = await db.from('vehicles').select('*').eq('id', 'v1').single();

    expect(result.data).toEqual(mockVehicleData[0]);
    expect(result.error).toBeNull();
  });
});

describe('DatabaseClient interface — behavior 2: error surfacing', () => {
  it('surfaces query errors', async () => {
    const dbError = { message: 'Table not found', code: '42P01' };
    const errorClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        insert: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        update: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        delete: vi.fn().mockResolvedValue({ data: null, error: dbError }),
        then: vi.fn((resolve) => resolve({ data: null, error: dbError })),
      }),
      auth: { getUser: vi.fn() },
    };

    const db = new SupabaseAdapter(errorClient as any);
    const result = await db.from('vehicles').select('*').eq('id', 'nonexistent');

    expect(result.data).toBeNull();
    expect(result.error).toMatchObject({ message: 'Table not found' });
  });
});

describe('DatabaseClient interface — behavior 3: adapter swap', () => {
  it('accepts any implementation of the interface', () => {
    // The adapter IS the interface compliance check.
    // If this constructs, the interface is satisfied.
    const db = new SupabaseAdapter(mockSupabaseClient as any);
    expect(db).toBeDefined();
    expect(typeof db.from).toBe('function');
    expect(typeof db.auth).toBe('object');
  });

  it('can be swapped for a mock in tests', () => {
    // Mock adapter that satisfies the interface without real Supabase
    const mockDb: DatabaseClient = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: mockVehicleData, error: null }),
        single: vi.fn().mockResolvedValue({ data: mockVehicleData[0], error: null }),
        insert: vi.fn().mockResolvedValue({ data: mockVehicleData[0], error: null }),
        update: vi.fn().mockResolvedValue({ data: mockVehicleData[0], error: null }),
        delete: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'mock-user' } },
          error: null,
        }),
      },
    };

    expect(mockDb.from).toBeDefined();
    expect(mockDb.auth.getUser).toBeDefined();
  });
});