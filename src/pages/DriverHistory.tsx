import { useState } from 'react';
import { History, Calendar, Clock, Map, DollarSign, Download, Filter, Search, ChevronDown } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';

export function DriverHistory() {
    const [searchTerm, setSearchTerm] = useState('');

    // Extended mock data for history
    const allTrips = [
        { id: 1, date: 'Today', startTime: '08:00 AM', endTime: '12:12 PM', duration: '4h 12m', distance: '124 km', earnings: '$145.50', status: 'Completed' },
        { id: 2, date: 'Yesterday', startTime: '09:15 AM', endTime: '04:00 PM', duration: '6h 45m', distance: '185 km', earnings: '$210.00', status: 'Completed' },
        { id: 3, date: 'Mon, 12 Oct', startTime: '07:30 AM', endTime: '01:00 PM', duration: '5h 30m', distance: '160 km', earnings: '$180.20', status: 'Completed' },
        { id: 4, date: 'Fri, 9 Oct', startTime: '10:00 AM', endTime: '06:00 PM', duration: '8h 00m', distance: '220 km', earnings: '$275.00', status: 'Completed' },
        { id: 5, date: 'Thu, 8 Oct', startTime: '08:45 AM', endTime: '02:15 PM', duration: '5h 30m', distance: '145 km', earnings: '$165.80', status: 'Completed' },
        { id: 6, date: 'Tue, 6 Oct', startTime: '11:00 AM', endTime: '03:30 PM', duration: '4h 30m', distance: '110 km', earnings: '$130.00', status: 'Completed' },
    ];

    const filteredTrips = allTrips.filter(trip => 
        trip.date.toLowerCase().includes(searchTerm.toLowerCase()) || 
        trip.status?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                        <p className="text-sm font-medium text-slate-500">Total Shifts (30 Days)</p>
                        <p className="text-2xl font-bold text-slate-900">24</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Map className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Distance</p>
                        <p className="text-2xl font-bold text-slate-900">3,450 km</p>
                    </div>
                </div>
                <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Hours</p>
                        <p className="text-2xl font-bold text-slate-900">142h 30m</p>
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
                                <th className="px-6 py-4 font-semibold">Distance</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Estimated Earnings</th>
                                <th className="px-6 py-4 font-semibold text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredTrips.map((trip) => (
                                <tr key={trip.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900">{trip.date}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{trip.startTime} - {trip.endTime}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Clock className="w-4 h-4 text-slate-400" />
                                            {trip.duration}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <Map className="w-4 h-4 text-slate-400" />
                                            {trip.distance}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <Badge className="bg-emerald-50 text-emerald-700 border-0 hover:bg-emerald-100">{trip.status}</Badge>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-900 text-right text-base">{trip.earnings}</p>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Button 
                                            variant="ghost" 
                                            size="sm" 
                                            className="text-slate-500 hover:text-primary rounded-lg"
                                            onClick={() => handleDownload(trip.id)}
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredTrips.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
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
