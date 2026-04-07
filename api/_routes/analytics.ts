import { Router } from 'express';
import { prisma } from '../_lib/prisma.js';

const router = Router();

// Dashboard Stats
router.get('/dashboard', async (req, res) => {
    try {
        const [
            totalVehicles,
            vehicleStatuses,
            totalDrivers,
            driverStatuses,
            activeRentals,
            pendingInvoices,
            overdueInvoices,
            totalAlerts
        ] = await Promise.all([
            prisma.vehicle.count(),
            prisma.vehicle.groupBy({ by: ['status'], _count: true }),
            prisma.driver.count(),
            prisma.driver.groupBy({ by: ['status'], _count: true }),
            prisma.rental.count({ where: { status: 'ACTIVE' } }),
            prisma.invoice.aggregate({
                where: { status: 'PENDING' },
                _count: true,
                _sum: { amount: true }
            }),
            prisma.invoice.aggregate({
                where: { status: 'OVERDUE' },
                _count: true,
                _sum: { amount: true }
            }),
            prisma.alert.count({ where: { resolved: false } })
        ]);

        const vehicleByStatus = vehicleStatuses.reduce((acc, curr) => ({
            ...acc, [curr.status]: curr._count
        }), {});

        const driverByStatus = driverStatuses.reduce((acc, curr) => ({
            ...acc, [curr.status]: curr._count
        }), {});

        res.json({
            vehicles: {
                total: totalVehicles,
                byStatus: vehicleByStatus
            },
            drivers: {
                total: totalDrivers,
                byStatus: driverByStatus
            },
            rentals: {
                active: activeRentals
            },
            invoices: {
                pending: {
                    count: pendingInvoices._count,
                    total: pendingInvoices._sum.amount || 0
                },
                overdue: {
                    count: overdueInvoices._count,
                    total: overdueInvoices._sum.amount || 0
                }
            },
            alerts: totalAlerts
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/rental-breakdown', async (req, res) => {
    try {
        const breakdown = await prisma.rental.groupBy({
            by: ['status'],
            _count: true
        });
        res.json(breakdown.map(b => ({ status: b.status, count: b._count })));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
