import { prisma } from '../index.js';
import { InvoiceStatus } from '@prisma/client';

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
    }) {
        try {
            // 1. Deduplication Check
            const existingToll = await prisma.tollCharge.findUnique({
                where: { provider_tx_id: tollData.provider_tx_id }
            });

            if (existingToll) {
                console.log(`[Tolls] Skipping duplicate toll: ${tollData.provider_tx_id}`);
                return null;
            }

            // 2. Find the active Rental for this plate at the EXACT date and time
            const matchingRental = await prisma.rental.findFirst({
                where: {
                    vehicle: { plate: tollData.plate },
                    start_date: { lte: tollData.date },
                    OR: [
                        { end_date: null }, // Ongoing rental
                        { end_date: { gte: tollData.date } } // Rental ended but was active during the toll
                    ]
                },
                include: {
                    driver: true,
                    invoices: {
                        where: { status: InvoiceStatus.PENDING },
                        orderBy: { due_date: 'asc' },
                        take: 1
                    }
                }
            });

            let assignedInvoiceId = null;

            if (matchingRental && matchingRental.invoices.length > 0) {
                // We have a driver and an open invoice to attach it to!
                const activeInvoice = matchingRental.invoices[0];
                assignedInvoiceId = activeInvoice.id;

                // Update the invoice to automatically charge the driver for this toll
                const newTollsTotal = Number(activeInvoice.tolls) + tollData.amount;
                const newTotalAmount = Number(activeInvoice.weekly_rate) + newTollsTotal + Number(activeInvoice.fines) - Number(activeInvoice.credits);

                await prisma.invoice.update({
                    where: { id: activeInvoice.id },
                    data: {
                        tolls: newTollsTotal,
                        amount: newTotalAmount
                    }
                });

                console.log(`[Tolls] Matched toll for ${tollData.plate} to Driver: ${matchingRental.driver.name}. Added $${tollData.amount} to Invoice ${activeInvoice.id}`);
            } else {
                console.warn(`[Tolls] WARNING: Toll for ${tollData.plate} at ${tollData.date} could not be matched to an active rental/invoice. It will be recorded unassigned.`);
            }

            // 3. Save the Toll Event to the database
            const tollRecording = await prisma.tollCharge.create({
                data: {
                    plate: tollData.plate,
                    date: tollData.date,
                    amount: tollData.amount,
                    location: tollData.location,
                    provider_tx_id: tollData.provider_tx_id,
                    invoice_id: assignedInvoiceId
                }
            });

            return tollRecording;

        } catch (error) {
            console.error(`[Tolls] Error processing toll event for plate ${tollData.plate}:`, error);
            throw error;
        }
    }

    /**
     * Automated job to pull yesterday's tolls from Linkt.
     * In a real implementation, this would use the LINKT_CLIENT_ID to pull from their SOAP/REST API
     * or process an SFTP CSV file drop.
     */
    static async syncDailyTolls() {
        console.log('[Tolls] Starting Daily Linkt Sync...');

        // --- MOCK LINKT API DATA IMPLEMENTATION --- 
        // We simulate polling the provider for new tolls on our fleet vehicles

        const rentedVehicles = await prisma.vehicle.findMany({
            where: { status: 'RENTED' },
            take: 3 // Let's simulate hits on 3 cars
        });

        let processed = 0;

        for (const vehicle of rentedVehicles) {
            // Generate a fake toll event for yesterday
            const tollDate = new Date();
            tollDate.setDate(tollDate.getDate() - 1);

            const mockTollData = {
                plate: vehicle.plate,
                date: tollDate,
                amount: parseFloat((Math.random() * 5 + 2).toFixed(2)), // Random $2 - $7
                location: 'M2 Motorway Gantry 4',
                provider_tx_id: `LINKT_${Date.now()}_${vehicle.plate}` // Unique Hash
            };

            await this.processTollEvent(mockTollData);
            processed++;
        }

        console.log(`[Tolls] Daily Sync Completed. Processed ${processed} new tolls.`);
        return processed;
    }
}
