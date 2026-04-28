import 'dotenv/config';
import { supabase } from '../_lib/supabase.js';

// Vercel cron handler for daily compliance check
export default async function handler(req: any, res: any) {
 if (req.method !== 'POST') {
 return res.status(405).json({ error: 'Method not allowed' });
 }

 const cronSecret = req.headers['x-cron-secret'];
 if (process.env.CRON_SECRET && cronSecret !== process.env.CRON_SECRET) {
 return res.status(401).json({ error: 'Unauthorized' });
 }

 try {
 const { ComplianceService } = await import('../_services/ComplianceService.js');

 // Get all businesses to run compliance check for each
 const { data: businesses } = await supabase.from('businesses').select('id');

 const allResults = [];
 for (const business of businesses || []) {
 try {
 const results = await ComplianceService.checkExpiries(business.id);
 allResults.push({ businessId: business.id, ...results });
 } catch (error: any) {
 console.error(`[Cron/Compliance] Error for business ${business.id}:`, error.message);
 allResults.push({ businessId: business.id, error: error.message });
 }
 }

 return res.status(200).json({ success: true, businesses: allResults });
 } catch (error: any) {
 console.error('[Cron/Compliance] Error:', error.message);
 return res.status(500).json({ error: error.message });
 }
}