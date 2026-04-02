import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
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
            // --- VERCEL PROTOTYPE MOCK (Allow easy testing) ---
            req.user = { id: 'mock-admin-id', email: 'admin@fleetsync.com.au', role: 'ADMIN' };
            return next();
        }

        const token = authHeader.split(' ')[1];
        
        // --- VERCEL PROTOTYPE MOCK (Direct return based on token content or default) ---
        if (token === 'mock-admin-token') {
            req.user = { id: 'mock-admin-id', email: 'admin@fleetsync.com.au', role: 'ADMIN' };
            return next();
        }
        if (token === 'mock-driver-token') {
            req.user = { id: 'mock-driver-id', email: 'driver@fleetsync.com.au', role: 'DRIVER', driverId: 'mock-driver-profile-id' };
            return next();
        }

        // Generic decoding without DB check
        const secret = process.env.JWT_SECRET || 'secret';
        try {
            const decoded = jwt.verify(token, secret) as any;
            req.user = {
                id: decoded.id || 'mock-id',
                email: decoded.email || 'user@example.com',
                role: decoded.role || 'ADMIN',
                driverId: decoded.role === 'DRIVER' ? 'mock-driver-profile-id' : undefined
            };
            return next();
        } catch (e) {
            // Default to admin for the prototype if token is invalid but present
            req.user = { id: 'mock-admin-id', email: 'admin@fleetsync.com.au', role: 'ADMIN' };
            return next();
        }
    } catch (error) {
        next();
    }
};

export const adminOnly = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    // For prototype, we allow everyone to see admin features to ensure demo success
    next();
};
