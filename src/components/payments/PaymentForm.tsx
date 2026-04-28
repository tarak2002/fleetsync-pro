import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { Button } from '../ui/button';
import { Loader2, ShieldCheck, Lock } from 'lucide-react';
import { toast } from '../ui/use-toast';

export function PaymentForm({ onComplete }: { onComplete: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMessage(null);

    const { error } = await stripe.confirmSetup({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard/payments`,
      },
      redirect: 'if_required', // Handle redirect-based methods if needed, but try to stay on page
    });

    if (error) {
      setErrorMessage(error.message || 'An unexpected error occurred.');
      setLoading(false);
    } else {
      toast({
        title: "Payment Method Saved",
        description: "Your card has been securely attached to your profile.",
      });
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-6 bg-slate-800/50 rounded-2xl border border-slate-700/50 backdrop-blur-xl">
        <PaymentElement />
        
        {errorMessage && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Lock className="w-3 h-3" />
          <span>Secured by Stripe</span>
        </div>
        <Button 
          type="submit" 
          disabled={!stripe || loading}
          className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8 h-12 min-w-[200px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 mr-2" />
              Save Card
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
