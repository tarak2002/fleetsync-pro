# FleetSync Pro — Required Structural Changes

**Generated:** April 24, 2026
**Purpose:** All changes that require Supabase/Database modifications, environment configuration, or other structural work that cannot be done via code fixes alone.

---

## PRIORITY 1 — CRITICAL (Must do before production)

### 1.1 — Multi-Tenancy: Add `business_id` to All Tables

**Why:** The system currently has no tenant isolation. All data is shared across businesses. The Supabase admin client uses the service-role key which bypasses RLS, so even if RLS were enabled it would be ineffective.

**Files/code changes needed:**

Run these SQL migrations in your Supabase SQL Editor:

```sql
-- ============================================================================
-- MULTI-TENANCY: Add business_id to all tenant-scoped tables
-- ============================================================================

-- Step 1: Add business_id column to all relevant tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE toll_charges ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE earnings_records ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE shifts ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE condition_reports ADD COLUMN IF NOT EXISTS business_id TEXT;
ALTER TABLE accident_reports ADD COLUMN IF NOT EXISTS business_id TEXT;

-- Step 2: Add business_id to businesses table itself (self-referential)
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS business_id TEXT;

-- Step 3: Remove the dead users.password column (SEC-24)
ALTER TABLE users DROP COLUMN IF EXISTS password;

-- Step 4: Create indexes on business_id for query performance
CREATE INDEX IF NOT EXISTS idx_users_business_id ON users(business_id);
CREATE INDEX IF NOT EXISTS idx_drivers_business_id ON drivers(business_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_business_id ON vehicles(business_id);
CREATE INDEX IF NOT EXISTS idx_rentals_business_id ON rentals(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_toll_charges_business_id ON toll_charges(business_id);
CREATE INDEX IF NOT EXISTS idx_alerts_business_id ON alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_earnings_records_business_id ON earnings_records(business_id);
CREATE INDEX IF NOT EXISTS idx_shifts_business_id ON shifts(business_id);
CREATE INDEX IF NOT EXISTS idx_condition_reports_business_id ON condition_reports(business_id);
CREATE INDEX IF NOT EXISTS idx_accident_reports_business_id ON accident_reports(business_id);

-- Step 5: Create RLS policies for each table
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE toll_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE accident_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own business's users
CREATE POLICY "users_select_own_business" ON users
  FOR SELECT USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "users_insert_own_business" ON users
  FOR INSERT WITH CHECK (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "users_update_own_business" ON users
  FOR UPDATE USING (
    business_id = (SELECT business_id FROM users WHERE id = auth.uid())
  );

-- RLS Policy: Drivers scoped to business
CREATE POLICY "drivers_select_own_business" ON drivers
  FOR SELECT USING (
    business_id = (SELECT business_id FROM drivers WHERE user_id = auth.uid())
  );

CREATE POLICY "drivers_all_for_admin" ON drivers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
  );

-- RLS Policy: Vehicles scoped to business
CREATE POLICY "vehicles_select_own_business" ON vehicles
  FOR SELECT USING (
    business_id = (SELECT business_id FROM vehicles WHERE business_id IS NOT NULL)
  );

CREATE POLICY "vehicles_all_for_admin" ON vehicles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
  );

-- RLS Policy: Rentals scoped via vehicle->business
CREATE POLICY "rentals_select_own_business" ON rentals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM vehicles v
      WHERE v.id = rentals.vehicle_id
      AND v.business_id = (SELECT business_id FROM users WHERE id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN drivers d ON d.id = r.driver_id
      WHERE r.id = rentals.id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "rentals_all_for_admin" ON rentals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
  );

-- RLS Policy: Invoices scoped via rental->vehicle->business
CREATE POLICY "invoices_select_own_business" ON invoices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rentals r
      JOIN vehicles v ON v.id = r.vehicle_id
      JOIN users u ON u.id = auth.uid()
      WHERE r.id = invoices.rental_id
      AND v.business_id = u.business_id
    )
  );

CREATE POLICY "invoices_all_for_admin" ON invoices
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'ADMIN')
  );

-- Similar RLS policies for remaining tables...

COMMENT ON COLUMN users.business_id IS 'Tenant identifier — all data must be scoped by this';
COMMENT ON COLUMN drivers.business_id IS 'Tenant identifier for driver records';
COMMENT ON COLUMN vehicles.business_id IS 'Tenant identifier for vehicle records';
COMMENT ON COLUMN rentals.business_id IS 'Tenant identifier for rental records';
COMMENT ON COLUMN invoices.business_id IS 'Tenant identifier for invoice records';
COMMENT ON COLUMN toll_charges.business_id IS 'Tenant identifier for toll charge records';
```

**Note on code changes:** After adding `business_id`, all Supabase queries in the API must be updated to filter by `business_id`. The auth middleware (`api/_middleware/auth.ts`) must also be updated to extract and inject `business_id` from the authenticated user's session into every query context. This is a significant refactor — see the "Multi-Tenancy Code Changes" section below.

