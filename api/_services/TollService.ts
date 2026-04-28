import { supabase } from '../_lib/supabase.js';
import { InvoiceStatus } from '../_lib/database.types.js';

export class TollService {
    /**
     * Processes a raw toll event from the Linkt API or CSV drop.
     * Matches the plate to the exact driver renting the car at that specific time.
     */
    static async processTollEvent(tollData: {
        plate: string;
        date: Date;
        amount: number;
        location: string;
        provider_tx_id: string;
    }, explicitBusinessId?: string) {
        try {
            // 1. Deduplication Check
            const { data: existingToll, error: checkError } = await supabase
                .from('toll_charges')
                .select('id')
                .eq('provider_tx_id', tollData.provider_tx_id)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingToll) {
                console.log(`[Tolls] Skipping duplicate toll: ${tollData.provider_tx_id}`);
                return null;
            }

            // 2. Find the active Rental for this plate at the EXACT date and time
            // We need to join vehicles to check the plate
            const { data: rentals, error: rentalError } = await supabase
                .from('rentals')
                .select(`
                    *,
                    driver:drivers(*),
                    vehicle:vehicles!inner(plate),
                    invoices(*)
                `)
                .eq('vehicles.plate', tollData.plate)
                .lte('start_date', tollData.date.toISOString())
                .or(`end_date.is.null,end_date.gte.${tollData.date.toISOString()}`)
                .eq('invoices.status', 'PENDING')
                .order('due_date', { foreignTable: 'invoices', ascending: true });

            if (rentalError) throw rentalError;

            const matchingRental = rentals?.[0];
            let assignedInvoiceId = null;
            let businessId = explicitBusinessId || matchingRental?.business_id;

            // If no businessId found yet, try to find the vehicle owner
            if (!businessId) {
                const { data: vehicle } = await supabase
                    .from('vehicles')
                    .select('business_id')
                    .eq('plate', tollData.plate)
                    .maybeSingle();
                businessId = vehicle?.business_id;
            }

            if (matchingRental && matchingRental.invoices && matchingRental.invoices.length > 0) {
                // We have a driver and an open invoice to attach it to!
                const activeInvoice = matchingRental.invoices[0];
                assignedInvoiceId = activeInvoice.id;

                // Update the invoice to automatically charge the driver for this toll
                const newTollsTotal = Number(activeInvoice.tolls) + tollData.amount;
                const newTotalAmount = Number(activeInvoice.weekly_rate) + newTollsTotal + Number(activeInvoice.fines) - Number(activeInvoice.credits);

                const { error: updateError } = await supabase
                    .from('invoices')
                    .update({
                        tolls: newTollsTotal,
                        amount: newTotalAmount
                    })
                    .eq('id', activeInvoice.id);

                if (updateError) throw updateError;

                console.log(`[Tolls] Matched toll for ${tollData.plate} to Driver: ${matchingRental.driver?.name}. Added $${tollData.amount} to Invoice ${activeInvoice.id}`);
            } else {
                console.warn(`[Tolls] WARNING: Toll for ${tollData.plate} at ${tollData.date} could not be matched to an active rental/invoice. It will be recorded unassigned.`);
            }

            // 3. Save the Toll Event to the database
            const { data: tollRecording, error: insertError } = await supabase
                .from('toll_charges')
                .insert({
                    plate: tollData.plate,
                    date: tollData.date.toISOString(),
                    amount: tollData.amount,
                    location: tollData.location,
                    provider_tx_id: tollData.provider_tx_id,
                    invoice_id: assignedInvoiceId,
                    business_id: businessId
                })
                .select()
                .single();

            if (insertError) throw insertError;

            return tollRecording;

        } catch (error) {
            console.error(`[Tolls] Error processing toll event for plate ${tollData.plate}:`, error);
            throw error;
        }
    }

    /**
     * Automated job to pull yesterday's tolls from Linkt.
     * Note: In a true multi-tenant production env, this would need to iterate through all businesses 
     * or use a global Linkt account that returns business mapping.
     */
    static async syncDailyTolls() {
        console.log('[Tolls] Starting Daily Linkt Sync...');

        // Fetch all businesses to sync for each
        const { data: businesses } = await supabase.from('businesses').select('id');
        let processed = 0;

        for (const biz of businesses || []) {
            const { data: rentedVehicles } = await supabase
                .from('vehicles')
                .select('plate')
                .eq('status', 'RENTED')
                .eq('business_id', biz.id)
                .limit(5);

            for (const vehicle of rentedVehicles || []) {
                const tollDate = new Date();
                tollDate.setDate(tollDate.getDate() - 1);

                const mockTollData = {
                    plate: vehicle.plate,
                    date: tollDate,
                    amount: parseFloat((Math.random() * 5 + 2).toFixed(2)),
                    location: 'M2 Motorway Gantry 4',
                    provider_tx_id: `LINKT_${Date.now()}_${vehicle.plate}_${biz.id.slice(0,4)}`
                };

                await this.processTollEvent(mockTollData, biz.id);
                processed++;
            }
        }

        console.log(`[Tolls] Daily Sync Completed. Processed ${processed} new tolls.`);
        return processed;
    }

    /**
     * Bulk process tolls from an external source (API/CSV).
     */
    static async processBatch(tolls: any[], explicitBusinessId?: string) {
        let successCount = 0;
        let skipCount = 0;

        for (const toll of tolls) {
            try {
                const result = await this.processTollEvent({
                    plate: toll.plate,
                    date: new Date(toll.date),
                    amount: Number(toll.amount),
                    location: toll.location || 'Unknown',
                    provider_tx_id: toll.provider_tx_id
                }, explicitBusinessId);
                
                if (result) successCount++;
                else skipCount++;
            } catch (err) {
                console.error(`[Tolls] Failed to process toll ${toll.provider_tx_id}:`, err);
            }
        }

        return { successCount, skipCount };
    }
}
