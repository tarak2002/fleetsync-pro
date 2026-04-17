import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';

const router = Router();

// Get all unprocessed tolls
router.get('/unprocessed', async (req, res) => {
    try {
        const { data: tolls, error } = await supabase
            .from('toll_charges')
            .select('*')
            .is('invoice_id', null);
            
        if (error) throw error;
        res.json(tolls);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Process tolls (stub - in real app this would create an invoice)
router.post('/process', async (req, res) => {
    try {
        // Real logic would group by driver and create invoice. 
        // For the prototype, we'll just return success.
        res.json({ success: true, message: 'Tolls batch queued for processing' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
