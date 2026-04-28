import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest } from '../_middleware/auth.js';
import { body, query as validateQuery, validationResult } from 'express-validator';

const router = Router();

// Validation middleware
const validate = (req: AuthRequest, res: any, next: any) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Get all rentals
router.get('/', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    const { status } = req.query;
    let query = supabase
      .from('rentals')
      .select('*, driver:drivers(*), vehicle:vehicles(*)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status as string);
    if (req.user?.role === 'DRIVER') query = query.eq('driver_id', req.user.driverId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get active rentals
router.get('/active', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    let query = supabase
      .from('rentals')
      .select('*, driver:drivers(*), vehicle:vehicles(*)')
      .eq('business_id', businessId)
      .eq('status', 'ACTIVE');

    if (req.user?.role === 'DRIVER') query = query.eq('driver_id', req.user.driverId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get rental by ID
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    const { data: rental, error } = await supabase
      .from('rentals')
      .select('*, driver:drivers(*), vehicle:vehicles(*), invoices(*)')
      .eq('id', req.params.id)
      .eq('business_id', businessId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Rental not found' });
      }
      throw error;
    }
    if (!rental) return res.status(404).json({ error: 'Rental not found' });

    if (req.user?.role === 'DRIVER' && rental.driver_id !== req.user.driverId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(rental);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new rental - with validation
const createRentalValidation = [
    body('driver_id').isUUID().withMessage('Valid driver_id is required'),
    body('vehicle_id').isUUID().withMessage('Valid vehicle_id is required'),
    body('weekly_rate').optional().isFloat({ min: 0 }).withMessage('Weekly rate must be positive'),
    body('bond_amount').optional().isFloat({ min: 0 }).withMessage('Bond amount must be positive'),
    body('start_date').optional().isISO8601().withMessage('Invalid start date'),
];

router.post('/', createRentalValidation, validate, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    const { driver_id, vehicle_id, weekly_rate, bond_amount, start_date } = req.body;

    if (!driver_id || !vehicle_id) {
      return res.status(400).json({ error: 'Driver and Vehicle IDs are required' });
    }

    // SEC-19 FIX: Validate start_date is within acceptable range
    if (start_date) {
      const start = new Date(start_date);
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Normalize to start of today
      const maxFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      if (isNaN(start.getTime()) || start < now || start > maxFuture) {
        return res.status(400).json({ error: 'start_date must be today or within the next 30 days' });
      }
    }

    // 1. Verify vehicle is available and belongs to business
    const { data: vehicle, error: vErr } = await supabase
      .from('vehicles')
      .select('id, status')
      .eq('id', vehicle_id)
      .eq('business_id', businessId)
      .single();

    if (vErr || !vehicle || vehicle.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Vehicle is no longer available' });
    }

    // 2. Update vehicle status to RENTED (Lock it)
    const { error: updateErr } = await supabase
      .from('vehicles')
      .update({ status: 'RENTED', updated_at: new Date().toISOString() })
      .eq('id', vehicle_id)
      .eq('business_id', businessId);
    if (updateErr) throw updateErr;

    // 3. Create rental (status can be PENDING or ACTIVE)
    const start = start_date ? new Date(start_date) : new Date();
    const nextPayment = new Date(start);
    nextPayment.setDate(nextPayment.getDate() + 7);

    const { data: rental, error: rentalErr } = await supabase
      .from('rentals')
      .insert({
        driver_id,
        vehicle_id,
        weekly_rate,
        bond_amount,
        start_date: start.toISOString(),
        next_payment_date: nextPayment.toISOString(),
        status: req.body.status || 'ACTIVE',
        business_id: businessId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (rentalErr) throw rentalErr;

    // 4. Create bond invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        rental_id: rental.id,
        weekly_rate: 0,
        amount: bond_amount,
        due_date: start.toISOString(),
        status: 'PENDING',
        business_id: businessId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (invErr) throw invErr;

    // 5. Create initial shift for the driver (so "Start Shift" works immediately)
    const { data: shift } = await supabase
      .from('shifts')
      .insert({
        rental_id: rental.id,
        driver_id,
        status: 'NOT_STARTED',
        business_id: businessId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    res.status(201).json({ rental, invoice, shift });
  } catch (error: any) {
    console.error('Rental Creation Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// End a rental
router.patch('/:id/end', async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    // Get rental to check vehicle
    const { data: rental, error: fetchErr } = await supabase
      .from('rentals')
      .select('id, vehicle_id, status')
      .eq('id', req.params.id)
      .eq('business_id', businessId)
      .single();

    if (fetchErr || !rental) return res.status(404).json({ error: 'Rental not found' });
    if (rental.status !== 'ACTIVE') return res.status(400).json({ error: 'Rental is not active' });

    // Update rental
    const { data: updated, error: rentalErr } = await supabase
      .from('rentals')
      .update({ status: 'COMPLETED', end_date: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('business_id', businessId)
      .select('*, driver:drivers(*), vehicle:vehicles(*)')
      .single();
    if (rentalErr) throw rentalErr;

    // Free the vehicle
    await supabase
      .from('vehicles')
      .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
      .eq('id', rental.vehicle_id)
      .eq('business_id', businessId);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
