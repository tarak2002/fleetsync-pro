import { prisma } from '../index.js';
import { RentalStatus, VehicleStatus, DriverStatus, InvoiceStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export class RentalService {
    /**
     * Create a new rental
     * Constraints: Vehicle cannot be SUSPENDED, Driver cannot be BLOCKED
     */
    static async createRental(data: {
        driver_id: string;
        vehicle_id: string;
        bond_amount: number;
        weekly_rate: number;
        start_date?: Date;
    }) {
        // Check vehicle status
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: data.vehicle_id }
        });

        if (!vehicle) {
            throw new Error('Vehicle not found');
        }

        if (vehicle.status === VehicleStatus.SUSPENDED) {
            throw new Error('Cannot assign a suspended vehicle');
        }

        if (vehicle.status === VehicleStatus.RENTED) {
            throw new Error('Vehicle is already rented');
        }

        // Check driver status
        const driver = await prisma.driver.findUnique({
            where: { id: data.driver_id }
        });

        if (!driver) {
            throw new Error('Driver not found');
        }

        if (driver.status === DriverStatus.BLOCKED) {
            throw new Error('Cannot assign vehicle to blocked driver');
        }

        if (driver.status !== DriverStatus.ACTIVE) {
            throw new Error('Driver must be active to rent a vehicle');
        }

        // Check driver doesn't already have an active rental
        const existingRental = await prisma.rental.findFirst({
            where: {
                driver_id: data.driver_id,
                status: RentalStatus.ACTIVE
            }
        });

        if (existingRental) {
            throw new Error('Driver already has an active rental');
        }

        const start_date = data.start_date || new Date();
        const next_payment_date = new Date(start_date);
        next_payment_date.setDate(next_payment_date.getDate() + 7);

        // Create rental and update vehicle status in a transaction
        const rental = await prisma.$transaction(async (tx) => {
            // Create rental
            const newRental = await tx.rental.create({
                data: {
                    driver_id: data.driver_id,
                    vehicle_id: data.vehicle_id,
                    start_date,
                    bond_amount: data.bond_amount,
                    weekly_rate: data.weekly_rate,
                    next_payment_date,
                    status: RentalStatus.ACTIVE
                },
                include: {
                    driver: true,
                    vehicle: true
                }
            });

            // Update vehicle status to RENTED
            await tx.vehicle.update({
                where: { id: data.vehicle_id },
                data: { status: VehicleStatus.RENTED }
            });

            return newRental;
        });

        return rental;
    }

    /**
     * End a rental
     */
    static async endRental(rental_id: string) {
        const rental = await prisma.rental.findUnique({
            where: { id: rental_id }
        });

        if (!rental) {
            throw new Error('Rental not found');
        }

        if (rental.status !== RentalStatus.ACTIVE) {
            throw new Error('Rental is not active');
        }

        // End rental and make vehicle available
        return prisma.$transaction(async (tx) => {
            const updatedRental = await tx.rental.update({
                where: { id: rental_id },
                data: {
                    status: RentalStatus.COMPLETED,
                    end_date: new Date()
                },
                include: {
                    driver: true,
                    vehicle: true
                }
            });

            await tx.vehicle.update({
                where: { id: rental.vehicle_id },
                data: { status: VehicleStatus.AVAILABLE }
            });

            return updatedRental;
        });
    }

    /**
     * Get all active rentals
     */
    static async getActiveRentals() {
        return prisma.rental.findMany({
            where: { status: RentalStatus.ACTIVE },
            include: {
                driver: true,
                vehicle: true,
                invoices: {
                    orderBy: { due_date: 'desc' },
                    take: 3
                }
            }
        });
    }

    /**
     * Get rentals due for invoicing (payment date within 3 days)
     */
    static async getRentalsDueForInvoicing() {
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        return prisma.rental.findMany({
            where: {
                status: RentalStatus.ACTIVE,
                next_payment_date: {
                    lte: threeDaysFromNow
                }
            },
            include: {
                driver: true,
                vehicle: true
            }
        });
    }
}
