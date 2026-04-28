import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, adminOnly } from '../_middleware/auth.js';

const router = Router();

// SEC-17 FIX: Added authMiddleware and adminOnly
// Dashboard analytics
router.get('/dashboard', adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

        const [
            { data: vehicles },
            { data: drivers },
            { data: rentals },
            { data: invoices },
            { data: alerts },
            { data: recentRentals },
        ] = await Promise.all([
            supabase.from('vehicles').select('status').eq('business_id', businessId),
            supabase.from('drivers').select('id, name, status').eq('business_id', businessId),
            supabase.from('rentals').select('status, created_at').eq('business_id', businessId),
            supabase.from('invoices').select('status, amount, paid_at, created_at').eq('business_id', businessId),
            supabase.from('alerts').select('id').eq('business_id', businessId).eq('resolved', false),
            supabase.from('rentals')
                .select('id, status, start_date, end_date, weekly_rate, driver:drivers(name), vehicle:vehicles(make, model, plate)')
                .eq('business_id', businessId)
                .in('status', ['ACTIVE', 'PENDING', 'COMPLETED'])
                .order('created_at', { ascending: false })
                .limit(8),
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
        const paidInvoices = (invoices || []).filter(i => i.status === 'PAID');

        // Build last 7 days revenue chart data from paid invoices
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        const weeklyRevenueData = last7Days.map(dateStr => {
            const dayRevenue = paidInvoices
                .filter(inv => inv.paid_at && inv.paid_at.startsWith(dateStr))
                .reduce((sum, inv) => sum + Number(inv.amount), 0);
            const dayLabel = new Date(dateStr).toLocaleDateString('en-AU', { weekday: 'short' });
            return { name: dayLabel, revenue: dayRevenue, cost: Math.round(dayRevenue * 0.48) };
        });

        // Rental counts by period
        const now = new Date();
        const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7);
        const thisMonthStart = new Date(now); thisMonthStart.setDate(1);

        const activeRentals = (rentals || []).filter(r => r.status === 'ACTIVE');
        const weekRentals = (rentals || []).filter(r => new Date(r.created_at) >= thisWeekStart);
        const monthRentals = (rentals || []).filter(r => new Date(r.created_at) >= thisMonthStart);

        // Total weekly revenue from paid invoices in last 7 days
        const weeklyRevenue = paidInvoices
            .filter(inv => inv.paid_at && new Date(inv.paid_at) >= thisWeekStart)
            .reduce((sum, inv) => sum + Number(inv.amount), 0);

        // Driver performance (rentals per driver)
        const driverRentalCounts: Record<string, number> = {};
        (rentals || []).forEach(r => {
            if ((r as any).driver_id) {
                driverRentalCounts[(r as any).driver_id] = (driverRentalCounts[(r as any).driver_id] || 0) + 1;
            }
        });

        res.json({
            vehicles: { total: (vehicles || []).length, byStatus: vehicleByStatus },
            drivers: { total: (drivers || []).length, byStatus: driverByStatus, list: drivers || [] },
            rentals: {
                active: activeRentals.length,
                total: (rentals || []).length,
                thisWeek: weekRentals.length,
                thisMonth: monthRentals.length,
            },
            invoices: {
                pending: {
                    count: pendingInvoices.length,
                    total: pendingInvoices.reduce((s, i) => s + Number(i.amount), 0),
                },
                overdue: {
                    count: overdueInvoices.length,
                    total: overdueInvoices.reduce((s, i) => s + Number(i.amount), 0),
                },
                paid: {
                    count: paidInvoices.length,
                    total: paidInvoices.reduce((s, i) => s + Number(i.amount), 0),
                },
            },
            alerts: (alerts || []).length,
            weeklyRevenue,
            weeklyRevenueData,
            recentRentals: recentRentals || [],
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Rental breakdown by status
router.get('/rental-breakdown', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data, error } = await supabase.from('rentals').select('status').eq('business_id', businessId);
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
