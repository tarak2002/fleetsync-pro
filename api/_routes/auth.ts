import { Router } from 'express';
import { supabase } from '../_lib/supabase.js';
import { AuthRequest } from '../_middleware/auth.js';

const router = Router();

const isDevOnly = process.env.NODE_ENV !== 'production';

/**
 * POST /api/auth/dev-login
 * Dev-only login that bypasses email verification (only works in development)
 */
router.post('/dev-login', async (req, res) => {
  if (!isDevOnly) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        return res.status(429).json({ error: 'Email rate limit exceeded. Try again in a few minutes.' });
      }
      return res.status(401).json({ error: error.message });
    }

    res.json({ 
      session: data.session,
      user: data.user 
    });
  } catch (error: any) {
    console.error('Dev login error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/dev-confirm-email
 * Bypasses email confirmation for development
 */
router.post('/dev-confirm-email', async (req, res) => {
  if (!isDevOnly) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const { data, error } = await supabase.auth.admin.updateUserByEmail(email, {
      email_confirm: true
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error('Dev confirm error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/dev-create-user
 * Creates user with admin API to bypass rate limits
 */
router.post('/dev-create-user', async (req, res) => {
  if (!isDevOnly) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { email, password, name, role } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name || email.split('@')[0],
        role: role || 'ADMIN'
      }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, user: data.user });
  } catch (error: any) {
    console.error('Dev create user error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auth/dev-create-db-user
 * Creates just a DB user (for testing without auth)
 */
router.post('/dev-create-db-user', async (req: AuthRequest, res) => {
  if (!isDevOnly) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { email, name, role } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    const { data: existing } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existing) {
      return res.json({ success: true, user: existing, message: 'User already exists' });
    }

    const { data, error } = await supabase
      .from('users')
      .insert({
        email,
        name: name || email.split('@')[0],
        role: role || 'ADMIN'
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, user: data });
  } catch (error: any) {
    console.error('Dev create db user error:', error);
    res.status(500).json({ error: error.message });
  }
});

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
        businessId: existingUser.business_id || null,
      });
    }

    // Create user if not found (first login via Supabase Auth)
    // SEC-FIX: Default new signups to ADMIN (business owners), not DRIVER
    // Drivers are invited, not self-registered. Check user metadata for explicit role.
    const roleFromMetadata = user.user_metadata?.role as string;
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        id: req.user.id,
        email: req.user.email,
        name: req.user.name || 'User',
        role: roleFromMetadata || 'ADMIN',
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
      businessId: newUser.business_id || null,
    });
  } catch (error: any) {
    console.error('Auth /me error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

/**
 * POST /api/auth/setup-business
 * Creates a business record and links it to the current admin user.
 */
router.post('/setup-business', async (req: AuthRequest, res) => {
  try {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can set up businesses' });
    }

    const { name, abn, address, phone } = req.body;

    if (!name) return res.status(400).json({ error: 'Business name is required' });

    // 0. Ensure user exists in public.users to satisfy foreign key constraint
    // This handles cases where the user exists in auth.users but was not synced to public.users
    const { error: userUpsertError } = await supabase.from('users').upsert({
      id: req.user.id,
      email: req.user.email,
      name: req.user.name || 'Admin User',
      role: 'ADMIN',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (userUpsertError) {
      console.error('Error ensuring user exists:', userUpsertError);
      // We don't necessarily want to throw here if the user already exists 
      // but let's be safe and log it.
    }

    // 1. Create Business
    const { data: business, error: bError } = await supabase
      .from('businesses')
      .insert({
        name,
        abn,
        address,
        phone,
        email: req.user.email,
        owner_id: req.user.id,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bError) throw bError;

    // 2. Update User with business_id
    const { error: uError } = await supabase
      .from('users')
      .update({ business_id: business.id })
      .eq('id', req.user.id);

    if (uError) throw uError;

    res.json({ success: true, businessId: business.id });
  } catch (error: any) {
    console.error('Setup business error:', error);
    res.status(500).json({ error: error.message || 'Failed to setup business' });
  }
});

/**
 * POST /api/auth/dev-create-admin
 * Creates an admin user for development/testing purposes (bypasses email verification)
 */
router.post('/dev-create-admin', async (req: AuthRequest, res) => {
  if (!isDevOnly) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const { email, password, name, businessName, abn, address, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: 'ADMIN'
        }
      }
    });

    if (authError) {
      if (authError.message.includes('rate limit')) {
        return res.status(429).json({ error: 'Email rate limit exceeded. Try again later or configure custom SMTP.' });
      }
      throw authError;
    }

    if (!authData.user) {
      return res.status(400).json({ error: 'Failed to create user' });
    }

    const userId = authData.user.id;

    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name,
        role: 'ADMIN'
      })
      .select()
      .single();

    if (userError) throw userError;

    let businessId = null;
    if (businessName) {
      const { data: business, error: bError } = await supabase
        .from('businesses')
        .insert({
          name: businessName,
          abn,
          address,
          phone,
          email,
          owner_id: userId
        })
        .select()
        .single();

      if (bError) console.error('Business creation error:', bError);
      else businessId = business?.id;
    }

    res.json({ success: true, userId, businessId });
  } catch (error: any) {
    console.error('Dev create admin error:', error);
    res.status(500).json({ error: error.message || 'Failed to create admin' });
  }
});

export default router;
