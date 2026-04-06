import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

// Driver dashboard data
router.get('/active-rental', async (req: AuthRequest, res) => {
    try {
        if (!req.user || req.user.role !== 'DRIVER') {
            return res.status(403).json({ error: 'Driver access required' });
        }

        const activeRental = await prisma.rental.findFirst({
            where: { 
                driver_id: req.user.driverId,
                status: 'ACTIVE'
            },
            include: {
                vehicle: true
            }
        });

        if (!activeRental) {
            return res.json({ has_active_rental: false });
        }

        res.json({
            has_active_rental: true,
            rental_id: activeRental.id,
            vehicle: activeRental.vehicle,
            documents: {
                regoUrl: `/api/documents/rego/${activeRental.vehicle.id}`,
                ctpUrl: `/api/documents/ctp/${activeRental.vehicle.id}`,
                pinkSlipUrl: `/api/documents/pink-slip/${activeRental.vehicle.id}`,
                rentalAgreementUrl: `/api/documents/rental-agreement/${activeRental.id}`
            },
            shift_status: 'NOT_STARTED', // Extend this based on a Shift model in the future
            last_condition_report: new Date(Date.now() - 86400000).toISOString()
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
