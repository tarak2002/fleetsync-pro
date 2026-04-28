import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { tollsApi } from '../lib/api';
import { formatCurrency, formatDate } from '../lib/utils';
import { AlertCircle, CheckCircle2, Clock, Car, MapPin, Loader2 } from 'lucide-react';

interface TollCharge {
    id: string;
    plate: string;
    date: string;
    amount: string;
    location: string;
    provider_tx_id: string;
    invoice_status: string;
    driver_name: string;
    created_at: string;
}

export function TollsPage() {
    const [tolls, setTolls] = useState<TollCharge[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'ALL' | 'UNPROCESSED' | 'PROCESSED'>('ALL');

    const loadTolls = async () => {
        setLoading(true);
        try {
            const res = await tollsApi.getAll();
            setTolls(res.data);
        } catch (error) {
            console.error('Failed to load tolls:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTolls();
    }, []);

    const filteredTolls = tolls.filter(toll => {
        if (filter === 'ALL') return true;
        if (filter === 'UNPROCESSED') return toll.invoice_status === 'UNPROCESSED';
        if (filter === 'PROCESSED') return toll.invoice_status !== 'UNPROCESSED';
        return true;
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'UNPROCESSED':
                return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Unprocessed</Badge>;
            case 'PENDING':
                return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Invoiced (Pending)</Badge>;
            case 'PAID':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200">Paid</Badge>;
            case 'OVERDUE':
                return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Overdue</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Road Tolls</h1>
                    <p className="text-slate-500 mt-1">Manage and track fleet toll charges from e-tags and ALPR.</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={loadTolls} variant="outline" disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Refresh List
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Tolls</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{tolls.length}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center">
                            <Car className="w-6 h-6 text-slate-400" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Unprocessed</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">
                                {tolls.filter(t => t.invoice_status === 'UNPROCESSED').length}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-amber-500" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-slate-200 shadow-sm bg-white">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Invoiced</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">
                                {tolls.filter(t => t.invoice_status !== 'UNPROCESSED').length}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border border-slate-200 shadow-sm bg-white">
                <CardHeader className="border-b border-slate-100 py-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-bold text-slate-900">Toll Log</CardTitle>
                    <div className="flex gap-2">
                        {['ALL', 'UNPROCESSED', 'PROCESSED'].map((f) => (
                            <Button
                                key={f}
                                variant={filter === f ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter(f as any)}
                                className={filter === f ? 'bg-primary text-white' : ''}
                            >
                                {f === 'ALL' ? 'All' : f === 'PROCESSED' ? 'Invoiced' : 'Unprocessed'}
                            </Button>
                        ))}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Date & Time</th>
                                    <th className="px-6 py-3">Vehicle</th>
                                    <th className="px-6 py-3">Driver</th>
                                    <th className="px-6 py-3">Location</th>
                                    <th className="px-6 py-3 text-right">Amount</th>
                                    <th className="px-6 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                                            Loading tolls...
                                        </td>
                                    </tr>
                                ) : filteredTolls.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No tolls found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTolls.map((toll) => (
                                        <tr key={toll.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-slate-400" />
                                                    {formatDate(toll.date)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium text-xs">
                                                    {toll.plate}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900">
                                                {toll.driver_name}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-slate-600">
                                                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                    <span className="truncate max-w-[200px]" title={toll.location}>
                                                        {toll.location}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-900">
                                                {formatCurrency(parseFloat(toll.amount))}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {getStatusBadge(toll.invoice_status)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
