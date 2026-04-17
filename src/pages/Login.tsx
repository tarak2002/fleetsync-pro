import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Car, LogIn, User, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { authApi, api } from '../lib/api';
import { setAuthUser } from '../store';

export function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // 1. Sign in with Supabase
            console.log('Attempting login with:', { email, passwordLength: password.length });
            await authApi.login(email, password);
            
            // 2. Fetch full profile from our backend
            const profileResponse = await api.get('/api/auth/me');
            const user = profileResponse.data;

            // 3. Update Redux store
            dispatch(setAuthUser(user));

            if (user.driverId) {
                localStorage.setItem('driverId', user.driverId);
            }

            if (user.role === 'DRIVER') {
                navigate('/dashboard/operations');
            } else {
                navigate('/admin');
            }
        } catch (err: any) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const fillAdminCredentials = () => {
        setEmail('admin@fleetsyncpro.com.au');
        setPassword('FleetSync789!');
    };

    const fillDriverCredentials = () => {
        setEmail('john.nguyen@email.com');
        setPassword('FleetSync789!');
    };

    return (
        <div className="min-h-screen flex animate-fade-in bg-white">
            {/* Left side: Premium Image/Branding */}
            <div className="hidden lg:flex flex-col justify-between w-[45%] p-12 bg-slate-900 relative overflow-hidden">
                {/* Background image overlay */}
                <div 
                    className="absolute inset-0 opacity-40 mix-blend-overlay"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1519003722824-194d4455a60c?q=80&w=1600&auto=format&fit=crop')`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                
                <div className="relative z-10 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg">
                        <Car className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-2xl text-white tracking-tight">FleetSync</h1>
                        <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Management</p>
                    </div>
                </div>

                <div className="relative z-10 max-w-md">
                    <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                        Intelligent fleet management for the modern enterprise.
                    </h2>
                    <p className="text-lg text-slate-300">
                        Streamline your operations, track vehicles in real-time, and manage your workforce with precision.
                    </p>
                </div>
            </div>

            {/* Right side: Login Form */}
            <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-12 relative">
                {/* Mobile logo only shows on small screens */}
                <div className="lg:hidden flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-md">
                        <Car className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="font-extrabold text-xl text-slate-900 tracking-tight">FleetSync</h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Management</p>
                    </div>
                </div>

                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-slate-500 font-medium">Sign in to your account to continue</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-fade-in shadow-sm">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-slate-700">Email Address</label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                required
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all text-slate-900 font-medium placeholder:text-slate-400"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-semibold text-slate-700">Password</label>
                                <a href="#" className="text-sm font-medium text-primary hover:text-blue-700 transition-colors">Forgot password?</a>
                            </div>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="h-12 bg-slate-50 border-slate-200 focus:bg-white focus:border-primary focus:ring-primary/20 transition-all text-slate-900 font-medium placeholder:text-slate-400"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-base transition-all shadow-md hover:shadow-lg"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn className="w-4 h-4 mr-2" />
                                    Sign In
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200"></div>
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-4 bg-white text-xs font-semibold text-slate-400 uppercase tracking-widest">Demo Access</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={fillAdminCredentials}
                            className="flex items-center justify-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                <Car className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-slate-900">Admin</p>
                            </div>
                        </button>
                        <button
                            type="button"
                            onClick={fillDriverCredentials}
                            className="flex items-center justify-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
                        >
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-bold text-slate-900">Driver</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
