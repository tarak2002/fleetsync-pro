import { Router } from 'express';
import { prisma } from '../_lib/prisma.js';
import { adminOnly } from '../_middleware/auth.js';

const router = Router();

// Helper to determine compliance color
const getComplianceColor = (expiryDate: Date) => {
    const monthsUntil = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30);
    if (monthsUntil < 0) return 'RED';
    if (monthsUntil < 2) return 'AMBER';
    return 'GREEN';
};

// Get all vehicles with optional status filter
router.get('/', adminOnly, async (req, res) => {
    try {
        const { status } = req.query;
        const vehicles = await prisma.vehicle.findMany({
            where: status ? { status: status as any } : undefined,
            include: {
                rentals: {
                    where: { status: 'ACTIVE' },
                    include: { driver: true },
                    take: 1
                }
            }
        });

        // Map to format frontend expects
        const formatted = vehicles.map(v => ({
            ...v,
            compliance: {
                rego: getComplianceColor(v.rego_expiry),
                ctp: getComplianceColor(v.ctp_expiry),
                pink_slip: getComplianceColor(v.pink_slip_expiry)
            },
            current_driver: v.rentals[0]?.driver || null
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get available vehicles
router.get('/available', async (req, res) => {
    try {
        const vehicles = await prisma.vehicle.findMany({
            where: { status: 'AVAILABLE' }
        });
        res.json(vehicles);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get vehicle by ID
router.get('/:id', async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: req.params.id },
            include: {
                rentals: {
                    orderBy: { created_at: 'desc' },
                    include: { driver: true }
                }
            }
        });

        if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

        const formatted = {
            ...vehicle,
            compliance: {
                rego: getComplianceColor(vehicle.rego_expiry),
                ctp: getComplianceColor(vehicle.ctp_expiry),
                pink_slip: getComplianceColor(vehicle.pink_slip_expiry)
            },
            current_driver: vehicle.rentals.find(r => r.status === 'ACTIVE')?.driver || null
        };

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/', adminOnly, async (req, res) => {
    try {
        const vehicle = await prisma.vehicle.create({
            data: req.body
        });
        res.status(201).json(vehicle);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
