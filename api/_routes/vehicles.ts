import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { adminOnly } from '../_middleware/auth.js';

const router = Router();

const getComplianceColor = (expiryDate: string): 'GREEN' | 'AMBER' | 'RED' => {
  const months = (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
  if (months < 0) return 'RED';
  if (months < 2) return 'AMBER';
  return 'GREEN';
};

// Get all vehicles with optional status filter
router.get('/', adminOnly, async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase
      .from('vehicles')
      .select('*, rentals(*, driver:drivers(*))');

    if (status) query = query.eq('status', status as string);

    const { data: vehicles, error } = await query;
    if (error) throw error;

    const formatted = (vehicles || []).map(v => ({
      ...v,
      compliance: {
        rego: getComplianceColor(v.rego_expiry),
        ctp: getComplianceColor(v.ctp_expiry),
        pink_slip: getComplianceColor(v.pink_slip_expiry),
      },
      current_driver: v.rentals?.find((r: any) => r.status === 'ACTIVE')?.driver || null,
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available vehicles
router.get('/available', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('status', 'AVAILABLE');
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const { data: vehicle, error } = await supabase
      .from('vehicles')
      .select('*, rentals(*, driver:drivers(*))')
      .eq('id', req.params.id)
      .order('created_at', { ascending: false, referencedTable: 'rentals' })
      .single();

    if (error || !vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    const formatted = {
      ...vehicle,
      compliance: {
        rego: getComplianceColor(vehicle.rego_expiry),
        ctp: getComplianceColor(vehicle.ctp_expiry),
        pink_slip: getComplianceColor(vehicle.pink_slip_expiry),
      },
      current_driver: vehicle.rentals?.find((r: any) => r.status === 'ACTIVE')?.driver || null,
    };

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create vehicle
router.post('/', adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert({ status: 'AVAILABLE', ...req.body, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update vehicle
router.patch('/:id', adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ ...req.body, updated_at: new Date().toISOString() })
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
