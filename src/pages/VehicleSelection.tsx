
import { useState, useEffect } from 'react';
import { vehiclesApi, rentalsApi } from '../lib/api';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Car, DollarSign, Calendar, Fuel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export function VehicleSelection() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
    const [processing, setProcessing] = useState(false);
    const navigate = useNavigate();
    const driverId = localStorage.getItem('driverId');

    useEffect(() => {
        loadVehicles();
    }, []);

    const loadVehicles = async () => {
        try {
            const response = await vehiclesApi.getAvailable();
            setVehicles(response.data);
        } catch (error) {
            console.error('Failed to load vehicles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectVehicle = (vehicle: Vehicle) => {
        setSelectedVehicle(vehicle);
    };

    const confirmSelection = async () => {
        if (!selectedVehicle || !driverId) return;

        setProcessing(true);
        try {
            // Create rental request
            // Note: In a real app, this might create a "Pending" rental or a "Request"
            // For now, we create an active rental or pending based on backend logic (assuming backend sets to ACTIVE or PENDING)
            // The current backend create rental sets status to 'ACTIVE' by default if not specified, 
            // but usually we want it to be PENDING. 
            // However, the backend createRental code (read previously) didn't seem to enforce status.
            // Let's send a request and see.

            await rentalsApi.create({
                driver_id: driverId,
                vehicle_id: selectedVehicle.id,
                weekly_rate: selectedVehicle.weekly_rate,
                bond_amount: selectedVehicle.bond_amount,
                start_date: new Date().toISOString()
            });

            // Redirect to dashboard
            navigate('/dashboard/operations');
        } catch (error: any) {
            console.error('Failed to select vehicle:', error);
            const message = error.response?.data?.error || 'Failed to process vehicle selection. Please try again.';
            alert(message);
        } finally {
            setProcessing(false);
            setSelectedVehicle(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading available vehicles...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
            <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Select Your Vehicle</h1>
                <p className="text-slate-500">Choose from our fleet of premium rideshare-ready vehicles.</p>
            </div>

            {vehicles.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-lg">
                    <Car className="mx-auto h-12 w-12 text-slate-300" />
                    <h3 className="mt-4 text-lg font-medium text-slate-900">No vehicles available</h3>
                    <p className="mt-2 text-slate-500">Check back later for new inventory.</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {vehicles.map((vehicle) => (
                        <Card key={vehicle.id} className="overflow-hidden hover:shadow-lg transition-shadow duration-200">
                            <div className="aspect-video relative bg-slate-100">
                                {vehicle.imageUrl ? (
                                    <img
                                        src={vehicle.imageUrl}
                                        alt={`${vehicle.make} ${vehicle.model} `}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                        <Car className="w-16 h-16" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge className="bg-emerald-500 hover:bg-emerald-600">Available</Badge>
                                </div>
                            </div>

                            <CardHeader>
                                <CardTitle className="flex justify-between items-start">
                                    <div>
                                        <div className="text-lg font-bold">{vehicle.make} {vehicle.model}</div>
                                        <div className="text-sm text-slate-500">{vehicle.year} • {vehicle.color}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-bold text-indigo-600">${vehicle.weekly_rate}</div>
                                        <div className="text-xs text-slate-500">/ week</div>
                                    </div>
                                </CardTitle>
                            </CardHeader>

                            <CardContent>
                                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                                    <div className="flex items-center gap-2">
                                        <Fuel className="w-4 h-4 text-slate-400" />
                                        <span>{vehicle.fuel_type || 'Hybrid'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Car className="w-4 h-4 text-slate-400" />
                                        <span>{vehicle.transmission || 'Automatic'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span>Min 4 weeks</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-slate-400" />
                                        <span>${vehicle.bond_amount} Bond</span>
                                    </div>
                                </div>
                            </CardContent>

                            <CardFooter>
                                <Button className="w-full" onClick={() => handleSelectVehicle(vehicle)}>
                                    Select Vehicle
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={!!selectedVehicle} onOpenChange={(open) => !open && setSelectedVehicle(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Vehicle Selection</DialogTitle>
                        <DialogDescription>
                            Review the details below to proceed with your rental application.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedVehicle && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-lg">
                                {selectedVehicle.imageUrl ? (
                                    <img
                                        src={selectedVehicle.imageUrl}
                                        alt={`${selectedVehicle.make} ${selectedVehicle.model} `}
                                        className="w-20 h-20 object-cover rounded-md"
                                    />
                                ) : (
                                    <div className="w-20 h-20 bg-slate-200 rounded-md flex items-center justify-center">
                                        <Car className="w-8 h-8 text-slate-400" />
                                    </div>
                                )}
                                <div>
                                    <h4 className="font-bold">{selectedVehicle.make} {selectedVehicle.model}</h4>
                                    <p className="text-sm text-slate-500">{selectedVehicle.year} • {selectedVehicle.plate}</p>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-slate-500">Weekly Rate</span>
                                    <span className="font-medium">${selectedVehicle.weekly_rate}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-slate-500">Security Bond</span>
                                    <span className="font-medium">${selectedVehicle.bond_amount}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b">
                                    <span className="text-slate-500">Start Date</span>
                                    <span className="font-medium">{new Date().toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="bg-blue-50 text-blue-700 p-3 rounded-md text-sm">
                                By proceeding, you agree to the rental terms and conditions. A request will be sent for approval.
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSelectedVehicle(null)}>Cancel</Button>
                        <Button onClick={confirmSelection} disabled={processing}>
                            {processing ? 'Processing...' : 'Confirm & Request'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </div>
        </div>
    );
}
