import { body } from 'express-validator';

/**
 * Validators for creating a vehicle.
 * Required: vin, plate, make, model, year, color, rego_expiry, ctp_expiry, pink_slip_expiry.
 * Optional: weekly_rate, bond_amount, insurance_cost.
 */
export const createVehicleValidation = [
  body('vin')
    .isLength({ min: 11, max: 17 })
    .withMessage('VIN must be 11-17 characters'),
  body('plate')
    .isLength({ min: 1, max: 10 })
    .withMessage('Plate is required'),
  body('make')
    .isLength({ min: 1 })
    .withMessage('Make is required'),
  body('model')
    .isLength({ min: 1 })
    .withMessage('Model is required'),
  body('year')
    .isInt({ min: 1990, max: 2030 })
    .withMessage('Year must be 1990-2030'),
  body('color')
    .isLength({ min: 1 })
    .trim()
    .withMessage('Color is required'),
  body('rego_expiry')
    .isISO8601()
    .withMessage('Registration expiry must be a valid date'),
  body('ctp_expiry')
    .isISO8601()
    .withMessage('CTP expiry must be a valid date'),
  body('pink_slip_expiry')
    .isISO8601()
    .withMessage('Pink slip expiry must be a valid date'),
  body('weekly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weekly rate must be positive'),
  body('bond_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bond amount must be positive'),
];