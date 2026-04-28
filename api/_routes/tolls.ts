import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { TollService } from '../_services/TollService.js';
import { authMiddleware, adminOnly, AuthRequest } from '../_middleware/auth.js';

const router = Router();

/**
 * @route POST /api/tolls/sync
 * @desc Bulk sync tolls from an external source (Linkt Scraper/API)
 * @access Private (via API Key or Admin Session)
 */
router.post('/sync', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
    try {
        const businessId = req.user?.businessId;
        if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

        const { tolls } = req.body;
        if (!Array.isArray(tolls)) {
            return res.status(400).json({ error: 'Invalid payload. Expected "tolls" array.' });
        }

        console.log(`[API] Bulk sync requested for ${tolls.length} tolls for business ${businessId}.`);
        const results = await TollService.processBatch(tolls, businessId);

        res.json({
            success: true,
            processed: results.successCount,
            skipped: results.skipCount,
            total: tolls.length
        });
    } catch (error: any) {
        console.error('[API] Sync Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all unprocessed tolls
router.get('/unprocessed', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data: tolls, error } = await supabase
 .from('toll_charges')
 .select('*')
 .eq('business_id', businessId)
 .is('invoice_id', null)
 .order('date', { ascending: false });

 if (error) throw error;
 res.json(tolls);
 } catch (error: any) {
 res.status(500).json({ error: error.message });
 }
});

// Get all tolls with invoice details
router.get('/', authMiddleware, adminOnly, async (req: AuthRequest, res) => {
 try {
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const { data: tolls, error } = await supabase
 .from('toll_charges')
 .select(`
 *,
 invoice:invoices(
 id,
 status,
 rental:rentals(
 id,
 driver:drivers(name)
 )
 )
 `)
 .eq('business_id', businessId)
 .order('date', { ascending: false });
            
        if (error) throw error;
        
        // Transform the nested data for easier consumption in the frontend
        const formattedTolls = (tolls || []).map(toll => {
            const invoice = toll.invoice;
            const rental = invoice?.rental;
            const driverName = rental?.driver?.[0]?.name || rental?.driver?.name || 'Unassigned';
            
            return {
                ...toll,
                invoice_status: invoice?.status || 'UNPROCESSED',
                driver_name: toll.invoice_id ? driverName : 'Unassigned'
            };
        });
        
        res.json(formattedTolls);
    } catch (error: any) {
        console.error('[API] Error fetching tolls:', error);
        res.status(500).json({ error: error.message });
    }
});

// Process tolls (stub - in real app this would create an invoice)
router.post('/process', authMiddleware, adminOnly, async (req, res) => {
    try {
        // Real logic would group by driver and create invoice. 
        // For the prototype, we'll just return success.
        res.json({ success: true, message: 'Tolls batch queued for processing' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
