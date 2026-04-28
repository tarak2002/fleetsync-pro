import { Router } from 'express';
import { stripe } from '../_lib/stripe.js';
import { StripeService } from '../_services/StripeService.js';
import { supabase } from '../_lib/supabase.js';

const router = Router();

// Simple in-memory rate limiting (resets on deploy, but provides basic protection)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 10; // 10 requests per window

const checkRateLimit = (ip: string): boolean => {
    const now = Date.now();
    const record = rateLimitStore.get(ip);
    if (!record || now > record.resetAt) {
        rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
        return true;
    }
    if (record.count >= RATE_LIMIT_MAX) {
        return false;
    }
    record.count++;
    return true;
};

// Create a Checkout Session for the rental bond
router.post('/create-checkout-session', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
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
            cancel_url: `${process.env.CLIENT_URL}/dashboard/cancel?status=cancel`,
            metadata,
        });

        res.json({ id: session.id, url: session.url });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a Setup Intent for future weekly billing
router.get('/setup-intent', async (req, res) => {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }
    try {
        const userId = req.user?.id; // From authMiddleware
        
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        // Get driver info
        const { data: driver, error: driverErr } = await supabase
            .from('drivers')
            .select('id, email, name, stripe_customer_id')
            .eq('user_id', userId)
            .single();

        if (driverErr || !driver) return res.status(404).json({ error: 'Driver not found' });

        // Ensure customer exists in Stripe
        const customerId = await StripeService.createCustomer(driver.id, driver.email, driver.name);

        // Create SetupIntent
        const setupIntent = await StripeService.createSetupIntent(customerId);
        
        res.json({ clientSecret: setupIntent.client_secret });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
