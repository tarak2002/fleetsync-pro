import { useState, useEffect } from 'react';
import { vehiclesApi } from '../lib/api';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
    Car, Calendar, Fuel, Star, MapPin, 
    ChevronLeft, ChevronRight, Clock, ShieldCheck, Search
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

interface Vehicle {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string;
    plate: string;
    weekly_rate: number;
    bond_amount: number;
    fuel_type?: string;
    transmission?: string;
    seats?: number;
    imageUrl?: string;
}

const MOCK_VEHICLES: Vehicle[] = [
    {
        id: 'mock-1',
        make: 'Tesla',
        model: 'Model 3',
        year: 2024,
        color: 'Pearl White',
        plate: 'TSL-001',
        weekly_rate: 350,
        bond_amount: 500,
        fuel_type: 'Electric',
        transmission: 'Automatic',
        seats: 5,
        imageUrl: '/images/fleet/tesla.png'
    },
    {
        id: 'mock-2',
        make: 'Toyota',
        model: 'Camry Hybrid',
        year: 2023,
        color: 'Midnight Black',
        plate: 'CAM-992',
        weekly_rate: 280,
        bond_amount: 400,
        fuel_type: 'Hybrid',
        transmission: 'Automatic',
        seats: 5,
        imageUrl: '/images/fleet/camry.png'
    },
    {
        id: 'mock-3',
        make: 'Kia',
        model: 'Niro EV',
        year: 2024,
        color: 'Steel Grey',
        plate: 'KIA-445',
        weekly_rate: 310,
        bond_amount: 450,
        fuel_type: 'Electric',
        transmission: 'Automatic',
        seats: 5,
        imageUrl: '/images/fleet/niro.png'
    }
];

