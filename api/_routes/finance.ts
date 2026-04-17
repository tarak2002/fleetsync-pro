import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';

const router = Router();

// Get financial dashboard summary
router.get('/dashboard', async (req, res) => {
    try {
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
                .select('amount')
                .eq('status', 'PAID')
                .gte('paid_at', start.toISOString())
                .lte('paid_at', end.toISOString()),
            supabase.from('vehicles')
                .select('insurance_cost')
                .in('status', ['AVAILABLE', 'RENTED'])
        ]);

        const totalIncome = (paidInvoices || []).reduce((sum, inv) => sum + Number(inv.amount), 0);
        
        // Calculate pro-rated insurance expenses for the period
        const totalAnnualInsurance = (vehicles || []).reduce((sum, v) => sum + Number(v.insurance_cost || 0), 0);
        const totalExpenses = (totalAnnualInsurance / 365) * periodDays;

        res.json({
            income: totalIncome,
            expenses: totalExpenses,
            net_profit: totalIncome - totalExpenses,
            period_days: periodDays
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get insurance breakdown
router.get('/insurance', async (req, res) => {
    try {
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
            .in('status', ['AVAILABLE', 'RENTED']);

        if (error) throw error;

        const insuranceData = (vehicles || []).map(v => {
            const activeRental = v.rentals?.find((r: any) => r.status === 'ACTIVE');
            const annualCost = Number(v.insurance_cost || 0);
            return {
                vehicle_id: v.id,
                plate: v.plate,
                make: v.make,
                model: v.model,
                current_driver: activeRental?.driver?.name || '—',
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
