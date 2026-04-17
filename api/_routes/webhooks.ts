import { Router } from 'express';
import { stripe } from '../_lib/stripe.js';
import { supabase } from '../_lib/supabase.js';
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
                    // Update rental as active
                    await supabase
                        .from('rentals')
                        .update({ 
                            status: 'ACTIVE', 
                            updated_at: new Date().toISOString() 
                        })
                        .eq('id', rentalId);
                }
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as any;
                // Handle recurring subscription payments
                const stripeCustomerId = invoice.customer;
                
                // Find driver associated with this customer
                const { data: driver } = await supabase
                    .from('drivers')
                    .select('id')
                    .eq('stripe_customer_id', stripeCustomerId)
                    .single();

                if (driver) {
                    // Find rentals for this driver to get invoice IDs
                    const { data: rentals } = await supabase
                        .from('rentals')
                        .select('id')
                        .eq('driver_id', driver.id);
                    
                    const rentalIds = (rentals || []).map(r => r.id);

                    if (rentalIds.length) {
                        // Mark most recent pending invoices as paid for these rentals
                        await supabase
                            .from('invoices')
                            .update({ 
                                status: 'PAID', 
                                paid_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .in('rental_id', rentalIds)
                            .eq('status', 'PENDING');
                    }
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
