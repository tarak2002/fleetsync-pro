import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
    LayoutDashboard, Car, Calendar,
    LogOut, Menu, Bell,
    Banknote, Settings, MapPin, Clock, Search, History
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { logout } from '../../store';
import type { RootState } from '../../store';
import { cn } from '../../lib/utils';

const navItems = [
    { path: '/dashboard/operations', icon: LayoutDashboard, label: 'Overview' },
    { path: '/dashboard/select-vehicle', icon: Car, label: 'My Vehicle' },
    { path: '/dashboard/history', icon: History, label: 'Activity' },
    { path: '/dashboard/payments', icon: Banknote, label: 'Payments' },
];

export function DriverLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useSelector((state: RootState) => state.auth);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={cn(
                "fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center gap-3 px-6 py-6 border-b border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md shadow-primary/20">
                            <Car className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-xl text-slate-900 tracking-tight">FleetSync</h1>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em] -mt-0.5">Driver Portal</p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
                        {navItems.map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end
                                onClick={() => setSidebarOpen(false)}
                                className={({ isActive }) => cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
                                    isActive
                                        ? "bg-primary text-white shadow-md shadow-primary/20"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                )}
                            >
                                <item.icon className={cn(
                                    "w-5 h-5",
                                    "group-hover:scale-110 transition-transform"
                                )} />
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-100 space-y-1">
                        <button 
                            onClick={() => alert('Settings module coming soon')}
                            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
                            <Settings className="w-5 h-5" />
                            Settings
                        </button>
                        <button 
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all"
                        >
                            <LogOut className="w-5 h-5" />
                            Logout
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64 flex flex-col min-h-screen">
                {/* Header */}
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200">
                    <div className="flex items-center justify-between px-4 py-4 lg:px-8">
                        <div className="flex items-center gap-4">
                            <button
                                className="lg:hidden p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                onClick={() => setSidebarOpen(true)}
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            
                            <div className="hidden sm:flex items-center gap-6">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Clock className="w-4 h-4 text-primary" />
                                    <span className="text-sm font-medium">
                                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <button className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">
                                    <Bell className="w-5 h-5" />
                                </button>
                                
                                <div className="flex items-center gap-3 ml-2 p-1.5 pr-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-all cursor-pointer shadow-sm">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-inner">
                                        {user?.name?.charAt(0) || 'D'}
                                    </div>
                                    <div className="hidden sm:flex flex-col">
                                        <span className="text-xs font-bold text-slate-900 leading-none">{user?.name || 'Driver'}</span>
                                        <span className="text-[10px] text-primary font-semibold mt-0.5 uppercase tracking-wider">Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    <div className="max-w-[1600px] mx-auto p-4 lg:p-8">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
