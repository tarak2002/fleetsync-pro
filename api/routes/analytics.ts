import { Router } from 'express';

const router = Router();

// Match frontend's analyticsApi.getDashboard() -> /api/analytics/dashboard
router.get('/dashboard', (req, res) => {
    // --- VERCEL PROTOTYPE MOCK (Aligned with DashboardStats interface) ---
    return res.json({
        vehicles: {
            total: 15,
            byStatus: {
                'AVAILABLE': 4,
                'RENTED': 8,
                'MAINTENANCE': 2,
                'DRAFT': 1
            }
        },
        drivers: {
            total: 12,
            byStatus: {
                'ACTIVE': 8,
                'PENDING_APPROVAL': 2,
                'INACTIVE': 2
            }
        },
        rentals: {
            active: 8
        },
        invoices: {
            pending: {
                count: 3,
                total: 15400.50
            },
            overdue: {
                count: 1,
                total: 2150.00
            }
        },
        alerts: 2
    });
});

router.get('/rental-breakdown', (req, res) => {
    return res.json([
        { status: 'ACTIVE', count: 8 },
        { status: 'PENDING', count: 3 },
        { status: 'ENDED', count: 4 }
    ]);
});

router.get('/revenue-history', (req, res) => {
    return res.json([
        { date: '2025-03-27', amount: 4200 },
        { date: '2025-03-28', amount: 3800 },
        { date: '2025-03-29', amount: 4500 },
        { date: '2025-03-30', amount: 5100 },
        { date: '2025-03-31', amount: 4800 },
        { date: '2025-04-01', amount: 5200 },
        { date: '2025-04-02', amount: 4900 }
    ]);
});

export default router;
