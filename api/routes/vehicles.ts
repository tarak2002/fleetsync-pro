import { Router } from 'express';

const router = Router();

const mockVehicles = [
    { id: 'v1', vin: 'VIN10001', plate: 'ABC-123', make: 'Toyota', model: 'Camry', year: 2023, color: 'Silver', status: 'RENTED', weekly_rate: "450.00", bond_amount: "1000.00", rego_expiry: '2025-12-01', ctp_expiry: '2025-12-01', pink_slip_expiry: '2025-12-01', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v2', vin: 'VIN10002', plate: 'ELN-001', make: 'Tesla', model: 'Model 3', year: 2024, color: 'White', status: 'RENTED', weekly_rate: "650.00", bond_amount: "1500.00", rego_expiry: '2025-10-15', ctp_expiry: '2025-10-15', pink_slip_expiry: '2025-10-15', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v3', vin: 'VIN10003', plate: 'EV-999', make: 'Hyundai', model: 'Ioniq 5', year: 2023, color: 'Matte Grey', status: 'SUSPENDED', weekly_rate: "550.00", bond_amount: "1200.00", rego_expiry: '2024-05-20', ctp_expiry: '2024-05-20', pink_slip_expiry: '2024-05-20', compliance: { rego: 'RED', ctp: 'RED', pink_slip: 'RED' } },
    { id: 'v4', vin: 'VIN10004', plate: 'VAN-111', make: 'Kia', model: 'Carnival', year: 2022, color: 'Black', status: 'AVAILABLE', weekly_rate: "500.00", bond_amount: "1000.00", rego_expiry: '2026-01-10', ctp_expiry: '2026-01-10', pink_slip_expiry: '2026-01-10', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v5', vin: 'VIN10005', plate: 'MG-777', make: 'MG', model: 'ZS EV', year: 2023, color: 'Blue', status: 'RENTED', weekly_rate: "420.00", bond_amount: "800.00", rego_expiry: '2025-08-30', ctp_expiry: '2025-08-30', pink_slip_expiry: '2025-08-30', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v6', vin: 'VIN10006', plate: 'FLT-001', make: 'Toyota', model: 'HiAce', year: 2023, color: 'White', status: 'RENTED', weekly_rate: "600.00", bond_amount: "1200.00", rego_expiry: '2025-11-20', ctp_expiry: '2025-11-20', pink_slip_expiry: '2025-11-20', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v7', vin: 'VIN10007', plate: 'FLT-002', make: 'Toyota', model: 'Rav4', year: 2024, color: 'Blue', status: 'RENTED', weekly_rate: "480.00", bond_amount: "900.00", rego_expiry: '2025-09-15', ctp_expiry: '2025-09-15', pink_slip_expiry: '2025-09-15', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v8', vin: 'VIN10008', plate: 'FLT-003', make: 'Tesla', model: 'Model Y', year: 2024, color: 'Red', status: 'RENTED', weekly_rate: "700.00", bond_amount: "1500.00", rego_expiry: '2025-10-01', ctp_expiry: '2025-10-01', pink_slip_expiry: '2025-10-01', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v9', vin: 'VIN10009', plate: 'FLT-004', make: 'Hyundai', model: 'Kona EV', year: 2023, color: 'Green', status: 'RENTED', weekly_rate: "450.00", bond_amount: "900.00", rego_expiry: '2025-07-20', ctp_expiry: '2025-07-20', pink_slip_expiry: '2025-07-20', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v10', vin: 'VIN10010', plate: 'FLT-005', make: 'BYD', model: 'Atto 3', year: 2023, color: 'White', status: 'RENTED', weekly_rate: "430.00", bond_amount: "800.00", rego_expiry: '2025-06-10', ctp_expiry: '2025-06-10', pink_slip_expiry: '2025-06-10', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v11', vin: 'VIN10011', plate: 'FLT-006', make: 'Toyota', model: 'Corolla', year: 2022, color: 'Grey', status: 'AVAILABLE', weekly_rate: "380.00", bond_amount: "700.00", rego_expiry: '2025-05-15', ctp_expiry: '2025-05-15', pink_slip_expiry: '2025-05-15', compliance: { rego: 'AMBER', ctp: 'AMBER', pink_slip: 'AMBER' } },
    { id: 'v12', vin: 'VIN10012', plate: 'FLT-007', make: 'Kia', model: 'Niro EV', year: 2023, color: 'Black', status: 'AVAILABLE', weekly_rate: "460.00", bond_amount: "900.00", rego_expiry: '2025-04-30', ctp_expiry: '2025-04-30', pink_slip_expiry: '2025-04-30', compliance: { rego: 'AMBER', ctp: 'AMBER', pink_slip: 'AMBER' } },
    { id: 'v13', vin: 'VIN10013', plate: 'FLT-008', make: 'Toyota', model: 'Hilux', year: 2022, color: 'White', status: 'AVAILABLE', weekly_rate: "550.00", bond_amount: "1100.00", rego_expiry: '2025-03-20', ctp_expiry: '2025-03-20', pink_slip_expiry: '2025-03-20', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } },
    { id: 'v14', vin: 'VIN10014', plate: 'FLT-009', make: 'Hyundai', model: 'Staria', year: 2023, color: 'Black', status: 'MAINTENANCE', weekly_rate: "600.00", bond_amount: "1200.00", rego_expiry: '2024-04-15', ctp_expiry: '2024-04-15', pink_slip_expiry: '2024-04-15', compliance: { rego: 'RED', ctp: 'RED', pink_slip: 'RED' } },
    { id: 'v15', vin: 'VIN10015', plate: 'FLT-010', make: 'Tesla', model: 'Model Y', year: 2024, color: 'Blue', status: 'DRAFT', weekly_rate: "700.00", bond_amount: "1500.00", rego_expiry: '2025-10-01', ctp_expiry: '2025-10-01', pink_slip_expiry: '2025-10-01', compliance: { rego: 'GREEN', ctp: 'GREEN', pink_slip: 'GREEN' } }
];

router.get('/', (req, res) => res.json(mockVehicles));
router.get('/available', (req, res) => res.json(mockVehicles.filter(v => v.status === 'AVAILABLE')));
router.get('/:id', (req, res) => res.json(mockVehicles.find(v => v.id === req.params.id) || mockVehicles[0]));
router.post('/', (req, res) => res.status(201).json({ id: 'new-v', ...req.body }));
router.put('/:id', (req, res) => res.json({ id: req.params.id, ...req.body }));

export default router;
