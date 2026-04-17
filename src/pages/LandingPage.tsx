import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BarChart3, Truck, Zap, CheckCircle2, ChevronRight, PieChart, Users } from 'lucide-react';

export const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
            {/* Animated Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-br from-blue-200/30 to-blue-200/30 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-gradient-to-tr from-blue-200/30 to-blue-200/30 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/40 bg-white/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 rotation-12">
                                <Truck className="text-white w-7 h-7" />
                            </div>
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-800 tracking-tight">
                                FleetSync Pro
                            </span>
                        </div>
                        <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
                            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                            <a href="#solutions" className="hover:text-blue-600 transition-colors">Solutions</a>
                            <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate('/login')}
                                className="px-6 py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-white/50 transition-all active:scale-95"
                            >
                                Log In
                            </button>
                            <button 
                                onClick={() => navigate('/login')}
                                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-xl shadow-blue-200 hover:shadow-blue-300 transition-all hover:-translate-y-0.5 active:scale-95"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-24 pb-32 overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-8 animate-fade-in-up">
                        <Zap className="w-4 h-4 fill-blue-600" />
                        <span>The Future of Fleet Management</span>
                    </div>
                    <h1 className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                        Simplify Your<br />
                        <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800">
                            Fleet Operations
                        </span>
                    </h1>
                    <p className="text-xl text-slate-500 max-w-3xl mx-auto mb-12 leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                        Manage vehicles, drivers, compliance, and finances in one high-performance dashboard. 
                        Designed for modern ride-share fleets and logistics providers.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
                        >
                            Start Your Free Trial
                            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button className="w-full sm:w-auto px-10 py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-sm">
                            View Demo
                        </button>
                    </div>

                    {/* Premium Hero Image Mockup */}
                    <div className="mt-20 relative animate-fade-in-up-delay group">
                        <div className="absolute inset-x-0 -bottom-12 h-24 bg-gradient-to-t from-white via-white/80 to-transparent z-10" />
                        <div className="relative rounded-3xl overflow-hidden border-8 border-white/40 shadow-[0_48px_96px_-16px_rgba(37,99,235,0.2)] bg-blue-900/5 backdrop-blur-sm transition-all duration-700 hover:scale-[1.02] hover:shadow-blue-200/50">
                            <img 
                                src="/images/hero_premium.png" 
                                alt="FleetSync Pro Dashboard Preview" 
                                className="w-full h-auto object-cover opacity-95 transition-opacity group-hover:opacity-100"
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 via-transparent to-blue-600/10 mix-blend-overlay" />
                        </div>
                        
                        {/* Decorative elements */}
                        <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-400/20 blur-3xl rounded-full animate-pulse" />
                        <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-blue-400/20 blur-3xl rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
                    </div>
                </div>
            </header>

            {/* Features Grid */}
            <section id="features" className="py-32 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">Everything you need to scale</h2>
                        <p className="text-lg text-slate-500 max-w-2xl mx-auto">Stop juggling spreadsheets. FleetSync Pro automates your entire workflow in a single unified interface.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard 
                            icon={<BarChart3 className="w-6 h-6 text-blue-600" />}
                            title="Real-time Analytics"
                            description="Track gross income, net earnings, and vehicle ROI with surgical precision."
                        />
                        <FeatureCard 
                            icon={<Shield className="w-6 h-6 text-blue-600" />}
                            title="Automated Compliance"
                            description="Automatic expiry tracking for REGO, CTP, and insurance with instant alerts."
                        />
                        <FeatureCard 
                            icon={<PieChart className="w-6 h-6 text-blue-600" />}
                            title="Finance Tracking"
                            description="Generate professional invoices automatically and track payment status in real-time."
                        />
                        <FeatureCard 
                            icon={<Users className="w-6 h-6 text-blue-600" />}
                            title="Driver Portals"
                            description="Self-service dashboards for drivers to report shifts, accidents, and check rental status."
                        />
                        <FeatureCard 
                            icon={<Zap className="w-6 h-6 text-blue-600" />}
                            title="Zero Overhead"
                            description="Automate boring tasks so you can focus on growing your fleet to 100+ vehicles."
                        />
                        <FeatureCard 
                            icon={<Truck className="w-6 h-6 text-blue-600" />}
                            title="Unified Management"
                            description="One platform for all your vehicles, driver profiles, and historical records."
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-900 text-white py-20 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <Truck className="text-blue-400 w-8 h-8" />
                        <span className="text-2xl font-bold tracking-tight">FleetSync Pro</span>
                    </div>
                    <div className="text-slate-400 font-medium space-x-12">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                    </div>
                    <p className="text-slate-500">© 2026 FleetSync Pro Pty Ltd. All rights reserved.</p>
                </div>
            </footer>

            <style>{`
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-up-delay {
                    0%, 50% { opacity: 0; transform: translateY(40px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up {
                    animation: fade-in-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .animate-fade-in-up-delay {
                    animation: fade-in-up-delay 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .rotation-12 { transform: rotate(-12deg); }
                html { scroll-behavior: smooth; }
            `}</style>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="p-8 rounded-3xl border border-slate-100 bg-white shadow-sm hover:shadow-xl hover:shadow-blue-50/50 hover:-translate-y-1 transition-all duration-300">
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-6">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-500 leading-relaxed">{description}</p>
    </div>
);
