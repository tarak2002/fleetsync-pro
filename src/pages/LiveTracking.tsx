import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Car, Search, Filter, Phone, MessageSquare } from 'lucide-react';
import { fetchDashboard } from '../store';
import type { RootState, AppDispatch } from '../store';
import { cn } from '../lib/utils';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom custom marker
const vehicleIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

const selectedIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, zoom, { duration: 1.5 });
    }, [center, zoom, map]);
    return null;
}

export function LiveTracking() {
    const dispatch = useDispatch<AppDispatch>();
    const { dashboard } = useSelector((state: RootState) => state.fleet);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

    useEffect(() => {
        dispatch(fetchDashboard());
    }, [dispatch]);

    // Mock data for live tracking
    const activeVehicles = [
        {
            id: '1',
            model: 'Daihatsu Granmax',
            plate: 'D 1587 IO',
            driver: 'Hendra',
            status: 'On Going',
            startTime: '15:30',
            estTime: '17:40',
            address: 'George St, Sydney',
            coordinates: [-33.8688, 151.2093] as [number, number],
            route: [[-33.8688, 151.2093], [-33.8720, 151.2100], [-33.8750, 151.2120]] as [number, number][]
        },
        {
            id: '2',
            model: 'DFSK Supercab',
            plate: 'D 7571 IO',
            driver: 'Toni',
            status: 'Transit',
            address: 'Bondi Beach',
            coordinates: [-33.8915, 151.2767] as [number, number],
        },
        {
            id: '3',
            model: 'L300',
            plate: 'D 7098 IO',
            driver: 'Arif',
            status: 'Trouble',
            address: 'Parramatta Rd',
            coordinates: [-33.8850, 151.1000] as [number, number],
        }
    ];

    const filteredVehicles = activeVehicles.filter(v => 
        v.model.toLowerCase().includes(searchQuery.toLowerCase()) || 
        v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.driver.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedVehicle = activeVehicles.find(v => v.id === selectedVehicleId);
    const mapCenter = selectedVehicle ? selectedVehicle.coordinates : [-33.8688, 151.2093] as [number, number];
    const mapZoom = selectedVehicle ? 15 : 12;

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] animate-fade-in">
            {/* Header */}
            <div className="mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
                    <span>Vehicle Management</span>
                    <span>&raquo;</span>
                    <span className="font-semibold text-slate-900">Live Tracking</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Live Tracking</h1>
            </div>

            {/* Content Split */}
            <div className="flex flex-1 gap-6 min-h-0">
                {/* Sidebar List */}
                <div className="w-80 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 space-y-4">
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <button className="p-2 border border-slate-200 rounded-xl hover:bg-slate-50 text-primary">
                                <Filter className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {filteredVehicles.map(vehicle => (
                            <div 
                                key={vehicle.id} 
                                onClick={() => setSelectedVehicleId(vehicle.id)}
                                className={cn(
                                "p-4 rounded-xl border transition-all cursor-pointer",
                                selectedVehicleId === vehicle.id ? "ring-2 ring-primary border-primary" : "border-slate-100 hover:border-slate-200",
                                vehicle.status === 'On Going' ? "bg-blue-50/30" : ""
                            )}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-900">{vehicle.model}</h3>
                                        <p className="text-xs text-slate-500">{vehicle.plate}</p>
                                    </div>
                                    <span className={cn(
                                        "text-xs font-semibold px-2 py-1 rounded-lg",
                                        vehicle.status === 'On Going' ? "bg-primary text-white" :
                                        vehicle.status === 'Transit' ? "bg-amber-100 text-amber-700" :
                                        "bg-red-100 text-red-700"
                                    )}>
                                        {vehicle.status}
                                    </span>
                                </div>

                                {vehicle.status === 'On Going' && (
                                    <div className="py-3 border-y border-slate-100 my-3">
                                        <div className="flex justify-between text-xs mb-1">
                                            <span className="text-slate-500">Start <span className="font-bold text-slate-900 ml-1">{vehicle.startTime}</span></span>
                                            <span className="text-slate-500">Estimation <span className="font-bold text-slate-900 ml-1">{vehicle.estTime}</span></span>
                                        </div>
                                        {/* Progress bar mock */}
                                        <div className="flex items-center gap-2 mt-2">
                                            <div className="w-2 h-2 rounded-full bg-primary" />
                                            <div className="flex-1 h-0.5 bg-slate-200 relative">
                                                <div className="absolute top-0 left-0 h-full w-1/2 bg-primary" />
                                                <Car className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-primary bg-white p-0.5 rounded-full" />
                                            </div>
                                            <div className="w-2 h-2 rounded-full border-2 border-slate-300" />
                                        </div>
                                        <p className="text-[10px] text-slate-500 text-center mt-2">{vehicle.address}</p>
                                    </div>
                                )}

                                <div className="flex items-center justify-between mt-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                            {vehicle.driver.charAt(0)}
                                        </div>
                                        <span className="text-sm font-medium text-slate-700">{vehicle.driver}</span>
                                    </div>
                                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-primary">
                                            <Phone className="w-4 h-4" />
                                        </button>
                                        <button className="p-1.5 rounded-lg hover:bg-slate-100 text-primary">
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden shadow-inner border border-slate-200 relative z-0">
                    <MapContainer 
                        center={mapCenter} 
                        zoom={mapZoom} 
                        style={{ height: '100%', width: '100%' }}
                    >
                        <MapController center={mapCenter} zoom={mapZoom} />
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                        />
                        {filteredVehicles.map(vehicle => (
                            <Marker 
                                key={vehicle.id} 
                                position={vehicle.coordinates}
                                icon={selectedVehicleId === vehicle.id ? selectedIcon : vehicleIcon}
                                eventHandlers={{
                                    click: () => setSelectedVehicleId(vehicle.id),
                                }}
                            >
                                <Popup>
                                    <div className="font-semibold text-slate-900">{vehicle.model}</div>
                                    <div className="text-xs text-slate-500">{vehicle.plate}</div>
                                    <div className="text-xs font-medium text-primary mt-1">{vehicle.status}</div>
                                </Popup>
                            </Marker>
                        ))}
                        {activeVehicles[0].route && selectedVehicleId === activeVehicles[0].id && (
                            <Polyline 
                                positions={activeVehicles[0].route} 
                                color="#2563EB" 
                                weight={4}
                                opacity={0.7}
                            />
                        )}
                    </MapContainer>
                </div>
            </div>
        </div>
    );
}
