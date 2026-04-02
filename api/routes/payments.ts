import { Router } from 'express';

const router = Router();

// Mock Payment intent creation
router.post('/create-payment-intent', (req, res) => {
    return res.json({ clientSecret: 'pi_mock_secret_123' });
});

// Mock Setup intent
router.post('/setup-intent', (req, res) => {
    return res.json({ clientSecret: 'seti_mock_secret_123' });
});

export default router;
export const webhookRouter = Router();
webhookRouter.post('/', (req, res) => res.json({ received: true }));
