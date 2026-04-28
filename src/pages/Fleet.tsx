import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Plus, FileText, Upload, Trash2, Download, Building2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from '../components/ui/dialog';
import { fetchVehicles } from '../store';
import type { RootState, AppDispatch } from '../store';
import { vehiclesApi, businessApi } from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, cn } from '../lib/utils';

interface Business {
    id: string;
    name: string;
    abn: string | null;
}

interface VehicleDoc {
    id: string;
    name: string;
    doc_type: string;
    file_name: string | null;
    expiry_date: string | null;
    created_at: string;
}

function ComplianceBadge({ status }: { status: 'GREEN' | 'AMBER' | 'RED' }) {
    const colors = {
        GREEN: 'bg-emerald-500',
        AMBER: 'bg-amber-500',
        RED: 'bg-red-500',
    };
    return (
        <span className={cn('w-3 h-3 rounded-full inline-block', colors[status])}
            title={status === 'GREEN' ? '> 30 days' : status === 'AMBER' ? '< 30 days' : 'Expired'}
        />
    );
}

function getDefaultExpiry() {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
}

const DOC_TYPES = [
    { value: 'REGO', label: 'Registration (REGO)' },
    { value: 'CTP', label: 'CTP Insurance' },
    { value: 'PINK_SLIP', label: 'Pink Slip (Safety)' },
    { value: 'INSURANCE', label: 'Comprehensive Insurance' },
    { value: 'RENTAL_AGREEMENT', label: 'Rental Agreement' },
    { value: 'SERVICE_RECORD', label: 'Service Record' },
    { value: 'OTHER', label: 'Other' },
];

