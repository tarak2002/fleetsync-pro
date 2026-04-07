import { prisma } from '../index.js';
import { VehicleStatus } from '@prisma/client';

export class VehicleService {
    /**
     * Validate vehicle compliance based on NSW requirements
     * If any expiry date < today, set status to SUSPENDED
     */
    static async validateCompliance(vehicle_id: string): Promise<{
        isCompliant: boolean;
        issues: string[];
        vehicle: any;
    }> {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id: vehicle_id }
        });

        if (!vehicle) {
            throw new Error('Vehicle not found');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const issues: string[] = [];

        // Check rego expiry
        if (vehicle.rego_expiry < today) {
            issues.push('Registration has expired');
        }

        // Check CTP (Green Slip) expiry
        if (vehicle.ctp_expiry < today) {
            issues.push('CTP (Green Slip) has expired');
        }

        // Check Pink Slip expiry
        if (vehicle.pink_slip_expiry < today) {
            issues.push('Pink Slip (Safety Check) has expired');
        }

        const isCompliant = issues.length === 0;

        // Auto-suspend if not compliant
        if (!isCompliant && vehicle.status !== VehicleStatus.SUSPENDED) {
            await prisma.vehicle.update({
                where: { id: vehicle_id },
                data: { status: VehicleStatus.SUSPENDED }
            });
        }

        return {
            isCompliant,
            issues,
            vehicle: await prisma.vehicle.findUnique({ where: { id: vehicle_id } })
        };
    }

    /**
     * Get compliance status for all dates
     * Returns "traffic light" status: GREEN (>30 days), AMBER (<30 days), RED (expired)
     */
    static getComplianceStatus(expiryDate: Date): 'GREEN' | 'AMBER' | 'RED' {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'RED';
        if (diffDays <= 30) return 'AMBER';
        return 'GREEN';
    }

    /**
     * Get all vehicles with compliance status
     */
    static async getAllWithCompliance() {
        const vehicles = await prisma.vehicle.findMany({
            include: {
                rentals: {
                    where: { status: 'ACTIVE' },
                    include: { driver: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return vehicles.map(vehicle => ({
            ...vehicle,
            rego_expiry: vehicle.rego_expiry,
            ctp_expiry: vehicle.ctp_expiry,
            pink_slip_expiry: vehicle.pink_slip_expiry,
            weekly_rate: vehicle.weekly_rate,
            bond_amount: vehicle.bond_amount,
            created_at: vehicle.created_at,
            updated_at: vehicle.updated_at,
            compliance: {
                rego: this.getComplianceStatus(vehicle.rego_expiry),
                ctp: this.getComplianceStatus(vehicle.ctp_expiry),
                pinkSlip: this.getComplianceStatus(vehicle.pink_slip_expiry)
            },
            current_driver: vehicle.rentals?.[0]?.driver || null
        }));
    }

    /**
     * Create a new vehicle
     */
    static async create(data: {
        vin: string;
        plate: string;
        make: string;
        model: string;
        year: number;
        color: string;
        rego_expiry: Date;
        ctp_expiry: Date;
        pink_slip_expiry: Date;
        weekly_rate?: number;
        bond_amount?: number;
        insurance_cost?: number;
        rego_doc?: string;
        ctp_doc?: string;
        pink_slip_doc?: string;
    }) {
        return prisma.vehicle.create({
            data: {
                ...data,
                status: VehicleStatus.DRAFT
            }
        });
    }

    /**
     * Update vehicle and check compliance
     */
    static async update(id: string, data: Partial<{
        vin: string;
        plate: string;
        make: string;
        model: string;
        year: number;
        color: string;
        status: VehicleStatus;
        rego_expiry: Date;
        ctp_expiry: Date;
        pink_slip_expiry: Date;
        weekly_rate: number;
        bond_amount: number;
        insurance_cost: number;
        rego_doc: string;
        ctp_doc: string;
        pink_slip_doc: string;
    }>) {
        const vehicle = await prisma.vehicle.update({
            where: { id },
            data
        });

        // Re-validate compliance after update
        await this.validateCompliance(id);

        return prisma.vehicle.findUnique({ where: { id } });
    }

    /**
     * Delete vehicle (only if not rented)
     */
    static async delete(id: string) {
        const vehicle = await prisma.vehicle.findUnique({
            where: { id },
            include: { rentals: { where: { status: 'ACTIVE' } } }
        });

        if (!vehicle) {
            throw new Error('Vehicle not found');
        }

        if (vehicle.rentals.length > 0) {
            throw new Error('Cannot delete vehicle with active rental');
        }

        return prisma.vehicle.delete({ where: { id } });
    }
}
