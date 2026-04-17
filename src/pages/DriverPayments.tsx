import { useState, useEffect } from 'react';
import { Banknote, FileText, Download, TrendingUp, AlertCircle, CheckCircle2, Search, ArrowUpRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';

interface Invoice {
    id: string;
    amount: number;
    status: string;
    due_date: string;
    description?: string;
    invoice_number: string;
}

export function DriverPayments() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const driverId = localStorage.getItem('driverId');

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        if (!driverId) return;
        try {
            const res = await api.get('/api/invoices', { params: { driver_id: driverId } });
            setInvoices(res.data);
        } catch (err) {
            console.error('Failed to load invoices:', err);
        } finally {
            setLoading(false);
        }
    };

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
    const paidAmount = invoices.filter(i => i.status === 'PAID').reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Banknote className="w-6 h-6 text-primary" />
                        Payments & Billing
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your invoices, view payment history, and download tax summaries.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" className="bg-white rounded-xl">
                        <FileText className="w-4 h-4 mr-2" />
                        Tax Statement
                    </Button>
                </div>
            </div>

            {/* Top Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Card */}
                <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start mb-6">
                            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                                <AlertCircle className="w-6 h-6 text-white" />
                            </div>
                            <Badge className="bg-white/20 text-white hover:bg-white/30 border-0">Due Now</Badge>
                        </div>
                        <div>
                            <p className="text-orange-100 font-medium mb-1">Total Outstanding Balance</p>
                            <h2 className="text-4xl font-black">${pendingAmount.toFixed(2)}</h2>
                        </div>
                    </div>
                </div>

                {/* Paid Year to Date */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between">
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
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <h3 className="font-bold text-slate-900">Billing History</h3>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search invoice # or amount..." 
                            className="pl-9 bg-white border-slate-200 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-slate-900">{inv.invoice_number || 'INV-Auto'}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{inv.description || 'Weekly Vehicle Rental'}</p>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">
                                            {new Date(inv.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            {inv.status === 'PAID' ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-0 flex items-center gap-1 w-max">
                                                    <CheckCircle2 className="w-3 h-3" /> Paid
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-amber-50 text-amber-700 border-0 flex items-center gap-1 w-max">
                                                    <AlertCircle className="w-3 h-3" /> Pending
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-900 text-base">
                                            ${inv.amount}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="text-slate-500 hover:text-primary hover:bg-blue-50 rounded-lg"
                                                onClick={() => handleDownload(inv.id)}
                                            >
                                                <Download className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            No invoices found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
