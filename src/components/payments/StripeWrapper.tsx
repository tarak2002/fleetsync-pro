import type { ReactNode } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export function StripeWrapper({ children }: { children: ReactNode }) {
  const options = {
    appearance: {
      theme: 'night' as const,
      variables: {
        colorPrimary: '#3b82f6',
        colorBackground: '#1e293b',
        colorText: '#f8fafc',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, sans-serif',
        borderRadius: '12px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      {children}
    </Elements>
  );
}
