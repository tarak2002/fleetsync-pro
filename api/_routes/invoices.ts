import { Router } from 'express';
import { prisma } from '../_lib/prisma.js';
import { AuthRequest } from '../_middleware/auth.js';

const router = Router();

// Get all invoices
router.get('/', async (req: AuthRequest, res) => {
    try {
        const { driver_id } = req.query;
        const where: any = {};

        if (driver_id) {
            where.rental = { driver_id: driver_id as string };
        } else if (req.user?.role === 'DRIVER') {
            where.rental = { driver_id: req.user.driverId };
        }

        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                rental: {
                    include: {
                        driver: true,
                        vehicle: true
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(invoices);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Pay invoice
router.post('/:id/pay', async (req: AuthRequest, res) => {
    try {
        const invoice = await prisma.invoice.update({
            where: { id: req.params.id },
            data: { 
                status: 'PAID',
                updated_at: new Date()
            }
        });
        res.json(invoice);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
