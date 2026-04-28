import 'dotenv/config';
import { TollService } from './api/_services/TollService.js';
import { supabase } from './api/_lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';

async function verifyTollLogic() {
    console.log('🧪 Starting Toll Logic Verification...');

    const TEST_PLATE = `TEST-${Math.floor(Math.random() * 1000)}`;
    const driverEmail = `tester-${Date.now()}@example.com`;

    try {
        // 1. Setup Mock Data
        console.log('📝 Setting up test data...');
        
        // Create Vehicle
        const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: vehicle, error: vErr } = await supabase.from('vehicles').insert({
            plate: TEST_PLATE,
            vin: `VIN-${Date.now()}`,
            make: 'Tesla',
            model: 'Model 3',
            year: 2024,
            color: 'White',
            status: 'RENTED',
            rego_expiry: expiry,
            ctp_expiry: expiry,
            pink_slip_expiry: expiry
        }).select().single();
        if (vErr) throw vErr;

        // Create Driver
        const { data: driver, error: dErr } = await supabase.from('drivers').insert({
            name: 'API Tester',
            email: driverEmail,
            license_no: `LIC-${Date.now()}`,
            status: 'ACTIVE'
        }).select().single();
        if (dErr) throw dErr;

        // Create Rental (Active now)
        const startDate = new Date();
        startDate.setHours(startDate.getHours() - 1);
        
        const { data: rental, error: rErr } = await supabase.from('rentals').insert({
            driver_id: driver.id,
            vehicle_id: vehicle.id,
            start_date: startDate.toISOString(),
            status: 'ACTIVE',
            weekly_rate: 300,
            bond_amount: 1000,
            next_payment_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }).select().single();
        if (rErr) throw rErr;

        // Create Pending Invoice
        const { data: invoice, error: iErr } = await supabase.from('invoices').insert({
            rental_id: rental.id,
            amount: 300,
            weekly_rate: 300,
            tolls: 0,
            status: 'PENDING',
            due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }).select().single();
        if (iErr) throw iErr;

        console.log(`✅ Test environment ready. Invoice ID: ${invoice.id}, Plate: ${TEST_PLATE}`);

        // 2. Trigger Toll Sync
        console.log('📡 Simulating Toll Sync API call...');
        const tollAmount = 15.75;
        const txId = `TX-${uuidv4()}`;

        const result = await TollService.processTollEvent({
            plate: TEST_PLATE,
            date: new Date(), // Within rental period
            amount: tollAmount,
            location: 'Sydney Harbour Bridge',
            provider_tx_id: txId
        });

        if (!result) throw new Error('Toll processing returned null');

        // 3. Verify Results
        console.log('🔍 Verifying database updates...');
        
        const { data: updatedInvoice } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', invoice.id)
            .single();

        console.log(`📊 Initial Amount: $${invoice.amount}`);
        console.log(`📊 Updated Amount: $${updatedInvoice.amount}`);
        console.log(`📊 Tolls Field: $${updatedInvoice.tolls}`);

        if (Number(updatedInvoice.tolls) === tollAmount && Number(updatedInvoice.amount) === (300 + tollAmount)) {
            console.log('✨ VERIFICATION SUCCESSFUL: Toll was correctly assigned and billed!');
        } else {
            throw new Error('Verification failed: Invoice amounts do not match expected values.');
        }

    } catch (error: any) {
        console.error('❌ Verification Failed:', error.message);
    } finally {
        console.log('🧹 Cleanup is not performed to allow manual inspection of test data if needed.');
        process.exit(0);
    }
}

verifyTollLogic();
