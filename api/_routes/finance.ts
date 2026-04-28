import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, adminOnly } from '../_middleware/auth.js';

const router = Router();

// Get financial dashboard summary
// SEC-09 FIX: Added authMiddleware and adminOnly
router.get('/dashboard', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { start_date, end_date } = req.query;

 // Default to last 30 days if no dates provided
 const start = start_date ? new Date(start_date as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
 const end = end_date ? new Date(end_date as string) : new Date();
 const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;

 const [
 { data: paidInvoices },
 { data: vehicles }
 ] = await Promise.all([
 supabase.from('invoices')
 .select('amount, tolls')
 .eq('status', 'PAID')
 .eq('business_id', businessId)
 .gte('paid_at', start.toISOString())
 .lte('paid_at', end.toISOString()),
 supabase.from('vehicles')
 .select('insurance_cost')
 .eq('business_id', businessId)
 .in('status', ['AVAILABLE', 'RENTED'])
 ]);

        const totalIncome = (paidInvoices || []).reduce((sum, inv) => sum + Number(inv.amount), 0);
        const totalTolls = (paidInvoices || []).reduce((sum, inv) => sum + Number(inv.tolls || 0), 0);
        
        // Calculate pro-rated insurance expenses for the period
        const totalAnnualInsurance = (vehicles || []).reduce((sum, v) => sum + Number(v.insurance_cost || 0), 0);
        const totalExpenses = (totalAnnualInsurance / 365) * periodDays;

        res.json({
            income: totalIncome,
            tolls_total: totalTolls,
            expenses: totalExpenses,
            net_profit: totalIncome - totalExpenses,
            period_days: periodDays
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get insurance breakdown
// SEC-09 FIX: Added adminOnly
router.get('/insurance', adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data: vehicles, error } = await supabase
 .from('vehicles')
 .select(`
 id,
 plate,
 make,
 model,
 insurance_cost,
 rentals(
 status,
 driver:drivers(name)
 )
 `)
 .eq('business_id', businessId)
 .in('status', ['AVAILABLE', 'RENTED']);

        if (error) throw error;

        const insuranceData = (vehicles || []).map(v => {
            const activeRental = v.rentals?.find((r: any) => r.status === 'ACTIVE');
            const annualCost = Number(v.insurance_cost || 0);
            const driver = activeRental?.driver;
            const driverName = typeof driver === 'object' && driver !== null
                ? driver.name
                : Array.isArray(driver) ? driver[0]?.name : '—';
            return {
                vehicle_id: v.id,
                plate: v.plate,
                make: v.make,
                model: v.model,
                current_driver: driverName || '—',
                insurance_cost_annual: annualCost,
                insurance_cost_daily: annualCost / 365
            };
        });

        res.json(insuranceData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
