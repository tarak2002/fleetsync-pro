import type { DatabaseClient } from '../_lib/DatabaseClient.js';

export interface RentalInput {
  driver_id: string;
  vehicle_id: string;
  bond_amount: number;
  weekly_rate: number;
  start_date?: Date;
  business_id: string;
}

export class RentalFactory {
  constructor(private db: DatabaseClient) {}

  async createRental(input: RentalInput) {
    // 1. Check vehicle
    const vehicle = await this.db
      .from('vehicles')
      .select('status')
      .eq('id', input.vehicle_id)
      .eq('business_id', input.business_id)
      .single();

    if (vehicle.error || !vehicle.data) {
      throw new Error('Vehicle not found');
    }

    if (vehicle.data.status === 'RENTED') {
      throw new Error('Vehicle is already rented');
    }

    // 2. Check driver
    const driver = await this.db
      .from('drivers')
      .select('status')
      .eq('id', input.driver_id)
      .eq('business_id', input.business_id)
      .single();

    if (driver.error || !driver.data) {
      throw new Error('Driver not found');
    }

    if (driver.data.status === 'BLOCKED') {
      throw new Error('Driver is blocked');
    }

    if (driver.data.status !== 'ACTIVE') {
      throw new Error('Driver must be active');
    }

    // 3. Check no existing active rental
    const existing = await this.db
      .from('rentals')
      .select('id')
      .eq('driver_id', input.driver_id)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (existing.data) {
      throw new Error('Driver already has an active rental');
    }

    const start_date = input.start_date ?? new Date();
    const next_payment = new Date(start_date);
    next_payment.setDate(next_payment.getDate() + 7);

    // 4. Create rental
    const rental = await this.db
      .from('rentals')
      .insert({
        driver_id: input.driver_id,
        vehicle_id: input.vehicle_id,
        bond_amount: input.bond_amount,
        weekly_rate: input.weekly_rate,
        start_date: start_date.toISOString(),
        next_payment_date: next_payment.toISOString(),
        status: 'ACTIVE',
        business_id: input.business_id,
        updated_at: new Date().toISOString(),
      })
      .single();

    if (rental.error) throw new Error(rental.error.message);

    // 5. Mark vehicle RENTED
    await this.db
      .from('vehicles')
      .update({ status: 'RENTED', updated_at: new Date().toISOString() })
      .eq('id', input.vehicle_id)
      .eq('business_id', input.business_id);

    return rental.data;
  }

  async endRental(rental_id: string, business_id: string) {
    const rental = await this.db
      .from('rentals')
      .select('*')
      .eq('id', rental_id)
      .eq('business_id', business_id)
      .single();

    if (rental.error || !rental.data) {
      throw new Error('Rental not found');
    }

    if (rental.data.status !== 'ACTIVE') {
      throw new Error('Rental not active');
    }

    const ended = await this.db
      .from('rentals')
      .update({ status: 'COMPLETED', end_date: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', rental_id)
      .eq('business_id', business_id)
      .single();

    if (ended.error) throw new Error(ended.error.message);

    await this.db
      .from('vehicles')
      .update({ status: 'AVAILABLE', updated_at: new Date().toISOString() })
      .eq('id', (rental.data as any).vehicle_id)
      .eq('business_id', business_id);

    return ended.data;
  }
}