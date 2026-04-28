import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { onboardingApi } from '../lib/api';

export function OnboardingPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [applicationData, setApplicationData] = useState({
    licenseNumber: '',
    licenseExpiry: '',
    firstName: '',
    lastName: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Invalid onboarding link');
        setLoading(false);
        return;
      }

      try {
        await onboardingApi.validate(token);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Invalid or expired onboarding link');
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setSubmitting(true);
    setError('');

    try {
      await onboardingApi.submitApplication(token, applicationData);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-slate-600">Validating onboarding link...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white rounded-2xl p-8 shadow-lg text-center max-w-md w-full space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Application Submitted!</h2>
          <p className="text-slate-600">Your onboarding application has been submitted successfully. Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 p-4">
      <div className="max-w-2xl mx-auto py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-slate-900">Driver Onboarding</h1>
            <p className="text-slate-600">Complete your profile to get started</p>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">First Name</label>
                <Input
                  type="text"
                  value={applicationData.firstName}
                  onChange={(e) => setApplicationData({ ...applicationData, firstName: e.target.value })}
                  placeholder="First name"
                  required
                  className="h-11"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Last Name</label>
                <Input
                  type="text"
                  value={applicationData.lastName}
                  onChange={(e) => setApplicationData({ ...applicationData, lastName: e.target.value })}
                  placeholder="Last name"
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
              <Input
                type="tel"
                value={applicationData.phone}
                onChange={(e) => setApplicationData({ ...applicationData, phone: e.target.value })}
                placeholder="+61"
                required
                className="h-11"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Address</label>
              <Input
                type="text"
                value={applicationData.address}
                onChange={(e) => setApplicationData({ ...applicationData, address: e.target.value })}
                placeholder="Street address"
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">License Number</label>
                <Input
                  type="text"
                  value={applicationData.licenseNumber}
                  onChange={(e) => setApplicationData({ ...applicationData, licenseNumber: e.target.value })}
                  placeholder="License #"
                  required
                  className="h-11"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">License Expiry</label>
                <Input
                  type="date"
                  value={applicationData.licenseExpiry}
                  onChange={(e) => setApplicationData({ ...applicationData, licenseExpiry: e.target.value })}
                  required
                  className="h-11"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-12 bg-primary hover:bg-blue-600 text-white font-semibold rounded-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Complete Onboarding'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
