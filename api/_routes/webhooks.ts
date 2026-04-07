import { Router } from 'express';
import { stripe } from '../_lib/stripe.js';
import { prisma } from '../_lib/prisma.js';
import express from 'express';

const router = Router();

// Stripe Webhook Secret (from Stripe Dashboard)
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as any;
                const { driverId, rentalId, type } = session.metadata;

                if (type === 'BOND_PAYMENT') {
                    // Update driver balance or mark rental as active
                    await prisma.rental.update({
                        where: { id: rentalId },
                        data: {
                            status: 'ACTIVE',
                            // Add other updates as needed
                        }
                    });
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as any;
                // Handle recurring subscription payments
                const stripeCustomerId = invoice.customer;
                
                // Find driver associated with this customer
                const driver = await prisma.driver.findUnique({
                    where: { stripe_customer_id: stripeCustomerId }
                });

                if (driver) {
                    // Create invoice record or update existing
                    // Example: update the most recent pending invoice
                    await prisma.invoice.updateMany({
                        where: {
                            rental: { driver_id: driver.id },
                            status: 'PENDING'
                        },
                        data: {
                            status: 'PAID',
                            paid_at: new Date()
                        }
                    });
                }
                break;
            }

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error: any) {
        console.error('Webhook process error:', error.message);
        res.status(500).json({ error: 'Internal server error processing webhook' });
    }
});

export default router;