---

### 1.2 — Race Condition Prevention: Partial Unique Index on Active Rentals

**Why:** SEC-06 — Two concurrent rental requests for the same vehicle can both pass the availability check, causing double-booking.

**SQL to run:**

```sql
-- Create a partial unique index to prevent double-booking
-- This ensures only ONE active rental per vehicle at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_rentals_vehicle_active
ON rentals(vehicle_id)
WHERE status = 'ACTIVE';
```

This enforces at the database level that a vehicle cannot have more than one `ACTIVE` rental. The application logic should still check and handle the error, but this is the last line of defense.

---

### 1.3 — Atomic Balance Operations: Create RPC Functions

**Why:** SEC-07 — The current read-then-write pattern for balance updates is susceptible to race conditions and can result in lost updates or negative balances.

**SQL to run:**

```sql
-- ============================================================================
-- ATOMIC BALANCE OPERATIONS (SEC-07 fix)
-- These RPC functions ensure balance updates are atomic and cannot go negative
-- ============================================================================

CREATE OR REPLACE FUNCTION deduct_balance_cents(
  p_driver_id TEXT,
  p_amount_cents BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomic deduction that fails if balance would go negative
  UPDATE drivers
  SET
    balance = balance - (p_amount_cents::DECIMAL / 100),
    updated_at = NOW()
  WHERE
    id = p_driver_id
    AND (balance * 100) >= p_amount_cents;  -- Prevent negative balance

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insufficient balance or driver not found';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION adjust_balance_cents(
  p_driver_id TEXT,
  p_amount_cents BIGINT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomic adjustment (can be positive or negative)
  UPDATE drivers
  SET
    balance = balance + (p_amount_cents::DECIMAL / 100),
    updated_at = NOW()
  WHERE id = p_driver_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Driver not found';
  END IF;
END;
$$;
```

---

## PRIORITY 2 — HIGH

### 2.1 — Fix `earnings_records` Upsert Constraint

**Why:** SEC-20 — The upsert in `argyle.ts` uses `onConflict: 'driver_id,period_start'` but the actual unique index is `(driver_id, week_starting, platform)`. This means multi-platform earnings silently fail.

**SQL to run:**

```sql
-- The actual unique constraint includes platform
-- Current upsert key is missing platform, causing silent failures
-- The code fix already applied uses: onConflict: 'driver_id,week_starting,platform'
-- But we also need to add platform column to the earnings_records table
-- and update the upsert to include it

ALTER TABLE earnings_records
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'ARGYLE',
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'ARGYLE',
ADD COLUMN IF NOT EXISTS argyle_user_id TEXT,
ADD COLUMN IF NOT EXISTS week_starting TIMESTAMP(3) NOT NULL;

-- Drop the old index if it exists and recreate with correct columns
DROP INDEX IF EXISTS earnings_records_driver_id_week_starting_platform_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_earnings_records_driver_week_platform
ON earnings_records(driver_id, week_starting, platform);
```

---

### 2.2 — Supabase Auth: Migrate `users` Table to Use Supabase Auth Exclusively

**Why:** SEC-24 — The `users` table has a `password TEXT NOT NULL` column that is never used (Supabase Auth manages passwords). This is dead code that causes confusion and potential security risk.

```sql
-- Already handled in 1.1 step 3:
ALTER TABLE users DROP COLUMN IF EXISTS password;
```

---

## PRIORITY 3 — MEDIUM

### 3.1 — Environment Variables

**Why:** Several secrets and configuration values are missing or use weak defaults.

Add these to your `.env` file (and set them in Vercel project settings):

```bash
# ============================================================
# EXISTING — VERIFY THESE ARE SET
# ============================================================
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here   # DO NOT commit to git
STRIPE_SECRET_KEY=sk_live_...                           # DO NOT commit to git
STRIPE_WEBHOOK_SECRET=whsec_...                         # From Stripe dashboard
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_API_URL=https://your-domain.vercel.app/api

# ============================================================
# NEW — REQUIRED FOR SECURITY FIXES
# ============================================================

# Argyle webhook signature verification (SEC-04)
# Get this from Argyle dashboard → Settings → Webhooks
ARGYLE_WEBHOOK_SECRET=your-argyle-webhook-secret

# Vercel cron job authentication (SEC-30)
# Choose a strong random string for cron job security
CRON_SECRET=your-strong-random-secret-here

# FleetSync API Key for toll sync (SEC-18)
# Consider migrating to Supabase Vault for production
FLEETSYNC_API_KEY=your-fleet-sync-api-key-here

# VEVO B2B credentials (if using real VEVO, not mock mode)
VEVO_B2B_ENDPOINT=https://vevo-b2b.example.gov.au
VEVO_B2B_USERNAME=your-vevo-username
VEVO_B2B_PASSWORD=your-vevo-password
VEVO_USE_MOCK=false  # Set to false for production VEVO calls
```

