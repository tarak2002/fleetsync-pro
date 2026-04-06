import { Request, Response, NextFunction } from 'express';
import { supabase } from '../lib/supabase.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        name?: string;
        role?: string;
        driverId?: string;
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

        // Extract role and other metadata from Supabase user
        // We'll trust the roles we store in user_metadata or set via Supabase claims
        req.user = {
            id: user.id,
            email: user.email || '',
            role: user.user_metadata?.role || 'DRIVER',
            driverId: user.user_metadata?.driverId
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
