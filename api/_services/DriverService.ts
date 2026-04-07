import { prisma } from '../index.js';
import { VevoStatus, DriverStatus } from '@prisma/client';
import { VevoService } from './VevoService.js';
import { StripeService } from './StripeService.js';

export class DriverService {
    /**
     * Mock VEVO (Visa Verification) check
     * Removed in favor of VevoService.checkVisaStatus
     */

    /**
     * Register a new driver with VEVO check
     */
    static async registerDriver(data: {
        name: string;
        email: string;
        phone?: string;
        license_no: string;
        license_expiry?: Date;
        passport_no?: string;
    }) {
        // Check for existing driver
        const existingDriver = await prisma.driver.findFirst({
            where: {
                OR: [
                    { email: data.email },
                    { license_no: data.license_no }
                ]
            }
        });

        if (existingDriver) {
            throw new Error('Driver with this email or license already exists');
        }

        // Perform VEVO check if passport provided
        let vevo_status: VevoStatus = VevoStatus.PENDING;
        if (data.passport_no) {
            vevo_status = await VevoService.checkVisaStatus(data.passport_no);
        }

        // Determine initial status based on VEVO
        const status: DriverStatus = vevo_status === VevoStatus.DENIED
            ? DriverStatus.BLOCKED
            : DriverStatus.PENDING_APPROVAL;

        return prisma.driver.create({
            data: {
                ...data,
                vevo_status,
                vevo_checked_at: data.passport_no ? new Date() : null,
                status
            }
        });
    }

    /**
     * Run VEVO check on existing driver
     */
    static async runVevoCheck(driver_id: string) {
        const driver = await prisma.driver.findUnique({
            where: { id: driver_id }
        });

        if (!driver) {
            throw new Error('Driver not found');
        }

        if (!driver.passport_no) {
            throw new Error('No passport number on file');
        }

        const vevo_status = await VevoService.checkVisaStatus(driver.passport_no);

        return prisma.driver.update({
            where: { id: driver_id },
            data: {
                vevo_status,
                vevo_checked_at: new Date(),
                status: vevo_status === VevoStatus.DENIED
                    ? DriverStatus.BLOCKED
                    : driver.status
            }
        });
    }

    /**
     * Approve a pending driver
     */
    static async approveDriver(driver_id: string) {
        const driver = await prisma.driver.findUnique({
            where: { id: driver_id }
        });

        if (!driver) {
            throw new Error('Driver not found');
        }

        if (driver.vevo_status === VevoStatus.DENIED) {
            throw new Error('Cannot approve driver with DENIED VEVO status');
        }

        // Automatic Stripe Customer Generation
        try {
            await StripeService.createCustomer(driver.id, driver.email, driver.name);
        } catch (e: any) {
            console.error(`Failed to create Stripe customer for ${driver.email}`, e);
            // Non-blocking for now, can be retried or flagged
        }

        return prisma.driver.update({
            where: { id: driver_id },
            data: { status: DriverStatus.ACTIVE }
        });
    }

    /**
     * Block a driver
     */
    static async blockDriver(driver_id: string, reason?: string) {
        if (reason) {
            console.log(`Blocking driver ${driver_id} for reason: ${reason}`);
        }
        return prisma.driver.update({
            where: { id: driver_id },
            data: { status: DriverStatus.BLOCKED }
        });
    }

    /**
     * Get all drivers with optional status filter
     */
    static async getAll(status?: DriverStatus) {
        return prisma.driver.findMany({
            where: status ? { status } : undefined,
            include: {
                rentals: {
                    where: { status: 'ACTIVE' },
                    include: { vehicle: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    /**
     * Get driver by ID with full details
     */
    static async getById(id: string) {
        return prisma.driver.findUnique({
            where: { id },
            include: {
                rentals: {
                    include: {
                        vehicle: true,
                        invoices: true
                    }
                }
            }
        });
    }

    /**
     * Update driver balance
     */
    static async updateBalance(driver_id: string, amount: number) {
        return prisma.driver.update({
            where: { id: driver_id },
            data: {
                balance: { increment: amount }
            }
        });
    }
}
