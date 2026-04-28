import { Router } from 'express';
import { BillingService } from '../_services/BillingService.js';
import { adminOnly } from '../_middleware/auth.js';
import type { AuthRequest } from '../_middleware/auth.js';

const router = Router();

/**
 * POST /billing/generate
 * Runs the billing cycle for a business — generates PENDING invoices for active rentals
 * due for payment. Accessible by admin users.
 */
router.post('/generate', adminOnly, async (req: AuthRequest, res) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(400).json({ error: 'Business ID not found' });
    }

    const results = await BillingService.runBillingCycle();

    // Filter results to this business only (BillingService fetches business-level rentals)
    const filtered = results.filter(
      (r) => r.businessId === businessId || r.rentalId
    );

    res.json({
      success: true,
      processed: filtered.length,
      results: filtered,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;