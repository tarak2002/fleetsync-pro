import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Shield, Plus, UserCheck, UserX, Copy, Check } from 'lucide-react';
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
    DialogFooter,
    DialogTrigger,
    DialogDescription,
} from '../components/ui/dialog';
import { fetchDrivers } from '../store';
import type { RootState, AppDispatch } from '../store';
import { driversApi, onboardingApi } from '../lib/api';
import { getStatusColor, formatCurrency } from '../lib/utils';

export function DriversPage() {
    const dispatch = useDispatch<AppDispatch>();
    const { drivers, loading } = useSelector((state: RootState) => state.fleet);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState(false);
    const [selectedDrivers, setSelectedDrivers] = useState<string[]>([]);
    const [approvingDriver, setApprovingDriver] = useState<any>(null);

    useEffect(() => {
        dispatch(fetchDrivers());
    }, [dispatch]);

    const handleApprove = (driver: any) => {
        setApprovingDriver(driver);
    };

    const confirmApprove = async () => {
        if (!approvingDriver) return;
        setSubmitting(true);
        try {
            await driversApi.approve(approvingDriver.id);
            dispatch(fetchDrivers());
            setApprovingDriver(null);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to approve driver');
        } finally {
            setSubmitting(false);
        }
    };

    const handleBlock = async (id: string) => {
        await driversApi.block(id);
        dispatch(fetchDrivers());
    };

    const handleGenerateLink = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await onboardingApi.generateLink(email);
            setGeneratedLink(response.data.link);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to generate link');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCopyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEmail('');
        setGeneratedLink('');
        setCopied(false);
    };

    const filteredDrivers = drivers.filter(d => {
        const matchesSearch =
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            d.email.toLowerCase().includes(search.toLowerCase()) ||
            d.license_no.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Driver Management</h1>
                    <p className="text-slate-500">
                        Manage drivers and onboarding applications
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => open ? setDialogOpen(true) : handleCloseDialog()}>
                    <DialogTrigger asChild>
                        <Button id="invite-driver-btn" className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200">
                            <Plus className="w-4 h-4" />
                            Invite Driver
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Invite New Driver</DialogTitle>
                            <DialogDescription>
                                Generate a magic link to send to a driver for onboarding
                            </DialogDescription>
                        </DialogHeader>

                        {!generatedLink ? (
                            <form onSubmit={handleGenerateLink} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Driver Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="driver@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                                <DialogFooter>
                                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                                        Cancel
                                    </Button>
                                    <Button type="submit" disabled={submitting}>
                                        {submitting ? 'Generating...' : 'Generate Link'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        ) : (
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                                    <p className="text-sm text-emerald-600 font-medium mb-2">
                                        ✅ Magic link generated!
                                    </p>
                                    <p className="text-xs text-slate-500 mb-3">
                                        Send this link to the driver. It expires in 7 days.
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={generatedLink}
                                            readOnly
                                            className="text-sm"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleCopyLink}
                                            className="shrink-0"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-emerald-500" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button type="button" onClick={handleCloseDialog}>
                                        Done
                                    </Button>
                                </DialogFooter>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>

            {/* Approval Confirmation Dialog */}
            <Dialog open={!!approvingDriver} onOpenChange={(open) => !open && setApprovingDriver(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Driver Approval</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve <strong>{approvingDriver?.name}</strong>? This will grant them access to the driver application and create a Stripe customer profile.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                                {approvingDriver?.name?.charAt(0)}
                            </div>
                            <div>
                                <p className="font-semibold text-slate-900">{approvingDriver?.name}</p>
                                <p className="text-xs text-slate-500">{approvingDriver?.email}</p>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setApprovingDriver(null)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={confirmApprove} disabled={submitting}>
                            {submitting ? 'Approving...' : 'Confirm Approval'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Filters Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                        id="driver-search-input"
                        placeholder="Search by name, email or license..."
                        className="pl-9 bg-slate-50 border-transparent focus:bg-white focus:border-primary transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 p-1 bg-slate-50 rounded-xl border border-slate-100">
                    {['all', 'ACTIVE', 'PENDING_APPROVAL', 'BLOCKED'].map((status) => (
                        <button
                            key={status}
                            id={`status-filter-${status.toLowerCase()}`}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${statusFilter === status ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {status === 'all' ? 'All' : status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>

            {/* Drivers Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden relative z-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4 w-12 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4"
                                        checked={selectedDrivers.length === filteredDrivers.length && filteredDrivers.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) setSelectedDrivers(filteredDrivers.map(d => d.id));
                                            else setSelectedDrivers([]);
                                        }}
                                    />
                                </th>
                                <th className="p-4">Driver Details</th>
                                <th className="p-4">License Info</th>
                                <th className="p-4">Compliance</th>
                                <th className="p-4">Financials</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                                    </td>
                                </tr>
                            ) : filteredDrivers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center text-slate-500">
                                        <UserX className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <p className="text-lg font-medium text-slate-600">No drivers found</p>
                                        <p className="text-sm">Try adjusting your filters or search query.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDrivers.map((driver) => (
                                    <tr key={driver.id} className="hover:bg-slate-50/80 transition-colors group">
                                        <td className="p-4 text-center">
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity"
                                                checked={selectedDrivers.includes(driver.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedDrivers([...selectedDrivers, driver.id]);
                                                    else setSelectedDrivers(selectedDrivers.filter(id => id !== driver.id));
                                                }}
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-bold shrink-0">
                                                    {driver.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900">{driver.name}</div>
                                                    <div className="text-xs text-slate-500">{driver.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm font-medium text-slate-700">
                                            {driver.license_no}
                                        </td>
                                        <td className="p-4">
                                            <Badge className={getStatusColor(driver.vevo_status)}>
                                                <Shield className="w-3 h-3 mr-1" />
                                                {driver.vevo_status}
                                            </Badge>
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-sm font-bold ${parseFloat(driver.balance) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {formatCurrency(driver.balance)}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <Badge className={getStatusColor(driver.status)}>
                                                {driver.status.replace('_', ' ')}
                                            </Badge>
                                        </td>
                                        <td className="p-4 text-right">
                                            {driver.status === 'PENDING_APPROVAL' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button size="sm" variant="success" className="h-8 px-2" onClick={() => handleApprove(driver)} disabled={driver.vevo_status === 'DENIED'}>
                                                        <Check className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="sm" variant="destructive" className="h-8 px-2" onClick={() => handleBlock(driver.id)}>
                                                        <UserX className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button variant="ghost" size="sm" className="text-slate-400 hover:text-primary">
                                                    View Profile
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination / Footer (Placeholder) */}
                <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-500 flex justify-between items-center">
                    <span>Showing {filteredDrivers.length} {filteredDrivers.length === 1 ? 'driver' : 'drivers'}</span>
                </div>
            </div>
        </div>
    );
}
