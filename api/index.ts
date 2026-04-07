import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes (Mocked versions)
import vehicleRoutes from './_routes/vehicles.js';
import driverRoutes from './_routes/drivers.js';
import rentalRoutes from './_routes/rentals.js';
import financeRoutes from './_routes/finance.js';
import invoiceRoutes from './_routes/invoices.js';
import onboardingRoutes from './_routes/onboarding.js';
import tollRoutes from './_routes/tolls.js';
import authRoutes from './_routes/auth.js';
import complianceRoutes from './_routes/compliance.js';
import analyticsRoutes from './_routes/analytics.js';
import driverDashboardRoutes from './_routes/driver-dashboard.js';
import documentsRoutes from './_routes/documents.js';
import paymentsRouter from './_routes/payments.js'; // Wait, I should check if I missed one
import webhookRouter from './_routes/webhooks.js';
import { authMiddleware, adminOnly } from './_middleware/auth.js';

// Load environment variables
dotenv.config();

import { prisma } from './_lib/prisma.js';

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
app.use('/api/vehicles', authMiddleware, vehicleRoutes);
app.use('/api/drivers', authMiddleware, adminOnly, driverRoutes);
app.use('/api/rentals', authMiddleware, rentalRoutes);
app.use('/api/invoices', authMiddleware, invoiceRoutes);
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
