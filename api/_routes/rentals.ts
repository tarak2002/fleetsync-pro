import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest } from '../_middleware/auth.js';

const router = Router();

// Get all rentals
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('rentals')
      .select('*, driver:drivers(*), vehicle:vehicles(*)')
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
    let query = supabase
      .from('rentals')
      .select('*, driver:drivers(*), vehicle:vehicles(*)')
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
    const { data: rental, error } = await supabase
      .from('rentals')
      .select('*, driver:drivers(*), vehicle:vehicles(*), invoices(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !rental) return res.status(404).json({ error: 'Rental not found' });

    if (req.user?.role === 'DRIVER' && rental.driver_id !== req.user.driverId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(rental);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new rental (transactional: check vehicle, update status, create rental + bond invoice)
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { driver_id, vehicle_id, weekly_rate, bond_amount, start_date } = req.body;

    if (!driver_id || !vehicle_id) {
      return res.status(400).json({ error: 'Driver and Vehicle IDs are required' });
    }

    // 1. Verify vehicle is available
    const { data: vehicle, error: vErr } = await supabase
      .from('vehicles')
      .select('id, status')
      .eq('id', vehicle_id)
      .single();

    if (vErr || !vehicle || vehicle.status !== 'AVAILABLE') {
      return res.status(400).json({ error: 'Vehicle is no longer available' });
    }

    // 2. Update vehicle status to RENTED
    const { error: updateErr } = await supabase
      .from('vehicles')
      .update({ status: 'RENTED', updated_at: new Date().toISOString() })
      .eq('id', vehicle_id);
    if (updateErr) throw updateErr;

    // 3. Create rental
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
        status: 'ACTIVE',
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
    // Get rental to check vehicle
    const { data: rental, error: fetchErr } = await supabase
      .from('rentals')
      .select('id, vehicle_id, status')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !rental) return res.status(404).json({ error: 'Rental not found' });
    if (rental.status !== 'ACTIVE') return res.status(400).json({ error: 'Rental is not active' });

    // Update rental
    const { data: updated, error: rentalErr } = await supabase
      .from('rentals')
      .update({ status: 'COMPLETED', end_date: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select('*, driver:drivers(*), vehicle:vehicles(*)')
      .single();
    if (rentalErr) throw rentalErr;

    // Free the vehicle
    await supabase
      .from('vehicles')
      .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
      .eq('id', rental.vehicle_id);

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
