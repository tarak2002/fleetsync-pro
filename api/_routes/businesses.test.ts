import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockFrom = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockDelete = vi.fn();

vi.mock('../_lib/supabase.js', () => ({
  supabase: {
    from: (...args: any[]) => {
      mockFrom(...args);
      return {
        select: () => ({ eq: mockEq, then: (cb: any) => cb({ data: [], error: null }) }),
        insert: () => ({ select: () => ({ then: (cb: any) => cb({ data: [{ id: 'b1' }], error: null }) }) }),
        update: mockUpdate,
        delete: mockDelete,
      };
    },
  },
}));

import businessesRouter from './businesses.js';

describe('Business API', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use((req: any, _res: any, next) => {
      req.user = { businessId: 'b1', role: 'ADMIN' };
      next();
    });
    app.use('/api/businesses', businessesRouter);
  });

  describe('PATCH /my-business', () => {
    it('should allow clearing fields with null', async () => {
      mockUpdate.mockReturnValue({
        eq: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({ data: { id: 'b1', abn: null }, error: null }),
          }),
        }),
      });

      const response = await request(app)
        .patch('/api/businesses/my-business')
        .send({ abn: null, address: null });

      expect(response.status).toBe(200);

      expect(mockUpdate).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall).toHaveProperty('abn');
      expect(updateCall).toHaveProperty('address');
    });
  });
});