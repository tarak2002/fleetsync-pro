import { Router } from 'express';

const router = Router();

const mockRentals = [
    { id: 'r1', status: 'ACTIVE', start_date: '2025-01-01', end_date: null, next_payment_date: '2025-04-09', weekly_rate: "450.00", bond_amount: "1000.00", driver: { id: 'd1', name: 'Demo Driver', email: 'driver@fleetsync.com.au' }, vehicle: { id: 'v1', plate: 'ABC-123', make: 'Toyota', model: 'Camry' } },
    { id: 'r2', status: 'ACTIVE', start_date: '2025-01-15', end_date: null, next_payment_date: '2025-04-10', weekly_rate: "550.00", bond_amount: "1500.00", driver: { id: 'd2', name: 'Jane Smith', email: 'jane@example.com' }, vehicle: { id: 'v2', plate: 'ELN-001', make: 'Tesla', model: 'Model 3' } },
    { id: 'r3', status: 'ACTIVE', start_date: '2025-02-01', end_date: null, next_payment_date: '2025-04-15', weekly_rate: "450.00", bond_amount: "1000.00", driver: { id: 'd3', name: 'John Doe', email: 'john@example.com' }, vehicle: { id: 'v3', plate: 'XYZ-789', make: 'Hyundai', model: 'Ioniq 5' } },
    { id: 'r4', status: 'ACTIVE', start_date: '2025-01-10', end_date: null, next_payment_date: '2025-04-08', weekly_rate: "400.00", bond_amount: "800.00", driver: { id: 'd4', name: 'Robert Brown', email: 'robert@example.com' }, vehicle: { id: 'v4', plate: 'EV-999', make: 'BYD', model: 'Atto 3' } },
    { id: 'r5', status: 'ACTIVE', start_date: '2025-01-20', end_date: null, next_payment_date: '2025-04-11', weekly_rate: "600.00", bond_amount: "1200.00", driver: { id: 'd6', name: 'Michael Jordan', email: 'michael@example.com' }, vehicle: { id: 'v6', plate: 'FLT-001', make: 'Toyota', model: 'HiAce' } },
    { id: 'r6', status: 'ACTIVE', start_date: '2025-01-25', end_date: null, next_payment_date: '2025-04-12', weekly_rate: "480.00", bond_amount: "900.00", driver: { id: 'd7', name: 'Steve Jobs', email: 'steve@apple.com' }, vehicle: { id: 'v7', plate: 'FLT-002', make: 'Toyota', model: 'Rav4' } },
    { id: 'r7', status: 'ACTIVE', start_date: '2025-02-05', end_date: null, next_payment_date: '2025-04-13', weekly_rate: "700.00", bond_amount: "1500.00", driver: { id: 'd8', name: 'Elon Musk', email: 'elon@x.com' }, vehicle: { id: 'v8', plate: 'FLT-003', make: 'Tesla', model: 'Model Y' } },
    { id: 'r8', status: 'ACTIVE', start_date: '2025-02-10', end_date: null, next_payment_date: '2025-04-14', weekly_rate: "450.00", bond_amount: "900.00", driver: { id: 'd9', name: 'Bill Gates', email: 'bill@ms.com' }, vehicle: { id: 'v9', plate: 'FLT-004', make: 'Hyundai', model: 'Kona EV' } },
    { id: 'r9', status: 'PENDING', start_date: '2025-03-01', end_date: null, next_payment_date: '2025-04-20', weekly_rate: "430.00", bond_amount: "800.00", driver: { id: 'd10', name: 'Mark Zuckerberg', email: 'mark@meta.com' }, vehicle: { id: 'v10', plate: 'FLT-005', make: 'BYD', model: 'Atto 3' } },
    { id: 'r10', status: 'COMPLETED', start_date: '2024-11-01', end_date: '2024-12-31', next_payment_date: '2024-12-31', weekly_rate: "450.00", bond_amount: "1000.00", driver: { id: 'd5', name: 'Alice Wilson', email: 'alice@example.com' }, vehicle: { id: 'v5', plate: 'FLT-555', make: 'Kia', model: 'EV6' } }
];

router.get('/', (req, res) => {
    const { status } = req.query;
    if (status && status !== 'all') {
        const filtered = mockRentals.filter(r => r.status === status);
        return res.json(filtered);
    }
    return res.json(mockRentals);
});

router.get('/active', (req, res) => res.json(mockRentals.filter(r => r.status === 'ACTIVE')));
router.get('/:id', (req, res) => res.json(mockRentals.find(r => r.id === req.params.id) || mockRentals[0]));

export default router;
