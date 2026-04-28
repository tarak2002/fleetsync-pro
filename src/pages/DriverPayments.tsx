import { useState, useEffect, useCallback } from 'react';
import { Banknote, FileText, Download, TrendingUp, AlertCircle, CheckCircle2,
         Search, ArrowUpRight, CreditCard, Plus, Settings2, Link2, Zap,
         RefreshCw, DollarSign, Calendar, Unlink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { api, argyleApi } from '../lib/api';
import { format } from 'date-fns';

interface Invoice {
    id: string; 
    amount: number; 
    status: string;
    due_date: string; 
    description?: string; 
    invoice_number: string;
    tolls?: number;
    weekly_rate?: number;
    fines?: number;
    credits?: number;
}
interface EarningsHistory {
    id: string; gross_earnings: number; source: string;
    period_start: string; period_end: string;
}

declare global {
    interface Window { ArgyleLink?: any; }
}

export function DriverPayments() {
    const [tab, setTab] = useState<'billing' | 'earnings'>('billing');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [driver, setDriver] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Earnings / Argyle state
    const [earningsData, setEarningsData] = useState<any>(null);
    const [earningsLoading, setEarningsLoading] = useState(false);
    const [linkingArgyle, setLinkingArgyle] = useState(false);

    const navigate = useNavigate();
    const driverId = localStorage.getItem('driverId') || '';

    // ── Load Argyle CDN script once ──────────────────────────────────────────
    useEffect(() => {
        if (document.getElementById('argyle-sdk')) return;
        const script = document.createElement('script');
        script.id = 'argyle-sdk';
        script.src = 'https://plugin.argyle.com/argyle.web.v4.js';
        script.async = true;
        document.head.appendChild(script);
    }, []);

    useEffect(() => { loadInvoices(); }, []);

    useEffect(() => {
        if (tab === 'earnings' && driverId) loadEarnings();
    }, [tab]);

    const loadInvoices = async () => {
        if (!driverId) return;
        try {
            const [invoiceRes, driverRes] = await Promise.all([
                api.get('/api/invoices', { params: { driver_id: driverId } }),
                api.get(`/api/drivers/${driverId}`),
            ]);
            setInvoices(invoiceRes.data);
            setDriver(driverRes.data);
        } catch (err) {
            console.error('Failed to load data:', err);
        } finally { setLoading(false); }
    };

    const loadEarnings = async () => {
        setEarningsLoading(true);
        try {
            const res = await argyleApi.getMyEarnings(driverId);
            setEarningsData(res.data);
        } catch (err) {
            console.error('Failed to load earnings:', err);
        } finally { setEarningsLoading(false); }
    };

    // ── Open Argyle Link pop-up ──────────────────────────────────────────────
    const openArgyleLink = useCallback(async () => {
        setLinkingArgyle(true);
        try {
            const tokenRes = await argyleApi.getUserToken(driverId);
            const { user_token } = tokenRes.data;

            if (!window.ArgyleLink) {
                alert('Argyle SDK not loaded yet. Please try again in a moment.');
                return;
            }

            const argyle = window.ArgyleLink.create({
                userToken: user_token,
                sandbox: true,
                pluginKey: import.meta.env.VITE_ARGYLE_PLUGIN_KEY || 'demo',
                // Called when the driver successfully links an account
                onAccountConnected: (_payload: any) => {
                    loadEarnings();
                },
                onClose: () => { setLinkingArgyle(false); },
                onError: (err: any) => {
                    console.error('[Argyle]', err);
                    setLinkingArgyle(false);
                },
            });
            argyle.open();
        } catch (err) {
            console.error('[Argyle] Link open error:', err);
            setLinkingArgyle(false);
        }
    }, [driverId]);

    const handleDownload = (id: string) => {
        const link = document.createElement('a');
        link.href = '/docs/sample_invoice.pdf';
        link.download = `Invoice-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredInvoices = invoices.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.amount.toString().includes(searchTerm)
    );
    const pendingAmount = invoices.filter(i => i.status === 'PENDING').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const paidAmount   = invoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-primary" />
                        Payments &amp; Earnings
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage invoices and track your gig income in one place.</p>
                </div>
                <Button variant="outline" className="bg-white rounded-xl">
                    <FileText className="w-4 h-4 mr-2" /> Tax Statement
                </Button>
            </div>

            {/* Tab switcher */}
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
                {(['billing', 'earnings'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                            tab === t
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {t === 'billing' ? 'Billing History' : '💰 My Earnings'}
                    </button>
                ))}
            </div>

            {/* ── BILLING TAB ────────────────────────────────────────────────── */}
            {tab === 'billing' && (
                <>
                    {/* Live Statement / Active Charges */}
                    {invoices.find(i => i.status === 'PENDING') && (
                        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-6">
                            <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Current Week Breakdown</h3>
                                        <p className="text-xs text-slate-500">Live charges for this billing cycle</p>
                                    </div>
                                </div>
                                <Badge className="bg-primary/10 text-primary border-0">IN PROGRESS</Badge>
                            </div>
                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-500">Vehicle Rental</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            ${(invoices.find(i => i.status === 'PENDING')?.weekly_rate || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-sm font-semibold text-blue-700">Road Tolls</p>
                                            <Link2 className="w-3 h-3 text-blue-400" />
                                        </div>
                                        <p className="text-2xl font-black text-blue-900">
                                            ${(invoices.find(i => i.status === 'PENDING')?.tolls || 0).toFixed(2)}
                                        </p>
                                        <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Synced from Linkt</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-500">Fines & Other</p>
                                        <p className="text-2xl font-bold text-slate-900">
                                            ${(invoices.find(i => i.status === 'PENDING')?.fines || 0).toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-slate-500">Total Due</p>
                                        <p className="text-2xl font-black text-primary">
                                            ${(invoices.find(i => i.status === 'PENDING')?.amount || 0).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Pending */}
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                        <AlertCircle className="w-6 h-6 text-white" />
                                    </div>
                                    <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">Due Now</Badge>
                                </div>
                                <p className="text-orange-100 font-medium mb-1">Total Outstanding Balance</p>
                                <h2 className="text-4xl font-black">${pendingAmount.toFixed(2)}</h2>
                            </div>
                        </div>

                        {/* Paid YTD */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-emerald-50 rounded-xl">
                                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                                </div>
                                <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">Year to Date</Badge>
                            </div>
                            <div>
                                <p className="text-slate-500 font-medium mb-1">Total Paid (2024)</p>
                                <div className="flex items-end gap-3">
                                    <h2 className="text-4xl font-black text-slate-900">${paidAmount.toFixed(2)}</h2>
                                    <p className="text-sm font-bold text-emerald-600 mb-1 flex items-center">
                                        <ArrowUpRight className="w-4 h-4" /> 12%
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment method */}
                        <div className="md:col-span-2 bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[120px] -mr-48 -mt-48 transition-all group-hover:bg-primary/30" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10">
                                        <CreditCard className="w-8 h-8 text-primary-foreground" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Payment Method</h3>
                                        {driver?.stripe_payment_method_id ? (
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0">ACTIVE</Badge>
                                                <p className="text-slate-400 text-sm font-medium">Card ending in •••• 4242</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Badge className="bg-amber-500/20 text-amber-400 border-0">ACTION REQUIRED</Badge>
                                                <p className="text-slate-400 text-sm">No primary payment method saved.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    onClick={() => navigate('/dashboard/payments/add')}
                                    className="bg-white text-slate-900 hover:bg-slate-100 rounded-2xl h-14 px-8 font-bold shadow-xl shadow-black/20 transition-transform active:scale-95"
                                >
                                    {driver?.stripe_payment_method_id
                                        ? <><Settings2 className="w-5 h-5 mr-2" /> Update Card</>
                                        : <><Plus className="w-5 h-5 mr-2" /> Add Payment Method</>}
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Invoices table */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                            <h3 className="font-bold text-slate-900">Billing History</h3>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input placeholder="Search invoice # or amount..."
                                    className="pl-9 bg-white border-slate-200 rounded-xl"
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        {loading ? (
                            <div className="py-12 flex justify-center">
                                <div className="w-8 h-8 border-4 border-slate-100 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Invoice Details</th>
                                            <th className="px-6 py-4 font-semibold">Due Date</th>
                                            <th className="px-6 py-4 font-semibold">Status</th>
                                            <th className="px-6 py-4 font-semibold">Amount</th>
                                            <th className="px-6 py-4 font-semibold text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredInvoices.map(inv => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900">{inv.invoice_number || 'INV-Auto'}</p>
                                                    <p className="text-xs text-slate-500 mt-0.5">{inv.description || 'Weekly Vehicle Rental'}</p>
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-700">
                                                    {new Date(inv.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {inv.status === 'PAID'
                                                        ? <Badge className="bg-emerald-50 text-emerald-700 border-0 flex items-center gap-1 w-max"><CheckCircle2 className="w-3 h-3" /> Paid</Badge>
                                                        : <Badge className="bg-amber-50 text-amber-700 border-0 flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3" /> Pending</Badge>}
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 text-base">${inv.amount}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button variant="ghost" size="sm"
                                                        className="text-slate-500 hover:text-primary hover:bg-blue-50 rounded-lg"
                                                        onClick={() => handleDownload(inv.id)}>
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredInvoices.length === 0 && (
                                            <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No invoices found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* ── EARNINGS TAB ───────────────────────────────────────────────── */}
            {tab === 'earnings' && (
                <div className="space-y-6">
                    {/* Argyle Connect Banner */}
                    {!earningsData?.is_linked && (
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 text-white relative overflow-hidden">
                            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-5 h-5 text-yellow-300" />
                                        <span className="text-sm font-semibold text-violet-200 uppercase tracking-wider">Powered by Argyle</span>
                                    </div>
                                    <h2 className="text-2xl font-black mb-2">Connect Your Gig Accounts</h2>
                                    <p className="text-violet-200 max-w-md">
                                        Link your Uber, Ola, or DiDi account once. FleetSync will automatically sync your earnings every week — no manual entry needed.
                                    </p>
                                    <div className="flex gap-2 mt-4">
                                        {['Uber', 'Ola', 'DiDi', 'DoorDash'].map(p => (
                                            <span key={p} className="px-3 py-1 bg-white/15 rounded-full text-xs font-semibold backdrop-blur-sm">{p}</span>
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    onClick={openArgyleLink}
                                    disabled={linkingArgyle}
                                    className="bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl h-14 px-8 font-bold shadow-xl shadow-indigo-900/30 transition-transform active:scale-95 shrink-0"
                                >
                                    {linkingArgyle
                                        ? <><RefreshCw className="w-5 h-5 mr-2 animate-spin" /> Connecting...</>
                                        : <><Link2 className="w-5 h-5 mr-2" /> Connect Account</>}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Account linked status */}
                    {earningsData?.is_linked && (
                        <div className="bg-white border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">Gig Accounts Connected</p>
                                    <p className="text-xs text-slate-500">Syncing automatically via Argyle</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="rounded-xl" onClick={loadEarnings}>
                                    <RefreshCw className="w-4 h-4 mr-1" /> Refresh
                                </Button>
                                <Button variant="ghost" size="sm" className="rounded-xl text-slate-400 hover:text-red-500"
                                    onClick={openArgyleLink}>
                                    <Unlink className="w-4 h-4 mr-1" /> Manage
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Loading */}
                    {earningsLoading && (
                        <div className="py-16 flex flex-col items-center gap-3 text-slate-400">
                            <div className="w-8 h-8 border-4 border-slate-100 border-t-violet-500 rounded-full animate-spin" />
                            <p className="text-sm">Fetching your earnings...</p>
                        </div>
                    )}

                    {/* Live this-week card */}
                    {!earningsLoading && earningsData?.live_earnings && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white col-span-1">
                                <p className="text-emerald-100 text-sm font-medium mb-1">This Week's Gross</p>
                                <h2 className="text-3xl font-black">${earningsData.live_earnings.weekly_gross.toFixed(2)}</h2>
                                <p className="text-emerald-200 text-xs mt-2">{earningsData.live_earnings.trip_count} trips · {earningsData.live_earnings.platform}</p>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between">
                                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                    <DollarSign className="w-4 h-4" /> Last Synced
                                </div>
                                <p className="font-bold text-slate-900">
                                    {format(new Date(earningsData.live_earnings.synced_at), 'PPp')}
                                </p>
                            </div>
                            <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col justify-between">
                                <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                                    <Calendar className="w-4 h-4" /> Total Records
                                </div>
                                <p className="font-black text-3xl text-slate-900">{earningsData.history?.length ?? 0}</p>
                            </div>
                        </div>
                    )}

                    {/* Placeholder if not linked and not loading */}
                    {!earningsLoading && !earningsData?.is_linked && (
                        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                            <Link2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-semibold">No accounts connected yet</p>
                            <p className="text-sm mt-1">Click "Connect Account" above to get started.</p>
                        </div>
                    )}

                    {/* Earnings history */}
                    {!earningsLoading && (earningsData?.history?.length ?? 0) > 0 && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="font-bold text-slate-900">Weekly Earnings History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Period</th>
                                            <th className="px-6 py-4 font-semibold">Source</th>
                                            <th className="px-6 py-4 font-semibold">Gross Earnings</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {(earningsData.history as EarningsHistory[]).map(row => (
                                            <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-900">
                                                        {row.period_start ? format(new Date(row.period_start), 'dd MMM') : '—'}
                                                        {' – '}
                                                        {row.period_end ? format(new Date(row.period_end), 'dd MMM yyyy') : '—'}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <Badge className={`border-0 ${
                                                        row.source === 'ARGYLE'
                                                            ? 'bg-violet-50 text-violet-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {row.source === 'ARGYLE' ? '⚡ Argyle' : '✏️ Manual'}
                                                    </Badge>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-slate-900 text-base">
                                                    ${Number(row.gross_earnings).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
