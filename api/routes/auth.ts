import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { AuthRequest } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/auth/me
 * Retrieves the current user's profile from the database.
 * If the user (from Supabase) doesn't exist in our DB yet, we create them.
 */
router.get('/me', async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Synchronize Supabase User with our Prisma User
        const user = await (prisma.user as any).upsert({
            where: { email: req.user.email },
            update: { 
                name: req.user.name || 'User',
            },
            create: {
                id: req.user.id,
                email: req.user.email,
                name: req.user.name || 'User',
                role: req.user.role as any || 'DRIVER'
            },
            include: {
                driver: {
                    select: { id: true, status: true }
                }
            }
        });

        res.json({
            ...user,
            driverId: (user as any).driver?.id || null
        });
    } catch (error: any) {
        console.error('Auth /me error:', error);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

export default router;
