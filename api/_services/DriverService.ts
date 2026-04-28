import { supabase } from '../_lib/supabase.js';
import { VevoStatus, DriverStatus } from '../_lib/database.types.js';
import { VevoService } from './VevoService.js';
import { StripeService } from './StripeService.js';

export class DriverService {
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
 user_id?: string;
 business_id: string;
 }) {
 // SEC-28 FIX: Validate license_no is non-empty
 if (!data.license_no || data.license_no.trim() === '') {
 throw new Error('License number is required');
 }

 // Check for existing driver
 const { data: existingDriver } = await supabase
 .from('drivers')
 .select('id')
 .eq('business_id', data.business_id)
 .or(`email.eq.${data.email},license_no.eq.${data.license_no}`)
 .maybeSingle();

 if (existingDriver) {
 throw new Error('Driver with this email or license already exists');
 }

 // Perform VEVO check if passport provided
 let vevo_status: VevoStatus = 'PENDING';
 if (data.passport_no) {
 vevo_status = await VevoService.checkVisaStatus(data.passport_no);
 }

 // Determine initial status based on VEVO
 const status: DriverStatus = vevo_status === 'DENIED'
 ? 'BLOCKED'
 : 'PENDING_APPROVAL';

 const { data: driver, error } = await supabase
 .from('drivers')
 .insert({
 name: data.name,
 email: data.email,
 phone: data.phone,
 license_no: data.license_no,
 license_expiry: data.license_expiry?.toISOString(),
 vevo_status,
 vevo_checked_at: data.passport_no ? new Date().toISOString() : null,
 status,
 user_id: data.user_id,
 business_id: data.business_id,
 updated_at: new Date().toISOString()
 })
 .select()
 .single();

 if (error) throw error;
 return driver;
 }

/**
 * Run VEVO check on existing driver
 */
 static async runVevoCheck(driver_id: string, businessId: string) {
 const { data: driver, error: fetchErr } = await supabase
 .from('drivers')
 .select('*')
 .eq('id', driver_id)
 .eq('business_id', businessId)
 .single();

 if (fetchErr || !driver) {
 throw new Error('Driver not found');
 }

 if (!driver.passport_no) {
 throw new Error('No passport number on file');
 }

 const vevo_status = await VevoService.checkVisaStatus(driver.passport_no);

 const { data: updated, error: updateErr } = await supabase
 .from('drivers')
 .update({
 vevo_status,
 vevo_checked_at: new Date().toISOString(),
 status: vevo_status === 'DENIED'
 ? 'BLOCKED'
 : driver.status,
 updated_at: new Date().toISOString()
 })
 .eq('id', driver_id)
 .eq('business_id', businessId)
 .select()
 .single();

 if (updateErr) throw updateErr;
 return updated;
 }

/**
 * Approve a pending driver
 */
 static async approveDriver(driver_id: string, businessId: string) {
 const { data: driver, error: fetchErr } = await supabase
 .from('drivers')
 .select('*')
 .eq('id', driver_id)
 .eq('business_id', businessId)
 .single();

 if (fetchErr || !driver) {
 throw new Error('Driver not found');
 }

 if (driver.vevo_status === 'DENIED' || driver.vevo_status === 'RESTRICTED') {
 throw new Error('Cannot approve driver with denied or restricted VEVO status');
 }

 // Automatic Stripe Customer Generation
 try {
 await StripeService.createCustomer(driver.id, driver.email, driver.name);
 } catch (e: any) {
 console.error(`Failed to create Stripe customer for ${driver.email}`, e);
 }

 const { data: updated, error: updateErr } = await supabase
 .from('drivers')
 .update({
 status: 'ACTIVE',
 updated_at: new Date().toISOString()
 })
 .eq('id', driver_id)
 .eq('business_id', businessId)
 .select()
 .single();

 if (updateErr) throw updateErr;
 return updated;
 }

/**
 * Block a driver
 */
 static async blockDriver(driver_id: string, businessId: string, reason?: string) {
 if (reason) {
 console.log(`Blocking driver ${driver_id} for reason: ${reason}`);
 }
 const { data, error } = await supabase
 .from('drivers')
 .update({
 status: 'BLOCKED',
 updated_at: new Date().toISOString()
 })
 .eq('id', driver_id)
 .eq('business_id', businessId)
 .select()
 .single();

 if (error) throw error;
 return data;
 }

    /**
     * Get all drivers with optional status filter
     */
    static async getAll(status?: DriverStatus) {
        let query = supabase.from('drivers').select('*, rentals(*, vehicle:vehicles(*))');
        
        if (status) {
            query = query.eq('status', status);
        }

        const { data, error } = await query
            .eq('rentals.status', 'ACTIVE') // Filter nested rentals
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }

    /**
     * Get driver by ID with full details
     */
    static async getById(id: string) {
        const { data, error } = await supabase
            .from('drivers')
            .select('*, rentals(*, vehicle:vehicles(*), invoices(*))')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    }

    /**
     * Update driver balance
     */
static async updateBalance(driver_id: string, amount: number) {
    // SEC-07 FIX: Use integer cents to avoid floating-point errors
    const amountCents = Math.round(amount * 100);

    // Try atomic RPC first
    const { error: rpcErr } = await supabase.rpc('adjust_balance_cents', {
      p_driver_id: driver_id,
      p_amount_cents: amountCents
    });

    if (rpcErr) {
      console.error('[DriverService] RPC failed, falling back to direct update');
      // Fallback: read-then-write with integer math
      const { data: driver, error: fetchErr } = await supabase
        .from('drivers')
        .select('balance')
        .eq('id', driver_id)
        .single();

      if (fetchErr || !driver) throw new Error('Driver not found');

      const currentCents = Math.round(Number(driver.balance) * 100);
      const newBalanceCents = currentCents + amountCents;

      const { data, error: updateErr } = await supabase
        .from('drivers')
        .update({ balance: newBalanceCents / 100, updated_at: new Date().toISOString() })
        .eq('id', driver_id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      return data;
    }
    return null;
  }
}
