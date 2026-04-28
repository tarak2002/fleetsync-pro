import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest, authMiddleware } from '../_middleware/auth.js';

const router = Router();

const ARGYLE_API_URL = 'https://api-sandbox.argyle.com/v2';
const ARGYLE_CLIENT_ID = process.env.ARGYLE_CLIENT_ID || '';
const ARGYLE_CLIENT_SECRET = process.env.ARGYLE_CLIENT_SECRET || '';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: base64 auth header for Argyle API
// ─────────────────────────────────────────────────────────────────────────────
function argyleAuthHeader() {
    const token = Buffer.from(`${ARGYLE_CLIENT_ID}:${ARGYLE_CLIENT_SECRET}`).toString('base64');
    return { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/argyle/create-user-token
// Called by the driver dashboard to get a short-lived token for Argyle Link
router.post('/create-user-token', authMiddleware, async (req: AuthRequest, res) => {
 try {
 // SEC-12 FIX: Use driverId from authenticated session, not request body
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const driverId = req.user?.driverId;
 if (!driverId) return res.status(403).json({ error: 'Driver account required' });

 // Fetch the driver to check if they already have an Argyle user ID
 const { data: driver, error: driverErr } = await supabase
 .from('drivers')
 .select('id, argyle_user_id')
 .eq('id', driverId)
 .eq('business_id', businessId)
 .single();

 if (driverErr) throw driverErr;

        let argyleUserId = driver?.argyle_user_id;

        // If no Argyle user yet, create one
        if (!argyleUserId) {
            const createRes = await fetch(`${ARGYLE_API_URL}/users`, {
                method: 'POST',
                headers: argyleAuthHeader(),
                body: JSON.stringify({}),
            });
            const argyleUser = await createRes.json() as { id?: string; error?: string };
            if (!argyleUser?.id) {
                throw new Error(`Argyle user creation failed: ${JSON.stringify(argyleUser)}`);
            }
            argyleUserId = argyleUser.id;

            // Persist the Argyle user ID to the driver record
            await supabase
                .from('drivers')
                .update({ argyle_user_id: argyleUserId, updated_at: new Date().toISOString() })
                .eq('id', driverId);
        }

        // Request a short-lived user token for Argyle Link
        const tokenRes = await fetch(`${ARGYLE_API_URL}/user-tokens`, {
            method: 'POST',
            headers: argyleAuthHeader(),
            body: JSON.stringify({ user: argyleUserId }),
        });
        const tokenData = await tokenRes.json() as { access: string; error?: string };
        if (!tokenData?.access) {
            throw new Error(`Argyle token request failed: ${JSON.stringify(tokenData)}`);
        }

        res.json({
            user_token: tokenData.access,
            argyle_user_id: argyleUserId,
            sandbox: true,
        });
    } catch (err: any) {
        console.error('[Argyle] create-user-token error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/argyle/webhook
// Called by Argyle when earnings data is updated for a linked account
// ─────────────────────────────────────────────────────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    // SEC-04 FIX: Verify Argyle webhook signature
    const signature = req.headers['x-argyle-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    if (signature && process.env.ARGYLE_WEBHOOK_SECRET) {
      const { createHmac } = await import('crypto');
      const expectedSig = createHmac('sha256', process.env.ARGYLE_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');
      if (signature !== expectedSig) {
        console.warn('[Argyle Webhook] Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const { name, data } = req.body;

        // We only care about income/gig events
        if (!['gigs.added', 'gigs.updated', 'paystubs.added'].includes(name)) {
            return res.json({ received: true, ignored: true });
        }

        const argyleUserId: string = data?.user;
        if (!argyleUserId) return res.status(400).json({ error: 'Missing user in webhook payload' });

// Find the driver linked to this Argyle user
 const { data: driver } = await supabase
 .from('drivers')
 .select('id, business_id')
 .eq('argyle_user_id', argyleUserId)
 .maybeSingle();

 if (!driver) {
 console.warn(`[Argyle Webhook] No driver found for argyle_user_id: ${argyleUserId}`);
 return res.json({ received: true, ignored: true });
 }

// Fetch latest gigs from Argyle for this user to get total earnings
    // ARCH-05 FIX: Add timeout
    const gigsRes = await fetch(
      `${ARGYLE_API_URL}/gigs?user=${argyleUserId}&limit=100`,
      {
        headers: argyleAuthHeader(),
        signal: AbortSignal.timeout(10000)
      }
    );
        const gigsData = await gigsRes.json() as { results?: any[]; error?: string };
        const gigs = gigsData?.results || [];

        // Calculate weekly earnings (current ISO week)
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday start
        startOfWeek.setHours(0, 0, 0, 0);

        const weeklyGross = gigs
            .filter((g: any) => new Date(g.start_datetime) >= startOfWeek)
            .reduce((sum: number, g: any) => sum + (parseFloat(g.income?.net_pay) || 0), 0);

// SEC-20 FIX: Use correct unique constraint key (includes platform)
 const { error: upsertErr } = await supabase
 .from('earnings_records')
 .upsert({
 driver_id: driver.id,
 business_id: driver.business_id,
 week_starting: startOfWeek.toISOString(),
 gross_earnings: weeklyGross,
 net_earnings: weeklyGross,
 trips: gigs.filter((g: any) => new Date(g.start_datetime) >= startOfWeek).length,
 platform: 'ARGYLE',
 argyle_user_id: argyleUserId,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 }, {
 onConflict: 'driver_id,week_starting,platform',
 });

        if (upsertErr) throw upsertErr;

        console.log(`[Argyle Webhook] Synced weekly earnings $${weeklyGross} for driver ${driver.id}`);
        res.json({ received: true, synced: true, weekly_gross: weeklyGross });
    } catch (err: any) {
        console.error('[Argyle Webhook] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/argyle/my-earnings
// Returns this driver's earnings from Argyle directly + history from DB
router.get('/my-earnings', authMiddleware, async (req: AuthRequest, res) => {
 try {
 // SEC-01 FIX: Enforce ownership — only allow querying own earnings
 const businessId = req.user?.businessId;
 if (!businessId) return res.status(400).json({ error: 'Business ID not found' });

 const driver_id = req.user?.driverId;
 if (!driver_id) return res.status(403).json({ error: 'Driver account required' });

 // Get driver and argyle_user_id
 const { data: driver, error: driverErr } = await supabase
 .from('drivers')
 .select('id, argyle_user_id, name')
 .eq('id', driver_id)
 .eq('business_id', businessId)
 .single();

 if (driverErr) throw driverErr;

        let liveEarnings = null;

// ARCH-05 FIX: Add timeout to external API calls
    if (driver?.argyle_user_id) {
      const gigsRes = await fetch(
        `${ARGYLE_API_URL}/gigs?user=${driver.argyle_user_id}&limit=200`,
        {
          headers: argyleAuthHeader(),
          signal: AbortSignal.timeout(10000) // 10s timeout
        }
      );
            const gigsData = await gigsRes.json() as { results?: any[]; count?: number };
            const gigs = gigsData?.results || [];

            const now = new Date();
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startOfWeek.setHours(0, 0, 0, 0);

            const thisWeekGigs = gigs.filter((g: any) => new Date(g.start_datetime) >= startOfWeek);
            const weeklyGross = thisWeekGigs.reduce((sum: number, g: any) => sum + (parseFloat(g.income?.net_pay) || 0), 0);

            liveEarnings = {
                weekly_gross: weeklyGross,
                trip_count: thisWeekGigs.length,
                platform: 'Uber / Ola / DiDi',
                synced_at: new Date().toISOString(),
            };
        }

// Get historical earnings from our DB
 const { data: history } = await supabase
 .from('earnings_records')
 .select('*')
 .eq('driver_id', driver_id)
 .eq('business_id', businessId)
 .order('period_start', { ascending: false })
 .limit(12);

        res.json({
            driver_name: driver?.name,
            is_linked: !!driver?.argyle_user_id,
            live_earnings: liveEarnings,
            history: history || [],
        });
    } catch (err: any) {
        console.error('[Argyle] my-earnings error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

export default router;
