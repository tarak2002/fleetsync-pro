import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
    const errorMsg = 'STRIPE_SECRET_KEY is missing from environment variables. Payment processing cannot start.';
    console.error(errorMsg);
    throw new Error(errorMsg);
}

export const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16' as any, // Current stable version
});
