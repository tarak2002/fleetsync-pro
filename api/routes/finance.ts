import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Get Admin Finance Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const income = await prisma.invoice.aggregate({
            where: { status: 'PAID' },
            _sum: { amount: true }
        });

        const totalIncome = Number(income._sum.amount || 0);
        const expenses = totalIncome * 0.2; // Simulating 20% overhead for now

        res.json({
            income: totalIncome,
            expenses: expenses,
            net_profit: totalIncome - expenses,
            period_days: 30
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get Insurance Breakdown
router.get('/insurance', async (req, res) => {
    try {
        const vehicles = await prisma.vehicle.findMany({
            include: {
                rentals: {
                    where: { status: 'ACTIVE' },
                    include: { driver: true }
                }
            }
        });

        const formatted = vehicles.map(v => ({
            vehicle_id: v.id,
            plate: v.plate,
            make: v.make,
            model: v.model,
            insurance_cost_annual: 2000, // Default or fetch from vehicle meta
            insurance_cost_daily: (2000 / 365).toFixed(2),
            current_driver: v.rentals[0]?.driver.name || 'None'
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
