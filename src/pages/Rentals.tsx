import { useState, useEffect } from 'react';
import { Search, SlidersHorizontal, Map as MapIcon, Grid, List, Filter, Car, Users, Zap, Settings, ShieldCheck, ChevronDown, CheckCircle2 } from 'lucide-react';
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
    DialogTrigger,
} from '../components/ui/dialog';
import { vehiclesApi, driversApi, rentalsApi } from '../lib/api';
import { Download, AlertCircle, Loader2 } from 'lucide-react';

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



const dotIcon = new L.Icon({
    iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzI1NjNFQiIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+PC9zdmc+',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

export function RentalsPage() {
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showMap, setShowMap] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([100, 1500]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
    const [selectedTransmission, setSelectedTransmission] = useState<string>('All');

    // Real data state
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [assigningVehicle, setAssigningVehicle] = useState<Vehicle | null>(null);
    const [selectedDriverId, setSelectedDriverId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const [vehiclesRes, driversRes] = await Promise.all([
                vehiclesApi.getAvailable(),
                driversApi.getAll('ACTIVE')
            ]);
            setVehicles(vehiclesRes.data);
            setDrivers(driversRes.data);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError('Failed to load available vehicles or drivers.');
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
            });
            
            // Refresh data
            await loadData();
            setAssigningVehicle(null);
            setSelectedDriverId('');
        } catch (err: any) {
            console.error('Assignment failed:', err);
            setError(err.response?.data?.error || 'Failed to assign vehicle. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        const vehicleName = `${v.year} ${v.make} ${v.model}`.toLowerCase();
        const matchesSearch = vehicleName.includes(searchQuery.toLowerCase()) || v.plate.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = selectedTypes.length === 0; // Simple for now as real data might not have types mapped same way
        const rate = typeof v.weekly_rate === 'string' ? parseFloat(v.weekly_rate) : v.weekly_rate;
        const matchesPrice = rate >= priceRange[0] && rate <= priceRange[1];
        return matchesSearch && matchesType && matchesPrice;
    });

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedTypes([]);
        setSelectedTransmission('All');
        setPriceRange([100, 1000]);
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-120px)] flex flex-col">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Available Vehicles</h1>
                    <p className="text-slate-500 text-sm mt-1">Find and assign vehicles for new rentals</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input 
                            id="vehicle-search-input"
                            placeholder="Search models..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 w-64 bg-white border-slate-200 focus:border-primary focus:ring-primary/20"
                        />
                    </div>
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1">
                        <button 
                            id="view-grid-btn"
                            className={`p-2 rounded-md transition-colors ${!showMap && viewMode === 'grid' ? 'bg-slate-100 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => { setViewMode('grid'); setShowMap(false); }}
                        >
                            <Grid className="w-4 h-4" />
                        </button>
                        <button 
                            id="view-list-btn"
                            className={`p-2 rounded-md transition-colors ${!showMap && viewMode === 'list' ? 'bg-slate-100 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => { setViewMode('list'); setShowMap(false); }}
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <div className="w-px h-4 bg-slate-200 mx-1"></div>
                        <button 
                            id="view-map-btn"
                            className={`p-2 rounded-md transition-colors ${showMap ? 'bg-slate-100 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                            onClick={() => setShowMap(true)}
                        >
                            <MapIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex gap-6 flex-1 min-h-0">
                {/* Filter Sidebar */}
                <div className="w-64 shrink-0 overflow-y-auto pr-2 custom-scrollbar hidden lg:block">
                    <div className="space-y-6">
                        {/* Car Type */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Car className="w-4 h-4 text-slate-500" />
                                Vehicle Type
                            </h3>
                            <div className="space-y-2">
                                {['SUV', 'Sedan', 'Hatchback', 'Van', 'Electric'].map((type) => (
                                    <label key={type} className="flex items-center gap-3 group cursor-pointer">
                                        <div className="relative flex items-center justify-center">
                                            <input 
                                                id={`filter-type-${type.toLowerCase()}`}
                                                type="checkbox" 
                                                checked={selectedTypes.includes(type)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedTypes([...selectedTypes, type]);
                                                    } else {
                                                        setSelectedTypes(selectedTypes.filter(t => t !== type));
                                                    }
                                                }}
                                                className="peer w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" 
                                            />
                                        </div>
                                        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">{type}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="h-px bg-slate-200 w-full"></div>

                        {/* Price Range */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4 text-slate-500" />
                                Weekly Rate ($)
                            </h3>
                            <div className="px-2">
                                <input 
                                    id="price-range-slider"
                                    type="range" 
                                    min="100" 
                                    max="1000" 
                                    value={priceRange[1]} 
                                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                    className="w-full accent-primary h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                                    <span>$100</span>
                                    <span className="text-primary font-bold">${priceRange[1]}</span>
                                    <span>$1000</span>
                                </div>
                            </div>
                        </div>

                        <div className="h-px bg-slate-200 w-full"></div>

                        {/* Transmission */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Settings className="w-4 h-4 text-slate-500" />
                                Transmission
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {['All', 'Auto', 'Manual'].map((trans) => (
                                    <Badge 
                                        key={trans}
                                        variant="outline" 
                                        onClick={() => setSelectedTransmission(trans)}
                                        className={`cursor-pointer ${selectedTransmission === trans ? 'bg-primary text-white border-primary hover:bg-primary/90' : 'text-slate-600 hover:bg-slate-100'}`}
                                    >
                                        {trans}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                        
                        <Button 
                            id="clear-filters-btn"
                            variant="outline"
                            onClick={clearFilters}
                            className="w-full border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        >
                            Clear Filters
                        </Button>
                    </div>
                </div>

                {/* Content Area (Grid, List, or Map) */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50/50 rounded-xl border border-slate-200/60 p-4 relative">
                    {loading ? (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                <p className="text-sm font-medium text-slate-600">Loading fleet...</p>
                            </div>
                        </div>
                    ) : null}

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-700">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p className="text-sm font-medium">{error}</p>
                            <Button variant="ghost" size="sm" onClick={loadData} className="ml-auto text-red-700 hover:bg-red-100">Retry</Button>
                        </div>
                    )}

                    {showMap ? (
                        <div className="h-full w-full rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0">
                            <MapContainer 
                                center={[-33.8688, 151.2093]} 
                                zoom={12} 
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                />
                                {filteredVehicles.map(v => (
                                    <Marker key={v.id} position={(v.location || [-33.8688, 151.2093]) as [number, number]} icon={dotIcon}>
                                        <Popup className="rounded-xl border-0 shadow-xl">
                                            <div className="p-1 min-w-[200px]">
                                                <img 
                                                    src={v.image_url || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=400'} 
                                                    alt={v.plate} 
                                                    className="w-full h-24 object-cover rounded-lg mb-2" 
                                                />
                                                <h4 className="font-bold text-slate-900">{v.year} {v.make} {v.model}</h4>
                                                <p className="text-xs text-slate-500 mb-2">{v.plate}</p>
                                                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                                                    <p className="text-primary font-bold">${v.weekly_rate}/wk</p>
                                                    <Button size="sm" onClick={() => setAssigningVehicle(v)}>Assign</Button>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    ) : (
                        <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                            {filteredVehicles.length === 0 && !loading ? (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                                    <Car className="w-12 h-12 text-slate-300 mb-4" />
                                    <p className="text-lg font-medium text-slate-600">No vehicles found</p>
                                    <p className="text-sm">Try adjusting your filters</p>
                                    <Button variant="outline" className="mt-4" onClick={clearFilters}>Clear Filters</Button>
                                </div>
                            ) : (
                                filteredVehicles.map(vehicle => (
                                    <Card key={vehicle.id} className={`overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 group bg-white ${viewMode === 'list' ? 'flex flex-row' : 'flex flex-col'}`}>
                                        <div className={`relative overflow-hidden bg-slate-100 ${viewMode === 'list' ? 'w-1/3' : 'w-full h-48'}`}>
                                            <img 
                                                src={vehicle.image_url || 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fd?auto=format&fit=crop&q=80&w=400'} 
                                                alt={vehicle.plate}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <Badge className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-900 border-0 shadow-sm font-semibold">
                                                Available
                                            </Badge>
                                        </div>
                                        <CardContent className={`p-5 flex flex-col justify-between ${viewMode === 'list' ? 'w-2/3' : 'flex-1'}`}>
                                            <div>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-slate-900 leading-tight">{vehicle.year} {vehicle.make} {vehicle.model}</h3>
                                                        <p className="text-sm text-slate-500 font-medium mt-1">{vehicle.plate} • {vehicle.color}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-wrap gap-4 mt-4 mb-6">
                                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                        <Users className="w-4 h-4 text-primary" />
                                                        <span className="font-medium">5 Seats</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                        <Settings className="w-4 h-4 text-primary" />
                                                        <span className="font-medium">Automatic</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                                        <Zap className="w-4 h-4 text-primary" />
                                                        <span className="font-medium">Hybrid/EV</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
                                                <div>
                                                    <p className="text-xs text-slate-500 font-medium">Weekly Rate</p>
                                                    <p className="text-xl font-bold text-slate-900">${vehicle.weekly_rate}</p>
                                                </div>
                                                <Button 
                                                    onClick={() => setAssigningVehicle(vehicle)}
                                                    className="bg-primary hover:bg-blue-700 shadow-md shadow-primary/20 transition-all group-hover:shadow-lg group-hover:shadow-primary/30"
                                                >
                                                    Assign Driver
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Assignment Dialog */}
            <Dialog open={!!assigningVehicle} onOpenChange={(open) => !open && setAssigningVehicle(null)}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Car className="w-5 h-5 text-primary" />
                            Assign Vehicle
                        </DialogTitle>
                    </DialogHeader>
                    {assigningVehicle && (
                        <div className="py-4 space-y-4">
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Selected Vehicle</p>
                                <h4 className="font-bold text-slate-900">{assigningVehicle.year} {assigningVehicle.make} {assigningVehicle.model}</h4>
                                <p className="text-sm text-slate-600">{assigningVehicle.plate} • ${assigningVehicle.weekly_rate}/week</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="driver-select">Select Active Driver</Label>
                                <select 
                                    id="driver-select"
                                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                    value={selectedDriverId}
                                    onChange={(e) => setSelectedDriverId(e.target.value)}
                                >
                                    <option value="">— Select a driver —</option>
                                    {drivers.map(driver => (
                                        <option key={driver.id} value={driver.id}>{driver.name} ({driver.email})</option>
                                    ))}
                                </select>
                                {drivers.length === 0 && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                                        <AlertCircle className="w-3 h-3" />
                                        No active drivers available for assignment.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssigningVehicle(null)}>Cancel</Button>
                        <Button 
                            disabled={!selectedDriverId || isSubmitting}
                            onClick={handleAssign}
                            className="gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Assigning...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4" />
                                    Confirm Assignment
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
