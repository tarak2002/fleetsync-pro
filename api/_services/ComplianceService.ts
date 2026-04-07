import { prisma } from '../index.js';
import { VehicleStatus, AlertType } from '@prisma/client';

export class ComplianceService {
    /**
     * Check all vehicle expiries and suspend non-compliant vehicles
     * Creates alerts for admin notification
     */
    static async checkExpiries() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all active vehicles (AVAILABLE or RENTED)
        const vehicles = await prisma.vehicle.findMany({
            where: {
                status: {
                    in: [VehicleStatus.AVAILABLE, VehicleStatus.RENTED]
                }
            }
        });

        const results: any[] = [];

        for (const vehicle of vehicles) {
            const issues: { type: AlertType; message: string }[] = [];

            // Check rego expiry
            const regoExpiry = new Date(vehicle.rego_expiry);
            regoExpiry.setHours(0, 0, 0, 0);
            if (regoExpiry < today) {
                issues.push({
                    type: AlertType.REGO_EXPIRY,
                    message: `Registration expired on ${vehicle.rego_expiry.toLocaleDateString()}`
                });
            }

            // Check CTP expiry
            const ctpExpiry = new Date(vehicle.ctp_expiry);
            ctpExpiry.setHours(0, 0, 0, 0);
            if (ctpExpiry < today) {
                issues.push({
                    type: AlertType.CTP_EXPIRY,
                    message: `CTP (Green Slip) expired on ${vehicle.ctp_expiry.toLocaleDateString()}`
                });
            }

            // Check Pink Slip expiry
            const pinkSlipExpiry = new Date(vehicle.pink_slip_expiry);
            pinkSlipExpiry.setHours(0, 0, 0, 0);
            if (pinkSlipExpiry < today) {
                issues.push({
                    type: AlertType.PINK_SLIP_EXPIRY,
                    message: `Pink Slip (Safety Check) expired on ${vehicle.pink_slip_expiry.toLocaleDateString()}`
                });
            }

            if (issues.length > 0) {
                // Suspend vehicle and create alerts atomically
                await prisma.$transaction(async (tx) => {
                    // Suspend vehicle
                    await tx.vehicle.update({
                        where: { id: vehicle.id },
                        data: { status: VehicleStatus.SUSPENDED }
                    });

                    // Create alerts for each issue
                    for (const issue of issues) {
                        // Check if alert already exists
                        const existingAlert = await tx.alert.findFirst({
                            where: {
                                vehicle_id: vehicle.id,
                                type: issue.type,
                                resolved: false
                            }
                        });

                        if (!existingAlert) {
                            await tx.alert.create({
                                data: {
                                    type: issue.type,
                                    message: `${vehicle.plate}: ${issue.message}`,
                                    vehicle_id: vehicle.id
                                }
                            });
                        }
                    }
                });

                results.push({
                    vehicleId: vehicle.id,
                    plate: vehicle.plate,
                    issues: issues.map(i => i.type),
                    status: 'suspended'
                });
            }
        }

        return {
            checkedCount: vehicles.length,
            suspendedCount: results.length,
            details: results
        };
    }

    /**
     * Get all unresolved alerts
     */
    static async getUnresolvedAlerts() {
        return prisma.alert.findMany({
            where: { resolved: false },
            include: { vehicle: true },
            orderBy: { created_at: 'desc' }
        });
    }

    /**
     * Resolve an alert
     */
    static async resolveAlert(alertId: string) {
        return prisma.alert.update({
            where: { id: alertId },
            data: {
                resolved: true,
                resolved_at: new Date()
            }
        });
    }

    /**
     * Get upcoming expiries (within 30 days)
     */
    static async getUpcomingExpiries() {
        const today = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(today.getDate() + 30);

        const vehicles = await prisma.vehicle.findMany({
            where: {
                status: { not: VehicleStatus.SUSPENDED },
                OR: [
                    { rego_expiry: { lte: thirtyDaysFromNow } },
                    { ctp_expiry: { lte: thirtyDaysFromNow } },
                    { pink_slip_expiry: { lte: thirtyDaysFromNow } }
                ]
            }
        });

        return vehicles.map(v => {
            const expiries: string[] = [];
            if (v.rego_expiry <= thirtyDaysFromNow) {
                expiries.push(`Rego: ${v.rego_expiry.toLocaleDateString()}`);
            }
            if (v.ctp_expiry <= thirtyDaysFromNow) {
                expiries.push(`CTP: ${v.ctp_expiry.toLocaleDateString()}`);
            }
            if (v.pink_slip_expiry <= thirtyDaysFromNow) {
                expiries.push(`Pink Slip: ${v.pink_slip_expiry.toLocaleDateString()}`);
            }
            return {
                vehicleId: v.id,
                plate: v.plate,
                upcomingExpiries: expiries
            };
        });
    }
}
