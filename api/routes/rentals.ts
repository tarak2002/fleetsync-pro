import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Get all rentals with optional status filter
router.get('/', async (req: AuthRequest, res) => {
    try {
        const { status } = req.query;
        const where: any = {};
        
        if (status && status !== 'all') {
            where.status = status;
        }

        // If the user is a driver, they should only see their own rentals
        if (req.user?.role === 'DRIVER') {
            where.driver_id = req.user.driverId;
        }

        const rentals = await prisma.rental.findMany({
            where,
            include: {
                driver: true,
                vehicle: true
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(rentals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get active rentals
router.get('/active', async (req: AuthRequest, res) => {
    try {
        const rentals = await prisma.rental.findMany({
            where: { 
                status: 'ACTIVE',
                driver_id: req.user?.role === 'DRIVER' ? req.user.driverId : undefined
            },
            include: {
                driver: true,
                vehicle: true
            }
        });
        res.json(rentals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get rental by ID
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const rental = await prisma.rental.findUnique({
            where: { id: req.params.id },
            include: {
                driver: true,
                vehicle: true,
                invoices: {
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        if (!rental) return res.status(404).json({ error: 'Rental not found' });

        // Security check: Drivers can only see their own rentals
        if (req.user?.role === 'DRIVER' && rental.driver_id !== req.user.driverId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(rental);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