---

### 3.2 — Supabase Storage: Configure `vehicle-documents` Bucket

**Why:** Document uploads in `api/_routes/businesses.ts` use `supabase.storage.from('vehicle-documents')`. This bucket must exist and be properly configured.

In your Supabase Dashboard → Storage → New Bucket:
- **Bucket name:** `vehicle-documents`
- **Public:** `false` (private bucket — served via signed URLs)
- **File size limit:** 10MB (enforced in multer config)

---

### 3.3 — Stripe: Configure Webhook Endpoint

**Why:** The Stripe webhook handler at `POST /api/payments/stripe` requires a webhook endpoint to be configured in your Stripe Dashboard.

In Stripe Dashboard → Developers → Webhooks → Add endpoint:
- **Endpoint URL:** `https://your-domain.com/api/payments/stripe`
- **Events to listen for:**
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `checkout.session.completed`
  - `invoice.paid`
  - `setup_intent.succeeded`

---

### 3.4 — Argyle: Configure Webhook Endpoint

**Why:** SEC-04 — The Argyle webhook now verifies the `X-Argyle-Signature` header.

In Argyle Dashboard → Settings → Webhooks → Add webhook:
- **Endpoint URL:** `https://your-domain.com/api/argyle/webhook`
- **Events:** `gigs.added`, `gigs.updated`, `paystubs.added`
- **Copy the webhook signing secret** into `ARGYLE_WEBHOOK_SECRET` env var

---

## PRIORITY 4 — LOW (Good Practices)

### 4.1 — Rate Limiting: Supabase

**Why:** SEC-13 — No rate limiting is implemented anywhere. For production, consider:

```sql
-- Enable Supabase's built-in rate limiting via pg_net
-- Or use Supabase Pro plan's API rate limits
```

### 4.2 — Vercel Environment Variables

Set all required environment variables in Vercel project settings:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all variables from section 3.1 above
3. Mark `SUPABASE_SERVICE_ROLE_KEY` and `STRIPE_SECRET_KEY` as **Production** only (not Development/Preview)

---

## MULTI-TENANCY CODE CHANGES (After DB migration)

The following code files need to be updated to support `business_id` filtering in every query:

### `api/_middleware/auth.ts`
Add `businessId` to the `AuthRequest` user object:
```typescript
req.user = {
  id: user.id,
  email: user.email || '',
  role: role,
  driverId: driverId,
  driverStatus: driverStatus,
  businessId: dbUser?.business_id || user.user_metadata?.businessId  // ADD THIS
};
```

### `api/_lib/supabase.ts`
Option A: Keep service-role client but add `business_id` to every query (not recommended)
Option B: Create a per-request client that uses the authenticated user's `business_id` as a default filter

**Recommended approach for Option B:**
```typescript
// Create a helper that wraps queries with business_id filter
export const withBusinessId = (query: SupabaseQueryBuilder, businessId: string) => {
  return query.eq('business_id', businessId);
};
```

Every query in the codebase would then need to be updated:
```typescript
// Before
supabase.from('vehicles').select('*')

// After
supabase.from('vehicles').select('*').eq('business_id', req.user.businessId)
```

This is a significant refactor (estimated 50+ queries to update). Budget adequate time for testing.

---

## TESTING CHECKLIST

After applying all changes, verify:

- [ ] Driver A cannot view Driver B's earnings (`/api/argyle/my-earnings`)
- [ ] Driver A cannot pay Driver B's invoice (`POST /api/invoices/:id/pay`)
- [ ] Driver A cannot return another driver's rental (`POST /api/driver/dashboard/return-vehicle`)
- [ ] Unauthenticated requests to `/api/finance/dashboard` return 401
- [ ] Unauthenticated requests to `/api/compliance/alerts` return 401
- [ ] Unauthenticated requests to `/api/analytics/dashboard` return 401
- [ ] Argyle webhook rejects requests without valid `X-Argyle-Signature`
- [ ] Onboarding token cannot be reused after partial failure
- [ ] Balance cannot go negative after concurrent invoice payments
- [ ] Only one ACTIVE rental per vehicle at any time (race condition test)
- [ ] Cron jobs fire correctly (test with Vercel cron preview or curl)

---

## ROLLBACK NOTES

If issues arise after deployment:

1. **Multi-tenancy:** If `business_id` queries break, the quickest fix is to temporarily relax RLS policies (set to `FOR ALL USING (true)`) while preserving the data integrity fixes
2. **Balance RPC:** If `deduct_balance_cents` RPC fails, the code has a fallback to direct update (with note in logs)
3. **Cron jobs:** If cron endpoints fail, the old `node-cron` code can be restored in `api/index.ts` temporarily (remove the `// NOTE: node-cron removed` comment block and restore the `cron.schedule()` calls)