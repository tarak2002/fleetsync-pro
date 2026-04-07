import { Router } from 'express';
import { prisma } from '../_lib/prisma.js';

const router = Router();

// Get all drivers with optional status filter
router.get('/', async (req, res) => {
    try {
        const { status } = req.query;
        const drivers = await prisma.driver.findMany({
            where: status ? { status: status as any } : undefined,
            include: { user: true }
        });
        res.json(drivers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get driver stats
router.get('/stats', async (req, res) => {
    try {
        const total = await prisma.driver.count();
        const active = await prisma.driver.count({ where: { status: 'ACTIVE' } });
        const pending = await prisma.driver.count({ where: { status: 'PENDING_APPROVAL' } });
        const inactive = await prisma.driver.count({ where: { status: 'INACTIVE' } });
        
        res.json({ total, active, pending, inactive });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get driver by ID
router.get('/:id', async (req, res) => {
    try {
        const driver = await prisma.driver.findUnique({
            where: { id: req.params.id },
            include: { 
                user: true,
                rentals: {
                    include: { vehicle: true }
                }
            }
        });
        if (!driver) return res.status(404).json({ error: 'Driver not found' });
        res.json(driver);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
