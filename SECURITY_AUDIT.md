# FleetSync Pro — Security & Architecture Audit Report

**Date:** April 24, 2026
**Auditor:** Senior Security Architect
**Scope:** Full codebase review — API routes, services, database schema, auth middleware, frontend API client, external integrations

---

## SYSTEM OVERVIEW

- **Frontend:** Vite/React + Tailwind + Axios (with Supabase Auth)
- **Backend:** Express/Node (API routes), Vercel serverless functions
- **Database:** Supabase (Postgres) via Supabase JS client
- **Auth:** Supabase Auth (email/password) + custom role claims
- **External Integrations:** Stripe (payments), Argyle (earnings), VEVO (visa), Linkt (tolls)
- **Key architectural trait:** Admin Supabase client (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS entirely — all server-side queries are privileged

---

## FINDINGS INDEX

| ID | Severity | Category | Label |
|----|----------|----------|-------|
| SEC-01 | CRITICAL | Auth/IDOR | IDOR on `/api/argyle/my-earnings` — any driver can view any driver's earnings |
| SEC-02 | CRITICAL | Injection/Mass-Assignment | Mass assignment on driver onboarding — arbitrary field injection |
| SEC-03 | CRITICAL | Auth | Multiple routes have NO authentication — public data exposure |
| SEC-04 | CRITICAL | Auth/Webhook | Argyle webhook is public with NO signature verification |
| SEC-05 | CRITICAL | Architecture | Multi-tenancy not implemented — full data leakage across tenants |
| SEC-06 | HIGH | Business Logic | Race condition in rental creation — double-booking possible |
| SEC-07 | HIGH | Data Integrity | Non-atomic balance updates — balance can go negative or lose updates |
| SEC-08 | HIGH | Auth/IDOR | IDOR on invoice payment — any driver can pay any invoice |
| SEC-09 | HIGH | Auth | `/api/finance/dashboard` has NO auth middleware despite parent mount claim |
| SEC-10 | HIGH | Business Logic | Stripe `invoice.paid` webhook marks ALL pending invoices as PAID |
| SEC-11 | HIGH | Business Logic | Onboarding token can be reused after partial failure |
| SEC-12 | MEDIUM | Auth/IDOR | `/api/argyle/create-user-token` accepts any `driverId` from request body |
| SEC-13 | MEDIUM | Performance/DoS | No rate limiting anywhere in the API |
| SEC-14 | MEDIUM | Auth/IDOR | Return vehicle endpoint has no ownership check |
| SEC-15 | MEDIUM | Architecture | Finance dashboard shows aggregate data across ALL businesses |
| SEC-16 | MEDIUM | Auth | Compliance endpoints trigger vehicle suspensions without auth |
| SEC-17 | MEDIUM | Auth | Analytics endpoints expose KPIs publicly |
| SEC-18 | MEDIUM | Deployment | Toll sync endpoint uses weak static API key auth |
| SEC-19 | MEDIUM | Input Validation | No validation on `start_date` in rental creation |
| SEC-20 | MEDIUM | Data Integrity | Argyle earnings upsert key conflicts with actual schema |
| SEC-21 | MEDIUM | Business Logic | `RESTRICTED` VEVO status not blocked during driver approval |
| SEC-22 | MEDIUM | Business Logic | Floating-point arithmetic for financial calculations |
| SEC-23 | MEDIUM | Architecture | Missing `business_id` on `invoices` and `toll_charges` tables |
| SEC-24 | LOW | Architecture | Dead `password` column in `users` table (Supabase Auth handles auth) |
| SEC-25 | LOW | Information Disclosure | Debug endpoint `debug-user` exposes full auth context in production |
| SEC-26 | LOW | Mass Assignment | Driver creation endpoint has no field allowlist |
| SEC-27 | LOW | Business Logic | Stripe checkout session activates rental without `payment_status` check |
| SEC-28 | LOW | Input Validation | No validation that `license_no` is non-empty on driver creation |
| SEC-29 | LOW | Data Integrity | `invoice.paid_at` uses server time instead of Stripe event timestamp |
| SEC-30 | LOW | Deployment | In-process `node-cron` will not run on Vercel serverless |

---

## SECURITY VULNERABILITIES

### SEC-01 — CRITICAL: IDOR on Earnings Endpoint

**Location:** `api/_routes/argyle.ts:156–214`
**Method:** OWASP IDOR check / Broken Access Control analysis
**Likelihood & Impact:** HIGH impact — any logged-in DRIVER can view another driver's live Argyle earnings and 12-week historical earnings by changing `driver_id` in query params.

**Concrete example:**
```
GET /api/argyle/my-earnings?driver_id=<victim-driver-uuid>
Authorization: Bearer <attacker-token>
→ Returns victim driver's live gig earnings, trip counts, Argyle connection status
```

**Suggested fix:**
```typescript
// Extract driver_id from authenticated session, not query params
const driver_id = req.user.driverId;
if (!driver_id) return res.status(403).json({ error: 'Driver account required' });
// Remove driver_id from query params entirely — no arbitrary lookup
```

---

### SEC-02 — CRITICAL: Mass Assignment on Driver Onboarding

**Location:** `api/_routes/onboarding.ts:93–101`
**Method:** OWASP mass-assignment / over-posting analysis
**Likelihood & Impact:** HIGH impact — attacker can set `vevo_status`, `status`, `balance`, `stripe_customer_id`, `user_id`, bypassing all business logic.

**Concrete example:**
```json
POST /api/onboarding/submit
{
  "token": "<valid-onboarding-token>",
  "data": {
    "name": "Attacker",
    "email": "attacker@example.com",
    "phone": "0400000000",
    "licenseNo": "LICENSE123",
    "licenseExpiry": "2030-01-01",
    "vevo_status": "APPROVED",
    "status": "ACTIVE",
    "balance": 999999
  }
}
```

**Suggested fix:** Allowlist only safe fields:
```typescript
const { data: driver } = await supabase
  .from('drivers')
  .insert({
    name: data.name,
    email: onboarding.email,  // forced from token
    phone: data.phone,
    license_no: data.licenseNo,
    license_expiry: data.licenseExpiry ? new Date(data.licenseExpiry) : undefined,
    passport_no: data.passportNo,
    user_id: authUser.user.id,
    updated_at: new Date().toISOString()
  })
```

---

### SEC-03 — CRITICAL: Multiple Routes Have NO Authentication

**Location:**
- `api/_routes/compliance.ts:8,11,26,36,46,63` — all endpoints
- `api/_routes/analytics.ts:7,58` — both endpoints
- `api/_routes/finance.ts:7,49` — dashboard and insurance endpoints

**Method:** OWASP missing-authentication check / threat-modeling
**Likelihood & Impact:** MEDIUM-HIGH — any internet request returns full financial summaries, compliance alerts, analytics, vehicle lists.

**Concrete example:**
```
GET /api/analytics/dashboard
→ Returns { vehicles: { total: 50, byStatus: {...} }, drivers: {...}, invoices: {...}, alerts: 12 }
```

**Suggested fix:** Apply `authMiddleware, adminOnly` to every individual route handler. Express parent-mount middleware does NOT propagate to router-internal routes.

---

### SEC-04 — CRITICAL: Argyle Webhook Has No Signature Verification

**Location:** `api/index.ts:72` — `/api/argyle/webhook` mounted with no auth
**Method:** OWASP missing-auth check / threat-modeling on third-party webhook flows
**Likelihood & Impact:** MEDIUM — attacker can submit fake gig/earnings data for any `argyle_user_id`.

**Concrete example:**
```http
POST /api/argyle/webhook
{ "name": "gigs.added", "data": { "user": "<any-argyle-user-id>", "income": { "net_pay": 99999 } } }
```

**Suggested fix:** Verify `X-Argyle-Signature` header using HMAC SHA-256 with the Argyle webhook secret:
```typescript
import crypto from 'crypto';
const expectedSig = crypto
  .createHmac('sha256', process.env.ARGYLE_WEBHOOK_SECRET)
  .update(rawBody)
  .digest('hex');
if (signature !== expectedSig) return res.status(401).send('Invalid signature');
```

---

### SEC-05 — CRITICAL: Multi-Tenancy Not Implemented — Full Data Leakage

**Location:** Database schema — no `business_id`/`tenant_id` on ANY table
**Method:** Architecture analysis / threat-modeling with data-flow
**Likelihood & Impact:** CRITICAL — all queries use `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS. Two businesses' data are completely mixed.

**Concrete example:** Without `business_id` filtering, an ADMIN of Business A can query all vehicles, drivers, rentals, and invoices across ALL businesses.

**Suggested fix:**
1. Add `business_id TEXT NOT NULL` to `users`, `drivers`, `vehicles`, `rentals`, `invoices`, `toll_charges`, `alerts`
2. Create RLS policies on every table filtering by `business_id`
3. Inject `business_id` from the authenticated user's session into every query
4. Remove or restrict the service-role key usage

---

### SEC-06 — HIGH: Race Condition in Rental Creation — Double-Booking Possible

**Location:** `api/_routes/rentals.ts:67–145`
**Method:** Race-condition analysis / concurrent access pattern review

**Concrete example:**
1. Request A: GET vehicle, status=AVAILABLE → proceeds
2. Request B: GET vehicle, status=AVAILABLE → proceeds (before A's UPDATE commits)
3. Both INSERT rental and UPDATE vehicle to RENTED

**Suggested fix:** Use a Postgres partial unique index:
```sql
CREATE UNIQUE INDEX rentals_vehicle_active ON rentals(vehicle_id) WHERE status = 'ACTIVE';
```
Or wrap in a Supabase RPC with `SELECT FOR UPDATE`.

---

### SEC-07 — HIGH: Non-Atomic Balance Updates — Balance Can Go Negative

**Location:**
- `api/_services/BillingService.ts:119–161` (markAsPaid)
- `api/_services/DriverService.ts:192–216` (updateBalance)

**Method:** Business-logic race-condition analysis / lost update pattern

**Concrete example:** Two concurrent invoice payments both read `balance = 100`, each subtracts their amount (50 + 30). Result: one subtraction is lost. Balance = 70 instead of 20.

**Suggested fix:** Use atomic Postgres update:
```sql
UPDATE drivers
SET balance = balance - $1, updated_at = NOW()
WHERE id = $2 AND balance >= $1
RETURNING *;
```
This prevents both the race condition AND negative balance in a single atomic statement.

---

### SEC-08 — HIGH: IDOR on Invoice Payment — Any Driver Can Pay Any Invoice

**Location:** `api/_routes/invoices.ts:42–55`
**Method:** OWASP IDOR / broken access control on financial operations

**Concrete example:**
```
POST /api/invoices/<any-invoice-id>/pay
Authorization: Bearer <driver-token>
→ Marks any invoice as PAID regardless of ownership
```

**Suggested fix:**
```typescript
const { data: invoice } = await supabase
  .from('invoices')
  .select('*, rental:rentals(driver_id)')
  .eq('id', req.params.id)
  .single();

if (req.user.role !== 'ADMIN' && invoice.rental.driver_id !== req.user.driverId) {
  return res.status(403).json({ error: 'Access denied' });
}
```

---

### SEC-09 — HIGH: Finance Dashboard Has NO Auth Middleware

**Location:** `api/_routes/finance.ts:7` — `async (req, res)` without AuthRequest
**Method:** OWASP missing-function-level-access-control check

**Note:** `api/index.ts:56` mounts `authMiddleware, adminOnly` on the parent path, but Express router-level middleware does NOT automatically apply to `router.get()` handlers registered inside the router file. Each route must self-apply the middleware.

**Suggested fix:** In `finance.ts`, import `authMiddleware` and `adminOnly`, then apply to each route.

---

### SEC-10 — HIGH: Stripe `invoice.paid` Marks ALL Pending Invoices as PAID

**Location:** `api/_services/StripeService.ts:160–191`
**Method:** Business-logic loophole / incorrect scope of update

**Concrete example:** If `invoice.paid` fires for one invoice, ALL pending invoices for that driver's rentals get marked PAID — even invoices that haven't been paid.

**Suggested fix:** Use the specific Stripe `invoice.id` to look up and update only the matching record:
```typescript
const stripeInvoiceId = invoice.id; // from the event
const { data: ourInvoice } = await supabase
  .from('invoices')
  .select('id')
  .eq('stripe_invoice_id', stripeInvoiceId)
  .single();
if (ourInvoice) {
  await supabase.from('invoices').update({ status: 'PAID', paid_at: ... }).eq('id', ourInvoice.id);
}
```

---

### SEC-11 — HIGH: Onboarding Token Reusable After Partial Failure

**Location:** `api/_routes/onboarding.ts:74–107`
**Method:** Business-logic token abuse / state-machine bypass

**Concrete example:** If Supabase Auth user creation succeeds (line 75) but `DriverService.registerDriver` throws (line 93), the token is never marked used. Attacker re-submits same token with modified data.

**Suggested fix:** Mark token as used BEFORE creating the auth user:
```typescript
await supabase
  .from('onboarding_tokens')
  .update({ used: true, used_at: new Date().toISOString() })
  .eq('token', token);
// Then create auth user — if this fails, token is already consumed
```

---

### SEC-12 — MEDIUM: Argyle Create-User-Token Accepts Arbitrary DriverId

**Location:** `api/_routes/argyle.ts:23–26`
**Method:** OWASP IDOR / privilege escalation via parameter tampering

**Concrete example:**
```json
POST /api/argyle/create-user-token
{ "driverId": "<any-driver-uuid>" }
```
Any authenticated user can link an Argyle account to any driver.

**Suggested fix:** Extract from `req.user.driverId` — do not accept from request body.

---

### SEC-13 — MEDIUM: No Rate Limiting Anywhere

**Location:** All API routes
**Method:** DoS risk analysis / OWASP throttling check

**Exposed attack surfaces:**
- Brute-force driver ID enumeration on `/api/drivers/:id`
- Card-testing on `POST /api/payments/create-checkout-session`
- Toll injection via `POST /api/tolls/sync`
- Onboarding token enumeration on `/api/onboarding/validate/:token`

**Suggested fix:** Add `express-rate-limit` middleware:
```typescript
import rateLimit from 'express-rate-limit';
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const paymentLimiter = rateLimit({ windowMs: 60 * 1000, max: 3 });
```

---

### SEC-14 — MEDIUM: Return Vehicle Has No Ownership Check

**Location:** `api/_routes/driver-dashboard.ts:179–209`
**Method:** OWASP IDOR / broken access control

**Concrete example:**
```
POST /api/driver/dashboard/return-vehicle
{ "rental_id": "<any-rental-id>" }
```
Any driver can end any rental and free any vehicle.

**Suggested fix:**
```typescript
const { data: rental } = await supabase.from('rentals').select('driver_id').eq('id', rental_id).single();
if (rental.driver_id !== req.user.driverId) return res.status(403).json({ error: 'Access denied' });
```

---

### SEC-15 — MEDIUM: Finance Dashboard Shows Data Across ALL Businesses

**Location:** `api/_routes/finance.ts:7–47`
**Method:** Architecture/data-integrity analysis — multi-tenancy absence

All financial queries aggregate from ALL businesses with no `WHERE business_id = ?` clause. Requires multi-tenancy fix (SEC-05) before this can be properly remediated.

---

### SEC-16 — MEDIUM: Compliance Check Triggers Without Auth

**Location:** `api/_routes/compliance.ts:26`
**Method:** OWASP broken access control / abuse of automated actions

`POST /api/compliance/check` calls `ComplianceService.checkExpiries()` which suspends vehicles. No auth required.

**Suggested fix:** Apply `adminOnly` middleware.

---

### SEC-17 — MEDIUM: Analytics Endpoints Publicly Accessible

**Location:** `api/_routes/analytics.ts:7,58`
**Method:** OWASP information disclosure

Both endpoints return vehicle counts, driver counts, rental statuses, invoice amounts, and alert counts without any authentication.

**Suggested fix:** Apply `authMiddleware, adminOnly`.

---

### SEC-18 — MEDIUM: Toll Sync Uses Weak Static API Key

**Location:** `api/_routes/tolls.ts:13–16`
**Method:** OWASP weak authentication / secrets analysis

```typescript
const isAuthorized = apiKey === process.env.FLEETSYNC_API_KEY;
```
Static string comparison. If the key leaks (logs, Git history), attackers can inject fake toll charges.

**Suggested fix:**
- Use Supabase Vault or AWS Secrets Manager for key management
- Implement key rotation
- Add request signing with HMAC

---

### SEC-19 — MEDIUM: No Validation on `start_date` in Rental Creation

**Location:** `api/_routes/rentals.ts:69,94`
**Method:** Edge-case fuzzing / input validation analysis

Attacker can set a past date (backdating rental) or far-future date (manipulating `next_payment_date`).

**Suggested fix:**
```typescript
const start = start_date ? new Date(start_date) : new Date();
const now = new Date();
const maxFuture = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
if (start < now || start > maxFuture) {
  return res.status(400).json({ error: 'start_date must be today or within 30 days' });
}
```

---

### SEC-20 — MEDIUM: Argyle Earnings Upsert Key Conflicts With Schema

**Location:** `api/_routes/argyle.ts:128–140`
**Method:** Data-integrity analysis — schema mismatch

The upsert uses `onConflict: 'driver_id,period_start'` but the actual unique index is `(driver_id, week_starting, platform)` per the migration. This silently fails for multi-platform drivers.

**Suggested fix:**
```typescript
.onConflict: 'driver_id,week_starting,platform'
```
And include `platform` in the upsert data.

---

### SEC-21 — MEDIUM: `RESTRICTED` VEVO Status Not Blocked on Approval

**Location:** `api/_services/DriverService.ts:111–113`
**Method:** Business-logic loophole / incomplete state machine

Only `DENIED` is blocked. `RESTRICTED` drivers (limited work rights) pass through and get `ACTIVE` status.

**Suggested fix:**
```typescript
if (driver.vevo_status === 'DENIED' || driver.vevo_status === 'RESTRICTED') {
  throw new Error('Cannot approve driver with denied or restricted VEVO status');
}
```

---

### SEC-22 — MEDIUM: Floating-Point Arithmetic for Financial Calculations

**Location:** `api/_services/BillingService.ts:25–31`
**Method:** Business-logic data integrity

`amount = (weekly_rate + tolls + fines) - credits` uses JavaScript floating-point arithmetic, producing values like `$100.000000000001`.

**Suggested fix:** Use integer cents throughout (Stripe already does this correctly):
```typescript
const amountCents = (weeklyRateCents + tollsCents + finesCents) - creditsCents;
const amount = amountCents / 100;
```

---

### SEC-23 — MEDIUM: Missing `business_id` on Invoices and Toll Charges

**Location:** Database schema
**Method:** Architecture analysis / multi-tenancy gap

`invoices` and `toll_charges` have no `business_id`. Even with RLS enabled, there's no column to filter on for tenant isolation.

**Suggested fix:** Add `business_id` FK to both tables, populate via triggers or application logic on insert, add RLS policies.

---

### SEC-24 — LOW: Dead `password` Column in `users` Table

**Location:** `prisma/migrations/20260209080031_init/migration.sql:29`
**Method:** Architecture analysis

`users.password TEXT NOT NULL` exists but is never used — Supabase Auth manages authentication. Dead code creates confusion and potential for misuse.

**Suggested fix:** Remove the `password` column. If legacy migration is needed for backwards compatibility, mark it deprecated.

---

### SEC-25 — LOW: Debug Endpoint Exposes Auth Context in Production

**Location:** `api/_routes/driver-dashboard.ts:8–10`
**Method:** OWASP information disclosure

```typescript
router.get('/debug-user', async (req: AuthRequest, res) => {
  res.json({ user: req.user });
});
```
Exposes full user object including `id`, `role`, `driverId`, `businessId`.

**Suggested fix:** Remove immediately.

---

### SEC-26 — LOW: Driver Creation Has No Field Allowlist

**Location:** `api/_routes/drivers.ts:64–76`
**Method:** OWASP mass-assignment

```typescript
.insert({ ...req.body, updated_at: new Date().toISOString() })
```
Same mass-assignment risk as SEC-02.

**Suggested fix:** Allowlist only safe fields: `name`, `email`, `phone`, `license_no`, `license_expiry`, `passport_no`.

---

### SEC-27 — LOW: Stripe Checkout Activates Rental Without Payment Verification

**Location:** `api/_services/StripeService.ts:144–158`
**Method:** Business-logic payment bypass

The `checkout.session.completed` handler activates rentals without checking `session.payment_status === 'paid'`. A checkout session can complete with `unpaid` status.

**Suggested fix:**
```typescript
if (type === 'BOND_PAYMENT' && rentalId && session.payment_status === 'paid') {
  await supabase.from('rentals').update({ status: 'ACTIVE', ... }).eq('id', rentalId);
}
```

---

### SEC-28 — LOW: No Validation That `license_no` Is Non-Empty

**Location:** `api/_services/DriverService.ts:19–28`
**Method:** Input validation analysis

```typescript
.or(`email.eq.${data.email},license_no.eq.${data.license_no}`)
```
If `license_no` is falsy, matches all records with empty string.

**Suggested fix:** Enforce at validation layer:
```typescript
if (!data.license_no || data.license_no.trim() === '') {
  throw new Error('License number is required');
}
```

---

### SEC-29 — LOW: `paid_at` Uses Server Time Instead of Stripe Timestamp

**Location:** `api/_services/StripeService.ts:136,184`
**Method:** Data-integrity analysis

Using `new Date()` introduces clock skew. Stripe retries can change the timestamp even for the same payment.

**Suggested fix:** Use `paymentIntent.created` from the Stripe event payload:
```typescript
paid_at: new Date(paymentIntent.created * 1000).toISOString()
```

---

### SEC-30 — LOW: In-Process Cron Jobs Will Not Run on Vercel

**Location:** `api/index.ts:82–90`
**Method:** Deployment analysis

Vercel serverless functions spin down after the request. In-process `node-cron` schedules are never triggered.

**Suggested fix:** Use Vercel's native cron configuration in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```
And move toll sync and compliance logic to those endpoints.

---

## ARCHITECTURE / DESIGN FLAWS

| ID | Label | Location | Method | Likelihood | Impact |
|----|-------|----------|--------|------------|--------|
| ARCH-01 | Supabase service-role key used for all DB ops (bypasses RLS) | `api/_lib/supabase.ts` | Threat-modeling data-flow | HIGH | Any vulnerability in query logic exposes all tenant data |
| ARCH-02 | No transaction support — multi-step operations are non-atomic | `rentals.ts`, `RentalService.ts` | Race-condition analysis | HIGH | Double-booking, inconsistent state after partial failure |
| ARCH-03 | Multi-tenancy not implemented — no `business_id` on any table | DB schema | Architecture analysis | HIGH | Cannot support multi-tenant isolation |
| ARCH-04 | In-process `node-cron` won't run on Vercel serverless | `api/index.ts:82` | Deployment analysis | MEDIUM | Cron jobs silently not executing |
| ARCH-05 | No circuit-breaker or timeout on external API calls (Argyle, VEVO, Stripe) | `argyle.ts`, `VevoService.ts` | Performance/resilience analysis | MEDIUM | External API failure cascades to request timeout |
| ARCH-06 | Supabase admin client disables `autoRefreshToken` and `persistSession` | `api/_lib/supabase.ts:11–16` | Architecture analysis | LOW | By design, noted for audit completeness |

---

## DATA-INTEGRITY & CONSISTENCY PROBLEMS

| ID | Label | Location | Method |
|----|-------|----------|--------|
| DATA-01 | Race condition in rental creation — possible double-booking | `rentals.ts:67–145` | Concurrent access pattern review |
| DATA-02 | Non-atomic balance updates — lost updates / negative balance | `BillingService.ts:119–161`, `DriverService.ts:192–216` | Dirty read/lost update analysis |
| DATA-03 | Upsert conflict key mismatch (Argyle earnings) | `argyle.ts:128–140` vs schema | Schema constraint mismatch |
| DATA-04 | `paid_at` uses server time instead of Stripe event timestamp | `StripeService.ts:136,184` | Incorrect timestamp provenance |
| DATA-05 | Vehicle status updated after rental insert — concurrent inserts can double-book | `rentals.ts:87–112` | Lost update / dirty write |
| DATA-06 | Onboarding token use not atomic with user creation — token can be consumed twice | `onboarding.ts:74–107` | State-machine inconsistency |

---

## OPERATIONAL / DEPLOYMENT RISKS

| ID | Label | Method |
|----|-------|--------|
| OPS-01 | No rate limiting anywhere | DoS risk analysis |
| OPS-02 | `FLEETSYNC_API_KEY` used for toll sync — static secret, no rotation | Weak credential analysis |
| OPS-03 | Cron jobs not executing on Vercel (in-process scheduler) | Deployment analysis |
| OPS-04 | No structured logging/monitoring (only `console.log`) | Observability gap |
| OPS-05 | `.env` may contain secrets (SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY) — not confirmed if in .gitignore | Secrets exposure risk |

---

## SUMMARY & TOP REMEDIATION PRIORITIES

### The Three Most Critical Issues

**1. SEC-05 (Multi-tenancy collapse):** The database has no `business_id` anywhere, and the Supabase client uses the service-role key that bypasses RLS. Every query must be reviewed for cross-tenant data leakage. This is foundational — everything else is built on an untrusted foundation. Multi-tenant isolation **must** be implemented before this system can safely handle multiple businesses.

**2. SEC-02 + SEC-26 (Mass assignment on driver creation):** Both `POST /api/onboarding/submit` and `POST /api/drivers` accept `...req.body` without field allowlisting. An attacker can set themselves to `ACTIVE` status, set arbitrary `balance`, and link arbitrary `stripe_customer_id`. This completely bypasses the onboarding approval workflow, VEVO checks, and business logic. These are trivial to exploit and give full driver-level access.

**3. SEC-01 + SEC-08 + SEC-12 + SEC-14 (Widespread IDOR):** The access-control model is inconsistent. Specific lookup and financial endpoints (`/argyle/my-earnings`, `/invoices/:id/pay`, `/return-vehicle`, `/argyle/create-user-token`) do not verify driver ownership. Any authenticated user can manipulate any other user's rentals, vehicles, invoices, and earnings data.

### Recommended Remediation Order

1. **Immediate:** Implement field allowlisting on all insert/update endpoints (SEC-02, SEC-26)
2. **Immediate:** Add ownership checks to all driver-specific financial and rental operations (SEC-01, SEC-08, SEC-12, SEC-14)
3. **Foundational:** Implement multi-tenancy with `business_id` + RLS policies (SEC-05, DATA-01, DATA-02, SEC-15, SEC-23)
4. **High:** Make rental creation and balance updates atomic via Postgres RPC (SEC-06, SEC-07)
5. **High:** Add auth to all remaining unauthenticated endpoints (SEC-03, SEC-09, SEC-16, SEC-17)
6. **High:** Add rate limiting on auth, payment, and onboarding endpoints (SEC-13)
7. **High:** Implement Argyle webhook signature verification (SEC-04)
8. **Medium:** Fix Stripe webhook to verify `payment_status` before activating rentals (SEC-27)
9. **Medium:** Add VEVO RESTRICTED to the blocked statuses on approval (SEC-21)
10. **Medium:** Replace in-process cron with Vercel native cron (SEC-30)
11. **Medium:** Switch to integer-cent arithmetic for all financial calculations (SEC-22)
12. **Low:** Remove debug endpoint (SEC-25)
13. **Low:** Remove dead `password` column from `users` (SEC-24)
14. **Low:** Add timeouts to all external API calls (ARCH-05)