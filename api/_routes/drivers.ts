import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, adminOnly } from '../_middleware/auth.js';
import { DriverService } from '../_services/DriverService.js';

const router = Router();

// Get all drivers with optional status filter
router.get('/', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { status } = req.query;
 let query = supabase.from('drivers').select('*, user:users(*)').eq('business_id', businessId);
 if (status) query = query.eq('status', status as string);

 const { data, error } = await query.order('created_at', { ascending: false });
 if (error) throw error;
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Get driver stats
router.get('/stats', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data, error } = await supabase
 .from('drivers')
 .select('status')
 .eq('business_id', businessId);
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
router.get('/:id', async (req: AuthRequest, res) => {
 try {
 // Security: Only Admin or the Driver themselves can view this
 if (req.user?.role !== 'ADMIN' && req.user?.driverId !== req.params.id) {
 return res.status(403).json({ error: 'Access denied' });
 }

 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data: driver, error } = await supabase
 .from('drivers')
 .select('*, user:users(*), rentals(*, vehicle:vehicles(*), invoices(*))')
 .eq('id', req.params.id)
 .eq('business_id', businessId)
 .single();

 if (error || !driver) return res.status(404).json({ error: 'Driver not found' });
 res.json(driver);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Create driver
// SEC-26 FIX: Field allowlisting — only safe fields from req.body
router.post('/', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { name, email, phone, license_no, license_expiry, passport_no } = req.body;

 if (!name || !email || !license_no) {
 return res.status(400).json({ error: 'name, email, and license_no are required' });
 }

 const { data, error } = await supabase
 .from('drivers')
 .insert({
 name,
 email,
 phone: phone || null,
 license_no,
 license_expiry: license_expiry ? new Date(license_expiry).toISOString() : null,
 passport_no: passport_no || null,
 business_id: businessId,
 updated_at: new Date().toISOString()
 })
 .select()
 .single();
 if (error) throw error;
 res.status(201).json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Update driver status
router.patch('/:id/status', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { status } = req.body;
 const { data, error } = await supabase
 .from('drivers')
 .update({ status, updated_at: new Date().toISOString() })
 .eq('id', req.params.id)
 .eq('business_id', businessId)
 .select()
 .single();
 if (error) throw error;
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Approve driver
router.post('/:id/approve', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const data = await DriverService.approveDriver(req.params.id, businessId);
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Block driver
router.post('/:id/block', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const data = await DriverService.blockDriver(req.params.id, businessId);
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Run VEVO check
router.post('/:id/vevo-check', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const data = await DriverService.runVevoCheck(req.params.id, businessId);
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

export default router;
