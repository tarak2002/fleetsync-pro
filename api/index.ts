import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes (Mocked versions)
import vehicleRoutes from './routes/vehicles.js';
import driverRoutes from './routes/drivers.js';
import rentalRoutes from './routes/rentals.js';
import financeRoutes from './routes/finance.js';
import invoiceRoutes from './routes/invoices.js';
import onboardingRoutes from './routes/onboarding.js';
import tollRoutes from './routes/tolls.js';
import authRoutes from './routes/auth.js';
import complianceRoutes from './routes/compliance.js';
import analyticsRoutes from './routes/analytics.js';
import driverDashboardRoutes from './routes/driver-dashboard.js';
import documentsRoutes from './routes/documents.js';
import paymentsRouter from './routes/payments.js';
import webhookRouter from './routes/webhooks.js';
import { authMiddleware, adminOnly } from './middleware/auth.js';

// Load environment variables
dotenv.config();

import { prisma } from './lib/prisma.js';

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware

// *** STRIPE WEBHOOK MUST COME BEFORE express.json() ***
app.use('/api/payments/stripe', webhookRouter);

app.use(cors());
app.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), mode: 'vercel-prototype' });
});

// API Routes (Protected)
app.use('/api/auth', authMiddleware, authRoutes);
app.use('/api/vehicles', authMiddleware, adminOnly, vehicleRoutes);
app.use('/api/drivers', authMiddleware, adminOnly, driverRoutes);
app.use('/api/rentals', authMiddleware, adminOnly, rentalRoutes);
app.use('/api/invoices', authMiddleware, adminOnly, invoiceRoutes);
app.use('/api/onboarding', authMiddleware, adminOnly, onboardingRoutes);
app.use('/api/tolls', authMiddleware, adminOnly, tollRoutes);
app.use('/api/compliance', authMiddleware, adminOnly, complianceRoutes);
app.use('/api/analytics', authMiddleware, adminOnly, analyticsRoutes);
app.use('/api/driver/dashboard', authMiddleware, driverDashboardRoutes);
app.use('/api/documents', authMiddleware, documentsRoutes);
app.use('/api/finance', authMiddleware, adminOnly, financeRoutes);
app.use('/api/payments', authMiddleware, paymentsRouter);

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Start server
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`🚀 FleetSync Pro API (MOCK MODE) running on http://localhost:${PORT}`);
    });
}

// Export for Vercel
export default app;
