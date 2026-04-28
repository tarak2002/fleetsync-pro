import { describe, it, expect } from 'vitest';
import { validationResult } from 'express-validator';
import type { Request } from 'express';
import { createVehicleValidation } from './createVehicle.js';

/** Run the validation chain against a mock request body */
async function runValidation(body: Record<string, unknown>): Promise<Request> {
  const req = {
    body,
    query: {},
    params: {},
    cookies: {},
    headers: {},
    get: () => undefined,
  } as unknown as Request;

  await Promise.all(createVehicleValidation.map((v) => v.run(req)));
  return req;
}

describe('Vehicle creation — compliance and color validation', () => {
  it('rejects vehicle when color is empty string', async () => {
    const req = await runValidation({
      vin: '1HGBH41JXMN109186',
      plate: 'TEST001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: '',
    });

    const result = validationResult(req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array()).toContainEqual(
      expect.objectContaining({ path: 'color' })
    );
  });

  it('rejects vehicle when color is missing entirely', async () => {
    const req = await runValidation({
      vin: '1HGBH41JXMN109186',
      plate: 'TEST001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
    });

    const result = validationResult(req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array()).toContainEqual(
      expect.objectContaining({ path: 'color' })
    );
  });

  it('rejects vehicle when rego_expiry is missing', async () => {
    const req = await runValidation({
      vin: '1HGBH41JXMN109186',
      plate: 'TEST001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: 'White',
    });

    const result = validationResult(req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array()).toContainEqual(
      expect.objectContaining({ path: 'rego_expiry' })
    );
  });

  it('rejects vehicle when ctp_expiry is missing', async () => {
    const req = await runValidation({
      vin: '1HGBH41JXMN109186',
      plate: 'TEST001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: 'White',
    });

    const result = validationResult(req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array()).toContainEqual(
      expect.objectContaining({ path: 'ctp_expiry' })
    );
  });

  it('rejects vehicle when pink_slip_expiry is missing', async () => {
    const req = await runValidation({
      vin: '1HGBH41JXMN109186',
      plate: 'TEST001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: 'White',
    });

    const result = validationResult(req);
    expect(result.isEmpty()).toBe(false);
    expect(result.array()).toContainEqual(
      expect.objectContaining({ path: 'pink_slip_expiry' })
    );
  });

  it('accepts vehicle when all required fields are present', async () => {
    const req = await runValidation({
      vin: '1HGBH41JXMN109186',
      plate: 'TEST001',
      make: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: 'White',
      rego_expiry: '2027-01-01',
      ctp_expiry: '2027-01-01',
      pink_slip_expiry: '2027-01-01',
    });

    const result = validationResult(req);
    expect(result.isEmpty()).toBe(true);
  });
});