import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { complianceApi } from '../lib/api';
import { formatDate } from '../lib/utils';

interface Alert {
    id: string;
    type: string;
    message: string;
    resolved: boolean;
    created_at: string;
    vehicle?: { plate: string };
}

interface Expiry {
    vehicle_id: string;
    plate: string;
    upcoming_expiries: string[];
}

export function CompliancePage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [expiries, setExpiries] = useState<Expiry[]>([]);
    const [loading, setLoading] = useState(true);
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            console.log('[Compliance] Fetching alerts and expiries...');
            const [alertsRes, expiriesRes] = await Promise.all([
                complianceApi.getAlerts(),
                complianceApi.getUpcomingExpiries()
            ]);
            console.log('[Compliance] Alerts Response:', alertsRes.status, alertsRes.data);
            console.log('[Compliance] Expiries Response:', expiriesRes.status, expiriesRes.data);
            setAlerts(alertsRes.data);
            setExpiries(expiriesRes.data);
        } catch (err: any) {
            console.error('[Compliance] Failed to fetch data:', err.message);
            if (err.response) {
                console.error('[Compliance] Server Error Response:', err.response.status, err.response.data);
            }
        } finally {
            setLoading(false);
        }
    };

    const [error, setError] = useState<string | null>(null);

    const runCheck = async () => {
        setChecking(true);
        setError(null);
        try {
            await complianceApi.check();
            await loadData();
        } catch (err) {
            console.error('Compliance check failed:', err);
            setError('Failed to run compliance check. Please try again.');
        } finally {
            setChecking(false);
        }
    };

    const resolveAlert = async (id: string) => {
        try {
            setError(null);
            await complianceApi.resolveAlert(id);
            await loadData();
        } catch (err) {
            console.error('Failed to resolve alert:', err);
            setError('Failed to resolve alert. Please try again.');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Compliance Watchdog</h1>
                    <p className="text-slate-500">NSW vehicle compliance tracking</p>
                </div>
                <Button onClick={runCheck} disabled={checking} className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg shadow-blue-200">
                    <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
                    Run Compliance Check
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-500" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Alerts */}
                <Card className="border-0 shadow-lg shadow-slate-100">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-rose-600">
                                <AlertTriangle className="w-4 h-4 text-white" />
                            </div>
                            Active Alerts ({alerts.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : alerts.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <Shield className="w-12 h-12 mx-auto mb-2 text-emerald-500" />
                                <p>All vehicles are compliant!</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-100">
                                        <div>
                                            <p className="font-medium text-red-700">
                                                {alert.type.replace(/_/g, ' ')}
                                            </p>
                                            <p className="text-sm text-red-600/80">{alert.message}</p>
                                            <p className="text-xs text-red-500 mt-1">{formatDate(alert.created_at)}</p>
                                        </div>
                                        <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                                            <CheckCircle className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Upcoming Expiries */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-500" />
                            Upcoming Expiries (30 days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : expiries.length === 0 ? (
                            <div className="text-center py-8 text-slate-500">
                                <p>No upcoming expiries</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {expiries.map((exp) => (
                                    <div key={exp.vehicle_id} className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                                        <p className="font-semibold text-amber-700">{exp.plate}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {exp.upcoming_expiries?.map((expiry: any, i: number) => (
                                                <Badge key={i} variant="warning">{expiry}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
