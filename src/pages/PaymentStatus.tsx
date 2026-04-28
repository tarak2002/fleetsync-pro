import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../components/ui/button';

export function PaymentStatus() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const status = searchParams.get('status');
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // We can verify the session here if needed, 
    // but the webhook will handle the backend logic.
  }, [sessionId]);

  const isSuccess = status === 'success' || !!sessionId;

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] p-12 border border-slate-100 shadow-2xl max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500">
        {isSuccess ? (
          <>
            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/40 text-white border-8 border-white animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Payment Received!</h2>
              <p className="text-slate-500 font-medium">Your booking is being processed. This usually takes a few seconds.</p>
            </div>
            <Button 
              onClick={() => navigate('/dashboard/operations')}
              className="w-full bg-primary hover:bg-blue-600 text-white h-14 rounded-2xl text-lg font-black shadow-lg shadow-primary/20"
            >
              Go to Dashboard
            </Button>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-red-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-red-500/40 text-white border-8 border-white">
              <XCircle className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-slate-900 mb-2">Payment Cancelled</h2>
              <p className="text-slate-500 font-medium">No worries, your card wasn't charged. You can try again when you're ready.</p>
            </div>
            <Button 
              onClick={() => navigate('/dashboard/select-vehicle')}
              className="w-full bg-slate-900 hover:bg-black text-white h-14 rounded-2xl text-lg font-black shadow-lg shadow-black/20"
            >
              Back to Fleet
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
