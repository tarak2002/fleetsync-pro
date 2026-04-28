import { useState, useEffect } from 'react';
import { History, Calendar, Clock, Map, Download, Filter, Search, ChevronDown, Activity } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { driverDashboardApi } from '../lib/api';
import { format } from 'date-fns';

export function DriverHistory() {
    const [searchTerm, setSearchTerm] = useState('');
    const [shifts, setShifts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const driverId = localStorage.getItem('driverId') || '';

    useEffect(() => {
        fetchShifts();
    }, []);

    const fetchShifts = async () => {
        try {
            // Only pass if we have a real ID, otherwise let backend use session
            const idToPass = driverId && driverId !== 'null' && driverId !== 'undefined' ? driverId : undefined;
            const response = await driverDashboardApi.getShifts(idToPass);
            
            // Only show shifts that actually started
            const realShifts = (response.data || []).filter((s: any) => s.started_at !== null);
            setShifts(realShifts);
        } catch (err) {
            console.error('Failed to fetch shifts:', err);
        } finally {
            setLoading(false);
        }
    };

    const filteredShifts = shifts.filter(shift => {
        const dateStr = shift.started_at ? format(new Date(shift.started_at), 'PPP') : 'Unknown Date';
        return dateStr.toLowerCase().includes(searchTerm.toLowerCase()) || 
               shift.status?.toLowerCase().includes(searchTerm.toLowerCase());
    });

    const formatDuration = (start: string, end: string | null) => {
        if (!start) return '--';
        const startTime = new Date(start).getTime();
        const endTime = end ? new Date(end).getTime() : new Date().getTime();
        const diffMs = endTime - startTime;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        return `${diffHrs}h ${diffMins}m`;
    };

    const totalHours = shifts.reduce((acc, shift) => {
        if (!shift.started_at) return acc;
        const start = new Date(shift.started_at).getTime();
        const end = shift.ended_at ? new Date(shift.ended_at).getTime() : (shift.status === 'ACTIVE' ? new Date().getTime() : start);
        return acc + (end - start);
    }, 0);

    const totalHoursStr = `${Math.floor(totalHours / 3600000)}h ${Math.floor((totalHours % 3600000) / 60000)}m`;

    const handleDownload = (id: number) => {
        const link = document.createElement('a');
        link.href = '/docs/rental_agreement.pdf';
        link.download = `Rental-Agreement-${id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <History className="w-6 h-6 text-primary" />
                        Activity History
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Review your past shifts, routes, and performance metrics.</p>
                </div>
                <Button className="bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-xl">
                    <Download className="w-4 h-4 mr-2" />
                    Export CSV
                </Button>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Shifts (Life)</p>
                        <p className="text-2xl font-bold text-slate-900">{shifts.length}</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Active Status</p>
                        <p className="text-2xl font-bold text-slate-900">
                            {shifts.some(s => s.status === 'ACTIVE') ? 'On Shift' : 'Off Shift'}
                        </p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Hours</p>
                        <p className="text-2xl font-bold text-slate-900">{totalHoursStr}</p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder="Search by date or distance..." 
                            className="pl-9 bg-white border-slate-200 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" className="w-full sm:w-auto rounded-xl">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                        <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-white border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Shift Date & Time</th>
                                <th className="px-6 py-4 font-semibold">Duration</th>
                                <th className="px-6 py-4 font-semibold">Vehicle</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            Loading shift history...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredShifts.map((shift) => (
                                <tr key={shift.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900">
                                            {shift.started_at ? format(new Date(shift.started_at), 'PPP') : 'Unknown Date'}
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {shift.started_at ? format(new Date(shift.started_at), 'p') : '--'} - {shift.ended_at ? format(new Date(shift.ended_at), 'p') : 'Active'}
                                        </p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            {formatDuration(shift.started_at, shift.ended_at)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Map className="w-4 h-4 text-slate-400" />
                                            {shift.rental?.vehicle?.plate || 'Unknown Vehicle'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge className={`border-0 ${
                                            shift.status === 'ACTIVE' 
                                            ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        }`}>
                                            {shift.status === 'ACTIVE' ? 'Active' : 'Completed'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-slate-500 hover:text-primary rounded-lg"
                                            onClick={() => handleDownload(shift.id)}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {!loading && filteredShifts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                        No activity found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
