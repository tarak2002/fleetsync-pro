import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest } from '../_middleware/auth.js';
import { DriverService } from '../_services/DriverService.js';

const router = Router();

// Get all drivers with optional status filter
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    let query = supabase.from('drivers').select('*, user:users(*)');
    if (status) query = query.eq('status', status as string);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get driver stats
router.get('/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('status');
    if (error) throw error;

    const total = data.length;
    const active = data.filter(d => d.status === 'ACTIVE').length;
    const pending = data.filter(d => d.status === 'PENDING_APPROVAL').length;
    const inactive = data.filter(d => d.status === 'INACTIVE').length;

    res.json({ total, active, pending, inactive });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get driver by ID
router.get('/:id', async (req, res) => {
  try {
    const { data: driver, error } = await supabase
      .from('drivers')
      .select('*, user:users(*), rentals(*, vehicle:vehicles(*))')
      .eq('id', req.params.id)
      .single();

    if (error || !driver) return res.status(404).json({ error: 'Driver not found' });
    res.json(driver);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create driver
router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .insert({ ...req.body, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update driver status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('drivers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Approve driver
router.post('/:id/approve', async (req, res) => {
  try {
    const data = await DriverService.approveDriver(req.params.id);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Block driver
router.post('/:id/block', async (req, res) => {
  try {
    const data = await DriverService.blockDriver(req.params.id);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run VEVO check
router.post('/:id/vevo-check', async (req, res) => {
  try {
    const data = await DriverService.runVevoCheck(req.params.id);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
