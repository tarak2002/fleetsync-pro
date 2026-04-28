import 'dotenv/config';

// Vercel cron handler for toll sync
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Optional: verify a secret header for cron security
  const cronSecret = req.headers['x-cron-secret'];
  if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { TollService } = await import('../_services/TollService.js');
    const result = await TollService.syncDailyTolls();
    return res.status(200).json({ success: true, processed: result });
  } catch (error: any) {
    console.error('[Cron/Tolls] Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}