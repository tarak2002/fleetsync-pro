import { Router } from 'express';

const router = Router();

router.get('/alerts', (req, res) => res.json([
    {
        id: 'a1',
        type: 'REGO_EXPIRY',
        message: 'Registration for ABC-123 expires in 2 days.',
        vehicle_id: 'v1',
        resolved: false,
        created_at: new Date().toISOString()
    },
    {
        id: 'a2',
        type: 'CTP_EXPIRY',
        message: 'CTP Insurance for ELN-001 is overdue.',
        vehicle_id: 'v2',
        resolved: false,
        created_at: new Date().toISOString()
    }
]));

router.get('/summary', (req, res) => res.json({
    rego: { valid: 12, expiringSoon: 2, expired: 1 },
    ctp: { valid: 13, expiringSoon: 1, expired: 1 },
    pink_slip: { valid: 14, expiringSoon: 1, expired: 0 }
}));

router.get('/expiring', (req, res) => res.json([
    { id: 'v3', plate: 'EV-999', type: 'REGO', expiryDate: '2024-05-20' },
    { id: 'v1', plate: 'ABC-123', type: 'PINK_SLIP', expiryDate: '2024-06-15' }
]));

export default router;
