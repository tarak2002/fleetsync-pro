import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Car, LogIn, User, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { authApi } from '../lib/api';
import { setCredentials } from '../store';

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
            const response = await authApi.login(email, password);
            const { user, token } = response.data;

            dispatch(setCredentials({ user, token }));

            if (user.driverId) {
                localStorage.setItem('driverId', user.driverId);
            }

            if (user.role === 'DRIVER') {
                navigate('/dashboard/operations');
            } else {
                navigate('/');
            }
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    const fillAdminCredentials = () => {
        setEmail('admin@fleetsync.com.au');
        setPassword('admin123');
    };

    const fillDriverCredentials = () => {
        setEmail('john.smith@email.com');
        setPassword('driver123');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Premium Animated Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-200/40 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200/40 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
                <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-pink-100/40 rounded-full blur-[80px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '2s' }} />
            </div>

            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSg5OSwxMDIsMjQxLDAuMDIpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2EpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-60 pointer-events-none" />

            <Card className="w-full max-w-md relative border border-white/60 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.15)] bg-white/70 backdrop-blur-2xl rounded-[2rem] overflow-hidden animate-fade-in transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(79,70,229,0.25)] hover:bg-white/80">
                {/* Top gradient bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <CardHeader className="text-center pt-10 pb-2 relative">
                    <div className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center mb-6 shadow-xl shadow-indigo-200 relative transform transition-transform hover:scale-105 duration-300">
                        <div className="absolute inset-0 bg-white/20 rounded-3xl backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity" />
                        <Car className="w-10 h-10 text-white relative z-10" />
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 rounded-full flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: '2s' }}>
                            <Sparkles className="w-4 h-4 text-amber-900" />
                        </div>
                    </div>
                    <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent pb-1">
                        Welcome Back
                    </CardTitle>
                    <CardDescription className="text-slate-500 font-medium text-base">Sign in to FleetSync Pro</CardDescription>
                </CardHeader>

                <CardContent className="px-8 pb-10">
                    <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 text-sm flex items-center gap-3 animate-fade-in shadow-sm">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                {error}
                            </div>
                        )}

                        <div className="space-y-2 group">
                            <label className="text-sm font-semibold text-slate-700 transition-colors group-focus-within:text-indigo-600 px-1">Email Address</label>
                            <div className="relative">
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email"
                                    required
                                    className="h-14 pl-5 rounded-2xl border-slate-200/60 bg-white/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 text-slate-800 font-medium placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 group">
                            <label className="text-sm font-semibold text-slate-700 transition-colors group-focus-within:text-indigo-600 px-1">Password</label>
                            <div className="relative">
                                <Input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="h-14 pl-5 rounded-2xl border-slate-200/60 bg-white/50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all duration-300 text-slate-800 font-medium placeholder:text-slate-400"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-14 mt-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-lg shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30 transform hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 relative overflow-hidden group"
                            disabled={loading}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                            <div className="relative flex items-center justify-center">
                                {loading ? (
                                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <LogIn className="w-5 h-5 mr-2 group-hover:translate-x-1 transition-transform" />
                                        Sign In Securely
                                    </>
                                )}
                            </div>
                        </Button>
                    </form>

                    {/* Quick Login Buttons */}
                    <div className="mt-8 pt-6 border-t border-slate-200/50 relative">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl px-4 text-xs font-bold text-slate-400 tracking-wider uppercase rounded-full">
                            Or Use Demo Access
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <button
                                type="button"
                                onClick={fillAdminCredentials}
                                className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-b from-indigo-50/50 to-purple-50/50 hover:from-indigo-100 hover:to-purple-100 border border-indigo-100/50 hover:border-indigo-200 transition-all duration-300 hover:shadow-lg hover:shadow-indigo-100 transform hover:-translate-y-1 active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-inner group-hover:shadow-indigo-400/50 transition-shadow">
                                    <Car className="w-6 h-6 text-white transform group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-800">Fleet Admin</p>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Control Panel</p>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={fillDriverCredentials}
                                className="group flex flex-col items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-b from-emerald-50/50 to-teal-50/50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-100/50 hover:border-emerald-200 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-100 transform hover:-translate-y-1 active:scale-[0.98]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-inner group-hover:shadow-emerald-400/50 transition-shadow">
                                    <User className="w-6 h-6 text-white transform group-hover:scale-110 transition-transform" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-slate-800">Driver</p>
                                    <p className="text-xs font-medium text-slate-500 mt-0.5">Mobile View</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
