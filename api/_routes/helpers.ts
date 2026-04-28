import type { Request, ValidationChain } from 'express-validator';

/**
 * Run a validation chain against a mock request object.
 * Returns the request with req.body, req.query, req.params populated.
 */
export async function runValidation(body: Record<string, unknown>): Promise<Request> {
  // Import the validation chain dynamically — we'll add to it
  const { createVehicleValidation } = await import('./vehicles.js').catch(() => ({
    createVehicleValidation: [] as ValidationChain[],
  }));

  const chain = createVehicleValidation;
  const req = {
    body,
    query: {},
    params: {},
    cookies: {},
    headers: {},
    get: () => undefined,
  } as unknown as Request;

  for (const validator of chain) {
    await validator.run(req);
  }

  return req;
}

export function makeValidationRequest(
  chain: ValidationChain[],
  body: Record<string, unknown>
): Promise<Request> {
  const req = {
    body,
    query: {},
    params: {},
    cookies: {},
    headers: {},
    get: () => undefined,
  } as unknown as Request;

  return Promise.all(chain.map((v) => v.run(req))).then(() => req);
}