import { Router } from 'express';
import express from 'express';
import { StripeService } from '../_services/StripeService.js';

const router = Router();

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    try {
        const result = await StripeService.handleWebhook(req.body, sig);
        res.json(result);
    } catch (err: any) {
        console.error('Webhook Error:', err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
    }
});

export default router;
