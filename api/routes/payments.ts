import { Router } from 'express';
import { stripe } from '../lib/stripe.js';
import { prisma } from '../lib/prisma.js';

const router = Router();

// Create a Checkout Session for the rental bond
router.post('/create-checkout-session', async (req, res) => {
    try {
        const { amount, currency = 'aud', metadata } = req.body;
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: 'Rental Bond Payment',
                            description: 'Initial bond for vehicle rental',
                        },
                        unit_amount: amount, // amount in cents
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.CLIENT_URL}/dashboard/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.CLIENT_URL}/dashboard/cancel`,
            metadata,
        });

        res.json({ id: session.id, url: session.url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a Setup Intent for future weekly billing
router.post('/create-setup-intent', async (req, res) => {
    try {
        const { customerId } = req.body;
        const setupIntent = await stripe.setupIntents.create({
            customer: customerId,
        });
        res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
