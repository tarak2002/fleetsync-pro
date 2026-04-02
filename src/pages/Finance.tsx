import { useState, useEffect } from 'react';
import { financeApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { format } from 'date-fns';
import { DollarSign, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { cn } from '../lib/utils';

export function FinancePage() {
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [insuranceData, setInsuranceData] = useState<any[]>([]);
    const [startDate, setStartDate] = useState<Date | undefined>(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const startStr = startDate ? startDate.toISOString() : undefined;
            const endStr = endDate ? endDate.toISOString() : undefined;

            const [dashboardRes, insuranceRes] = await Promise.all([
                financeApi.getDashboard({ start_date: startStr, end_date: endStr }),
                financeApi.getInsurance()
            ]);

            setDashboardData(dashboardRes.data);
            setInsuranceData(insuranceRes.data);
        } catch (error) {
            console.error('Failed to fetch finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(amount);
    };

    if (loading && !dashboardData) {
        return <div className="p-8 text-center">Loading financials...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Overview</h1>
                    <p className="text-slate-500">Track income, expenses, and insurance costs.</p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Date Range Picker (Simplified using native date inputs for now if UI components missing) */}
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md p-1">
                        <input
                            type="date"
                            className="text-sm border-none focus:ring-0 text-slate-600 outline-none"
                            value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            className="text-sm border-none focus:ring-0 text-slate-600 outline-none"
                            value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                    </div>
                    <Button onClick={fetchData} size="sm">Refresh</Button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">{formatCurrency(dashboardData?.income || 0)}</div>
                        <p className="text-xs text-slate-500">From paid invoices</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Insurance Costs</CardTitle>
                        <Shield className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600">{formatCurrency(dashboardData?.expenses || 0)}</div>
                        <p className="text-xs text-slate-500">Pro-rated for {dashboardData?.period_days || 30} days</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                        {(dashboardData?.net_profit || 0) >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className={cn("text-2xl font-bold", (dashboardData?.net_profit || 0) >= 0 ? "text-emerald-600" : "text-red-600")}>
                            {formatCurrency(dashboardData?.net_profit || 0)}
                        </div>
                        <p className="text-xs text-slate-500">Income - Insurance</p>
                    </CardContent>
                </Card>
            </div>

            {/* Insurance Breakdown Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Insurance Breakdown by Vehicle</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="[&_tr]:border-b">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Vehicle</th>
                                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Current Driver</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Annual Cost</th>
                                    <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0">Daily Cost</th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {insuranceData.map((item: any) => (
                                    <tr key={item.vehicle_id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">
                                            <div className="font-medium">{item.plate}</div>
                                            <div className="text-xs text-slate-500">{item.make} {item.model}</div>
                                        </td>
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0">{item.current_driver}</td>
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">{formatCurrency(Number(item.insurance_cost_annual))}</td>
                                        <td className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-right">{formatCurrency(Number(item.insurance_cost_daily))}</td>
                                    </tr>
                                ))}
                                {insuranceData.length === 0 && (
                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                        <td colSpan={4} className="p-4 align-middle [&:has([role=checkbox])]:pr-0 text-center text-slate-500 py-8">
                                            No active vehicles found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
