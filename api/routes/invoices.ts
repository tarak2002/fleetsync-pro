import { Router } from 'express';

const router = Router();

const mockInvoices = [
    { id: 'inv-1', amount: 450.00, status: 'PENDING', due_date: new Date(Date.now() + 172800000).toISOString(), rental: { driver: { name: 'Demo Driver' }, vehicle: { plate: 'ABC-123' } } },
    { id: 'inv-0', amount: 520.50, status: 'PAID', due_date: new Date(Date.now() - 604800000).toISOString(), updated_at: new Date(Date.now() - 518400000).toISOString(), rental: { driver: { name: 'Demo Driver' }, vehicle: { plate: 'ABC-123' } } },
    { id: 'inv-2', amount: 380.00, status: 'PAID', due_date: new Date(Date.now() - 172800000).toISOString(), rental: { driver: { name: 'Jane Smith' }, vehicle: { plate: 'ELN-001' } } },
    { id: 'inv-3', amount: 920.00, status: 'OVERDUE', due_date: new Date(Date.now() - 864000000).toISOString(), rental: { driver: { name: 'John Doe' }, vehicle: { plate: 'XYZ-789' } } },
    { id: 'inv-4', amount: 450.00, status: 'PENDING', due_date: new Date(Date.now() + 432000000).toISOString(), rental: { driver: { name: 'Robert Brown' }, vehicle: { plate: 'EV-999' } } },
    { id: 'inv-5', amount: 410.00, status: 'PAID', due_date: new Date(Date.now() - 1209600000).toISOString(), rental: { driver: { name: 'Alice Wilson' }, vehicle: { plate: 'FLT-555' } } }
];

// Get all invoices
router.get('/', (req, res) => {
    const { driver_id } = req.query;
    if (driver_id) {
        return res.json(mockInvoices.filter(i => i.rental.driver.name === 'Demo Driver' || driver_id === 'mock-driver-profile-id'));
    }
    return res.json(mockInvoices);
});

// Pay invoice
router.post('/:id/pay', (req, res) => {
    return res.json({ id: req.params.id, status: 'PAID', updated_at: new Date().toISOString() });
});

export default router;
