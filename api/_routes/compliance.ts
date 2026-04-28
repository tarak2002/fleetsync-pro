import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { ComplianceService } from '../_services/ComplianceService.js';
import { AuthRequest, adminOnly } from '../_middleware/auth.js';

const router = Router();

// SEC-16 FIX: All compliance routes now require authMiddleware + adminOnly
// Get unresolved compliance alerts
router.get('/alerts', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data, error } = await supabase
 .from('alerts')
 .select('*, vehicle:vehicles(plate)')
 .eq('business_id', businessId)
 .eq('resolved', false)
 .order('created_at', { ascending: false });
 if (error) throw error;
 res.json(data);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Run compliance check
router.post('/check', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const results = await ComplianceService.checkExpiries(businessId);
 res.json(results);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Resolve an alert
router.post('/alerts/:id/resolve', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const result = await ComplianceService.resolveAlert(req.params.id, businessId);
 res.json(result);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Get upcoming expiries (frontend expectation)
router.get('/upcoming-expiries', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const data = await ComplianceService.getUpcomingExpiries(businessId);
 // Transform to match the Expiry interface in Compliance.tsx
 // Interface Expiry { vehicle_id: string; plate: string; upcoming_expiries: string[]; }
 const formatted = data.map((v: any) => ({
 vehicle_id: v.vehicleId,
 plate: v.plate,
 upcoming_expiries: v.upcomingExpiries
 }));
 res.json(formatted);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Historical/Legacy routes for compatibility
router.get('/summary', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data: vehicles, error } = await supabase.from('vehicles').select('rego_expiry, ctp_expiry, pink_slip_expiry').eq('business_id', businessId);
 if (error) throw error;

    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const summary = {
      rego:      { valid: 0, expiringSoon: 0, expired: 0 },
      ctp:       { valid: 0, expiringSoon: 0, expired: 0 },
      pink_slip: { valid: 0, expiringSoon: 0, expired: 0 },
    };

    (vehicles || []).forEach(v => {
      const check = (expiry: string, key: keyof typeof summary) => {
        const d = new Date(expiry);
        if (d < now) summary[key].expired++;
        else if (d < thirtyDays) summary[key].expiringSoon++;
        else summary[key].valid++;
      };
      check(v.rego_expiry, 'rego');
      check(v.ctp_expiry, 'ctp');
      check(v.pink_slip_expiry, 'pink_slip');
    });

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
