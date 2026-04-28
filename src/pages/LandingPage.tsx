import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BarChart3, Truck, Zap, ChevronRight, PieChart, Users } from 'lucide-react';
import { motion } from 'framer-motion';

import heroImage from '../assets/hero-dashboard.png';

export const LandingPage = () => {
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-200 selection:text-blue-900 overflow-x-hidden">
            {/* Animated Background Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none transition-opacity duration-1000 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-blue-300/20 to-indigo-400/20 blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tr from-blue-300/20 to-indigo-400/20 blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Navigation */}
            <nav className="sticky top-0 z-50 backdrop-blur-xl border-b border-slate-200/50 bg-white/70 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-3 cursor-pointer"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200/50 -rotate-6">
                                <Truck className="text-white w-6 h-6" />
                            </div>
                            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
                                FleetSync Pro
                            </span>
                        </motion.div>
                        <div className="hidden md:flex items-center gap-8 font-medium text-slate-600">
                            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                            <a href="#how-it-works" className="hover:text-blue-600 transition-colors">How it Works</a>
                            <a href="#roi" className="hover:text-blue-600 transition-colors">ROI Calculator</a>
                        </div>
                        <motion.div 
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-4"
                        >
                            <button 
                                onClick={() => navigate('/login')}
                                className="px-6 py-2.5 rounded-xl font-semibold text-slate-700 hover:bg-slate-100 transition-all"
                            >
                                Log In
                            </button>
                            <button 
                                onClick={() => navigate('/signup')}
                                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-semibold shadow-lg shadow-slate-900/20 hover:shadow-slate-900/30 transition-all hover:-translate-y-0.5"
                            >
                                Get Started
                            </button>
                        </motion.div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="relative pt-24 pb-32 overflow-hidden z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={containerVariants}
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-8 shadow-sm">
                            <Zap className="w-4 h-4 fill-blue-600" />
                            <span>The Autonomous Fleet Operating System</span>
                        </motion.div>
                        <motion.h1 variants={itemVariants} className="text-6xl md:text-8xl font-black text-slate-900 tracking-tight mb-8 leading-[1.1]">
                            Zero Overhead.<br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800">
                                Maximum Margin.
                            </span>
                        </motion.h1>
                        <motion.p variants={itemVariants} className="text-xl text-slate-600 max-w-3xl mx-auto mb-12 leading-relaxed">
                            Stop chasing drivers for rego and chasing clients for payments. FleetSync Pro automates compliance, invoicing, and vehicle tracking so you can focus on scale.
                        </motion.p>
                        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button 
                                onClick={() => navigate('/signup')}
                                className="w-full sm:w-auto px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-600/30 hover:bg-blue-700 transition-all flex items-center justify-center gap-2 group"
                            >
                                Start Your Free Trial
                                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                            <button className="w-full sm:w-auto px-10 py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl font-bold text-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                View Interactive Demo
                            </button>
                        </motion.div>
                    </motion.div>

                    {/* Premium Hero Image Mockup */}
                    <motion.div 
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                        className="mt-20 relative group max-w-6xl mx-auto"
                    >
                        <div className="absolute inset-x-0 -bottom-24 h-48 bg-gradient-to-t from-slate-50 to-transparent z-10" />
                        <div className="relative rounded-[2.5rem] overflow-hidden border border-white/60 shadow-[0_48px_100px_-20px_rgba(37,99,235,0.25)] bg-slate-900/5 backdrop-blur-md ring-1 ring-black/5">
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/40 to-white/10 mix-blend-overlay z-10" />
                            <img 
                                src={heroImage} 
                                alt="FleetSync Pro Dashboard Preview" 
                                className="w-full h-auto object-cover opacity-100 transform transition-transform duration-700 group-hover:scale-[1.01]"
                            />
                        </div>
                    </motion.div>
                </div>
            </header>

            {/* Features Grid */}
            <section id="features" className="py-32 bg-white relative z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6 tracking-tight">Everything you need to scale</h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto">From single vehicles to enterprise fleets, our platform adapts to your operational complexity.</p>
                    </div>
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={containerVariants}
                        className="grid md:grid-cols-3 gap-8"
                    >
                        <FeatureCard 
                            icon={<Shield className="w-6 h-6 text-blue-600" />}
                            title="Automated Compliance"
                            description="Never miss a registration renewal. Automatic expiry tracking for REGO, CTP, and insurance with SMS alerts."
                        />
                        <FeatureCard 
                            icon={<PieChart className="w-6 h-6 text-indigo-600" />}
                            title="Instant Payouts"
                            description="Generate professional invoices automatically, track arrears, and reconcile payments in real-time."
                        />
                        <FeatureCard 
                            icon={<Users className="w-6 h-6 text-blue-600" />}
                            title="Driver Portals"
                            description="Self-service mobile dashboard for drivers to upload documents, report accidents, and pay rental fees."
                        />
                        <FeatureCard 
                            icon={<BarChart3 className="w-6 h-6 text-indigo-600" />}
                            title="Real-time Analytics"
                            description="Track gross income, net earnings, and individual vehicle ROI with surgical precision."
                        />
                        <FeatureCard 
                            icon={<Zap className="w-6 h-6 text-blue-600" />}
                            title="Zero Data Entry"
                            description="OCR technology extracts data from driver licenses and registration papers instantly."
                        />
                        <FeatureCard 
                            icon={<Truck className="w-6 h-6 text-indigo-600" />}
                            title="Asset Tracking"
                            description="Monitor vehicle assignments, maintenance schedules, and physical condition reports."
                        />
                    </motion.div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-32 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">How it works</h2>
                        <p className="text-xl text-slate-400 max-w-2xl mx-auto">Get your entire fleet onboarded and automated in less than 24 hours.</p>
                    </div>
                    
                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        {[
                            { step: '1', title: 'Import Vehicles', desc: 'Upload your spreadsheet or connect your existing systems in minutes.' },
                            { step: '2', title: 'Invite Drivers', desc: 'Drivers complete a digital onboarding flow and upload their own documents.' },
                            { step: '3', title: 'Collect Revenue', desc: 'Automated weekly invoicing and integrated payment collection via Stripe.' }
                        ].map((item, idx) => (
                            <motion.div 
                                key={idx}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2 }}
                                className="relative"
                            >
                                <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center text-2xl font-bold mx-auto mb-6 border border-blue-500/30">
                                    {item.step}
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                                <p className="text-slate-400 leading-relaxed">{item.desc}</p>
                                {idx < 2 && (
                                    <div className="hidden md:block absolute top-8 left-1/2 w-full h-px bg-gradient-to-r from-blue-500/50 to-transparent -z-10" />
                                )}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-slate-950 text-slate-400 py-16 px-4">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-3">
                        <Truck className="text-blue-500 w-8 h-8" />
                        <span className="text-2xl font-bold tracking-tight text-white">FleetSync Pro</span>
                    </div>
                    <div className="font-medium space-x-8">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                        <a href="#" className="hover:text-white transition-colors">Contact Support</a>
                    </div>
                    <p>© 2026 FleetSync Pro Pty Ltd. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <motion.div 
        variants={{
            hidden: { opacity: 0, y: 20 },
            visible: { opacity: 1, y: 0 }
        }}
        className="p-8 rounded-3xl border border-slate-200/60 bg-white/50 backdrop-blur-sm hover:bg-white hover:shadow-2xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 group"
    >
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 group-hover:bg-blue-100">
            {icon}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
        <p className="text-slate-600 leading-relaxed">{description}</p>
    </motion.div>
);
