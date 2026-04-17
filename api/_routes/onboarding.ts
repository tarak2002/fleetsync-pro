import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get onboarding status for a user
router.get('/status', async (req, res) => {
    try {
        // Simplified status check
        res.json({ status: 'COMPLETED' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Generate invitation link
router.post('/generate-link', async (req, res) => {
    try {
        const { email } = req.body;
        const token = uuidv4();
        const { error } = await supabase
            .from('onboarding_tokens')
            .insert({
                token,
                email,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                used: false
            });
            
        if (error) throw error;
        res.json({ link: `${process.env.CLIENT_URL}/onboard/${token}` });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Validate onboarding token
router.get('/validate-token/:token', async (req, res) => {
    try {
        const { data: onboarding, error } = await supabase
            .from('onboarding_tokens')
            .select('*')
            .eq('token', req.params.token)
            .single();

        if (error || !onboarding || onboarding.used || new Date(onboarding.expires_at) < new Date()) {
            return res.status(400).json({ valid: false, error: 'Invalid or expired token' });
        }

        res.json({ valid: true, email: onboarding.email });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/submit-application', async (req, res) => {
    try {
        // Here you would create the Driver record
        // Placeholder as per original logic
        res.json({ success: true, message: 'Application submitted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
