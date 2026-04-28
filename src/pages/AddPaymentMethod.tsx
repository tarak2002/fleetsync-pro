import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ShieldCheck, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { paymentsApi } from '../lib/api';
import { PaymentForm } from '../components/payments/PaymentForm';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

export function AddPaymentMethod() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function init() {
      try {
        const res = await paymentsApi.getSetupIntent();
        setClientSecret(res.data.clientSecret);
      } catch (err) {
        console.error('Failed to get setup intent:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleComplete = () => {
    navigate('/dashboard/payments');
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Button 
        variant="ghost" 
        className="mb-8 text-slate-500 hover:text-slate-900"
        onClick={() => navigate('/dashboard/payments')}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Payments
      </Button>

      <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-8">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <CreditCard className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Add Payment Method</h1>
              <p className="text-slate-500 text-sm">Save your card for automated weekly rental billing.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-emerald-100 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                <span className="text-slate-900 block">Bank-grade Security</span>
                Your sensitive data is encrypted and never touches our servers.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-emerald-100 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                <span className="text-slate-900 block">Automated Billing</span>
                No more manual transfers. Rent is deducted automatically every week.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="mt-1 p-1 bg-emerald-100 rounded-full">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">
                <span className="text-slate-900 block">Easy Cancellations</span>
                Manage or remove your payment methods at any time.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-400">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm font-medium">Preparing secure gateway...</p>
            </div>
          ) : clientSecret ? (
            <Elements stripe={stripePromise} options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#3b82f6',
                  borderRadius: '12px',
                }
              }
            }}>
              <PaymentForm onComplete={handleComplete} />
            </Elements>
          ) : (
            <div className="p-8 bg-red-50 rounded-2xl text-center">
              <p className="text-red-600 font-medium">Failed to initialize payment gateway.</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
