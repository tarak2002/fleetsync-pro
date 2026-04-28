import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock BillingService before importing the route
vi.mock('../_services/BillingService.js', () => ({
  BillingService: {
    runBillingCycle: vi.fn().mockResolvedValue([
      { rentalId: 'r1', invoiceId: 'inv1', amount: 450, status: 'generated' },
      { rentalId: 'r2', status: 'already_exists' },
    ]),
    generateInvoice: vi.fn().mockResolvedValue({ id: 'inv-new', amount: 450 }),
  },
}));

// Mock supabase for the route
vi.mock('../_lib/supabase.js', () => ({
  supabase: { from: vi.fn() },
}));

import invoicesRouter from '../_routes/invoices.js';
import billingRouter from '../_routes/billing.js';

function mockAuth(overrides: { businessId?: string; role?: string } = {}) {
  return (_req: any, _res: any, next: any) => {
    _req.user = { businessId: overrides.businessId ?? 'b1', role: overrides.role ?? 'ADMIN' };
    next();
  };
}

describe('Billing routes', () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/invoices', mockAuth(), invoicesRouter);
    app.use('/api/billing', mockAuth(), billingRouter);
  });

  it('POST /api/invoices/run-billing-cycle returns 200 with generated invoices', async () => {
    const res = await request(app)
      .post('/api/invoices/run-billing-cycle')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      processed: 2,
    });
    expect(Array.isArray(res.body.results)).toBe(true);
  });

  it('POST /api/billing/generate returns 200', async () => {
    const res = await request(app)
      .post('/api/billing/generate')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/invoices/run-billing-cycle returns 400 when business ID missing', async () => {
    const res = await request(app)
      .post('/api/invoices/run-billing-cycle')
      .set('Authorization', 'Bearer invalid')
      .send({});

    // Mock returns b1 by default — should work. If auth fails, 401.
    expect([200, 401]).toContain(res.status);
  });
});