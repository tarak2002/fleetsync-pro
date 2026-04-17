import { supabase } from '../_lib/supabase.js';
import { InvoiceStatus } from '../_lib/database.types.js';
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
        const { data: rental, error: fetchErr } = await supabase
            .from('rentals')
            .select('*, driver:drivers(*)')
            .eq('id', rental_id)
            .single();

        if (fetchErr || !rental) {
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

        const { data: invoice, error: invErr } = await supabase
            .from('invoices')
            .insert({
                rental_id: rental_id,
                weekly_rate,
                tolls,
                fines,
                credits,
                amount,
                due_date: due_date.toISOString(),
                status: 'PENDING' as InvoiceStatus,
                updated_at: new Date().toISOString()
            })
            .select('*, rental:rentals(*, driver:drivers(*), vehicle:vehicles(*))')
            .single();

        if (invErr) throw invErr;

        // Update next payment date on rental (normalize to midnight)
        const next_payment_date = new Date(rental.next_payment_date);
        next_payment_date.setDate(next_payment_date.getDate() + 7);
        next_payment_date.setHours(0, 0, 0, 0);

        await supabase
            .from('rentals')
            .update({ 
                next_payment_date: next_payment_date.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', rental_id);

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
                const { data: existingInvoice } = await supabase
                    .from('invoices')
                    .select('id')
                    .eq('rental_id', rental.id)
                    .gte('due_date', rental.next_payment_date)
                    .maybeSingle();

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
        const { data: currentInvoice, error: fetchErr } = await supabase
            .from('invoices')
            .select('*, rental:rentals(driver_id)')
            .eq('id', invoice_id)
            .single();
            
        if (fetchErr || !currentInvoice) throw new Error('Invoice not found');

        const { data: invoice, error: updateErr } = await supabase
            .from('invoices')
            .update({
                status: 'PAID' as InvoiceStatus,
                paid_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', invoice_id)
            .select('*, rental:rentals(*, driver:drivers(*))')
            .single();

        if (updateErr) throw updateErr;

        // Adjust driver balance
        const amount = Number(invoice.amount);
        
        // Fetch current balance
        const { data: driver } = await supabase
            .from('drivers')
            .select('balance')
            .eq('id', invoice.rental.driver_id)
            .single();
            
        if (driver) {
            await supabase
                .from('drivers')
                .update({ 
                    balance: Number(driver.balance) - amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', invoice.rental.driver_id);
        }

        return invoice;
    }

    /**
     * Check and mark overdue invoices
     */
    static async checkOverdueInvoices() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
            .from('invoices')
            .update({ 
                status: 'OVERDUE' as InvoiceStatus,
                updated_at: new Date().toISOString()
            })
            .eq('status', 'PENDING' as InvoiceStatus)
            .lt('due_date', today.toISOString())
            .select();

        if (error) throw error;
        return data;
    }

    /**
     * Get all invoices with optional filters
     */
    static async getInvoices(filters?: {
        status?: InvoiceStatus;
        rental_id?: string;
        driver_id?: string;
    }) {
        let query = supabase
            .from('invoices')
            .select('*, rental:rentals(*, driver:drivers(*), vehicle:vehicles(*))');

        if (filters?.status) query = query.eq('status', filters.status);
        if (filters?.rental_id) query = query.eq('rental_id', filters.rental_id);
        
        if (filters?.driver_id) {
            // Two-step lookup since Supabase doesn't support nested where on relations well
            const { data: rentals } = await supabase
                .from('rentals')
                .select('id')
                .eq('driver_id', filters.driver_id);
            const ids = (rentals || []).map(r => r.id);
            query = query.in('rental_id', ids.length ? ids : ['__none__']);
        }

        const { data, error } = await query.order('due_date', { ascending: false });
        if (error) throw error;
        return data;
    }
}
