import { Router } from 'express';

const router = Router();

router.get('/unprocessed', (req, res) => res.json([
    { id: 't1', vehicle_id: 'v1', plate: 'ABC-123', location: 'Sydney Harbour Bridge', amount: 4.50, timestamp: new Date().toISOString() },
    { id: 't2', vehicle_id: 'v2', plate: 'ELN-001', location: 'M2 Motorway', amount: 8.20, timestamp: new Date().toISOString() }
]));
router.post('/process', (req, res) => res.json({ success: true, processed_count: 2 }));

export default router;
