import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest } from '../_middleware/auth.js';

const router = Router();

/**
 * GET /api/auth/me
 * Retrieves current user profile. If the user doesn't exist in our DB, creates them.
 */
router.get('/me', async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Try to find user in our DB
    const { data: existingUser } = await supabase
      .from('users')
      .select('*, drivers(id, status)')
      .eq('email', req.user.email)
      .single();

    if (existingUser) {
      const driverId = Array.isArray(existingUser.drivers) 
        ? existingUser.drivers[0]?.id 
        : (existingUser.drivers as any)?.id;
        
      return res.json({
        ...existingUser,
        driverId: driverId || null,
      });
    }

    // Create user if not found (first login via Supabase Auth)
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name || 'User',
        role: (req.user.role as string) || 'DRIVER',
        updated_at: new Date().toISOString(),
      })
      .select('*, drivers(id, status)')
      .single();

    if (error) throw error;

    const newDriverId = Array.isArray(newUser.drivers) 
      ? newUser.drivers[0]?.id 
      : (newUser.drivers as any)?.id;

    res.json({
      ...newUser,
      driverId: newDriverId || null,
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

export default router;
