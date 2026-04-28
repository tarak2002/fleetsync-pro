import { body } from 'express-validator';

/**
 * Validators for creating a rental.
 * Required: driver_id (must be ACTIVE), vehicle_id (must be AVAILABLE)
 */
export const createRentalValidation = [
  body('driver_id')
    .isUUID()
    .withMessage('Valid driver_id is required'),
  body('vehicle_id')
    .isUUID()
    .withMessage('Valid vehicle_id is required'),
  body('weekly_rate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weekly rate must be positive'),
  body('bond_amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Bond amount must be positive'),
  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date'),
];