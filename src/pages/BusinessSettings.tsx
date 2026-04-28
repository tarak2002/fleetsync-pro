import { useEffect, useState } from 'react';
import { Plus, Building2, Hash, Phone, Mail, MapPin, Pencil, Trash2, X, BadgeCheck, Sparkles, CreditCard, User, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '../components/ui/dialog';
import { businessApi } from '../lib/api';

interface Business {
    id: string;
    name: string;
    abn: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    is_active: boolean;
    created_at: string;
    // Bank details
    bank_name: string | null;
    bank_bsb: string | null;
    bank_account_number: string | null;
    bank_account_name: string | null;
    // Admin linking
    admin_user_id: string | null;
    admin_name: string | null;
}

interface BankDetails {
    bank_name: string;
    bank_bsb: string;
    bank_account_number: string;
    bank_account_name: string;
}

const emptyForm: { name: string; abn: string; address: string; phone: string; email: string } & BankDetails = {
    name: '', abn: '', address: '', phone: '', email: '',
    bank_name: '', bank_bsb: '', bank_account_number: '', bank_account_name: ''
};

function formatAbn(abn: string | null): string {
    if (!abn) return '—';
    const clean = abn.replace(/\D/g, '');
    if (clean.length !== 11) return abn;
    return `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 11)}`;
}

function AbnBadge({ abn }: { abn: string | null }) {
    if (!abn) {
        return (
            <Badge className="bg-amber-100 text-amber-700 border-0 gap-1">
                <X className="w-3 h-3" />
                No ABN
            </Badge>
        );
    }
    return (
        <Badge className="bg-emerald-100 text-emerald-700 border-0 gap-1">
            <BadgeCheck className="w-3 h-3" />
            ABN Verified
        </Badge>
    );
}

export function BusinessSettings() {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
    const [formData, setFormData] = useState(emptyForm);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchBusinesses = async () => {
        try {
            const res = await businessApi.getAll();
            setBusinesses(res.data);
        } catch (err) {
            console.error('Failed to fetch businesses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBusinesses();
    }, []);

    const openCreate = () => {
        setEditingBusiness(null);
        setFormData(emptyForm);
        setDialogOpen(true);
    };

    const openEdit = (biz: Business) => {
        setEditingBusiness(biz);
        setFormData({
            name: biz.name,
            abn: biz.abn || '',
            address: biz.address || '',
            phone: biz.phone || '',
            email: biz.email || '',
            bank_name: biz.bank_name || '',
            bank_bsb: biz.bank_bsb || '',
            bank_account_number: biz.bank_account_number || '',
            bank_account_name: biz.bank_account_name || '',
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                name: formData.name || 'Untitled Business',
                abn: formData.abn || null,
                address: formData.address || null,
                phone: formData.phone || null,
                email: formData.email || null,
                bank_name: formData.bank_name || null,
                bank_bsb: formData.bank_bsb || null,
                bank_account_number: formData.bank_account_number || null,
                bank_account_name: formData.bank_account_name || null,
            };
            if (editingBusiness) {
                await businessApi.update(editingBusiness.id, payload);
            } else {
                await businessApi.create(payload);
            }
            setDialogOpen(false);
            fetchBusinesses();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to save business');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this business? Vehicles linked to it will be unlinked.')) return;
        setDeletingId(id);
        try {
            await businessApi.delete(id);
            fetchBusinesses();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to delete');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Business Settings</h1>
                    <p className="text-slate-500">Manage your business entities and ABN registrations</p>
                </div>
                <Button
                    onClick={openCreate}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200"
                >
                    <Plus className="w-4 h-4" />
                    Add Business
                </Button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-lg shadow-slate-100">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <Building2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{businesses.length}</p>
                            <p className="text-sm text-slate-500">Total Businesses</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg shadow-slate-100">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                            <BadgeCheck className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{businesses.filter(b => b.abn).length}</p>
                            <p className="text-sm text-slate-500">With ABN</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-lg shadow-slate-100">
                    <CardContent className="p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-800">{businesses.filter(b => !b.name || b.name === 'Untitled Business').length}</p>
                            <p className="text-sm text-slate-500">Untitled</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Business Cards Grid */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                </div>
            ) : businesses.length === 0 ? (
                <Card className="border-0 shadow-lg shadow-slate-100">
                    <CardContent className="p-12 text-center">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                            <Building2 className="w-10 h-10 text-slate-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">No Businesses Yet</h3>
                        <p className="text-slate-500 mb-6 max-w-sm mx-auto">Create your first business entity to start managing vehicles under a registered ABN.</p>
                        <Button onClick={openCreate} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700">
                            <Plus className="w-4 h-4" />
                            Add First Business
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {businesses.map((biz) => (
                        <Card key={biz.id} className="border-0 shadow-lg shadow-slate-100 hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                            <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600" />
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-100 to-blue-100 flex items-center justify-center">
                                            <Building2 className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base text-slate-800">
                                                {biz.name || 'Untitled Business'}
                                            </CardTitle>
                                            <AbnBadge abn={biz.abn} />
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEdit(biz)}
                                            className="w-8 h-8 hover:bg-blue-50 hover:text-blue-600"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(biz.id)}
                                            disabled={deletingId === biz.id}
                                            className="w-8 h-8 hover:bg-red-50 hover:text-red-600"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 space-y-3">
                                {/* Admin Linked */}
                                {(biz.admin_user_id || biz.admin_name) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                                            <User className="w-3.5 h-3.5 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">Linked Admin</p>
                                            <p className="font-medium text-slate-700">{biz.admin_name || 'Admin User'}</p>
                                        </div>
                                    </div>
                                )}
                                {biz.abn && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <Hash className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">ABN</p>
                                            <p className="font-mono font-semibold text-slate-700">{formatAbn(biz.abn)}</p>
                                        </div>
                                    </div>
                                )}
                                {biz.phone && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            <Phone className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <span className="text-slate-600">{biz.phone}</span>
                                    </div>
                                )}
                                {biz.email && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <span className="text-slate-600 truncate">{biz.email}</span>
                                    </div>
                                )}
                                {biz.address && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                                        </div>
                                        <span className="text-slate-600 text-xs leading-snug">{biz.address}</span>
                                    </div>
                                )}
                                {/* Bank Details Display */}
                                {(biz.bank_name || biz.bank_account_number) && (
                                    <div className="flex items-center gap-2 text-sm">
                                        <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                                            <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-400">{biz.bank_name}</p>
                                            <p className="font-mono font-semibold text-slate-700">
                                                {biz.bank_account_number ? `••••${biz.bank_account_number.slice(-4)}` : ''}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {!biz.abn && !biz.phone && !biz.email && !biz.address && (
                                    <div className="bg-amber-50 rounded-xl px-3 py-2">
                                        <p className="text-xs text-amber-700 font-medium">
                                            ⚠️ Complete this business profile by adding ABN and contact details
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            {editingBusiness ? 'Edit Business' : 'Add New Business'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="biz-name">Business Name</Label>
                            <Input
                                id="biz-name"
                                placeholder="Untitled Business"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                            <p className="text-xs text-slate-400">Leave blank to create as "Untitled Business"</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="biz-abn" className="flex items-center gap-2">
                                ABN
                                <Badge className="bg-blue-50 text-blue-600 border-0 text-[10px]">11 digits</Badge>
                            </Label>
                            <Input
                                id="biz-abn"
                                placeholder="e.g. 51 824 753 556"
                                value={formData.abn}
                                onChange={e => setFormData({ ...formData, abn: e.target.value })}
                                className="font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="biz-email">Email</Label>
                            <Input
                                id="biz-email"
                                type="email"
                                placeholder="contact@business.com.au"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label htmlFor="biz-phone">Phone</Label>
                                <Input
                                    id="biz-phone"
                                    placeholder="+61 4XX XXX XXX"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="biz-address">Address</Label>
                                <Input
                                    id="biz-address"
                                    placeholder="Sydney NSW 2000"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Bank Details Section */}
                        <div className="border-t border-slate-100 pt-4 mt-2">
                            <div className="flex items-center gap-2 mb-3">
                                <CreditCard className="w-4 h-4 text-emerald-600" />
                                <Label className="text-sm font-semibold text-slate-700">Bank Details</Label>
                                <Badge className="bg-emerald-50 text-emerald-600 border-0 text-[10px]">Optional</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="bank-name">Bank Name</Label>
                                    <Input
                                        id="bank-name"
                                        placeholder="e.g. Commonwealth Bank"
                                        value={formData.bank_name}
                                        onChange={e => setFormData({ ...formData, bank_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank-bsb">BSB</Label>
                                    <Input
                                        id="bank-bsb"
                                        placeholder="XXX-XXX"
                                        value={formData.bank_bsb}
                                        onChange={e => setFormData({ ...formData, bank_bsb: e.target.value })}
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bank-account">Account Number</Label>
                                    <Input
                                        id="bank-account"
                                        placeholder="12345678"
                                        value={formData.bank_account_number}
                                        onChange={e => setFormData({ ...formData, bank_account_number: e.target.value })}
                                        className="font-mono"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label htmlFor="bank-account-name">Account Name</Label>
                                    <Input
                                        id="bank-account-name"
                                        placeholder="Business Name Pty Ltd"
                                        value={formData.bank_account_name}
                                        onChange={e => setFormData({ ...formData, bank_account_name: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={submitting}
                                className="bg-gradient-to-r from-blue-600 to-blue-700"
                            >
                                {submitting ? 'Saving...' : editingBusiness ? 'Save Changes' : 'Create Business'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
