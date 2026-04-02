import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car, FileText, Shield, AlertTriangle, Copy, Check, Phone, Camera, ChevronRight, Clock, X, Video, Sparkles, User, CheckCircle2, Download, LogOut, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import { useDispatch } from 'react-redux';
import { logout } from '../store';
import { driverDashboardApi, api, authApi, API_BASE_URL } from '../lib/api';

interface VehicleInfo {
    id: string;
    make: string;
    model: string;
    plate: string;
    vin: string;
    color: string;
    year: number;
    imageUrl: string;
}

interface Documents {
    regoUrl: string;
    ctpUrl: string;
    pinkSlipUrl: string;
    rentalAgreementUrl: string;
}

interface DashboardData {
    has_active_rental: boolean;
    rental_id?: string;
    vehicle?: VehicleInfo;
    documents?: Documents;
    shift_id?: string;
    shift_status?: string;
    started_at?: string;
    last_condition_report?: string;
}

interface DocumentData {
    title: string;
    type: string;
    issueDate?: string;
    expiryDate?: string;
    validUntil?: string;
    inspectionDate?: string;
    startDate?: string;
    status?: string;
    details: Record<string, any>;
    terms?: string[];
    downloadUrl?: string;
}

interface MediaFile {
    id: string;
    type: 'photo' | 'video';
    name: string;
    preview: string;
    file: File;
}

