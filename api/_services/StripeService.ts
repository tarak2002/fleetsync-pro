import Stripe from 'stripe';
import { supabase } from '../_lib/supabase.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock';
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';

// Initialize the Stripe client.
export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2026-01-28.clover' as any, // Cast as any due to version mismatch in local types vs real API
    appInfo: {
        name: 'FleetSync Pro',
        version: '1.0.0'
    }
});

export class StripeService {
    /**
     * Creates a Stripe customer for a given driver and saves their customer ID
     */
    static async createCustomer(driverId: string, email: string, name: string): Promise<string> {
        try {
            console.log(`[Stripe] Creating customer for ${email}`);

            // Check if we already have the customer ID in Supabase
            const { data: existingDriver, error: fetchErr } = await supabase
                .from('drivers')
                .select('stripe_customer_id')
                .eq('id', driverId)
                .single();

            if (existingDriver?.stripe_customer_id) {
                return existingDriver.stripe_customer_id;
            }

            const customer = await stripe.customers.create({
                email,
                name,
                metadata: {
                    driverId
                }
            });

            // Update driver in DB with Stripe Customer ID
            await supabase
                .from('drivers')
                .update({ 
                    stripe_customer_id: customer.id,
                    updated_at: new Date().toISOString() 
                })
                .eq('id', driverId);

            return customer.id;
        } catch (error) {
            console.error('[Stripe] Failed to create customer:', error);
            throw new Error('Failed to create payment provider customer.');
        }
    }

    /**
     * Generate SetupIntent allows the frontend to collect card details safely
     */
    static async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
        try {
            const setupIntent = await stripe.setupIntents.create({
                customer: customerId,
                payment_method_types: ['card'],
                usage: 'off_session', // We plan to charge them automatically
            });

            return setupIntent;
        } catch (error) {
            console.error('[Stripe] Failed to create SetupIntent:', error);
            throw new Error('Failed to prepare payment setup.');
        }
    }

    /**
     * Charges a specific existing Invoice
     */
    static async chargeInvoice(invoiceId: string, amountDecimal: number, customerId: string, paymentMethodId: string): Promise<Stripe.PaymentIntent> {
        try {
            // Stripe expects amounts in cents for AUD
            const amountInCents = Math.round(amountDecimal * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'aud',
                customer: customerId,
                payment_method: paymentMethodId,
                off_session: true, // Auto billing
                confirm: true, // Confirm immediately
                metadata: {
                    invoiceId
                }
            });

            // Update Database with the intention to track
            await supabase
                .from('invoices')
                .update({ 
                    stripe_payment_intent_id: paymentIntent.id,
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoiceId);

            return paymentIntent;
        } catch (error: any) {
            console.error('[Stripe] Failed to charge invoice:', error.message);
            throw new Error(`Failed to process charge: ${error.message}`);
        }
    }

    /**
     * Validate and process Stripe Webhooks
     */
    static async handleWebhook(payload: string | Buffer, signature: string) {
        try {
            const event = stripe.webhooks.constructEvent(
                payload,
                signature,
                stripeWebhookSecret
            );

            console.log(`[Stripe Webhook] Received event: ${event.type}`);

            switch (event.type) {
                case 'payment_intent.succeeded': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    const invoiceId = paymentIntent.metadata.invoiceId;

                    if (invoiceId) {
                        await supabase
                            .from('invoices')
                            .update({
                                status: 'PAID',
                                paid_at: new Date().toISOString(),
                                updated_at: new Date().toISOString()
                            })
                            .eq('id', invoiceId);
                        console.log(`[Stripe Webhook] Invoice ${invoiceId} marked as PAID`);
                    }
                    break;
                }
                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object as Stripe.PaymentIntent;
                    console.log(`[Stripe Webhook] Payment failed for Intent: ${paymentIntent.id}`);
                    break;
                }
                case 'setup_intent.succeeded': {
                    const setupIntent = event.data.object as Stripe.SetupIntent;
                    const customerId = setupIntent.customer as string;
                    const paymentMethodId = setupIntent.payment_method as string;

                    if (customerId && paymentMethodId) {
                        await supabase
                            .from('drivers')
                            .update({ 
                                stripe_payment_method_id: paymentMethodId,
                                updated_at: new Date().toISOString()
                            })
                            .eq('stripe_customer_id', customerId);
                        console.log(`[Stripe Webhook] Default payment method updated for Customer ${customerId}`);
                    }
                    break;
                }
                default:
                    console.log(`Unhandled event type ${event.type}`);
            }

            return { received: true };

        } catch (err: any) {
            console.error(`[Stripe Webhook Error] Webhook signature verification failed. ${err.message}`);
            throw new Error(`Webhook Error: ${err.message}`);
        }
    }
}
