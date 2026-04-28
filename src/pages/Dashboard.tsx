import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Car, AlertTriangle, TrendingUp, Activity, CheckCircle2, Clock, Wallet, ArrowUpRight, Zap, ShieldAlert, BarChart3, Info, Banknote } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { fetchDashboard, fetchAlerts } from '../store';
import type { RootState, AppDispatch } from '../store';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { Dialog, DialogContent } from '../components/ui/dialog';
import { User, Navigation2, Hash, ArrowRight, Timer, MapPin as MapPinIcon } from 'lucide-react';
import { Button } from '../components/ui/button';

// Custom Map Icon
const dotIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzI1NjNFQiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
});

export function Dashboard() {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { dashboard, alerts } = useSelector((state: RootState) => state.fleet);
    const [selectedTrip] = useState<any>(null);
    const [isTripDialogOpen, setIsTripDialogOpen] = useState(false);
    const [, setLastUpdated] = useState<Date>(new Date());

    useEffect(() => {
        dispatch(fetchDashboard());
        dispatch(fetchAlerts());
        // Poll every 30 seconds for realtime updates
        const interval = setInterval(() => {
            dispatch(fetchDashboard());
            dispatch(fetchAlerts());
            setLastUpdated(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, [dispatch]);

    if (!dashboard) {
        return <LoadingScreen message="Syncing Fleet Data..." fullScreen={false} />;
    }

    const stats = [
        {
            title: 'Total Vehicle',
            value: dashboard?.vehicles?.total ?? 0,
            icon: Car,
            color: 'text-primary',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-100'
        },
        {
            title: 'Active Vehicle',
            value: dashboard?.rentals?.active ?? 0,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-100'
        },
        {
            title: 'Idle Vehicle',
            value: dashboard?.vehicles?.byStatus?.['AVAILABLE'] ?? 0,
            icon: Clock,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-100'
        },
        {
            title: 'Maintenance Required',
            value: alerts?.length ?? 0,
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            borderColor: 'border-red-100'
        },
    ];

    const recentRentals = dashboard?.recentRentals ?? [];
    const financeData = (dashboard?.weeklyRevenueData || []).length > 0
        ? dashboard.weeklyRevenueData
        : [{ name: 'No data', revenue: 0, cost: 0 }];
    const weeklyRevenue = dashboard?.weeklyRevenue ?? 0;
    const weeklyExpenses = Math.round(weeklyRevenue * 0.48);
    const weeklyProfit = weeklyRevenue - weeklyExpenses;
    const activeDrivers = dashboard?.drivers?.list?.filter(d => d.status === 'ACTIVE') ?? [];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Overview of your fleet management operations
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" className="bg-white border-slate-200 shadow-sm text-slate-700 hover:text-blue-600 hover:border-blue-200 transition-all" onClick={() => navigate('/admin/fleet')}>
                        <Car className="w-4 h-4 mr-2" />
                        Add Vehicle
                    </Button>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all" onClick={() => navigate('/admin/invoices')}>
                        <Banknote className="w-4 h-4 mr-2" />
                        New Invoice
                    </Button>
                </div>
            </div>

            {/* Top Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <Card key={index} className="border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.borderColor} border`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500 font-medium">{stat.title}</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-0.5">
                                        {stat.value}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Middle Section: Map and Trip Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Tracking Map */}
                <Card className="lg:col-span-2 border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-slate-100 bg-white py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold text-slate-900">Live Tracking</CardTitle>
                            <button className="text-sm text-primary font-medium hover:underline">See All</button>
                        </div>
                    </CardHeader>
                    <div className="h-[300px] w-full bg-slate-100 relative z-0">
                        <MapContainer 
                            center={[-33.8688, 151.2093]} 
                            zoom={12} 
                            style={{ height: '100%', width: '100%' }}
                            zoomControl={false}
                        >
                            <TileLayer
                                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            />
                            <Marker position={[-33.8688, 151.2093]} icon={dotIcon} />
                            <Marker position={[-33.8800, 151.2150]} icon={dotIcon} />
                        </MapContainer>
                    </div>
                </Card>

                {/* Trip Stats */}
                <div className="space-y-4 flex flex-col">
                    <Card className="border border-slate-200 shadow-sm flex-1">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Total Rentals</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard.rentals.total}</p>
                                <p className="text-xs text-slate-500 mt-1 font-medium">{dashboard.rentals.thisMonth} this month</p>
                            </div>
                            <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary flex items-center justify-center bg-primary/5">
                                <Activity className="w-8 h-8 text-primary animate-pulse" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-200 shadow-sm flex-1">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Active Rentals</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard.rentals.active}</p>
                                <p className="text-xs text-emerald-600 mt-1 font-medium">{dashboard.rentals.thisWeek} this week</p>
                            </div>
                            <div className="flex items-end gap-1 h-12">
                                <div className="w-2 h-6 bg-primary/40 rounded-t" />
                                <div className="w-2 h-8 bg-primary/60 rounded-t" />
                                <div className="w-2 h-12 bg-primary rounded-t" />
                                <div className="w-2 h-10 bg-primary/80 rounded-t" />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-200 shadow-sm flex-1">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-500 font-medium">Pending Invoices</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard.invoices.pending.count}</p>
                                <p className="text-xs text-amber-500 mt-1 font-medium">${dashboard.invoices.pending.total.toLocaleString()} outstanding</p>
                            </div>
                            <div className="flex items-end gap-1 h-12">
                                <div className="w-2 h-10 bg-amber-400 rounded-t" />
                                <div className="w-2 h-8 bg-amber-300 rounded-t" />
                                <div className="w-2 h-12 bg-amber-500 rounded-t" />
                                <div className="w-2 h-6 bg-amber-200 rounded-t" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Bottom Section: Chart and Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Fuel Consumption Chart */}
                <Card className="border border-slate-200 shadow-sm">
                    <CardHeader className="border-b border-slate-100 bg-white py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold text-slate-900">Weekly Revenue</CardTitle>
                            <Badge variant="outline" className="text-xs bg-slate-50">Last 7 days • Live</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={financeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRevSmall" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v) => v != null ? [`$${Number(v).toLocaleString()}`, 'Revenue'] : [null, '']} />
                                    <Area type="monotone" dataKey="revenue" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorRevSmall)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Rentals Table */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-slate-100 bg-white py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold text-slate-900">Recent Rentals</CardTitle>
                            <span className="text-[10px] text-slate-400 font-medium">Live • updates every 30s</span>
                        </div>
                    </CardHeader>
                    <div className="flex-1 overflow-x-auto">
                        {recentRentals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                <Activity className="w-8 h-8 mb-2 opacity-40" />
                                <p className="text-sm">No active rentals</p>
                            </div>
                        ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 bg-slate-50/50">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">#</th>
                                    <th className="px-4 py-3 font-semibold">Driver</th>
                                    <th className="px-4 py-3 font-semibold">Vehicle</th>
                                    <th className="px-4 py-3 font-semibold">Rate/wk</th>
                                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {recentRentals.map((rental, idx) => (
                                    <tr key={rental.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                    {rental.driver?.name?.charAt(0) ?? '?'}
                                                </div>
                                                <span className="font-medium text-slate-700">{rental.driver?.name ?? '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900 text-xs">{rental.vehicle ? `${rental.vehicle.make} ${rental.vehicle.model}` : '—'}</p>
                                            <p className="text-[10px] text-slate-400">{rental.vehicle?.plate}</p>
                                        </td>
                                        <td className="px-4 py-3 font-semibold text-slate-900">${Number(rental.weekly_rate).toFixed(0)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold ${
                                                rental.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                                                rental.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-600'
                                            }`}>
                                                {rental.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        )}
                    </div>
                </Card>
            </div>

            {/* Finance and Insights Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Financial Overview */}
                <Card className="lg:col-span-2 border border-slate-200 shadow-sm overflow-hidden flex flex-col bg-white">
                    <CardHeader className="border-b border-slate-100 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Wallet className="w-5 h-5 text-primary" />
                                <CardTitle className="text-base font-bold text-slate-900">Financial Performance</CardTitle>
                            </div>
                            <div className="flex gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                                    <ArrowUpRight className="w-3 h-3" />
                                    +12.5%
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-3 gap-6 mb-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Weekly Revenue</p>
                                <p className="text-xl font-bold text-slate-900">${weeklyRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Est. Expenses</p>
                                <p className="text-xl font-bold text-slate-900">${weeklyExpenses.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Net Profit</p>
                                <p className={`text-xl font-bold ${weeklyProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>${weeklyProfit.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            </div>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={financeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* AI Insights & Suggestions */}
                <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
                    <CardHeader className="border-b border-slate-100 py-4 bg-slate-50/50">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                            <CardTitle className="text-base font-bold text-slate-900">Owner Insights</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        <div className="divide-y divide-slate-100">
                            <div className="p-5 hover:bg-slate-50 transition-colors group cursor-help">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-100">
                                        <ShieldAlert className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 mb-1">Maintenance Warning</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Vehicle <span className="text-slate-900 font-bold">SYD-102</span> has exceeded 5,000km since last oil change. Efficiency may drop.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 hover:bg-slate-50 transition-colors group cursor-help">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                                        <BarChart3 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 mb-1">Fuel Efficiency Tip</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Aggressive braking detected in <span className="text-slate-900 font-bold">3 trips</span> this morning. Driver training could save 5-8% fuel.
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 hover:bg-slate-50 transition-colors group cursor-help">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-blue-50 text-primary border border-blue-100">
                                        <Info className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900 mb-1">Utilization Insight</p>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            Fleet utilization is at <span className="text-emerald-600 font-bold">85%</span>. Peak demand expected tomorrow; prep standby vehicles.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                            <button className="w-full text-xs font-bold text-primary flex items-center justify-center gap-2 hover:gap-3 transition-all h-10 rounded-xl bg-white border border-slate-200 shadow-sm">
                                View Full Analytics Report
                                <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Driver Performance & Suggestions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Driver Leaderboard */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden flex flex-col bg-white">
                    <CardHeader className="border-b border-slate-100 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                <CardTitle className="text-base font-bold text-slate-900">Driver Performance</CardTitle>
                            </div>
                            <button className="text-xs text-slate-500 font-semibold hover:text-primary transition-colors">By Efficiency</button>
                        </div>
                    </CardHeader>
                    <div className="p-4 space-y-4">
                        {activeDrivers.length === 0 ? (
                            <p className="text-center text-slate-400 text-sm py-6">No active drivers</p>
                        ) : activeDrivers.slice(0, 5).map((driver, i) => (
                            <div key={driver.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-md transition-all cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">
                                            {driver.name.charAt(0)}
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[8px] text-white font-bold">
                                            {i + 1}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{driver.name}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">Active Driver</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[10px]">Active</Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Suggestions & Optimization */}
                <Card className="border border-slate-200 shadow-sm overflow-hidden flex flex-col bg-emerald-50/30">
                    <CardHeader className="border-b border-emerald-100 py-4 bg-emerald-50/50">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                            <CardTitle className="text-base font-bold text-emerald-900">Optimization Center</CardTitle>
                        </div>
                    </CardHeader>
                    <div className="p-6 space-y-6">
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <div className="flex-1 p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Fuel Savings</p>
                                    <p className="text-xl font-black text-slate-900">-$2,450</p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Potential monthly savings with route optimization.</p>
                                </div>
                                <div className="flex-1 p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Safety Rating</p>
                                    <p className="text-xl font-black text-slate-900">A+</p>
                                    <p className="text-[10px] text-slate-500 mt-1 leading-tight">Your fleet is in the top 5% for safety this week.</p>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white border border-emerald-100 shadow-sm">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Expansion Forecast</p>
                                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none">High Demand</Badge>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed mb-3">
                                    Based on your current volume, we suggest adding <span className="font-bold text-slate-900">2 light trucks</span> to your Sydney fleet to meet projected December demand.
                                </p>
                                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-10 rounded-xl">
                                    Explore Vehicle Inventory
                                    <ArrowRight className="w-3 h-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Trip Detail Dialog */}
            <Dialog open={isTripDialogOpen} onOpenChange={setIsTripDialogOpen}>
                <DialogContent className="sm:max-w-[480px] border-0 shadow-2xl overflow-hidden p-0 rounded-3xl bg-white">
                    {/* Header with Background Pattern */}
                    <div className="relative bg-slate-900 h-24 flex items-end p-6 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-transparent z-0" />
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-3xl" />
                        
                        <div className="relative z-10 flex items-center justify-between w-full">
                            <div>
                                <h2 className="text-white text-xl font-bold flex items-center gap-2">
                                    <Hash className="w-5 h-5 text-primary-foreground/60" />
                                    Trip <span className="text-primary-foreground">{selectedTrip?.id}</span>
                                </h2>
                                <p className="text-slate-400 text-xs font-medium">Tracking trip details in real-time</p>
                            </div>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-bold tracking-widest px-3 py-1">
                                {selectedTrip?.status}
                            </Badge>
                        </div>
                    </div>

                    {selectedTrip && (
                        <div className="p-6 space-y-6">
                            {/* Driver & Vehicle Section */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-widest">
                                        <User className="w-3 h-3" />
                                        Assigned Driver
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                            {selectedTrip.driver.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm">{selectedTrip.driver}</div>
                                            <div className="text-[10px] text-slate-500">Employee ID: DRV-092</div>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold mb-2 uppercase tracking-widest">
                                        <Car className="w-3 h-3" />
                                        Vehicle Specs
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500">
                                            <Car className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 text-sm leading-tight">{selectedTrip.vehicle}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-tighter">Plate: B 1234 XYZ</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Trip Timeline / Path */}
                            <div className="space-y-4 pt-2">
                                <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100 before:dashed">
                                    <div className="relative">
                                        <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Origin</div>
                                        <div className="text-sm font-semibold text-slate-900">Fleet Headquarters, Sydney</div>
                                    </div>
                                    <div className="relative">
                                        <div className="absolute -left-[23px] top-1 w-4 h-4 rounded-full bg-primary border-4 border-white shadow-sm animate-pulse" />
                                        <div className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Current Destination</div>
                                        <div className="text-sm font-bold text-slate-900 leading-tight">{selectedTrip.destination}</div>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Timer className="w-3 h-3" />
                                                Est. 45 mins
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <Navigation2 className="w-3 h-3" />
                                                12.4 km left
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                <Button id="track-trip-btn" className="flex-[2] h-12 gap-2 shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 text-white rounded-2xl">
                                    <MapPinIcon className="w-4 h-4" />
                                    Open Live Tracking
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsTripDialogOpen(false)} 
                                    className="flex-1 h-12 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-2xl font-semibold"
                                >
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
