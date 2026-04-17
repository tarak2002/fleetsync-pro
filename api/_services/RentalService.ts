import { supabase } from '../_lib/supabase.js';
import { RentalStatus, VehicleStatus, DriverStatus } from '../_lib/database.types.js';

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
        const { data: vehicle, error: vErr } = await supabase
            .from('vehicles')
            .select('status')
            .eq('id', data.vehicle_id)
            .single();

        if (vErr || !vehicle) {
            throw new Error('Vehicle not found');
        }

        if (vehicle.status === 'SUSPENDED' as VehicleStatus) {
            throw new Error('Cannot assign a suspended vehicle');
        }

        if (vehicle.status === 'RENTED' as VehicleStatus) {
            throw new Error('Vehicle is already rented');
        }

        // Check driver status
        const { data: driver, error: dErr } = await supabase
            .from('drivers')
            .select('status')
            .eq('id', data.driver_id)
            .single();

        if (dErr || !driver) {
            throw new Error('Driver not found');
        }

        if (driver.status === 'BLOCKED' as DriverStatus) {
            throw new Error('Cannot assign vehicle to blocked driver');
        }

        if (driver.status !== 'ACTIVE' as DriverStatus) {
            throw new Error('Driver must be active to rent a vehicle');
        }

        // Check driver doesn't already have an active rental
        const { data: existingRental } = await supabase
            .from('rentals')
            .select('id')
            .eq('driver_id', data.driver_id)
            .eq('status', 'ACTIVE' as RentalStatus)
            .maybeSingle();

        if (existingRental) {
            throw new Error('Driver already has an active rental');
        }

        const start_date = data.start_date || new Date();
        const next_payment_date = new Date(start_date);
        next_payment_date.setDate(next_payment_date.getDate() + 7);

        // Supabase JS doesn't support transactions easily on the client.
        // We will perform operations sequentially for this prototype.
        
        // 1. Create rental
        const { data: rental, error: rentalErr } = await supabase
            .from('rentals')
            .insert({
                driver_id: data.driver_id,
                vehicle_id: data.vehicle_id,
                start_date: start_date.toISOString(),
                bond_amount: data.bond_amount,
                weekly_rate: data.weekly_rate,
                next_payment_date: next_payment_date.toISOString(),
                status: 'ACTIVE' as RentalStatus,
                updated_at: new Date().toISOString()
            })
            .select('*, driver:drivers(*), vehicle:vehicles(*)')
            .single();

        if (rentalErr) throw rentalErr;

        // 2. Update vehicle status to RENTED
        const { error: vehicleUpdateErr } = await supabase
            .from('vehicles')
            .update({ 
                status: 'RENTED' as VehicleStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', data.vehicle_id);

        if (vehicleUpdateErr) {
            // Rollback rental manual deletion if vehicle update fails (simple case)
            await supabase.from('rentals').delete().eq('id', rental.id);
            throw vehicleUpdateErr;
        }

        return rental;
    }

    /**
     * End a rental
     */
    static async endRental(rental_id: string) {
        const { data: rental, error: fetchErr } = await supabase
            .from('rentals')
            .select('*')
            .eq('id', rental_id)
            .single();

        if (fetchErr || !rental) {
            throw new Error('Rental not found');
        }

        if (rental.status !== 'ACTIVE' as RentalStatus) {
            throw new Error('Rental is not active');
        }

        // 1. End rental
        const { data: updatedRental, error: rentalErr } = await supabase
            .from('rentals')
            .update({
                status: 'COMPLETED' as RentalStatus,
                end_date: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', rental_id)
            .select('*, driver:drivers(*), vehicle:vehicles(*)')
            .single();

        if (rentalErr) throw rentalErr;

        // 2. Make vehicle available
        await supabase
            .from('vehicles')
            .update({ 
                status: 'AVAILABLE' as VehicleStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', rental.vehicle_id);

        return updatedRental;
    }

    /**
     * Get all active rentals
     */
    static async getActiveRentals() {
        const { data, error } = await supabase
            .from('rentals')
            .select('*, driver:drivers(*), vehicle:vehicles(*), invoices(*)')
            .eq('status', 'ACTIVE' as RentalStatus)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Sorting and taking 3 invoices in-memory since Supabase nested limit is complex
        return (data || []).map(rental => ({
            ...rental,
            invoices: (rental.invoices || [])
                .sort((a: any, b: any) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
                .slice(0, 3)
        }));
    }

    /**
     * Get rentals due for invoicing (payment date within 3 days)
     */
    static async getRentalsDueForInvoicing() {
        const today = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(today.getDate() + 3);

        const { data, error } = await supabase
            .from('rentals')
            .select('*, driver:drivers(*), vehicle:vehicles(*)')
            .eq('status', 'ACTIVE' as RentalStatus)
            .lte('next_payment_date', threeDaysFromNow.toISOString());

        if (error) throw error;
        return data;
    }
}
