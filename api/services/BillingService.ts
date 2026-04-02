import { prisma } from '../index.js';
import { InvoiceStatus } from '@prisma/client';
import { RentalService } from './RentalService.js';

export class BillingService {
    /**
     * Generate invoice for a rental
     * Formula: (Weekly_Rate + Tolls + Fines) - Credits
     */
    static async generateInvoice(rental_id: string, additionalData?: {
        tolls?: number;
        fines?: number;
        credits?: number;
    }) {
        const rental = await prisma.rental.findUnique({
            where: { id: rental_id },
            include: { driver: true }
        });

        if (!rental) {
            throw new Error('Rental not found');
        }

        const weekly_rate = Number(rental.weekly_rate);
        const tolls = additionalData?.tolls || 0;
        const fines = additionalData?.fines || 0;
        const credits = additionalData?.credits || 0;

        // Calculate final amount using Australian billing formula
        const amount = (weekly_rate + tolls + fines) - credits;

        const due_date = new Date();
        due_date.setHours(0, 0, 0, 0); // Normalize to start of day
        due_date.setDate(due_date.getDate() + 7);

        const invoice = await prisma.invoice.create({
            data: {
                rental_id: rental_id,
                weekly_rate,
                tolls,
                fines,
                credits,
                amount,
                due_date,
                status: InvoiceStatus.PENDING
            },
            include: {
                rental: {
                    include: { driver: true, vehicle: true }
                }
            }
        });

        // Update next payment date on rental (normalize to midnight)
        const next_payment_date = new Date(rental.next_payment_date);
        next_payment_date.setDate(next_payment_date.getDate() + 7);
        next_payment_date.setHours(0, 0, 0, 0);

        await prisma.rental.update({
            where: { id: rental_id },
            data: { next_payment_date }
        });

        return invoice;
    }

    /**
     * Run billing cycle - check all active rentals and generate invoices as needed
     * This is the cron job logic (called daily)
     */
    static async runBillingCycle() {
        const rentals = await RentalService.getRentalsDueForInvoicing();
        const results: any[] = [];

        for (const rental of rentals) {
            try {
                // Check if invoice already exists for this period
                const existingInvoice = await prisma.invoice.findFirst({
                    where: {
                        rental_id: rental.id,
                        due_date: {
                            gte: rental.next_payment_date
                        }
                    }
                });

                if (!existingInvoice) {
                    const invoice = await this.generateInvoice(rental.id);
                    results.push({
                        rentalId: rental.id,
                        invoiceId: invoice.id,
                        amount: invoice.amount,
                        status: 'generated'
                    });
                } else {
                    results.push({
                        rentalId: rental.id,
                        invoiceId: existingInvoice.id,
                        status: 'already_exists'
                    });
                }
            } catch (error: any) {
                results.push({
                    rentalId: rental.id,
                    status: 'error',
                    error: error.message
                });
            }
        }

        return results;
    }

    /**
     * Mark invoice as paid
     */
    static async markAsPaid(invoice_id: string) {
        const invoice = await prisma.invoice.update({
            where: { id: invoice_id },
            data: {
                status: InvoiceStatus.PAID,
                paid_at: new Date()
            },
            include: {
                rental: {
                    include: { driver: true }
                }
            }
        });

        // Adjust driver balance
        const amount = Number(invoice.amount);
        await prisma.driver.update({
            where: { id: invoice.rental.driver_id },
            data: {
                balance: { decrement: amount }
            }
        });

        return invoice;
    }

    /**
     * Check and mark overdue invoices
     */
    static async checkOverdueInvoices() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const overdueInvoices = await prisma.invoice.updateMany({
            where: {
                status: InvoiceStatus.PENDING,
                due_date: { lt: today }
            },
            data: { status: InvoiceStatus.OVERDUE }
        });

        return overdueInvoices;
    }

    /**
     * Get all invoices with optional filters
     */
    static async getInvoices(filters?: {
        status?: InvoiceStatus;
        rental_id?: string;
        driver_id?: string;
    }) {
        const where: any = {};

        if (filters?.status) where.status = filters.status;
        if (filters?.rental_id) where.rental_id = filters.rental_id;
        if (filters?.driver_id) {
            where.rental = { driver_id: filters.driver_id };
        }

        return prisma.invoice.findMany({
            where,
            include: {
                rental: {
                    include: { driver: true, vehicle: true }
                }
            },
            orderBy: { due_date: 'desc' }
        });
    }
}
