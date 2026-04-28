import 'dotenv/config';

// Vercel cron handler for daily billing cycle
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { BillingService } = await import('../_services/BillingService.js');
    const results = await BillingService.runBillingCycle();
    return res.status(200).json({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error('[Cron/Billing] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}