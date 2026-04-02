import { Router } from 'express';

const router = Router();

router.get('/status', (req, res) => res.json({ status: 'COMPLETED' }));
router.post('/generate-link', (req, res) => res.json({ link: 'http://localhost:5174/onboard/mock-token' }));
router.get('/validate-token/:token', (req, res) => res.json({ valid: true, driver: { name: 'New Driver' } }));
router.post('/submit-application', (req, res) => res.json({ success: true }));

export default router;
