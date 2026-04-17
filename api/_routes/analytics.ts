import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';

const router = Router();

// Dashboard analytics
router.get('/dashboard', async (req, res) => {
  try {
    const [
      { data: vehicles },
      { data: drivers },
      { data: rentals },
      { data: invoices },
      { data: alerts },
    ] = await Promise.all([
      supabase.from('vehicles').select('status'),
      supabase.from('drivers').select('status'),
      supabase.from('rentals').select('status'),
      supabase.from('invoices').select('status, amount'),
      supabase.from('alerts').select('id').eq('resolved', false),
    ]);

    const vehicleByStatus = (vehicles || []).reduce((acc: Record<string, number>, v) => {
      acc[v.status] = (acc[v.status] || 0) + 1;
      return acc;
    }, {});

    const driverByStatus = (drivers || []).reduce((acc: Record<string, number>, d) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      return acc;
    }, {});

    const pendingInvoices = (invoices || []).filter(i => i.status === 'PENDING');
    const overdueInvoices = (invoices || []).filter(i => i.status === 'OVERDUE');

    res.json({
      vehicles: { total: (vehicles || []).length, byStatus: vehicleByStatus },
      drivers: { total: (drivers || []).length, byStatus: driverByStatus },
      rentals: { active: (rentals || []).filter(r => r.status === 'ACTIVE').length },
      invoices: {
        pending: {
          count: pendingInvoices.length,
          total: pendingInvoices.reduce((s, i) => s + Number(i.amount), 0),
        },
        overdue: {
          count: overdueInvoices.length,
          total: overdueInvoices.reduce((s, i) => s + Number(i.amount), 0),
        },
      },
      alerts: (alerts || []).length,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rental breakdown by status
router.get('/rental-breakdown', async (req, res) => {
  try {
    const { data, error } = await supabase.from('rentals').select('status');
    if (error) throw error;

    const breakdown = (data || []).reduce((acc: Record<string, number>, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});

    res.json(Object.entries(breakdown).map(([status, count]) => ({ status, count })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
