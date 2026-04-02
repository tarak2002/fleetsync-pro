import { Router } from 'express';

const router = Router();

const mockDocs: Record<string, any> = {
    'rego': { title: 'Registration Certificate', type: 'REGO', validUntil: '2025-12-01', details: { 'Plate': 'ABC-123', 'VIN': 'VIN123456789', 'Owner': 'FleetSync Pro Pty Ltd' } },
    'ctp': { title: 'Compulsory Third Party (CTP)', type: 'CTP', validUntil: '2025-12-01', details: { 'Insurer': 'NRMA Insurance', 'Policy #': 'CTP-9922881', 'Status': 'ACTIVE' } },
    'pink-slip': { title: 'Safety Inspection (Pink Slip)', type: 'PINK_SLIP', inspectionDate: '2024-11-20', details: { 'Inspector': 'Elite Auto Sydney', 'Result': 'PASS', 'Next Due': '2025-11-20' } },
    'rental-agreement': { title: 'Rental Agreement', type: 'RENTAL_AGREEMENT', startDate: '2025-01-01', details: { 'Weekly Rate': '$450', 'Bond': '$1,000', 'Driver': 'Demo Driver' }, terms: ['Cleanliness required', 'Weekly payments', 'No smoking'] }
};

router.get('/:type/:id', (req, res) => {
    const { type } = req.params;
    const doc = mockDocs[type] || mockDocs['rego'];
    return res.json(doc);
});

export default router;
