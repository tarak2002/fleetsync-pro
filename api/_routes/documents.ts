import { Router } from 'express';
import { prisma } from '../_lib/prisma.js';

const router = Router();

router.get('/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;

        if (['rego', 'ctp', 'pink-slip'].includes(type)) {
            const vehicle = await prisma.vehicle.findUnique({
                where: { id: id }
            });

            if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

            const docMap: Record<string, any> = {
                'rego': { title: 'Registration Certificate', type: 'REGO', validUntil: vehicle.rego_expiry, details: { 'Plate': vehicle.plate, 'VIN': vehicle.vin, 'Owner': 'FleetSync Pro Pty Ltd' } },
                'ctp': { title: 'Compulsory Third Party (CTP)', type: 'CTP', validUntil: vehicle.ctp_expiry, details: { 'Insurer': 'NRMA Insurance', 'Status': 'ACTIVE' } },
                'pink-slip': { title: 'Safety Inspection (Pink Slip)', type: 'PINK_SLIP', inspectionDate: vehicle.pink_slip_expiry, details: { 'Result': 'PASS' } }
            };

            return res.json(docMap[type]);
        }

        if (type === 'rental-agreement') {
            const rental = await prisma.rental.findUnique({
                where: { id: id },
                include: { driver: true, vehicle: true }
            });

            if (!rental) return res.status(404).json({ error: 'Rental not found' });

            return res.json({
                title: 'Rental Agreement',
                type: 'RENTAL_AGREEMENT',
                startDate: rental.start_date,
                details: { 'Weekly Rate': `$${Number(rental.weekly_rate).toFixed(2)}`, 'Bond': `$${Number(rental.bond_amount).toFixed(2)}`, 'Driver': rental.driver.name },
                terms: ['Cleanliness required', 'Weekly payments', 'No smoking']
            });
        }

        res.status(400).json({ error: 'Invalid document type' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
