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
import defaultPaymentRoutes, { webhookRouter } from './routes/payments.js';

// Load environment variables
dotenv.config();

// Initialize Mock Prisma Client (To prevent crashes if imported elsewhere)
// Initialize Recursive Mock Prisma Client (To prevent crashes if imported elsewhere)
const createMockProxy = (name: string = 'prisma'): any => {
    const fn = (...args: any[]) => {
        console.warn(`Prisma method "${name}" called in prototype mode.`);
        return Promise.resolve(null);
    };
    return new Proxy(fn, {
        get: (target, prop) => {
            if (typeof prop === 'string') {
                return createMockProxy(`${name}.${prop}`);
            }
            return (target as any)[prop];
        }
    });
};

export const prisma = createMockProxy();

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

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/tolls', tollRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/driver/dashboard', driverDashboardRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/payments', defaultPaymentRoutes);

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
