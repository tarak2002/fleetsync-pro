import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, adminOnly } from '../_middleware/auth.js';
import { BillingService } from '../_services/BillingService.js';

const router = Router();

// Get all invoices
router.get('/', async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 let query = supabase
 .from('invoices')
 .select('*, rental:rentals(*, driver:drivers(*), vehicle:vehicles(*))')
 .eq('business_id', businessId)
 .order('created_at', { ascending: false });

 // Status filter (PENDING, PAID, OVERDUE)
 const { status, driver_id } = req.query;
 if (status && status !== 'all') {
   query = query.eq('status', status as string);
 }

 if (driver_id) {
 const { data: matchingRentals } = await supabase
 .from('rentals')
 .select('id')
 .eq('driver_id', driver_id as string)
 .eq('business_id', businessId);
 const ids = (matchingRentals || []).map(r => r.id);
 query = query.in('rental_id', ids.length ? ids : ['__none__']);
 } else if (req.user?.role === 'DRIVER') {
 const { data: driverRentals } = await supabase
 .from('rentals')
 .select('id')
 .eq('driver_id', req.user.driverId)
 .eq('business_id', businessId);
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
// SEC-08 FIX: Add ownership check — only the driver on the rental or an admin can pay
router.post('/:id/pay', async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data: invoice, error: fetchErr } = await supabase
 .from('invoices')
 .select('*, rental:rentals(driver_id)')
 .eq('id', req.params.id)
 .eq('business_id', businessId)
 .single();

 if (fetchErr || !invoice) return res.status(404).json({ error: 'Invoice not found' });

 // Authorization: ADMIN can pay any invoice; DRIVER can only pay their own
 if (req.user?.role !== 'ADMIN' && invoice.rental?.driver_id !== req.user?.driverId) {
 return res.status(403).json({ error: 'Access denied' });
 }

 const { data, error } = await supabase
 .from('invoices')
 .update({ status: 'PAID', paid_at: new Date().toISOString(), updated_at: new Date().toISOString() })
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

// Run billing cycle — generates invoices for all active rentals due for payment
router.post('/run-billing-cycle', adminOnly, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    const results = await BillingService.runBillingCycle();
    res.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Generate invoice for a specific rental
router.post('/generate', adminOnly, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

    const { rental_id, tolls, fines, credits } = req.body;
    if (!rental_id) return res.status(400).json({ error: 'rental_id is required' });

    const invoice = await BillingService.generateInvoice(rental_id, { tolls, fines, credits });
    res.status(201).json(invoice);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
