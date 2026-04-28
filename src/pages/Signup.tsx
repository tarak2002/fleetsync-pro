import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Car, User, ArrowRight, ShieldCheck, Mail, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';

export function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailConfirmTo: email,
                    data: {
                        full_name: name,
                        role: 'ADMIN'
                    }
                }
            });

            if (signUpError) throw signUpError;

            if (data.user) {
                // Redirect to business setup
                navigate('/setup-business');
            }
        } catch (err: any) {
            console.error('Signup error:', err);
            setError(err.message || 'Signup failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex animate-fade-in bg-white">
            {/* Left side: Hero Branding */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 bg-slate-900 relative overflow-hidden">
                <div 
                    className="absolute inset-0 opacity-40 mix-blend-overlay"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1559297434-2d8a1302fd4c?q=80&w=1600&auto=format&fit=crop')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
                
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                        <Car className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-2xl text-white tracking-tight">FleetSync</h1>
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Enterprise</p>
                    </div>
                </div>

                <div className="relative z-10 max-w-md">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-primary-foreground text-xs font-bold uppercase tracking-widest mb-6">
                        <Sparkles className="w-3 h-3" />
                        New: Fleet Automation
                    </div>
                    <h2 className="text-5xl font-black text-white mb-6 leading-tight tracking-tight">
                        Scale your fleet with <span className="text-primary">Intelligence.</span>
                    </h2>
                    <p className="text-xl text-slate-300 font-medium leading-relaxed">
                        Join hundreds of fleet owners who have automated their operations and increased their margins by 25%.
                    </p>
                    
                    <div className="mt-12 space-y-4">
                        {[
                            "Real-time vehicle tracking & telemetry",
                            "Automated driver onboarding & VEVO",
                            "Integrated toll & payment processing",
                            "Smart predictive maintenance alerts"
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3 text-slate-200">
                                <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                </div>
                                <span className="font-medium">{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="relative z-10 text-slate-400 text-sm font-medium">
                    © 2026 FleetSync Pro. All rights reserved.
                </div>
            </div>

            {/* Right side: Signup Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 relative overflow-y-auto">
                <div className="w-full max-w-md space-y-8">
                    <div className="lg:hidden flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                            <Car className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="font-extrabold text-xl text-slate-900 tracking-tight">FleetSync</h1>
                    </div>

                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Get Started</h2>
                        <p className="text-slate-500 font-medium">Create your admin account to start managing your fleet</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-fade-in shadow-sm">
                                <div className="w-2 h-2 bg-red-500 rounded-full" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="John Doe"
                                    required
                                    className="h-12 pl-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all text-slate-900 font-medium"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-700 ml-1">Work Email</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="john@company.com"
                                    required
                                    className="h-12 pl-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all text-slate-900 font-medium"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="h-12 pl-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all text-slate-900 font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-bold text-slate-700 ml-1">Confirm</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="h-12 pl-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all text-slate-900 font-medium"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 mt-2">
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                                By signing up, you agree to our <a href="#" className="text-primary font-bold hover:underline">Terms of Service</a> and <a href="#" className="text-primary font-bold hover:underline">Privacy Policy</a>.
                            </p>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Create Admin Account
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>

                        <p className="text-center text-slate-500 font-medium">
                            Already have an account? <Link to="/login" className="text-primary font-bold hover:underline">Sign In</Link>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