export function VehicleSelection() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState(1);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [processing, setProcessing] = useState(false);
    
    // Form States
    const [pickupDate, setPickupDate] = useState('');
    const [returnDate, setReturnDate] = useState('');
    const [pickupTime, setPickupTime] = useState('10:00');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    
    const navigate = useNavigate();
    const driverId = localStorage.getItem('driverId');

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            const response = await vehiclesApi.getAvailable();
            // Fallback to premium mock vehicles if database is empty to ensure UI demo works
            if (response.data.length === 0) {
                setVehicles(MOCK_VEHICLES);
            } else {
                setVehicles(response.data);
            }
        } catch (error) {
            console.error('Failed to load vehicles:', error);
            setVehicles(MOCK_VEHICLES);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
        setStep(2);
        
        // Default dates
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        
        setPickupDate(today.toISOString().split('T')[0]);
        setReturnDate(nextWeek.toISOString().split('T')[0]);
    };

    const processPaymentAndBooking = async () => {
        if (!selectedVehicle || !driverId) return;

        setProcessing(true);
        try {
            // 1. Create a PENDING rental first to lock the vehicle
            const rentalResponse = await api.post('/api/rentals', {
                driver_id: driverId,
                vehicle_id: selectedVehicle.id,
                weekly_rate: selectedVehicle.weekly_rate,
                bond_amount: selectedVehicle.bond_amount,
                start_date: pickupDate,
                status: 'PENDING'
            });

            const rentalId = rentalResponse.data.id;

            // 2. Calculate total in cents for Stripe
            const totalAmount = (selectedVehicle.weekly_rate + selectedVehicle.bond_amount + 15) * 100;

            // 3. Create Checkout Session with rentalId in metadata
            const response = await api.post('/api/payments/create-checkout-session', {
                amount: totalAmount,
                metadata: {
                    driverId,
                    rentalId,
                    vehicleId: selectedVehicle.id,
                    type: 'BOND_PAYMENT',
                    weeklyRate: selectedVehicle.weekly_rate,
                    bondAmount: selectedVehicle.bond_amount
                }
            });

            if (response.data.url) {
                window.location.href = response.data.url;
            } else {
                throw new Error('Failed to create checkout session');
            }
        } catch (error: any) {
            console.error('Failed to book vehicle:', error);
            const errorMsg = error.response?.data?.error || error.message || 'Failed to process payment. Please try again.';
            alert(errorMsg);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24">

            <div className="max-w-6xl mx-auto py-4">
                
                {/* Step 1: Browse Vehicles */}
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Hero Section & Filters */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                <div>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">Available Fleet</h2>
                                    <p className="text-slate-500 mt-1">Select a premium vehicle for your next shift.</p>
                                </div>
                                
                                <div className="flex flex-col sm:flex-row gap-4 items-center">
                                    <div className="relative w-full sm:w-72">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input 
                                            placeholder="Search make or model..." 
                                            className="pl-11 h-12 bg-slate-50 border-slate-100 rounded-2xl focus:ring-primary focus:border-primary font-bold"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto hide-scrollbar">
                                        {['All', 'Saver', 'Premium', 'Electric', 'Hybrid'].map((category) => (
                                            <button 
                                                key={category}
                                                onClick={() => setActiveCategory(category)}
                                                className={cn(
                                                    "px-5 py-2 rounded-xl text-xs whitespace-nowrap transition-all duration-300",
                                                    activeCategory === category 
                                                        ? "bg-white text-primary shadow-sm font-black" 
                                                        : "font-bold text-slate-500 hover:text-slate-900"
                                                )}
                                            >
                                                {category}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {vehicles
                                .filter(v => {
                                    const matchesSearch = v.make.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                                        v.model.toLowerCase().includes(searchQuery.toLowerCase());
                                    const matchesCategory = activeCategory === 'All' || 
                                                           (activeCategory === 'Electric' && v.fuel_type === 'Electric') ||
                                                           (activeCategory === 'Hybrid' && v.fuel_type === 'Hybrid') ||
                                                           (activeCategory === 'Premium' && v.weekly_rate > 500) ||
                                                           (activeCategory === 'Saver' && v.weekly_rate <= 400);
                                    return matchesSearch && matchesCategory;
                                })
                                .map((vehicle) => (
                                <div key={vehicle.id} className="bg-white rounded-[2.5rem] p-5 border border-slate-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-500 group overflow-hidden flex flex-col">
                                    {/* Image Section */}
                                    <div className="w-full aspect-[16/9] rounded-3xl overflow-hidden relative bg-slate-50 mb-6">
                                        {vehicle.imageUrl ? (
                                            <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-slate-100"><Car className="w-16 h-16 text-slate-300" /></div>
                                        )}
                                        <div className="absolute top-4 left-4 flex gap-2">
                                            <Badge className="bg-white/95 text-slate-900 border-0 shadow-lg backdrop-blur-md px-4 py-1.5 font-bold rounded-full">
                                                <Star className="w-4 h-4 text-amber-500 mr-2 fill-amber-500" />
                                                4.9
                                            </Badge>
                                        </div>
                                        <div className="absolute bottom-4 right-4">
                                            <Badge className="bg-primary text-white border-0 shadow-lg px-5 py-2 font-black text-xl rounded-2xl">
                                                ${vehicle.weekly_rate}<span className="text-[10px] font-normal opacity-80 ml-1">/WK</span>
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex-1 flex flex-col px-2">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight">{vehicle.make} {vehicle.model}</h3>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-slate-500 font-bold text-sm">{vehicle.year}</span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                                    <span className="text-slate-500 font-bold text-sm">{vehicle.color}</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="border-slate-200 text-slate-500 font-mono font-bold px-3 py-1 rounded-lg">
                                                {vehicle.plate}
                                            </Badge>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mb-8">
                                            <div className="bg-slate-50/50 rounded-[1.25rem] p-4 flex flex-col items-center gap-1.5 border border-slate-100">
                                                <Fuel className="w-5 h-5 text-primary" />
                                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Engine</span>
                                                <span className="text-xs font-black text-slate-700">{vehicle.fuel_type || 'Hybrid'}</span>
                                            </div>
                                            <div className="bg-slate-50/50 rounded-[1.25rem] p-4 flex flex-col items-center gap-1.5 border border-slate-100">
                                                <Car className="w-5 h-5 text-primary" />
                                                <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Shift</span>
                                                <span className="text-xs font-black text-slate-700">{vehicle.transmission || 'Auto'}</span>
                                            </div>
                                            <div className="bg-emerald-50 rounded-[1.25rem] p-4 flex flex-col items-center gap-1.5 border border-emerald-100">
                                                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                                                <span className="text-[10px] uppercase font-black text-emerald-400 tracking-wider">Safety</span>
                                                <span className="text-xs font-black text-emerald-700">Insured</span>
                                            </div>
                                        </div>

                                        <Button 
                                            className="w-full bg-primary hover:bg-blue-600 text-white h-16 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-primary/30 mt-auto group-hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3"
                                            onClick={() => handleSelectVehicle(vehicle)}
                                        >
                                            Instant Booking
                                            <ChevronRight className="w-6 h-6" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Booking Details */}
                {step === 2 && selectedVehicle && (
                    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Back Button and Progress */}
                        <div className="flex items-center gap-4 mb-2">
                            <Button variant="ghost" size="icon" onClick={() => setStep(1)} className="rounded-full bg-white shadow-sm border border-slate-100">
                                <ChevronLeft className="w-6 h-6" />
                            </Button>
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">Finalize Booking</h3>
                                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Step 2 of 4</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                {/* Booking Form */}
                                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
                                    <div>
                                        <Label className="text-primary text-xs font-black uppercase tracking-[0.2em] mb-8 block">Rental Duration</Label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <div className="space-y-3">
                                                <Label className="text-slate-600 font-bold ml-1">Pick Up Date</Label>
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <Input type="date" value={pickupDate} onChange={e => setPickupDate(e.target.value)} className="pl-12 bg-slate-50 border-slate-100 rounded-2xl h-14 focus:ring-primary focus:border-primary text-lg font-bold" />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-slate-600 font-bold ml-1">Pick Up Time</Label>
                                                <div className="relative">
                                                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                    <Input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="pl-12 bg-slate-50 border-slate-100 rounded-2xl h-14 focus:ring-primary focus:border-primary text-lg font-bold" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-8 space-y-3">
                                            <Label className="text-slate-600 font-bold ml-1">Estimated Return Date</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                                <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="pl-12 bg-slate-50 border-slate-100 rounded-2xl h-14 focus:ring-primary focus:border-primary text-lg font-bold" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-8">
                                        <Label className="text-primary text-xs font-black uppercase tracking-[0.2em] mb-8 block">Collection Point</Label>
                                        <div className="bg-blue-50/50 rounded-[2rem] p-6 flex items-start gap-5 border border-blue-100/50">
                                            <div className="p-4 bg-white rounded-2xl shadow-sm">
                                                <MapPin className="w-6 h-6 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 text-xl">Sydney Main Depot</p>
                                                <p className="text-slate-500 font-bold mt-1">123 Fleet Street, Alexandria, NSW 2015</p>
                                                <p className="text-primary font-black text-xs mt-3 uppercase tracking-widest flex items-center gap-2">
                                                    <Clock className="w-3.5 h-3.5" /> Open: 08:00 - 20:00
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* Vehicle Snippet */}
                                <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
                                    <div className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-50 mb-4 border border-slate-100">
                                        {selectedVehicle.imageUrl && <img src={selectedVehicle.imageUrl} className="w-full h-full object-cover" />}
                                    </div>
                                    <Badge className="bg-primary/10 text-primary border-0 mb-2 font-black text-[10px] uppercase tracking-widest">Selected Unit</Badge>
                                    <h3 className="text-2xl font-black text-slate-900 leading-tight">{selectedVehicle.make} {selectedVehicle.model}</h3>
                                    <div className="flex items-center gap-2 mt-2 mb-6">
                                        <span className="text-slate-500 font-bold text-sm">{selectedVehicle.year}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                        <span className="text-slate-500 font-bold text-sm">{selectedVehicle.color}</span>
                                    </div>
                                    
                                    <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-bold">Weekly Rate</span>
                                            <span className="text-slate-900 font-black">${selectedVehicle.weekly_rate}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-bold">Security Bond</span>
                                            <span className="text-slate-900 font-black">${selectedVehicle.bond_amount}</span>
                                        </div>
                                        <div className="border-t border-slate-200 pt-4 flex justify-between items-end">
                                            <span className="text-slate-500 font-bold">Due Today</span>
                                            <span className="text-2xl font-black text-primary">${selectedVehicle.weekly_rate + selectedVehicle.bond_amount + 15}</span>
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    onClick={processPaymentAndBooking}
                                    disabled={processing}
                                    className="w-full bg-slate-900 hover:bg-black text-white h-16 rounded-[1.5rem] text-xl font-black shadow-2xl shadow-slate-900/30 transition-all active:scale-95 flex items-center justify-center gap-3"
                                >
                                    {processing ? (
                                        <>
                                            <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Pay & Book Now
                                            <ChevronRight className="w-6 h-6" />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}






            </div>

        </div>
    );
}