export function DriverOperations() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [startingShift, setStartingShift] = useState(false);
    const [showAccidentWizard, setShowAccidentWizard] = useState(false);
    const [accidentStep, setAccidentStep] = useState(1);
    const navigate = useNavigate();

    const [showDocumentModal, setShowDocumentModal] = useState(false);
    const [currentDocument, setCurrentDocument] = useState<DocumentData | null>(null);
    const [loadingDocument, setLoadingDocument] = useState(false);

    const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [accidentData, setAccidentData] = useState({
        isSafe: true,
        emergencyCalled: false,
        description: '',
        thirdPartyName: '',
        thirdPartyPhone: '',
        thirdPartyPlate: '',
        location: '',
    });

    const driverId = localStorage.getItem('driverId') || '';
    const mediaFilesRef = useRef<MediaFile[]>([]);
    const dispatch = useDispatch();

    const handleLogout = () => {
        dispatch(logout());
        localStorage.removeItem('driverId');
        navigate('/login');
    };

    useEffect(() => {
        mediaFilesRef.current = mediaFiles;
    }, [mediaFiles]);

    useEffect(() => {
        loadDashboard();
        return () => {
            mediaFilesRef.current.forEach(file => URL.revokeObjectURL(file.preview));
        };
    }, []);

    const loadDashboard = async () => {
        let currentDriverId = driverId;

        if (!currentDriverId) {
            try {
                // Try to recover driver ID from phantom session
                console.log('Driver ID missing, attempting to recover from session...');
                const meResponse = await authApi.me();
                if (meResponse.data?.driver?.id) {
                    currentDriverId = meResponse.data.driver.id;
                    localStorage.setItem('driverId', currentDriverId);
                    console.log('Driver ID recovered:', currentDriverId);
                } else {
                    console.error('No driver profile linked to this user');
                    setLoading(false);
                    return;
                }
            } catch (authError) {
                console.error('Failed to recover session:', authError);
                setLoading(false);
                return;
            }
        }

        try {
            const [dataRes, invoicesRes] = await Promise.all([
                driverDashboardApi.getActiveRental(currentDriverId),
                api.get('/api/invoices', { params: { driver_id: currentDriverId } })
            ]);
            setData(dataRes.data);
            setInvoices(invoicesRes.data);
        } catch (err) {
            console.error('Failed to load dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyVin = () => {
        if (data?.vehicle?.vin) {
            navigator.clipboard.writeText(data.vehicle.vin);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleStartShift = async () => {
        if (!data?.shift_id || !data?.vehicle || !driverId) return;
        setStartingShift(true);
        try {
            await driverDashboardApi.startShift({
                shift_id: data!.shift_id!,
                vehicle_id: data!.vehicle!.id,
                driver_id: driverId,
                damage_markers: [],
                notes: 'Vehicle condition verified',
                photos: []
            });
            loadDashboard();
        } catch (err) {
            alert('Failed to start shift');
        } finally {
            setStartingShift(false);
        }
    };

    const handleReturnVehicle = async () => {
        if (!data?.rental_id) return;
        if (confirm('Are you sure you want to request vehicle return?')) {
            try {
                await driverDashboardApi.returnVehicle({ rental_id: data!.rental_id!, shift_id: data!.shift_id });
                alert('Return request submitted. Please return the vehicle to the depot.');
                loadDashboard();
            } catch (err) {
                alert('Failed to submit return request');
            }
        }
    };

    const handlePayInvoice = async (invoiceId: string) => {
        setPayingInvoiceId(invoiceId);
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        try {
            await api.post(`/api/invoices/${invoiceId}/pay`);
            alert('Payment Successful! Thank you.');
            loadDashboard();
        } catch (err) {
            alert('Payment failed. Please try again.');
        } finally {
            setPayingInvoiceId(null);
        }
    };

    const handleEmergencyCall = () => { window.location.href = 'tel:000'; };

    const openDocument = async (docType: 'rego' | 'ctp' | 'pink-slip' | 'rental-agreement') => {
        if (!data?.vehicle) return;
        if (docType === 'rental-agreement' && !data?.rental_id) {
            alert('Rental agreement not available');
            return;
        }

        setLoadingDocument(true);
        setShowDocumentModal(true);
        try {
            const url = docType === 'rental-agreement'
                ? `/api/documents/rental-agreement/${data.rental_id}`
                : `/api/documents/${docType}/${data.vehicle.id}`;
            const response = await api.get(url);
            setCurrentDocument(response.data);
        } catch (err) {
            setCurrentDocument(null);
        } finally {
            setLoadingDocument(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        const newMediaFiles: MediaFile[] = [];
        Array.from(files).forEach(file => {
            const isVideo = file.type.startsWith('video/');
            const isImage = file.type.startsWith('image/');
            if (isVideo || isImage) {
                newMediaFiles.push({
                    id: Math.random().toString(36).substr(2, 9),
                    type: isVideo ? 'video' : 'photo',
                    name: file.name,
                    preview: URL.createObjectURL(file),
                    file
                });
            }
        });
        setMediaFiles(prev => [...prev, ...newMediaFiles]);
        e.target.value = '';
    };

    const removeMedia = (id: string) => {
        setMediaFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file) URL.revokeObjectURL(file.preview);
            return prev.filter(f => f.id !== id);
        });
    };

    const handleAccidentSubmit = async () => {
        if (!data?.rental_id || !data?.vehicle || !driverId) return;
        try {
            await driverDashboardApi.reportAccident({
                rental_id: data!.rental_id!,
                driver_id: driverId,
                vehicle_id: data!.vehicle!.id,
                ...accidentData,
                scene_photos: mediaFiles.map(f => f.name),
                occurred_at: new Date().toISOString()
            });
            alert('Accident report submitted successfully');
            setShowAccidentWizard(false);
            setAccidentStep(1);

            // Cleanup object URLs to prevent memory leaks
            mediaFilesRef.current.forEach(file => URL.revokeObjectURL(file.preview));
            mediaFilesRef.current = [];
            setMediaFiles([]);

            setAccidentData({ isSafe: true, emergencyCalled: false, description: '', thirdPartyName: '', thirdPartyPhone: '', thirdPartyPlate: '', location: '' });
        } catch (err) {
            alert('Failed to submit report. Data saved locally.');
            localStorage.setItem('offlineAccidentReports', JSON.stringify([
                ...JSON.parse(localStorage.getItem('offlineAccidentReports') || '[]'),
                { ...accidentData, rental_id: data?.rental_id, driver_id: driverId, vehicle_id: data?.vehicle?.id, occurred_at: new Date().toISOString() }
            ]));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center animate-pulse">
                        <Car className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-slate-500">Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    if (!data?.has_active_rental) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
                <div className="text-center bg-white rounded-3xl shadow-xl shadow-indigo-100 p-8 max-w-sm">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                        <Car className="w-10 h-10 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">No Active Rental</h2>
                    <p className="text-slate-500 mb-6">You don't have an assigned vehicle right now. Browse our fleet to get started.</p>
                    <Button
                        onClick={() => navigate('/dashboard/select-vehicle')}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl py-6"
                    >
                        Browse Vehicles
                    </Button>
                </div>
            </div>
        );
    }

    const vehicle = data.vehicle!;
    const currentTime = new Date().toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
    const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-28">
            {/* Premium Header with Glassmorphism */}
            <div className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iYSIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBwYXR0ZXJuVHJhbnNmb3JtPSJyb3RhdGUoNDUpIj48cGF0aCBkPSJNLTEwIDMwaDYwdjJoLTYweiIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNhKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
                <div className="relative px-6 pt-12 pb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="text-indigo-200 text-sm">{greeting}</p>
                            <h1 className="text-2xl font-bold text-white">Driver Dashboard</h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="hidden sm:flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <Sparkles className="w-4 h-4 text-yellow-300" />
                                <span className="text-white text-sm font-medium">{currentTime}</span>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={handleLogout}
                                className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 border-0 rounded-xl w-10 h-10"
                            >
                                <LogOut className="w-5 h-5" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-4 -mt-4 space-y-5 max-w-md mx-auto">
                {/* My Vehicle Card - Premium Glass Design */}
                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 overflow-hidden">
                    <div className="relative h-44 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
                        <div className="absolute top-4 right-4">
                            <Badge className="bg-emerald-500 text-white border-0 shadow-lg shadow-emerald-200 px-3 py-1">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Active
                            </Badge>
                        </div>
                        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <Car className="w-16 h-16 text-indigo-500" />
                        </div>
                    </div>

                    <div className="p-5">
                        <div className="text-center mb-4">
                            <h2 className="text-2xl font-bold text-slate-800">{vehicle.make} {vehicle.model}</h2>
                            <p className="text-slate-500">{vehicle.year} • {vehicle.color}</p>
                        </div>

                        {/* Large Plate Display */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl p-5 text-center mb-4 shadow-lg shadow-indigo-200">
                            <p className="text-xs text-indigo-200 mb-1 uppercase tracking-wider">License Plate</p>
                            <span className="text-4xl font-black tracking-[0.2em]">{vehicle.plate}</span>
                        </div>

                        {/* VIN with Copy */}
                        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 mb-4">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wide">VIN Number</p>
                                <code className="text-sm text-slate-700 font-mono">{vehicle.vin}</code>
                            </div>
                            <button
                                onClick={handleCopyVin}
                                className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
                            >
                                {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5 text-slate-400" />}
                            </button>
                        </div>

                        <Button variant="outline" className="w-full rounded-xl h-12 border-2" onClick={handleReturnVehicle}>
                            Return Vehicle
                        </Button>
                    </div>
                </div>

                {/* My Invoices / Payments Section - NEW */}
                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-5">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-200">
                                <DollarSign className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">Payments</h3>
                                <p className="text-xs text-slate-500">Your rental billing</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="text-indigo-600 border-indigo-100">Weekly</Badge>
                    </div>

                    <div className="space-y-3">
                        {invoices.filter(i => i.status === 'PENDING').map(invoice => (
                            <div key={invoice.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <p className="text-xs text-slate-400 uppercase font-semibold">Outstanding Balance</p>
                                        <p className="text-2xl font-bold text-slate-900">${invoice.amount}</p>
                                    </div>
                                    <Badge className="bg-amber-100 text-amber-700 border-0">Due in 2 days</Badge>
                                </div>
                                <Button 
                                    onClick={() => handlePayInvoice(invoice.id)}
                                    disabled={payingInvoiceId === invoice.id}
                                    className="w-full bg-slate-900 hover:bg-black text-white rounded-xl h-12 font-bold"
                                >
                                    {payingInvoiceId === invoice.id ? (
                                        <div className="flex items-center gap-2">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Processing...
                                        </div>
                                    ) : (
                                        'Pay Now'
                                    )}
                                </Button>
                            </div>
                        ))}
                        {invoices.filter(i => i.status === 'PENDING').length === 0 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                    <Check className="w-5 h-5 text-white" />
                                </div>
                                <p className="text-emerald-800 font-medium text-sm">Account up to date</p>
                            </div>
                        )}
                        
                        <div className="pt-2">
                            <p className="text-xs text-slate-400 font-medium mb-2 px-1">PAST INVOICES</p>
                            {invoices.filter(i => i.status === 'PAID').slice(0, 2).map(invoice => (
                                <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 px-1">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">{new Date(invoice.due_date).toLocaleDateString('en-AU', { month: 'short', day: 'numeric' })}</p>
                                        <p className="text-[10px] text-slate-400">Paid on {new Date(invoice.updated_at || invoice.due_date).toLocaleDateString()}</p>
                                    </div>
                                    <p className="text-sm font-bold text-slate-900">${invoice.amount}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Digital Glovebox - Beautiful Card Grid */}
                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-200">
                            <FileText className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Digital Glovebox</h3>
                            <p className="text-xs text-slate-500">Tap to view documents</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => openDocument('rego')}
                            className="group p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-3 shadow-lg shadow-blue-200 group-hover:scale-110 transition-transform">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-semibold text-slate-700">Rego Paper</p>
                            <p className="text-xs text-slate-500">Registration</p>
                        </button>

                        <button
                            onClick={() => openDocument('ctp')}
                            className="group p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-3 shadow-lg shadow-emerald-200 group-hover:scale-110 transition-transform">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-semibold text-slate-700">CTP Slip</p>
                            <p className="text-xs text-slate-500">Insurance</p>
                        </button>

                        <button
                            onClick={() => openDocument('pink-slip')}
                            className="group p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl hover:shadow-lg hover:shadow-pink-100 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center mb-3 shadow-lg shadow-pink-200 group-hover:scale-110 transition-transform">
                                <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-semibold text-slate-700">Pink Slip</p>
                            <p className="text-xs text-slate-500">Safety Check</p>
                        </button>

                        <button
                            onClick={() => openDocument('rental-agreement')}
                            className="group p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl hover:shadow-lg hover:shadow-violet-100 transition-all duration-300 hover:-translate-y-1"
                        >
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg shadow-violet-200 group-hover:scale-110 transition-transform">
                                <User className="w-6 h-6 text-white" />
                            </div>
                            <p className="font-semibold text-slate-700">Agreement</p>
                            <p className="text-xs text-slate-500">Rental Contract</p>
                        </button>
                    </div>
                </div>

                {/* Shift Status Card */}
                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-200">
                            <Clock className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Shift Status</h3>
                            <p className="text-xs text-slate-500">
                                {data.shift_status === 'NOT_STARTED' ? 'Ready to start' : 'Currently active'}
                            </p>
                        </div>
                    </div>

                    {data.shift_status === 'NOT_STARTED' ? (
                        <button
                            onClick={handleStartShift}
                            disabled={startingShift}
                            className="w-full py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all duration-300 hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {startingShift ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Sparkles className="w-5 h-5" />
                                    Start Your Shift
                                    <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    ) : (
                        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                                <Check className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <p className="font-bold text-emerald-700">Shift Active</p>
                                <p className="text-sm text-emerald-600">
                                    {data.last_condition_report
                                        ? `Verified at ${new Date(data.last_condition_report).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}`
                                        : 'Condition check complete'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Emergency Button - Premium Design */}
            <div className="fixed bottom-6 left-4 right-4 max-w-md mx-auto">
                <button
                    onClick={() => setShowAccidentWizard(true)}
                    className="w-full py-4 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-2xl font-bold shadow-xl shadow-red-200 hover:shadow-2xl hover:shadow-red-300 transition-all duration-300 flex items-center justify-center gap-2"
                >
                    <AlertTriangle className="w-5 h-5" />
                    Report Accident / Emergency
                </button>
            </div>

            {/* Document Viewer Modal */}
            <Dialog open={showDocumentModal} onOpenChange={setShowDocumentModal}>
                <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            <span>{currentDocument?.title || 'Document'}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {loadingDocument ? (
                        <div className="flex justify-center py-12">
                            <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        </div>
                    ) : currentDocument ? (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4">
                                <p className="text-sm font-medium text-indigo-600">{currentDocument.type}</p>
                                <div className="mt-3 grid grid-cols-2 gap-3">
                                    {currentDocument.issueDate && (
                                        <div className="bg-white rounded-xl p-3">
                                            <p className="text-xs text-slate-400">Issue Date</p>
                                            <p className="font-semibold text-slate-700">{currentDocument.issueDate}</p>
                                        </div>
                                    )}
                                    {(currentDocument.expiryDate || currentDocument.validUntil) && (
                                        <div className="bg-white rounded-xl p-3">
                                            <p className="text-xs text-slate-400">Expiry</p>
                                            <p className="font-semibold text-emerald-600">{currentDocument.expiryDate || currentDocument.validUntil}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4">
                                <h4 className="font-semibold text-slate-800 mb-3">Details</h4>
                                <div className="space-y-2">
                                    {Object.entries(currentDocument.details).map(([key, value]) => {
                                        if (Array.isArray(value)) {
                                            return (
                                                <div key={key} className="space-y-2">
                                                    <p className="text-sm font-medium text-slate-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {value.map((item: any, idx: number) => (
                                                            <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-2">
                                                                <span className="text-sm">{item.name}</span>
                                                                <Badge className={item.status === 'PASS' ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                                                                    {item.status}
                                                                </Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <div key={key} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                                                <span className="text-sm text-slate-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                <span className="text-sm font-medium text-slate-700 text-right max-w-[55%]">{String(value)}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {currentDocument.terms && (
                                <div className="bg-amber-50 rounded-2xl p-4">
                                    <h4 className="font-semibold text-amber-800 mb-2">Terms & Conditions</h4>
                                    <ul className="space-y-1">
                                        {currentDocument.terms.map((term, idx) => (
                                            <li key={idx} className="text-sm text-amber-700 flex gap-2">
                                                <span>•</span>
                                                <span>{term}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {currentDocument.downloadUrl && (
                                <Button
                                    className="w-full mt-4 gap-2"
                                    onClick={() => {
                                        const url = currentDocument.downloadUrl?.startsWith('http')
                                            ? currentDocument.downloadUrl
                                            : `${API_BASE_URL}${currentDocument.downloadUrl}`;
                                        window.open(url, '_blank');
                                    }}
                                >
                                    <Download className="w-4 h-4" />
                                    Download Document
                                </Button>
                            )}
                        </div>
                    ) : (
                        <p className="text-center text-slate-500 py-8">Document not available</p>
                    )}
                </DialogContent>
            </Dialog>

            {/* Accident Wizard Modal */}
            <Dialog open={showAccidentWizard} onOpenChange={setShowAccidentWizard}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
                                <AlertTriangle className="w-5 h-5 text-white" />
                            </div>
                            <span>
                                {accidentStep === 1 && 'Safety First'}
                                {accidentStep === 2 && 'Capture Evidence'}
                                {accidentStep === 3 && 'Other Party Details'}
                            </span>
                        </DialogTitle>
                    </DialogHeader>

                    {/* Step Indicator */}
                    <div className="flex gap-2 mb-4">
                        {[1, 2, 3].map(step => (
                            <div
                                key={step}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${step <= accidentStep ? 'bg-gradient-to-r from-red-500 to-rose-600' : 'bg-slate-200'
                                    }`}
                            />
                        ))}
                    </div>

                    {accidentStep === 1 && (
                        <div className="space-y-4">
                            <div className="bg-red-50 rounded-2xl p-4 text-center">
                                <Phone className="w-12 h-12 text-red-500 mx-auto mb-2" />
                                <p className="text-red-700 font-medium">Are you and others safe?</p>
                            </div>
                            <Button
                                variant="destructive"
                                className="w-full h-14 rounded-xl text-lg"
                                onClick={handleEmergencyCall}
                            >
                                <Phone className="w-5 h-5 mr-2" />
                                Call 000 (Emergency)
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-12 rounded-xl"
                                onClick={() => setAccidentStep(2)}
                            >
                                I'm safe, continue report
                            </Button>
                        </div>
                    )}

                    {accidentStep === 2 && (
                        <div className="space-y-4">
                            <p className="text-slate-600 text-sm">Capture photos and videos of the scene</p>

                            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4">
                                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} className="hidden" />

                                <div className="flex gap-2 justify-center">
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 rounded-xl">
                                        <Camera className="w-4 h-4" />
                                        Photos
                                    </Button>
                                    <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2 rounded-xl">
                                        <Video className="w-4 h-4" />
                                        Videos
                                    </Button>
                                </div>

                                {mediaFiles.length > 0 && (
                                    <div className="mt-4 grid grid-cols-3 gap-2">
                                        {mediaFiles.map(media => (
                                            <div key={media.id} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
                                                {media.type === 'photo' ? (
                                                    <img src={media.preview} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                                        <Video className="w-6 h-6 text-white" />
                                                    </div>
                                                )}
                                                <button onClick={() => removeMedia(media.id)} className="absolute top-1 right-1 p-1 bg-red-500 rounded-full">
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Location</Label>
                                <Input
                                    placeholder="Where did this happen?"
                                    value={accidentData.location}
                                    onChange={(e) => setAccidentData({ ...accidentData, location: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700 font-semibold">What happened?</Label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-xl p-3 min-h-20 text-sm font-sans text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Describe the incident..."
                                    value={accidentData.description}
                                    onChange={(e) => setAccidentData({ ...accidentData, description: e.target.value })}
                                />
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAccidentStep(1)} className="rounded-xl">Back</Button>
                                <Button onClick={() => setAccidentStep(3)} className="rounded-xl">Next</Button>
                            </DialogFooter>
                        </div>
                    )}

                    {accidentStep === 3 && (
                        <div className="space-y-4">
                            <p className="text-slate-600 text-sm">Enter details of any other party involved</p>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input placeholder="Other party's name" value={accidentData.thirdPartyName} onChange={(e) => setAccidentData({ ...accidentData, thirdPartyName: e.target.value })} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input placeholder="Their phone number" value={accidentData.thirdPartyPhone} onChange={(e) => setAccidentData({ ...accidentData, thirdPartyPhone: e.target.value })} className="rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Vehicle Plate</Label>
                                    <Input placeholder="Their license plate" value={accidentData.thirdPartyPlate} onChange={(e) => setAccidentData({ ...accidentData, thirdPartyPlate: e.target.value })} className="rounded-xl" />
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-4">
                                <p className="font-medium text-slate-700 mb-2">Report Summary</p>
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p>📍 {accidentData.location || 'No location'}</p>
                                    <p>📷 {mediaFiles.length} file(s) attached</p>
                                    <p>📝 {accidentData.description ? 'Description added' : 'No description'}</p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setAccidentStep(2)} className="rounded-xl">Back</Button>
                                <Button variant="destructive" onClick={handleAccidentSubmit} className="rounded-xl">Submit Report</Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
