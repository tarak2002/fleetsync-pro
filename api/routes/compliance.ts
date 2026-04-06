import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/alerts', async (req, res) => {
    try {
        const alerts = await prisma.alert.findMany({
            where: { resolved: false },
            orderBy: { created_at: 'desc' }
        });
        res.json(alerts);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/summary', async (req, res) => {
    try {
        const vehicles = await prisma.vehicle.findMany();
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const summary = {
            rego: { valid: 0, expiringSoon: 0, expired: 0 },
            ctp: { valid: 0, expiringSoon: 0, expired: 0 },
            pink_slip: { valid: 0, expiringSoon: 0, expired: 0 }
        };

        vehicles.forEach(v => {
            // Check Rego
            if (v.rego_expiry < now) summary.rego.expired++;
            else if (v.rego_expiry < thirtyDaysFromNow) summary.rego.expiringSoon++;
            else summary.rego.valid++;

            // Check CTP
            if (v.ctp_expiry < now) summary.ctp.expired++;
            else if (v.ctp_expiry < thirtyDaysFromNow) summary.ctp.expiringSoon++;
            else summary.ctp.valid++;

            // Check Pink Slip
            if (v.pink_slip_expiry < now) summary.pink_slip.expired++;
            else if (v.pink_slip_expiry < thirtyDaysFromNow) summary.pink_slip.expiringSoon++;
            else summary.pink_slip.valid++;
        });

        res.json(summary);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/expiring', async (req, res) => {
    try {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const expiring = await prisma.vehicle.findMany({
            where: {
                OR: [
                    { rego_expiry: { lt: thirtyDaysFromNow } },
                    { ctp_expiry: { lt: thirtyDaysFromNow } },
                    { pink_slip_expiry: { lt: thirtyDaysFromNow } }
                ]
            }
        });

        const formatted = expiring.flatMap(v => {
            const items = [];
            if (v.rego_expiry < thirtyDaysFromNow) items.push({ id: v.id, plate: v.plate, type: 'REGO', expiryDate: v.rego_expiry });
            if (v.ctp_expiry < thirtyDaysFromNow) items.push({ id: v.id, plate: v.plate, type: 'CTP', expiryDate: v.ctp_expiry });
            if (v.pink_slip_expiry < thirtyDaysFromNow) items.push({ id: v.id, plate: v.plate, type: 'PINK_SLIP', expiryDate: v.pink_slip_expiry });
            return items;
        });

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
