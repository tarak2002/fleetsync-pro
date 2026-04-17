import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { ComplianceService } from '../_services/ComplianceService.js';

const router = Router();

// Test route
router.get('/test', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Get unresolved compliance alerts
router.get('/alerts', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*, vehicle:vehicles(plate)')
      .eq('resolved', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Run compliance check
router.post('/check', async (req, res) => {
  try {
    const results = await ComplianceService.checkExpiries();
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resolve an alert
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const result = await ComplianceService.resolveAlert(req.params.id);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get upcoming expiries (frontend expectation)
router.get('/upcoming-expiries', async (req, res) => {
  try {
    const data = await ComplianceService.getUpcomingExpiries();
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
router.get('/summary', async (req, res) => {
  try {
    const { data: vehicles, error } = await supabase.from('vehicles').select('rego_expiry, ctp_expiry, pink_slip_expiry');
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
