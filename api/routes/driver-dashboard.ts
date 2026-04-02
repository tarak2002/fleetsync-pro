import { Router } from 'express';

const router = Router();

// Mock Driver dashboard data
router.get('/active-rental', (req, res) => {
    // --- VERCEL PROTOTYPE MOCK ---
    return res.json({
        has_active_rental: true,
        rental_id: 'mock-rental-id',
        vehicle: {
            id: 'v1',
            make: 'Toyota',
            model: 'Camry',
            plate: 'ABC-123',
            vin: 'VIN123456789',
            color: 'Silver',
            year: 2023,
            imageUrl: '/images/vehicles/toyota-camry.jpg'
        },
        documents: {
            regoUrl: '/api/documents/rego/v1',
            ctpUrl: '/api/documents/ctp/v1',
            pinkSlipUrl: '/api/documents/pink-slip/v1',
            rentalAgreementUrl: '/api/documents/rental-agreement/v1'
        },
        shift_id: 'mock-shift-id',
        shift_status: 'NOT_STARTED',
        started_at: null,
        last_condition_report: new Date(Date.now() - 86400000).toISOString()
    });
});

// Other driver actions
router.post('/start-shift', (req, res) => res.json({ success: true, shift: { id: 'mock-shift-id', status: 'ACTIVE' } }));
router.post('/end-shift', (req, res) => res.json({ success: true }));
router.post('/return-vehicle', (req, res) => res.json({ success: true, message: 'Return request submitted' }));
router.post('/accident-report', (req, res) => res.json({ success: true }));

export default router;
