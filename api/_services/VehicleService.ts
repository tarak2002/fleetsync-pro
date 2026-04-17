import { supabase } from '../_lib/supabase.js';
import { VehicleStatus } from '../_lib/database.types.js';

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
        const { data: vehicle, error: fetchErr } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', vehicle_id)
            .single();

        if (fetchErr || !vehicle) {
            throw new Error('Vehicle not found');
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const issues: string[] = [];

        // Check rego expiry
        if (new Date(vehicle.rego_expiry) < today) {
            issues.push('Registration has expired');
        }

        // Check CTP (Green Slip) expiry
        if (new Date(vehicle.ctp_expiry) < today) {
            issues.push('CTP (Green Slip) has expired');
        }

        // Check Pink Slip expiry
        if (new Date(vehicle.pink_slip_expiry) < today) {
            issues.push('Pink Slip (Safety Check) has expired');
        }

        const isCompliant = issues.length === 0;

        // Auto-suspend if not compliant
        if (!isCompliant && vehicle.status !== 'SUSPENDED' as VehicleStatus) {
            await supabase
                .from('vehicles')
                .update({ 
                    status: 'SUSPENDED' as VehicleStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', vehicle_id);
        }

        const { data: finalVehicle } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', vehicle_id)
            .single();

        return {
            isCompliant,
            issues,
            vehicle: finalVehicle
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
        const { data: vehicles, error } = await supabase
            .from('vehicles')
            .select('*, rentals(*, driver:drivers(*))')
            .eq('rentals.status', 'ACTIVE') // Filter relation
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (vehicles || []).map(vehicle => ({
            ...vehicle,
            compliance: {
                rego: this.getComplianceStatus(new Date(vehicle.rego_expiry)),
                ctp: this.getComplianceStatus(new Date(vehicle.ctp_expiry)),
                pinkSlip: this.getComplianceStatus(new Date(vehicle.pink_slip_expiry))
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
        const { data: vehicle, error } = await supabase
            .from('vehicles')
            .insert({
                ...data,
                rego_expiry: data.rego_expiry.toISOString(),
                ctp_expiry: data.ctp_expiry.toISOString(),
                pink_slip_expiry: data.pink_slip_expiry.toISOString(),
                status: 'DRAFT' as VehicleStatus,
                updated_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;
        return vehicle;
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
        // Formulate update data
        const updateData: any = { ...data, updated_at: new Date().toISOString() };
        if (data.rego_expiry) updateData.rego_expiry = data.rego_expiry.toISOString();
        if (data.ctp_expiry) updateData.ctp_expiry = data.ctp_expiry.toISOString();
        if (data.pink_slip_expiry) updateData.pink_slip_expiry = data.pink_slip_expiry.toISOString();

        const { error: updateErr } = await supabase
            .from('vehicles')
            .update(updateData)
            .eq('id', id);

        if (updateErr) throw updateErr;

        // Re-validate compliance after update
        await this.validateCompliance(id);

        const { data: vehicle, error: fetchErr } = await supabase
            .from('vehicles')
            .select('*')
            .eq('id', id)
            .single();
            
        if (fetchErr) throw fetchErr;
        return vehicle;
    }

    /**
     * Delete vehicle (only if not rented)
     */
    static async delete(id: string) {
        const { data: vehicle, error: fetchErr } = await supabase
            .from('vehicles')
            .select('*, rentals(*)')
            .eq('id', id)
            .eq('rentals.status', 'ACTIVE')
            .single();

        if (fetchErr || !vehicle) {
            throw new Error('Vehicle not found');
        }

        if ((vehicle.rentals || []).length > 0) {
            throw new Error('Cannot delete vehicle with active rental');
        }

        const { error: deleteErr } = await supabase
            .from('vehicles')
            .delete()
            .eq('id', id);

        if (deleteErr) throw deleteErr;
        return { id, success: true };
    }
}
