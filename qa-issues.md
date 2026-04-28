# QA Session Issues — FleetSync Pro

## Issue 1: Invoice generation route is missing — Generate Invoices returns 404

**Severity: HIGH**

### What happened
Clicking "Generate Invoices" on the Invoices page fails. The frontend calls `POST /api/invoices/run-billing-cycle` but no route handler exists for it. Only `/api/cron/billing` exists, wired for Vercel cron, not user requests.

### What I expected
The Generate Invoices button should create PENDING invoices from active rentals and display a success or error message via toast.

### Steps to reproduce
1. Navigate to Invoices page
2. Click Generate Invoices
3. The request returns 404 or an unhandled error — no invoices are created

### Additional context
Frontend calls `api.post('/api/invoices/run-billing-cycle')`. The billing sweep logic exists in `api/cron/billing.ts` — it iterates active rentals and toll charges. This needs to be exposed as a user-accessible admin endpoint.

---

## Issue 2: Vehicle creation allows empty compliance dates — DB rejects with cryptic error

**Severity: HIGH**

### What happened
Adding a vehicle via the Fleet page shows an error when the compliance date fields (rego expiry, CTP expiry, pink slip expiry) are not filled or are invalid. The backend does not validate these fields before sending to the database, so the user sees a raw Supabase constraint error instead of a friendly field-level validation message.

### What I expected
Each compliance date should be validated as a required ISO8601 date on the backend. If missing, the API should return which field is invalid, and the UI should highlight it.

### Steps to reproduce
1. Navigate to Fleet page
2. Click Add Vehicle
3. Submit the form with a blank or invalid compliance date field
4. Observe: error toast with a raw DB error message

### Additional context
The backend validation array in `api/_routes/vehicles.ts` validates vin, plate, make, model, year, but omits `rego_expiry`, `ctp_expiry`, and `pink_slip_expiry`. These are NOT NULL columns in the database.

---

## Issue 3: Vehicle color not validated — empty string passes backend but DB rejects

**Severity: HIGH**

### What happened
Creating a vehicle with no color value (or an empty color field) passes backend validation but fails at the database layer with a NOT NULL constraint violation.

### What I expected
Backend validation should reject empty color as required, with a clear field-level error shown in the UI.

### Steps to reproduce
1. Fleet page → Add Vehicle
2. Clear or leave the color field empty
3. Submit — observe raw DB error toast

---

## Issue 4: Driver status not validated before rental creation — wrong status slips through

**Severity: HIGH**

### What happened
Creating a rental does not verify the driver is ACTIVE. If a driver's status was changed to SUSPENDED or PENDING after being shown in the driver dropdown, the rental can still be created, violating the fleet business rule.

### What I expected
Rental creation should verify driver status is ACTIVE server-side. Attempting to create a rental for a non-active driver should return a clear error.

### Steps to reproduce
1. Navigate to Rentals → Available Fleet
2. Select a driver whose status is SUSPENDED
3. Attempt to create rental
4. Observe: rental is created despite driver not being active

### Additional context
The rental route queries the driver's current status from the database before creating the rental — but only checks the driver exists, not that the status is ACTIVE.

---

## Issue 5: Driver must belong to the same business — no cross-tenant check

**Severity: HIGH**

### What happened
A driver who belongs to Business A could potentially be assigned to a vehicle owned by Business B if the IDs are swapped. The rental creation endpoint does not verify the driver and vehicle belong to the same business.

### What I expected
Both the driver and vehicle should be verified as belonging to the requesting user's business before a rental is created.

### Steps to reproduce
1. As Admin of Business A, obtain the UUID of a driver from Business B
2. Attempt to assign that driver to a vehicle in Business A
3. Observe: rental is created for cross-business driver (no error)

---

## Issue 6: Rental creation missing from RentalService — route bypasses service layer

**Severity: MEDIUM**

### What happened
The POST `/api/rentals` route handles all rental creation logic inline (validation, vehicle check, rental insert, bond invoice, shift creation). This mirrors V1's architecture — the route is the module. But there's no transactional integrity: if the bond invoice insert fails after the rental is already created, the system is in an inconsistent state.

### What I expected
Rental creation should be behind a single interface (the RentalFactory we just built). Each step of the rental flow should either succeed together or fail together.

### Steps to reproduce
1. Attempt to create a rental with bond amount that triggers an invoice error
2. Observe: partial state (rental created) with no rollback

---

## Issue 7: Invoice table has no business_id — no multi-tenancy isolation

**Severity: CRITICAL**

### What happened
Invoices have no `business_id` column. All invoices are stored in a shared namespace across businesses. Any admin can see all invoices in the system.

### What I expected
Every invoice record should be scoped to a business. All queries and inserts should filter by `business_id`.

### Additional context
This affects compliance with the V2 spec's multi-tenancy requirement. Other tables (vehicles, drivers, rentals) already have `business_id` in their queries even if not in the schema — invoices are completely missing this dimension.

---

## Issue 8: Generic error messages leak raw DB errors to users

**Severity: MEDIUM**

### What happened
All route catch blocks return `error.message` directly — Supabase's native error messages (e.g. "duplicate key value violates unique constraint (vin_key)") are shown to users via toasts and alerts.

### What I expected
Every error should be mapped to a user-friendly message. Duplicate VIN should say "A vehicle with this VIN already exists." Foreign key violations should say "The referenced driver or vehicle no longer exists."

### Steps to reproduce
1. Attempt to create a vehicle with a duplicate VIN
2. Observe: toast shows raw Postgres error text

---

## Issue 9: Invoice status transitions — no enforcement

**Severity: MEDIUM**

### What happened
The invoice status can be set to PAID without any payment having been collected. The "Mark as Paid" action does not verify that a PaymentIntent was completed via Stripe/PayPal before marking an invoice as settled.

### What I expected
Invoice status should only transition to PAID via webhook confirmation from Stripe or PayPal, or via a manual override with an audit trail note.

### Steps to reproduce
1. Create an invoice
2. Click Mark as Paid without any actual payment
3. Invoice shows as PAID despite no payment

---

## Blocking relationships

```
Issue 7 (Invoice business_id) — blocks: none
Issue 1 (Invoice route missing) — blocks: none
Issue 2 (Compliance date validation) — blocks: none
Issue 3 (Color validation) — blocks: none
Issue 4 (Driver status check) — blocks: Issue 6 (RentalFactory should own this check)
Issue 5 (Cross-business rental) — blocks: none
Issue 6 (RentalFactory migration) — blocked by: none
Issue 8 (Error message mapping) — blocked by: none
Issue 9 (Invoice payment enforcement) — blocked by: none
```