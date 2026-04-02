import { Router } from 'express';

const router = Router();

// Get Admin Finance Dashboard
router.get('/dashboard', (req, res) => {
    return res.json({
        income: 24850.00,
        expenses: 4210.50,
        net_profit: 20639.50,
        period_days: 30
    });
});

// Get Insurance Breakdown
router.get('/insurance', (req, res) => {
    return res.json([
        { vehicle_id: 'v1', plate: 'ABC-123', make: 'Toyota', model: 'Camry', insurance_cost_annual: 1800, insurance_cost_daily: "4.93", current_driver: 'Demo Driver' },
        { vehicle_id: 'v2', plate: 'ELN-001', make: 'Tesla', model: 'Model 3', insurance_cost_annual: 2400, insurance_cost_daily: "6.58", current_driver: 'Jane Smith' },
        { vehicle_id: 'v3', plate: 'EV-999', make: 'BYD', model: 'Atto 3', insurance_cost_annual: 2100, insurance_cost_daily: "5.75", current_driver: 'Robert Brown' },
        { vehicle_id: 'v4', plate: 'XYZ-789', make: 'Hyundai', model: 'Ioniq 5', insurance_cost_annual: 2200, insurance_cost_daily: "6.03", current_driver: 'John Doe' },
        { vehicle_id: 'v5', plate: 'POL-101', make: 'Polestar', model: '2', insurance_cost_annual: 2600, insurance_cost_daily: "7.12", current_driver: 'Charlie Davis' },
        { vehicle_id: 'v6', plate: 'FLT-555', make: 'Kia', model: 'EV6', insurance_cost_annual: 2300, insurance_cost_daily: "6.30", current_driver: 'Alice Wilson' }
    ]);
});

export default router;
