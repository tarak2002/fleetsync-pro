import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Building2, ArrowRight, ShieldCheck, Phone, MapPin, Hash, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import type { RootState } from '../store';
import { setAuthUser } from '../store';
import { authApi } from '../lib/api';

export function BusinessSetup() {
    const { user, isAuthenticated, loading: authLoading } = useSelector((state: RootState) => state.auth);
    const [name, setName] = useState('');
    const [abn, setAbn] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const dispatch = useDispatch();

    useEffect(() => {
        if (authLoading) return;
        if (!isAuthenticated) {
            navigate('/login');
            return;
        }
        if (user?.role !== 'ADMIN') {
            navigate('/dashboard/operations');
            return;
        }
        if (user?.businessId) {
            navigate('/admin');
        }
    }, [isAuthenticated, user, navigate, authLoading]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authApi.setupBusiness({ name, abn, address, phone });
            const data = response.data;
            
            if (!data.success) throw new Error(data.error || 'Failed to setup business');

            // Update local state
            if (user) {
                dispatch(setAuthUser({
                    ...user,
                    businessId: data.businessId
                }));
            }

            navigate('/admin');
        } catch (err: any) {
            console.error('Setup error:', err);
            setError(err.message || 'Setup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
            </div>

            <div className="w-full max-w-2xl relative z-10">
                <div className="text-center mb-10 animate-fade-in">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-4">
                        <Sparkles className="w-3 h-3" />
                        Final Step
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">Setup Your Business</h1>
                    <p className="text-slate-500 font-medium text-lg max-w-md mx-auto">
                        Tell us about your fleet business to personalize your dashboard and reports.
                    </p>
                </div>

                <Card className="border-none shadow-2xl shadow-slate-200/60 rounded-[32px] overflow-hidden bg-white animate-slide-up">
                    <CardHeader className="pb-2 pt-10 px-10">
                        <div className="flex items-center gap-4 mb-2">
                            <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg shadow-slate-200">
                                <Building2 className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900">Business Profile</CardTitle>
                                <CardDescription className="text-slate-500 font-medium italic">All fields are required to verify your business identity.</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-fade-in">
                                    <div className="w-2 h-2 bg-red-500 rounded-full shrink-0" />
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Business Name</label>
                                    <div className="relative group">
                                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Elite Fleet Solutions"
                                            required
                                            className="h-14 pl-11 bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white focus:ring-primary/10 focus:border-primary transition-all text-slate-900 font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">ABN (Optional)</label>
                                    <div className="relative group">
                                        <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            value={abn}
                                            onChange={(e) => setAbn(e.target.value)}
                                            placeholder="12 345 678 910"
                                            className="h-14 pl-11 bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white focus:ring-primary/10 focus:border-primary transition-all text-slate-900 font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Business Address</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="123 Fleet St, Sydney NSW 2000"
                                            required
                                            className="h-14 pl-11 bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white focus:ring-primary/10 focus:border-primary transition-all text-slate-900 font-semibold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-sm font-bold text-slate-700 ml-1">Contact Phone</label>
                                    <div className="relative group">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                                        <Input
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="+61 400 000 000"
                                            required
                                            className="h-14 pl-11 bg-slate-50/50 border-slate-200 rounded-2xl focus:bg-white focus:ring-primary/10 focus:border-primary transition-all text-slate-900 font-semibold"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <Button
                                    type="submit"
                                    className="w-full h-16 rounded-[20px] bg-slate-900 hover:bg-slate-800 text-white font-black text-lg transition-all shadow-xl shadow-slate-200 hover:shadow-2xl hover:shadow-slate-300 flex items-center justify-center gap-3 group"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            Complete Business Setup
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>
                                <p className="text-center mt-6 text-slate-400 font-medium text-sm flex items-center justify-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    Secure, encrypted data storage
                                </p>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
