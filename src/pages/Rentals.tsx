import { useState, useEffect } from 'react';
import { 
    Search, Map as MapIcon, Grid, List, 
    Users, Zap, Settings, ShieldCheck, 
    DollarSign, Calendar,
    User, Ban, History,
    AlertCircle, Loader2
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import { vehiclesApi, driversApi, rentalsApi } from '../lib/api';
import { formatCurrency, formatDate, cn } from '../lib/utils';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plate: string;
    weekly_rate: number;
    status: string;
    image_url?: string;
    location?: [number, number];
}

interface Driver {
    id: string;
    name: string;
    email: string;
    status: string;
}

interface Rental {
    id: string;
    driver_id: string;
    vehicle_id: string;
    start_date: string;
    end_date?: string;
    weekly_rate: number;
    bond_amount: number;
    status: string;
    next_payment_date: string;
    driver: {
        id: string;
        name: string;
        email: string;
    };
    vehicle: {
        id: string;
        plate: string;
        make: string;
        model: string;
        year: number;
    };
}

const dotIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzI1NjNFQiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

export function RentalsPage() {
    const [activeTab, setActiveTab] = useState<'active' | 'available'>('active');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showMap, setShowMap] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([100, 1500]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    
    // Data state
    const [activeRentals, setActiveRentals] = useState<Rental[]>([]);
    const [availableVehicles, setAvailableVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [endingRental, setEndingRental] = useState<Rental | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [activeRes, availableRes, driversRes] = await Promise.all([
                rentalsApi.getActive(),
                vehiclesApi.getAvailable(),
                driversApi.getAll('ACTIVE')
            ]);
            setActiveRentals(activeRes.data);
            setAvailableVehicles(availableRes.data);
            setDrivers(driversRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load rentals or vehicles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleAssign = async () => {
        if (!assigningVehicle || !selectedDriverId) return;
        
        setIsSubmitting(true);
        setError(null);
        try {
            await rentalsApi.create({
                vehicle_id: assigningVehicle.id,
                driver_id: selectedDriverId,
                start_date: new Date().toISOString(),
                weekly_rate: assigningVehicle.weekly_rate,
                bond_amount: 1000, // Default bond
            });
            
            await loadData();
            setAssigningVehicle(null);
            setSelectedDriverId('');
            setActiveTab('active');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to assign vehicle.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEndRental = async () => {
        if (!endingRental) return;
        setIsSubmitting(true);
        try {
            await rentalsApi.end(endingRental.id);
            await loadData();
            setEndingRental(null);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to end rental.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredVehicles = availableVehicles.filter(v => {
        const name = `${v.year} ${v.make} ${v.model} ${v.plate}`.toLowerCase();
        return name.includes(searchQuery.toLowerCase());
    });

    const filteredRentals = activeRentals.filter(r => {
        const searchStr = `${r.driver.name} ${r.vehicle.plate} ${r.vehicle.make} ${r.vehicle.model}`.toLowerCase();
        return searchStr.includes(searchQuery.toLowerCase());
    });

    const totalWeeklyRevenue = activeRentals.reduce((sum, r) => sum + (Number(r.weekly_rate) || 0), 0);
    const totalBonds = activeRentals.reduce((sum, r) => sum + (Number(r.bond_amount) || 0), 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Stats Summary */}
            <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rentals Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage active contracts and fleet assignments</p>
                    
                    <div className="flex items-center gap-1 mt-6 bg-slate-100 p-1 rounded-xl w-fit">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                                activeTab === 'active' 
                                    ? "bg-white text-blue-600 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Active Contracts ({activeRentals.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('available')}
                            className={cn(
                                "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
                                activeTab === 'available' 
                                    ? "bg-white text-blue-600 shadow-sm" 
                                    : "text-slate-500 hover:text-slate-700"
                            )}
                        >
                            Available Fleet ({availableVehicles.length})
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-96">
                    <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg shadow-blue-200">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between opacity-80">
                                <span className="text-xs font-bold uppercase tracking-wider">Weekly Revenue</span>
                                <DollarSign className="w-4 h-4" />
                            </div>
                            <div className="mt-2">
                                <span className="text-2xl font-bold">{formatCurrency(totalWeeklyRevenue)}</span>
                                <p className="text-[10px] mt-1 opacity-70">From {activeRentals.length} active contracts</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white border-slate-200 shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between text-slate-400">
                                <span className="text-xs font-bold uppercase tracking-wider">Bonds Held</span>
                                <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div className="mt-2">
                                <span className="text-2xl font-bold text-slate-900">{formatCurrency(totalBonds)}</span>
                                <p className="text-[10px] mt-1 text-slate-500">Security deposits on hand</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input 
                        placeholder={activeTab === 'active' ? "Search by driver or plate..." : "Search available models..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-blue-500 transition-all"
                    />
                </div>
                
                {activeTab === 'available' && (
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <Button 
                            variant="ghost" size="sm" 
                            className={cn("px-3 h-8", !showMap && viewMode === 'grid' && "bg-white shadow-sm text-blue-600")}
                            onClick={() => { setViewMode('grid'); setShowMap(false); }}
                        >
                            <Grid className="w-4 h-4 mr-2" /> Grid
                        </Button>
                        <Button 
                            variant="ghost" size="sm" 
                            className={cn("px-3 h-8", !showMap && viewMode === 'list' && "bg-white shadow-sm text-blue-600")}
                            onClick={() => { setViewMode('list'); setShowMap(false); }}
                        >
                            <List className="w-4 h-4 mr-2" /> List
                        </Button>
                        <Button 
                            variant="ghost" size="sm" 
                            className={cn("px-3 h-8", showMap && "bg-white shadow-sm text-blue-600")}
                            onClick={() => setShowMap(true)}
                        >
                            <MapIcon className="w-4 h-4 mr-2" /> Map
                        </Button>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px] relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10 rounded-2xl">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                            <p className="text-sm font-medium text-slate-600">Syncing rental data...</p>
                        </div>
                    </div>
                )}

                {activeTab === 'active' ? (
                    <Card className="border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Driver</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Vehicle</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Started</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Weekly Rate</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Next Payment</th>
                                        <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredRentals.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-12 text-center text-slate-400">
                                                <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p>No active rental contracts found</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRentals.map(rental => (
                                            <tr key={rental.id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                                            <User className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-slate-900">{rental.driver.name}</p>
                                                            <p className="text-xs text-slate-500">{rental.driver.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{rental.vehicle.plate}</p>
                                                        <p className="text-xs text-slate-500">{rental.vehicle.year} {rental.vehicle.make} {rental.vehicle.model}</p>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2 text-slate-600">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span className="text-sm">{formatDate(rental.start_date)}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <span className="font-bold text-slate-900">{formatCurrency(rental.weekly_rate)}</span>
                                                </td>
                                                <td className="p-4">
                                                    <Badge className={cn(
                                                        "font-medium",
                                                        new Date(rental.next_payment_date) < new Date() ? "bg-red-100 text-red-700 border-red-200" : "bg-emerald-100 text-emerald-700 border-emerald-200"
                                                    )}>
                                                        {formatDate(rental.next_payment_date)}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 gap-2"
                                                        onClick={() => setEndingRental(rental)}
                                                    >
                                                        <Ban className="w-4 h-4" /> End Contract
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                ) : (
                    /* Available Fleet View */
                    showMap ? (
                        <div className="h-[500px] w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                            <MapContainer 
                                center={[-33.8688, 151.2093]} 
                                zoom={12} 
                                className="h-full w-full"
                            >
                                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                                {filteredVehicles.map(v => (
                                    <Marker key={v.id} position={(v.location || [-33.8688, 151.2093]) as [number, number]} icon={dotIcon}>
                                        <Popup>
                                            <div className="p-2 min-w-[200px]">
                                                <img src={v.image_url || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=400'} className="w-full h-24 object-cover rounded-lg mb-2" />
                                                <h4 className="font-bold">{v.year} {v.make} {v.model}</h4>
                                                <p className="text-xs text-slate-500 mb-2">{v.plate}</p>
                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <p className="font-bold text-blue-600">{formatCurrency(v.weekly_rate)}/wk</p>
                                                    <Button size="sm" onClick={() => setAssigningVehicle(v)}>Assign</Button>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    ) : (
                        <div className={cn("grid gap-6", viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
                            {filteredVehicles.map(vehicle => (
                                <Card key={vehicle.id} className={cn("group overflow-hidden border-slate-200 hover:shadow-xl transition-all duration-300", viewMode === 'list' && "flex flex-row h-48")}>
                                    <div className={cn("relative", viewMode === 'list' ? "w-64" : "h-48")}>
                                        <img 
                                            src={vehicle.image_url || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=400'} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        <Badge className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-900 border-0">Available</Badge>
                                    </div>
                                    <CardContent className="p-5 flex flex-col justify-between flex-1">
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-900">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                                            <p className="text-sm text-slate-500">{vehicle.plate} • {vehicle.color}</p>
                                            
                                            <div className="flex gap-3 mt-4">
                                                <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                    <Users className="w-3 h-3" /> 5 Seats
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                                                    <Settings className="w-3 h-3" /> Auto
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
                                            <div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase">Weekly Rate</p>
                                                <p className="text-lg font-bold text-slate-900">{formatCurrency(vehicle.weekly_rate)}</p>
                                            </div>
                                            <Button size="sm" onClick={() => setAssigningVehicle(vehicle)} className="bg-blue-600 hover:bg-blue-700">Assign Driver</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )
                )}
            </div>

            {/* Assignment Dialog */}
            <Dialog open={!!assigningVehicle} onOpenChange={(open) => !open && setAssigningVehicle(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Vehicle to Driver</DialogTitle>
                    </DialogHeader>
                    {assigningVehicle && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Vehicle Details</p>
                                <h4 className="font-bold text-slate-900">{assigningVehicle.year} {assigningVehicle.make} {assigningVehicle.model}</h4>
                                <p className="text-sm text-slate-600">{assigningVehicle.plate} • {formatCurrency(assigningVehicle.weekly_rate)}/week</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Select Active Driver</Label>
                                <select 
                                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                                    value={selectedDriverId}
                                    onChange={(e) => setSelectedDriverId(e.target.value)}
                                >
                                    <option value="">— Select a driver —</option>
                                    {drivers.map(d => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.email})</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssigningVehicle(null)}>Cancel</Button>
                        <Button disabled={!selectedDriverId || isSubmitting} onClick={handleAssign}>
                            {isSubmitting ? "Processing..." : "Create Rental Contract"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* End Rental Confirmation */}
            <Dialog open={!!endingRental} onOpenChange={(open) => !open && setEndingRental(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-red-600 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            End Rental Contract
                        </DialogTitle>
                    </DialogHeader>
                    {endingRental && (
                        <div className="py-4 text-slate-600">
                            <p>Are you sure you want to end the rental for <strong>{endingRental.driver.name}</strong> with vehicle <strong>{endingRental.vehicle.plate}</strong>?</p>
                            <div className="mt-4 p-4 bg-slate-50 rounded-xl text-xs space-y-1">
                                <p>• The vehicle status will be set back to <strong>AVAILABLE</strong>.</p>
                                <p>• The driver's active assignment will be terminated.</p>
                                <p>• Final billing should be handled in the Invoices section.</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEndingRental(null)}>Keep Active</Button>
                        <Button variant="destructive" disabled={isSubmitting} onClick={handleEndRental}>
                            {isSubmitting ? "Ending..." : "Confirm End Rental"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

