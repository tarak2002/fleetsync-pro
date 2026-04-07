import { Router } from 'express';
import { prisma } from '../_lib/prisma.js';
import { AuthRequest } from '../_middleware/auth.js';

const router = Router();

// Get all rentals with optional status filter
router.get('/', async (req: AuthRequest, res) => {
    try {
        const { status } = req.query;
        const where: any = {};
        
        if (status && status !== 'all') {
            where.status = status;
        }

        // If the user is a driver, they should only see their own rentals
        if (req.user?.role === 'DRIVER') {
            where.driver_id = req.user.driverId;
        }

        const rentals = await prisma.rental.findMany({
            where,
            include: {
                driver: true,
                vehicle: true
            },
            orderBy: { created_at: 'desc' }
        });

        res.json(rentals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get active rentals
router.get('/active', async (req: AuthRequest, res) => {
    try {
        const rentals = await prisma.rental.findMany({
            where: { 
                status: 'ACTIVE',
                driver_id: req.user?.role === 'DRIVER' ? req.user.driverId : undefined
            },
            include: {
                driver: true,
                vehicle: true
            }
        });
        res.json(rentals);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get rental by ID
router.get('/:id', async (req: AuthRequest, res) => {
    try {
        const rental = await prisma.rental.findUnique({
            where: { id: req.params.id },
            include: {
                driver: true,
                vehicle: true,
                invoices: {
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        if (!rental) return res.status(404).json({ error: 'Rental not found' });

        // Security check: Drivers can only see their own rentals
        if (req.user?.role === 'DRIVER' && rental.driver_id !== req.user.driverId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json(rental);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create a new rental
router.post('/', async (req: AuthRequest, res) => {
    try {
        const { driver_id, vehicle_id, weekly_rate, bond_amount, start_date } = req.body;

        if (!driver_id || !vehicle_id) {
            return res.status(400).json({ error: 'Driver and Vehicle IDs are required' });
        }

        // Use transaction to ensure data integrity
        const result = await prisma.$transaction(async (tx) => {
            // 1. Verify vehicle is available
            const vehicle = await tx.vehicle.findUnique({
                where: { id: vehicle_id }
            });

            if (!vehicle || vehicle.status !== 'AVAILABLE') {
                throw new Error('Vehicle is no longer available');
            }

            // 2. Update vehicle status
            await tx.vehicle.update({
                where: { id: vehicle_id },
                data: { status: 'RENTED' }
            });

            // 3. Create rental
            const start = start_date ? new Date(start_date) : new Date();
            const nextPayment = new Date(start);
            nextPayment.setDate(nextPayment.getDate() + 7);

            const rental = await tx.rental.create({
                data: {
                    driver_id,
                    vehicle_id,
                    weekly_rate,
                    bond_amount,
                    start_date: start,
                    next_payment_date: nextPayment,
                    status: 'ACTIVE'
                }
            });

            // 4. Create Bond Invoice
            const invoice = await tx.invoice.create({
                data: {
                    rental_id: rental.id,
                    weekly_rate: 0, // Bond invoice, weekly rate is separate
                    amount: bond_amount,
                    due_date: start,
                    status: 'PENDING'
                }
            });

            return { rental, invoice };
        });

        res.status(201).json(result);
    } catch (error: any) {
        console.error('Rental Creation Error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