export function FleetPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { vehicles, loading } = useSelector((state: RootState) => state.fleet);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [businesses, setBusinesses] = useState<Business[]>([]);

    // Doc management modal state
    const [docsVehicleId, setDocsVehicleId] = useState<string | null>(null);
    const [docsVehiclePlate, setDocsVehiclePlate] = useState<string>('');
    const [vehicleDocs, setVehicleDocs] = useState<VehicleDoc[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [uploadForm, setUploadForm] = useState({ name: '', doc_type: 'OTHER', expiry_date: '', notes: '' });
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        vin: '',
        plate: '',
        make: '',
        model: '',
        year: new Date().getFullYear().toString(),
        color: '',
        regoExpiry: getDefaultExpiry(),
        ctpExpiry: getDefaultExpiry(),
        pinkSlipExpiry: getDefaultExpiry(),
        weeklyRate: '450',
        bondAmount: '1000',
        business_id: '',
    });

    useEffect(() => {
        dispatch(fetchVehicles());
        businessApi.getAll().then(r => setBusinesses(r.data)).catch(() => {});
    }, [dispatch]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleComplianceDateChange = (field: 'regoExpiry' | 'ctpExpiry' | 'pinkSlipExpiry', value: string) => {
        const updates: Partial<typeof formData> = { [field]: value };
        if (field === 'regoExpiry') { updates.ctpExpiry = value; updates.pinkSlipExpiry = value; }
        else if (field === 'ctpExpiry') { updates.pinkSlipExpiry = value; }
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await vehiclesApi.create({
                vin: formData.vin,
                plate: formData.plate,
                make: formData.make,
                model: formData.model,
                year: parseInt(formData.year),
                color: formData.color,
                rego_expiry: formData.regoExpiry,
                ctp_expiry: formData.ctpExpiry,
                pink_slip_expiry: formData.pinkSlipExpiry,
                weekly_rate: parseFloat(formData.weeklyRate),
                bond_amount: parseFloat(formData.bondAmount),
                business_id: formData.business_id || null,
            });
            setDialogOpen(false);
            setFormData({
                vin: '', plate: '', make: '', model: '',
                year: new Date().getFullYear().toString(), color: '',
                regoExpiry: getDefaultExpiry(), ctpExpiry: getDefaultExpiry(), pinkSlipExpiry: getDefaultExpiry(),
                weeklyRate: '450', bondAmount: '1000', business_id: '',
            });
            dispatch(fetchVehicles());
        } catch (error: any) {
            const errorData = error.response?.data;
            if (errorData?.errors && Array.isArray(errorData.errors)) {
                setError(errorData.errors.map((e: any) => e.msg).join(', '));
            } else {
                setError(errorData?.error || 'Failed to create vehicle');
            }
        } finally {
            setSubmitting(false);
        }
    };

    // --- Document Management ---
    const openDocsModal = async (vehicleId: string, plate: string) => {
        setDocsVehicleId(vehicleId);
        setDocsVehiclePlate(plate);
        setError('');
        setDocsLoading(true);
        try {
            const res = await businessApi.getVehicleDocs(vehicleId);
            setVehicleDocs(res.data);
        } catch { setVehicleDocs([]); }
        finally { setDocsLoading(false); }
    };

    const handleUpload = async () => {
        if (!docsVehicleId || !uploadFile || !uploadForm.name) {
            setError('Please fill in the document name and select a file.');
            return;
        }
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', uploadFile);
            fd.append('name', uploadForm.name);
            fd.append('doc_type', uploadForm.doc_type);
            if (uploadForm.expiry_date) fd.append('expiry_date', uploadForm.expiry_date);
            if (uploadForm.notes) fd.append('notes', uploadForm.notes);

            await businessApi.uploadVehicleDoc(docsVehicleId, fd);
            setUploadForm({ name: '', doc_type: 'OTHER', expiry_date: '', notes: '' });
            setUploadFile(null);
            if (fileRef.current) fileRef.current.value = '';
            const res = await businessApi.getVehicleDocs(docsVehicleId);
            setVehicleDocs(res.data);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadDoc = async (doc: VehicleDoc) => {
        if (!docsVehicleId) return;
        try {
            const res = await businessApi.getDocDownloadUrl(docsVehicleId, doc.id);
            window.open(res.data.url, '_blank');
        } catch { setError('Failed to get download URL'); }
    };

    const handleDeleteDoc = async (docId: string) => {
        if (!docsVehicleId) return;
        if (!confirm('Delete this document?')) return;
        try {
            await businessApi.deleteVehicleDoc(docsVehicleId, docId);
            setVehicleDocs(prev => prev.filter(d => d.id !== docId));
        } catch { setError('Failed to delete document'); }
    };

    const filteredVehicles = vehicles.filter(v => {
        const matchesSearch =
            v.plate.toLowerCase().includes(search.toLowerCase()) ||
            v.vin.toLowerCase().includes(search.toLowerCase()) ||
            v.make.toLowerCase().includes(search.toLowerCase()) ||
            v.model.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Fleet Management</h1>
                    <p className="text-slate-500">Manage your vehicles, compliance, and vehicle documents</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200">
                            <Plus className="w-4 h-4" />
                            Add Vehicle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Vehicle</DialogTitle>
                            <DialogDescription className="sr-only">
                                Fill in the details below to register a new vehicle to your fleet.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm animate-shake">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="vin">VIN</Label>
                                    <Input id="vin" name="vin" placeholder="e.g. 1HGBH41JXMN109186" value={formData.vin} onChange={handleInputChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="plate">Plate Number</Label>
                                    <Input id="plate" name="plate" placeholder="e.g. ABC123" value={formData.plate} onChange={handleInputChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="make">Make</Label>
                                    <Input id="make" name="make" placeholder="e.g. Toyota" value={formData.make} onChange={handleInputChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="model">Model</Label>
                                    <Input id="model" name="model" placeholder="e.g. Camry" value={formData.model} onChange={handleInputChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="year">Year</Label>
                                    <Input id="year" name="year" type="number" min="2000" max="2030" value={formData.year} onChange={handleInputChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="color">Color</Label>
                                    <Input id="color" name="color" placeholder="e.g. White" value={formData.color} onChange={handleInputChange} required />
                                </div>
                            </div>

                            {/* Business Link */}
                            <div className="border-t pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    <h4 className="text-sm font-medium">Business Entity</h4>
                                </div>
                                <select
                                    name="business_id"
                                    value={formData.business_id}
                                    onChange={handleInputChange}
                                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">— No Business / Unassigned —</option>
                                    {businesses.map(b => (
                                        <option key={b.id} value={b.id}>
                                            {b.name || 'Untitled Business'}{b.abn ? ` (ABN: ${b.abn})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-400 mt-1">
                                    Link this vehicle to a business entity. Manage businesses in <strong>Business Settings</strong>.
                                </p>
                            </div>

                            {/* Compliance Dates */}
                            <div className="border-t pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <h4 className="text-sm font-medium">Compliance Dates</h4>
                                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">Linked</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">Dates cascade: Rego → CTP → Pink Slip</p>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2 relative">
                                        <Label htmlFor="regoExpiry" className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            Rego Expiry
                                        </Label>
                                        <Input id="regoExpiry" name="regoExpiry" type="date" value={formData.regoExpiry}
                                            onChange={e => handleComplianceDateChange('regoExpiry', e.target.value)} required className="border-blue-200" />
                                        <div className="hidden sm:block absolute -right-3 top-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-300 to-blue-300" />
                                    </div>
                                    <div className="space-y-2 relative">
                                        <Label htmlFor="ctpExpiry" className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            CTP Expiry
                                        </Label>
                                        <Input id="ctpExpiry" name="ctpExpiry" type="date" value={formData.ctpExpiry}
                                            onChange={e => handleComplianceDateChange('ctpExpiry', e.target.value)} required className="border-blue-200" />
                                        <div className="hidden sm:block absolute -right-3 top-1/2 w-6 h-0.5 bg-gradient-to-r from-blue-300 to-blue-300" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pinkSlipExpiry" className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            Pink Slip Expiry
                                        </Label>
                                        <Input id="pinkSlipExpiry" name="pinkSlipExpiry" type="date" value={formData.pinkSlipExpiry}
                                            onChange={e => handleComplianceDateChange('pinkSlipExpiry', e.target.value)} required className="border-blue-200" />
                                    </div>
                                </div>
                            </div>

                            {/* Rates */}
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-3">Rates</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="weeklyRate">Weekly Rate (AUD)</Label>
                                        <Input id="weeklyRate" name="weeklyRate" type="number" min="0" step="0.01" value={formData.weeklyRate} onChange={handleInputChange} required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="bondAmount">Bond Amount (AUD)</Label>
                                        <Input id="bondAmount" name="bondAmount" type="number" min="0" step="0.01" value={formData.bondAmount} onChange={handleInputChange} required />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create Vehicle'}</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input placeholder="Search by plate, VIN, make or model..." className="pl-10" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            {['all', 'AVAILABLE', 'RENTED', 'SUSPENDED'].map(status => (
                                <Button key={status} variant={statusFilter === status ? 'default' : 'outline'} size="sm" onClick={() => setStatusFilter(status)}>
                                    {status === 'all' ? 'All' : status}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Legend */}
            <div className="flex items-center gap-6 text-sm text-slate-600">
                <span className="font-medium">Compliance:</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500" /> {'>'} 30 days</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500" /> {'<'} 30 days</span>
                <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500" /> Expired</span>
            </div>

            {/* Vehicle Table */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="text-left p-4 text-sm font-medium text-slate-500">Vehicle</th>
                                    <th className="text-left p-4 text-sm font-medium text-slate-500">Status</th>
                                    <th className="text-left p-4 text-sm font-medium text-slate-500">Driver</th>
                                    <th className="text-center p-4 text-sm font-medium text-slate-500">Rego</th>
                                    <th className="text-center p-4 text-sm font-medium text-slate-500">CTP</th>
                                    <th className="text-center p-4 text-sm font-medium text-slate-500">Pink Slip</th>
                                    <th className="text-right p-4 text-sm font-medium text-slate-500">Weekly Rate</th>
                                    <th className="text-center p-4 text-sm font-medium text-slate-500">Docs</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                                    </td></tr>
                                ) : filteredVehicles.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-slate-500">No vehicles found</td></tr>
                                ) : (
                                    filteredVehicles.map(vehicle => (
                                        <tr key={vehicle.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <td className="p-4">
                                                <div>
                                                    <p className="font-semibold text-slate-900">{vehicle.plate}</p>
                                                    <p className="text-sm text-slate-500">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <Badge className={getStatusColor(vehicle.status)}>{vehicle.status}</Badge>
                                            </td>
                                            <td className="p-4">
                                                {vehicle.current_driver ? (
                                                    <span className="text-sm text-slate-900">{vehicle.current_driver.name}</span>
                                                ) : (
                                                    <span className="text-sm text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <ComplianceBadge status={vehicle.compliance.rego} />
                                                    <span className="text-xs text-slate-500">{formatDate(vehicle.rego_expiry)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <ComplianceBadge status={vehicle.compliance.ctp} />
                                                    <span className="text-xs text-slate-500">{formatDate(vehicle.ctp_expiry)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <ComplianceBadge status={vehicle.compliance.pink_slip} />
                                                    <span className="text-xs text-slate-500">{formatDate(vehicle.pink_slip_expiry)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-medium text-slate-900">{formatCurrency(vehicle.weekly_rate)}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openDocsModal(vehicle.id, vehicle.plate)}
                                                    className="gap-1 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    <span className="text-xs">Docs</span>
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Document Management Modal */}
            <Dialog open={!!docsVehicleId} onOpenChange={open => { if (!open) { setDocsVehicleId(null); setVehicleDocs([]); } }}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-white" />
                            </div>
                            Vehicle Documents — {docsVehiclePlate}
                        </DialogTitle>
                    </DialogHeader>

                    {/* Upload Form */}
                    <div className="bg-gradient-to-br from-blue-50 to-blue-50 rounded-2xl p-4 space-y-3">
                        <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                            <Upload className="w-4 h-4 text-blue-600" />
                            Upload New Document
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs">Document Name *</Label>
                                <Input
                                    placeholder="e.g. NRMA Insurance 2025"
                                    value={uploadForm.name}
                                    onChange={e => setUploadForm({ ...uploadForm, name: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Document Type</Label>
                                <select
                                    value={uploadForm.doc_type}
                                    onChange={e => setUploadForm({ ...uploadForm, doc_type: e.target.value })}
                                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">Expiry Date (Optional)</Label>
                                <Input
                                    type="date"
                                    value={uploadForm.expiry_date}
                                    onChange={e => setUploadForm({ ...uploadForm, expiry_date: e.target.value })}
                                    className="bg-white"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs">File * (PDF / Image, max 10MB)</Label>
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".pdf,image/*"
                                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                                    className="w-full text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-100 file:text-blue-700 file:text-xs cursor-pointer"
                                />
                            </div>
                        </div>
                        <Input
                            placeholder="Notes (optional)"
                            value={uploadForm.notes}
                            onChange={e => setUploadForm({ ...uploadForm, notes: e.target.value })}
                            className="bg-white"
                        />
                        <Button
                            onClick={handleUpload}
                            disabled={uploading || !uploadFile || !uploadForm.name}
                            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 gap-2"
                        >
                            <Upload className="w-4 h-4" />
                            {uploading ? 'Uploading...' : 'Upload Document'}
                        </Button>
                    </div>

                    {/* Documents List */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-slate-800">Uploaded Documents ({vehicleDocs.length})</h4>
                        {docsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-8 h-8 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                            </div>
                        ) : vehicleDocs.length === 0 ? (
                            <div className="text-center py-8 bg-slate-50 rounded-2xl">
                                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                <p className="text-slate-500 text-sm">No documents uploaded yet</p>
                            </div>
                        ) : (
                            vehicleDocs.map(doc => (
                                <div key={doc.id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-800 truncate">{doc.name}</p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <Badge className="bg-blue-50 text-blue-700 border-0 text-[10px]">
                                                {doc.doc_type.replace('_', ' ')}
                                            </Badge>
                                            {doc.expiry_date && (
                                                <span className="text-xs text-slate-400">
                                                    Expires {new Date(doc.expiry_date).toLocaleDateString('en-AU')}
                                                </span>
                                            )}
                                            {doc.file_name && (
                                                <span className="text-xs text-slate-400 truncate">{doc.file_name}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDownloadDoc(doc)}
                                            className="w-8 h-8 hover:bg-emerald-50 hover:text-emerald-600"
                                            title="Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteDoc(doc.id)}
                                            className="w-8 h-8 hover:bg-red-50 hover:text-red-600"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
