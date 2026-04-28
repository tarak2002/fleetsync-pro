import { Request, Response, NextFunction } from 'express';
import { supabase } from '../_lib/supabase.js';

export interface AuthRequest extends Request {
 user?: {
 id: string;
 email: string;
 name?: string;
 role?: string;
 driverId?: string;
 driverStatus?: string;
 businessId?: string;
 };
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        
        // Verify with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Extract context from database to ensure metadata is always synced
        const { data: dbUser, error: dbError } = await supabase
            .from('users')
            .select('role, business_id, drivers(id, status)')
            .eq('id', user.id)
            .single();

        if (dbError && dbError.code !== 'PGRST116') {
            // PGRST116 = no rows returned, which is handled below
            throw new Error(`Database query failed: ${dbError.message}`);
        }

        const role = dbUser?.role || user.user_metadata?.role || 'DRIVER';

        // Safely extract driver info regardless of whether it's an object or array
        const drivers = dbUser?.drivers;
        let driverId: string | undefined;
        let driverStatus: string | undefined;

        if (drivers) {
            if (Array.isArray(drivers) && drivers.length > 0) {
                driverId = drivers[0]?.id;
                driverStatus = drivers[0]?.status;
            } else if (typeof drivers === 'object' && !Array.isArray(drivers)) {
                driverId = (drivers as any).id;
                driverStatus = (drivers as any).status;
            }
        }

        // Fallback to user metadata
        if (!driverId) {
            driverId = user.user_metadata?.driverId;
        }

        console.log(`[Auth] Authenticated as ${role} (User: ${user.id}, Driver: ${driverId}, Business: ${dbUser?.business_id || 'NONE'})`);

        req.user = {
            id: user.id,
            email: user.email || '',
            role: role,
            driverId: driverId,
            driverStatus: driverStatus,
            businessId: dbUser?.business_id || user.user_metadata?.businessId
        };
        
        next();
    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
};

export const adminOnly = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Access denied: Admin only' });
    }
    next();
};
