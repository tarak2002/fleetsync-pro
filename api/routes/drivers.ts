import { Router } from 'express';

const router = Router();

// Stats: 8 Active, 2 Pending, 2 Inactive = 12 Total
const mockDrivers = [
    { id: 'd1', name: 'Demo Driver', email: 'driver@fleetsync.com.au', phone: '0412345678', status: 'ACTIVE', abn: '12 345 678 901', license_no: '12345678', license_expiry: '2026-12-01', balance: "0.00", vevo_status: 'APPROVED' },
    { id: 'd2', name: 'Jane Smith', email: 'jane@example.com', phone: '0422333444', status: 'ACTIVE', abn: '98 765 432 109', license_no: '87654321', license_expiry: '2025-06-15', balance: "0.00", vevo_status: 'APPROVED' },
    { id: 'd3', name: 'John Doe', email: 'john@example.com', phone: '0488888888', status: 'ACTIVE', abn: '11 222 333 444', license_no: '11223344', license_expiry: '2025-01-10', balance: "750.00", vevo_status: 'PENDING' },
    { id: 'd4', name: 'Robert Brown', email: 'robert@example.com', phone: '0477777777', status: 'PENDING_APPROVAL', abn: '55 666 777 888', license_no: '55667788', license_expiry: '2026-05-20', balance: "0.00", vevo_status: 'PENDING' },
    { id: 'd5', name: 'Alice Wilson', email: 'alice@example.com', phone: '0455555555', status: 'INACTIVE', abn: '44 333 222 111', license_no: '44332211', license_expiry: '2024-03-15', balance: "0.00", vevo_status: 'DENIED' },
    { id: 'd6', name: 'Michael Jordan', email: 'michael@example.com', phone: '0499000999', status: 'ACTIVE', abn: '22 111 222 333', license_no: '22113344', license_expiry: '2027-01-01', balance: "0.00", vevo_status: 'APPROVED' },
    { id: 'd7', name: 'Steve Jobs', email: 'steve@apple.com', phone: '0400011100', status: 'ACTIVE', abn: '33 444 555 666', license_no: '33445566', license_expiry: '2026-08-15', balance: "0.00", vevo_status: 'APPROVED' },
    { id: 'd8', name: 'Elon Musk', email: 'elon@x.com', phone: '0444555666', status: 'ACTIVE', abn: '77 888 999 000', license_no: '77889900', license_expiry: '2025-11-30', balance: "0.00", vevo_status: 'APPROVED' },
    { id: 'd9', name: 'Bill Gates', email: 'bill@ms.com', phone: '0433322211', status: 'ACTIVE', abn: '11 000 111 222', license_no: '11002233', license_expiry: '2026-03-15', balance: "0.00", vevo_status: 'APPROVED' },
    { id: 'd10', name: 'Mark Zuckerberg', email: 'mark@meta.com', phone: '0422211100', status: 'ACTIVE', abn: '00 999 888 777', license_no: '00998877', license_expiry: '2025-09-01', balance: "0.00", vevo_status: 'APPROVED' },
    { id: 'd11', name: 'Larry Page', email: 'larry@google.com', phone: '0411100099', status: 'PENDING_APPROVAL', abn: '99 888 777 666', license_no: '99887766', license_expiry: '2026-02-14', balance: "0.00", vevo_status: 'PENDING' },
    { id: 'd12', name: 'Sergey Brin', email: 'sergey@google.com', phone: '0455544433', status: 'INACTIVE', abn: '88 777 666 555', license_no: '88776655', license_expiry: '2024-12-31', balance: "0.00", vevo_status: 'APPROVED' }
];

router.get('/', (req, res) => {
    const { status } = req.query;
    if (status) {
        return res.json(mockDrivers.filter(d => d.status === status));
    }
    return res.json(mockDrivers);
});

router.get('/stats', (req, res) => res.json({ total: 12, active: 8, pending: 2, inactive: 2 }));
router.get('/:id', (req, res) => res.json(mockDrivers.find(d => d.id === req.params.id) || mockDrivers[0]));

export default router;
