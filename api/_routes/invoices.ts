import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest } from '../_middleware/auth.js';

const router = Router();

// Get all invoices
router.get('/', async (req: AuthRequest, res) => {
  try {
    let query = supabase
      .from('invoices')
      .select('*, rental:rentals(*, driver:drivers(*), vehicle:vehicles(*))')
      .order('created_at', { ascending: false });

    const { driver_id } = req.query;
    if (driver_id) {
      // filter via rental relation — fetch matching rental IDs first
      const { data: matchingRentals } = await supabase
        .from('rentals')
        .select('id')
        .eq('driver_id', driver_id as string);
      const ids = (matchingRentals || []).map(r => r.id);
      query = query.in('rental_id', ids.length ? ids : ['__none__']);
    } else if (req.user?.role === 'DRIVER') {
      const { data: driverRentals } = await supabase
        .from('rentals')
        .select('id')
        .eq('driver_id', req.user.driverId);
      const ids = (driverRentals || []).map(r => r.id);
      query = query.in('rental_id', ids.length ? ids : ['__none__']);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark invoice as paid
router.post('/:id/pay', async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .update({ status: 'PAID', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
