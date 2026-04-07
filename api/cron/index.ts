import cron from 'node-cron';
import { TollService } from '../_services/TollService.js';

export function initializeCronJobs() {
    console.log('[Cron] Initializing background jobs...');

    // Run every day at 2:00 AM (02:00) server time
    cron.schedule('0 2 * * *', async () => {
        try {
            console.log(`[Cron] Executing nightly Toll Sync at ${new Date().toISOString()}`);
            await TollService.syncDailyTolls();
        } catch (error) {
            console.error('[Cron] Nightly Toll Sync failed:', error);
        }
    });

    // You can add more cron jobs here (e.g., verifying rego expiry, processing overdue invoices via Stripe, etc.)
}
